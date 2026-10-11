import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Explainer } from '../types'

// $.state: what the sidebar draws from. Survives a hot reload of this file.
const entries = atom({ plugin: 'explain', key: 'entries' } as const, [])
const shownId = atom({ plugin: 'explain', key: 'shownId' } as const, null)

// $.store: the glossary on disk, so past explainers survive a new session.
const STORE_KEY = 'glossary'
const KEEP = 50

const PANE = 'explain'
const ACCENT = '#fa9005'

// Used when there is no conversation yet to read the term in.
const FALLBACK_MODEL = 'sonnet'

function ask(term: string, withSession: boolean): string {
  const where = withSession
    ? 'as it is used in this session (look back at where it came up)'
    : 'in general (there is no conversation to look at)'

  return [
    `Explain "${term}" ${where}.`,
    '',
    'Who is asking: a solo electrical contractor who builds his own software and is learning',
    'filesystems, Git and databases as he goes. Plain English, not baby talk.',
    '',
    'Shape:',
    '- First line: what it is, in one sentence.',
    '- What it means or does here, in this session, if it came up.',
    '- An everyday or electrical-trade analogy, only if it actually helps.',
    '- The real technical terms worth learning, each with a short gloss.',
    '',
    'Under 200 words. Markdown, no heading bigger than ###. Reply with the explainer only:',
    'no preamble, no offer to help further, no tools.',
  ].join('\n')
}

async function explain($: EngineInterface, term: string): Promise<{ ok: boolean; text: string }> {
  const forked = await $.model.fork({ prompt: ask(term, true) })
  if (forked.isAnswered) {
    return { ok: true, text: forked.text }
  }
  if (forked.reason !== 'nothing-to-fork') {
    return { ok: false, text: `No explainer: ${forked.reason}. Try /explain ${term} again.` }
  }

  const plain = await $.model.complete({
    model: FALLBACK_MODEL,
    prompt: ask(term, false),
    maxTokens: 800,
    timeoutMs: 60_000,
  })

  return plain.isAnswered
    ? { ok: true, text: plain.text }
    : { ok: false, text: `No explainer: ${plain.reason}. Try /explain ${term} again.` }
}

async function setEntry($: EngineInterface, id: string, change: Partial<Explainer>): Promise<void> {
  await update($, entries, list => list.map(one => (one.id === id ? { ...one, ...change } : one)))
  const kept = (await read($, entries)).filter(one => one.status === 'done')
  await $.store.set(STORE_KEY, kept)
}

// A label short enough for a button or a one-line reply.
function short(text: string): string {
  const line = text.replace(/\s+/g, ' ')

  return line.length > 48 ? `${line.slice(0, 47)}...` : line
}

function isExplainer(value: unknown): value is Explainer {
  const one = value as Explainer

  return (
    typeof value === 'object' &&
    value !== null &&
    typeof one.id === 'string' &&
    typeof one.term === 'string' &&
    typeof one.text === 'string' &&
    one.status === 'done'
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'explain',
      description: 'Plain-English explainer in the sidebar. /explain <term>, or highlight text and type /explain.',
      argumentHint: '<term, phrase or command>',
      immediate: true,
    })

    // A new session starts with empty $.state: bring back the saved glossary.
    if ((await read($, entries)).length === 0) {
      const saved = await $.store.get(STORE_KEY)
      if (Array.isArray(saved)) {
        await update($, entries, () => saved.filter(isExplainer).slice(0, KEEP))
      }
    }

    return next(e)
  })

  on('command.run', { command: 'explain' }, async ($, e) => {
    // What to explain: what was typed after /explain, else what is highlighted.
    let term = e.args.trim()
    if (term === '') {
      term = ((await $.ui.selection())?.text ?? '').trim()
    }

    // Nothing typed or highlighted: show the sidebar with past explainers.
    if (term === '') {
      const opened = await $.ui.open({ id: PANE, title: 'Explain' })

      return {
        text: opened.isPlaced
          ? 'Explain sidebar opened. Type /explain followed by a term, or highlight text and type /explain.'
          : 'Type /explain followed by a term, or highlight text and type /explain.',
      }
    }

    const id = `${await $.clock.now()}-${(await read($, entries)).length}`
    const entry: Explainer = { id, term, status: 'loading', text: '' }
    await update($, entries, list => [entry, ...list].slice(0, KEEP))
    await update($, shownId, () => id)

    const opened = await $.ui.open({ id: PANE, title: 'Explain' })

    // No sidebar on this surface: wait for the explainer and print it here.
    if (!opened.isPlaced) {
      const result = await explain($, term)
      await setEntry($, id, { status: result.ok ? 'done' : 'error', text: result.text })

      return { text: result.text }
    }

    // Sidebar shown: answer in the background so the prompt stays free.
    $.clock.after(0, () => {
      void explain($, term).then(result =>
        setEntry($, id, { status: result.ok ? 'done' : 'error', text: result.text }),
      )
    })

    return { text: `Explaining "${short(term)}" in the sidebar.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const list = await read($, entries)
    const wanted = await read($, shownId)
    const entry = list.find(one => one.id === wanted) ?? list[0]

    if (entry === undefined) {
      return (
        <Box flexDirection="column">
          <Text dimColor>
            Type /explain followed by any word, phrase or command. Or highlight text and type /explain.
          </Text>
        </Box>
      )
    }

    const earlier = list.filter(one => one.id !== entry.id && one.status === 'done').slice(0, 8)

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color={ACCENT}>
          {entry.term}
        </Text>
        {entry.status === 'loading' && <Text dimColor>Explaining...</Text>}
        {entry.status === 'error' && <Text color="error">{entry.text}</Text>}
        {entry.status === 'done' && <Markdown text={entry.text} />}
        {earlier.length > 0 && (
          <Box flexDirection="column">
            <Text dimColor>Earlier</Text>
            {earlier.map(one => (
              <Button
                key={`show-${one.id}`}
                plain
                label={short(one.term)}
                onPress={() => update($, shownId, () => one.id)}
              />
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
