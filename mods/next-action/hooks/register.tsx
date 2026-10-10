import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { NextAction } from '../types'

// $.state: what the banner draws from. Survives a hot reload of this file.
const current = atom({ plugin: 'next-action', key: 'current' } as const, null)
const doneCount = atom({ plugin: 'next-action', key: 'doneCount' } as const, 0)

// $.store: a copy on disk, so the next action survives a new session too.
const STORE_KEY = 'current'

// Words that mean "I finished it" when typed after /next.
const DONE_WORDS = new Set(['done', 'clear', 'x'])

// VoltX accent orange.
const ACCENT = '#fa9005'

async function setNext($: EngineInterface, text: string): Promise<NextAction | null> {
  const before = await read($, current)
  const action: NextAction = { text, setAt: await $.clock.now() }
  await update($, current, () => action)
  await $.store.set(STORE_KEY, action)
  await refreshStatus($)

  return before
}

async function finish($: EngineInterface): Promise<NextAction | null> {
  const was = await read($, current)
  if (was === null) {
    return null
  }

  await update($, current, () => null)
  await $.store.delete(STORE_KEY)
  await update($, doneCount, n => n + 1)
  await refreshStatus($)

  return was
}

function doneLine(count: number): string {
  return count === 1 ? '1 done this session' : `${count} done this session`
}

// The status line under the prompt: shown on every surface, including the
// app's view of a cloud session, where the banner above the prompt is not.
function statusLine(action: NextAction | null, done: number): string {
  const wins = done > 0 ? ` (${doneLine(done)})` : ''

  return action ? `NEXT: ${action.text}${wins}` : `No next action. Type /next <step>.${wins}`
}

async function refreshStatus($: EngineInterface): Promise<void> {
  $.ui.status(statusLine(await read($, current), await read($, doneCount)))
}

function isNextAction(value: unknown): value is NextAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as NextAction).text === 'string' &&
    typeof (value as NextAction).setAt === 'number'
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'next',
      description: 'Set your one next step (shown above the prompt). /next done clears it.',
      argumentHint: '<next step> | done',
      immediate: true,
    })

    // A new session starts with empty $.state: bring back the saved one.
    if ((await read($, current)) === null) {
      const saved = await $.store.get(STORE_KEY)
      if (isNextAction(saved)) {
        await update($, current, () => saved)
      }
    }
    await refreshStatus($)

    return next(e)
  })

  on('command.run', { command: 'next' }, async ($, e) => {
    const args = e.args.trim()

    // "/next" alone: say what it is.
    if (args === '') {
      const action = await read($, current)

      return {
        text: action
          ? `Next action: ${action.text}`
          : 'No next action set. Type /next followed by the one next step.',
      }
    }

    // "/next done": finish it.
    if (DONE_WORDS.has(args.toLowerCase())) {
      const was = await finish($)
      if (was === null) {
        return { text: 'Nothing to clear: no next action was set.' }
      }

      return { text: `Done: ${was.text} (${doneLine(await read($, doneCount))})` }
    }

    // "/next <step>": set it, and say what it replaced so nothing vanishes silently.
    const before = await setNext($, args)

    return {
      text: before
        ? `Next action set: ${args}\n(Replaced: ${before.text})`
        : `Next action set: ${args}`,
      context: [`The user set their next action to: "${args}". It shows in a banner above their prompt.`],
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const action = await read($, current)
    const done = await read($, doneCount)
    const { Box, Button, Text } = $.ui.resolve(e)

    if (action === null) {
      return (
        <Box>
          <Text dimColor wrap="truncate-end">
            {done > 0 ? `${doneLine(done)}. ` : ''}No next action. Type /next followed by the one next step.
          </Text>
        </Box>
      )
    }

    return (
      <Box gap={1}>
        <Text bold color={ACCENT}>
          NEXT
        </Text>
        <Box flexGrow={1} flexShrink={1}>
          <Text wrap="truncate-end">{action.text}</Text>
        </Box>
        {done > 0 && <Text dimColor>{doneLine(done)}</Text>}
        <Button
          key="done"
          hotkey="d"
          label="Done"
          onPress={async () => {
            const was = await finish($)
            if (was !== null) {
              $.ui.toast(`Done: ${was.text}`)
            }
          }}
        />
      </Box>
    )
  })
}
