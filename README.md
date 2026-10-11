# claude-skills-and-mods

Alec's custom add-ons for Claude Code, in one place.

- **Skills**: instructions Claude loads when a task matches (for example, "back-process receipts").
- **Mods**: code that changes Claude Code itself (a banner, a slash command, a panel).

This repo is also a **plugin marketplace**: a catalog Claude Code can install from with one command.

## What's here

```
claude-skills-and-mods/
├── .claude-plugin/
│   └── marketplace.json        The catalog: lists every installable plugin below
├── mods/
│   ├── next-action/            Mod: "NEXT: ..." banner above the prompt, /next command
│   └── explain/                Mod: /explain <term> → plain-English explainer in the sidebar
│       ├── .claude-plugin/plugin.json
│       ├── hooks/              The mod's code (register.tsx) and its loader (hooks.json)
│       ├── types/              What the mod remembers ($.state), as TypeScript types
│       └── tests/              Tests: run with  claude plugin test mods/next-action
└── skills/                     Skill pack "alec-skills": one folder per skill
    ├── .claude-plugin/plugin.json
    ├── voltx-backprocess-receipts/
    ├── nd-audit/
    ├── rtfm/
    ├── i-have-adhd/            Written by Ayoub Ghriss, MIT license (kept in its folder)
    ├── plant-identifier/
    └── creature-identifier-skill/
```

| Installable plugin | What you get |
|---|---|
| `next-action` | `/next <step>` sets your one next step and shows it above the prompt (terminal) and in the status line under the prompt (everywhere, including the desktop app's cloud sessions). `/next done` clears it and counts the win. `/next` alone shows it. |
| `explain` | `/explain <term>` explains any word, phrase or command in plain English, in a sidebar, using where it came up in the session. Highlight text and type `/explain` to explain the highlight. Past explainers stay listed under **Earlier**, and are kept between sessions as a personal glossary. |
| `alec-skills` | All six skills, named `alec-skills:<skill>`. |

## Install

On any computer with Claude Code, in a terminal (not inside a session):

```
claude plugin marketplace add classA19/claude-skills-and-mods
claude plugin install next-action@alec-plugins
claude plugin install explain@alec-plugins
claude plugin install alec-skills@alec-plugins
```

Or inside a Claude Code session: `/plugin install next-action --marketplace classA19/claude-skills-and-mods`, then `y`, then pick a scope.

The repo is private, so the computer needs git access to GitHub (for example, `gh auth login`).

**Note on skills:** these six skills are also uploaded to your claude.ai account, which already syncs them into Claude sessions. Installing `alec-skills` as well gives you a second copy of each. Install it on machines that don't get the account sync.

## Updating

There are no version numbers on purpose. Every commit pushed to `main` counts as an update. On a computer that installed from GitHub:

```
claude plugin marketplace update alec-plugins
```

then run `/reload-plugins` inside the session.

## Adding something new

- **A skill:** make `skills/<skill-name>/SKILL.md`. It's part of `alec-skills` automatically.
- **A mod:** make `mods/<mod-name>/` with its own `.claude-plugin/plugin.json`, then add an entry for it in `.claude-plugin/marketplace.json`.
- Check before committing: `claude plugin validate .`

## Known gaps

- `nd-audit` tells Claude to read a `REFERENCE.md` beside it. That file wasn't in the synced copy this repo was made from. Add it to `skills/nd-audit/` if you have it.
- `creature-identifier-skill/SKILL.md` has two header blocks. It's copied as-is.
