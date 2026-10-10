export type NextAction = { text: string; setAt: number }

declare module 'claude-code' {
  interface PluginState {
    'next-action': { current: NextAction | null; doneCount: number }
  }
}
