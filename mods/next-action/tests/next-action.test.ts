import { describe, expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On } from 'claude-code'

const BAND = {
  plugin: 'next-action',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

// A /next typed at the prompt, the way the engine passes it.
function typed(args = ''): CommandRunInput {
  return {
    command: 'next',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  }
}

// What sits beneath the plugin in a real session: a store, a clock, the
// command list and the toast bar. Returns the toasts the plugin raised.
function world(on: On, stored: Record<string, unknown> = {}): string[] {
  mock.store(on, stored)
  mock.clock(on, { now: 1_000 })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

describe('/next', () => {
  test('sets, replaces, shows and clears the next action', async ($, on) => {
    world(on)

    const empty = await $.command.run(typed())
    expect(empty.text).toContain('No next action set')

    const set = await $.command.run(typed('Call Elliott about the panel'))
    expect(set.text).toBe('Next action set: Call Elliott about the panel')
    expect(set.context?.[0]).toContain('Call Elliott about the panel')

    const replaced = await $.command.run(typed('Order breakers'))
    expect(replaced.text).toContain('Replaced: Call Elliott about the panel')

    const shown = await $.command.run(typed('  '))
    expect(shown.text).toBe('Next action: Order breakers')

    const done = await $.command.run(typed('DONE'))
    expect(done.text).toBe('Done: Order breakers (1 done this session)')

    const again = await $.command.run(typed('done'))
    expect(again.text).toContain('Nothing to clear')
  })

  test('brings back a saved next action when a session starts', async ($, on) => {
    world(on, { current: { text: 'Pull permit for Smith job', setAt: 5 } })
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

    const shown = await $.command.run(typed())
    expect(shown.text).toBe('Next action: Pull permit for Smith job')
  })
})

for (const surface of ['terminal', 'desktop'] as const) {
  describe(`banner on ${surface}`, () => {
    test('shows a nudge when empty, the step when set, and Done clears it', async ($, on) => {
      const toasts = world(on)
      const band = await $.ui.mount({ ...BAND, surface })

      expect((await band.find({ text: /No next action/ }))?.text).toContain('/next')

      await $.command.run(typed('Send Johnson invoice'))
      expect(await band.find({ text: 'Send Johnson invoice' })).toBeDefined()
      expect(await band.find({ text: 'NEXT' })).toBeDefined()

      await band.press({ key: 'done' })
      expect(toasts).toEqual(['Done: Send Johnson invoice'])
      expect((await band.find({ text: /No next action/ }))?.text).toContain('1 done this session')
    })

    test('steps aside for a survey', async ($, on) => {
      world(on)
      on('ui.render', { component: 'AbovePrompt' }, () => ({
        type: 'Text',
        children: ['A survey'],
      }))
      await $.command.run(typed('Anything'))

      const band = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, hasSurvey: true } })
      expect(await band.find({ text: 'A survey' })).toBeDefined()
      expect(await band.find({ text: 'Anything' })).toBeUndefined()
    })
  })
}
