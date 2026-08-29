# CODING AGENTS: READ THIS FIRST

This is a second Claude Design bundle in this repo's `design/` folder, separate from
`design/project/Daily Challenge Tracker.dc.html` (the original app handoff — see
`../../design-handoff-readme.md`). Same idea, different origin: this one was authored directly by an
AI coding agent from a UI/UX review of the live app, not exported from a claude.ai/design session, so
there's no `chats/` transcript for it — this file is the transcript-equivalent.

**Live, editable version**: https://claude.ai/code/artifact/e92757e9-4854-42c3-bb1a-7b64295c4c92 (a
Claude Design canvas — open it to see all 14 artboards laid out, or to tweak them visually). The files
in this folder are that canvas's source, checked in for reference/implementation.

## Why this exists

A UI/UX review of tickd's actual running screens (real screenshots, both desktop and mobile viewports,
captured from the app itself) found one dominant issue: **the app has no real desktop layout.**
`src/components/layout/screen.tsx` caps content at `max-width: 672px` (`lg:max-w-2xl`) and centers it —
a deliberate mobile-first tradeoff (see that file's own comment: "no sidebar nav, no multi-column
reflow") — but the result on a real desktop viewport is a narrow mobile column floating in a lot of
unused space, not a composition designed for the width.

Plus a handful of smaller, screen-specific issues the review turned up. This bundle fixes both: a
reusable desktop container pattern (centered content, real two-column layouts where the content
benefits from it) applied to every main screen, plus the specific fixes below.

## What's in here

14 `.dc.html` artboards — 7 screens × desktop (1440px) + mobile (390px) — plus `canvas.json` (layout)
and `support.js` (the Design Components runtime these files expect at `./support.js`).

| Screen | Desktop file | Mobile file | Fix beyond the layout pattern |
|---|---|---|---|
| Landing | `Main.dc.html` | `LandingMobile.dc.html` | Real two-column hero + illustrative "wall" graphic + a "how it works" section, instead of the mobile column stretched into a wide, mostly-empty viewport |
| Today | `TodayDesktop.dc.html` | `TodayMobile.dc.html` | Checklist + sticky sidebar (stats/streak panel + plant mascot + Share button) instead of one stacked column; the floating "Share today" button — which visually collided with the last checklist row — is now inline in the sidebar |
| Wall | `WallDesktop.dc.html` | `WallMobile.dc.html` | Member avatar row (was a horizontally-scrolling strip that cut off with no scroll affordance) becomes a full, non-scrolling sidebar list; legend gets real labels instead of tiny inline text |
| Ranks | `RanksDesktop.dc.html` | `RanksMobile.dc.html` | Top 3 get medal styling (gold/silver/bronze) — previously every row looked identical regardless of rank |
| Group settings | `GroupSettingsDesktop.dc.html` | `GroupSettingsMobile.dc.html` | "Delete group" now reads as genuinely destructive (red-tinted danger-zone card) instead of sharing the same green styling as every other button in the app |
| Account | `AccountDesktop.dc.html` | `AccountMobile.dc.html` | "Save your account" (converting a guest to a persistent login — arguably the most important action on the page) is now a visually prominent card up top, instead of buried mid-page at the same weight as a preference toggle |
| Member detail | `MemberDetailDesktop.dc.html` | `MemberDetailMobile.dc.html` | Badges now visually distinguish locked vs. earned (desaturated + lock icon vs. full color) — previously every badge rendered identically regardless of whether the member had actually earned it |

All content — colors, fonts, radii, component shapes — was pulled directly from this repo's own source
at authoring time: `src/app/globals.css` (color tokens, `--radius-card`/`--radius-pill`), `src/lib/fonts.ts`
(Caprasimo + Figtree via next/font/google), and the relevant components (`today-stats-panel.tsx`,
`today-checklist.tsx`, `progress-ring.tsx`, `group-mascot.tsx`, `share-button.tsx`, `button.tsx`,
`switch.tsx`, `wall-grid.tsx`, `logo.tsx`). Follow the same instructions as the original handoff bundle
for implementing these: read the `.dc.html` source directly (don't rely on a screenshot), recreate
pixel-perfectly in the app's real React components, and match the app's actual Tailwind/CSS-variable
setup rather than the prototype's inline styles.

## Scope notes

- Mobile artboards are included for side-by-side comparison on the canvas, but they were **not**
  redesigned — they intentionally match the app's existing (working) mobile layout. The fix is
  desktop-only.
- Demo/sample data (member names, streak numbers, calendar fill patterns, rank scores) is illustrative,
  not real app data — same as the original handoff bundle's own prototypes.
