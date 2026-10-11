export type Explainer = {
  id: string
  term: string
  status: 'loading' | 'done' | 'error'
  // The explainer in markdown once done; the reason it failed on error.
  text: string
}

declare module 'claude-code' {
  interface PluginState {
    explain: { entries: Explainer[]; shownId: string | null }
  }
}
