# Translation Plugin

Current project status: @STATE.md (read it at session start; update it after every meaningful change).
Full project plan: PLAN.md (read it when planning or picking the next task; keep it in sync).

## Purpose
Chrome extension (MV3) that shows translated subtitles on YouTube videos. Personal tool now; may go public (Chrome Web Store) later.

## Stack
- TypeScript, WXT (Vite-based extension framework), Manifest V3.
- Translation: Chrome built-in Translator API (Chrome 138+, desktop only, on-device), behind a `Translator` interface.
- Tests: Vitest. Manual checks in desktop Chrome.
- No backend.

## Commands
- Install: `npm install`
- Dev: `npm run dev` (opens a separate Chrome profile; for the user's own Chrome use build + load unpacked)
- Test: `npm test` (Vitest)
- Typecheck: `npm run typecheck`
- Lint/format: TBD
- Build: `npm run build` -> load unpacked `.output/chrome-mv3`, reload the extension after each build

## Structure
- `entrypoints/`: WXT entrypoints only (every file there is an entrypoint). `*.content.ts` = content scripts.
- `utils/`: shared code imported by entrypoints.
- `types/`: ambient types (e.g. Translator API).

## Conventions
- Branch per task: `feat/<slug>`, `fix/<slug>`. Small commits, one logical change each.
- Language-agnostic code: never hardcode `en`/`ru` outside defaults/settings.
- Translation engines implement the `Translator` interface; UI and subtitle code never call an engine API directly.
- Keep YouTube DOM selectors and caption-fetch logic in one module each; YouTube breaks them often.

## Definition of Done
- Tests: `npm test` pass; new behavior has tests; bugs get a failing test first.
- Typecheck: `npm run typecheck` pass.
- UI: checked in Chrome on a real YouTube video (golden path plus one edge case).
- STATE.md and PLAN.md updated.
- Committed on a task branch.

## Constraints
- Permissions minimal: `storage` + host access to `youtube.com` only. Anything more needs a reason in STATE.md "Decisions".
- `Translator.create()` requires a user gesture (player button click).
- Translator API runs requests sequentially: do not flood it; translate ahead of playback.
- No external network calls for translation in MVP (privacy, no API keys).
