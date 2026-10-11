import { describe, expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On } from 'claude-code'

const USAGE = {
  input_tokens: 1,
  output_tokens: 1,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}

const PANE = {
  plugin: 'explainer',
  component: 'Pane',
  requestId: 'explainer',
  props: {
    title: 'Explain',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

// /huh typed at the prompt, the way the engine passes it.
function typed(args = ''): CommandRunInput {
  return {
    command: 'huh',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  }
}

type World = {
  stored?: Record<string, unknown>
  isPlaced?: boolean
  selected?: string
  canFork?: boolean
}

// What sits beneath the plugin in a real session: store, clock, command list,
// the sidebar, the highlighted text, toasts and the model. Returns the clock,
// what the model was asked and the toasts raised.
function world(on: On, opts: World = {}) {
  mock.store(on, opts.stored ?? {})
  const clock = mock.clock(on, { now: 1_000 })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.open', () =>
    opts.isPlaced === false
      ? { value: { isPlaced: false as const, reason: 'no surface places panes' } }
      : { value: { isPlaced: true as const } },
  )
  on('ui.selection', () => ({
    value: opts.selected === undefined ? undefined : { text: opts.selected },
  }))
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  const asked: { via: 'fork' | 'complete'; prompt: string; model?: string }[] = []
  on('model.fork', ($, e) => {
    asked.push({ via: 'fork', prompt: e.prompt })

    return opts.canFork === false
      ? { value: { isAnswered: false as const, reason: 'nothing-to-fork' as const, usage: USAGE } }
      : { value: { isAnswered: true as const, text: '**Forked** answer', usage: USAGE } }
  })
  on('model.complete', ($, e) => {
    asked.push({ via: 'complete', prompt: String(e.prompt), model: e.model })

    return { value: { isAnswered: true as const, text: '**Plain** answer', usage: USAGE } }
  })

  return { clock, asked, toasts }
}

describe('sidebar button', () => {
  test('explains the highlighted text with one click', async ($, on) => {
    const { clock, asked } = world(on, { selected: ' git push -u origin main ' })
    const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })

    await pane.press({ key: 'explain-selection' })
    expect(await pane.find({ text: 'git push -u origin main' })).toBeDefined()
    expect(await pane.find({ text: 'Explaining...' })).toBeDefined()

    await clock.settle()
    expect(asked[0]?.prompt).toContain('"git push -u origin main" as it is used in this session')
    expect(await pane.find({ type: 'Markdown', text: '**Forked** answer' })).toBeDefined()
  })

  test('asks for a highlight when nothing is highlighted', async ($, on) => {
    const { asked, toasts } = world(on)
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })

    await pane.press({ key: 'explain-selection' })
    expect(toasts).toEqual(['Highlight a word or phrase in the chat first.'])
    expect(asked).toHaveLength(0)
  })

  test('opens with the session, showing the how-to', async ($, on) => {
    world(on)
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

    const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect(await pane.find({ text: /Highlight a word, phrase or command/ })).toBeDefined()
  })
})

describe('/huh', () => {
  test('answers in the sidebar, in the background, using the session', async ($, on) => {
    const { clock, asked } = world(on)

    const ran = await $.command.run(typed('symbolic link'))
    expect(ran.text).toBe('Explaining "symbolic link" in the sidebar.')

    const terminal = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
    for (const pane of [terminal, desktop]) {
      expect(await pane.find({ text: 'symbolic link' })).toBeDefined()
      expect(await pane.find({ text: 'Explaining...' })).toBeDefined()
    }

    await clock.settle()
    expect(asked).toHaveLength(1)
    expect(asked[0]?.via).toBe('fork')

    // The same drawings, redrawn when the answer landed.
    for (const pane of [terminal, desktop]) {
      expect(await pane.find({ type: 'Markdown', text: '**Forked** answer' })).toBeDefined()
      expect(await pane.find({ text: 'Explaining...' })).toBeUndefined()
    }
  })

  test('explains the highlighted text when nothing is typed', async ($, on) => {
    const { asked } = world(on, { isPlaced: false, selected: 'origin' })

    const ran = await $.command.run(typed())
    expect(ran.text).toBe('**Forked** answer')
    expect(asked[0]?.prompt).toContain('"origin"')
  })

  test('falls back to a plain model call before the conversation has a reply', async ($, on) => {
    const { asked } = world(on, { isPlaced: false, canFork: false })

    const ran = await $.command.run(typed('pgTAP'))
    expect(ran.text).toBe('**Plain** answer')
    expect(asked.map(one => one.via)).toEqual(['fork', 'complete'])
    expect(asked[1]?.model).toBe('sonnet')
    expect(asked[1]?.prompt).toContain('in general')
  })

  test('opens the sidebar with a hint when nothing is typed or highlighted', async ($, on) => {
    const { asked } = world(on)

    const ran = await $.command.run(typed())
    expect(ran.text).toContain('Explain sidebar opened')
    expect(asked).toHaveLength(0)
  })
})

describe('glossary', () => {
  test('earlier explainers come back next session and reopen', async ($, on) => {
    const saved = [{ id: 'old-1', term: 'remote', status: 'done', text: 'A copy elsewhere.' }]
    world(on, { stored: { glossary: saved } })

    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
    await $.command.run(typed('push'))

    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await pane.find({ text: 'Earlier' })).toBeDefined()

    await pane.press({ key: 'show-old-1' })
    expect(await pane.find({ type: 'Markdown', text: 'A copy elsewhere.' })).toBeDefined()
  })
})
