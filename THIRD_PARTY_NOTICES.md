# Third-party notices

SYNTHIA SRT Studio is an independent React/TypeScript application. The manual timing
semantics (R/E/W, Shift variants, selection advancement, early timestamp capture)
and compatible SRT parsing conventions were informed by and adapted from
[cityedge/SRT Tap Timer](https://github.com/cityedge/srt-tap-timer), v1.64.2,
Copyright (c) 2026 cityedge, MIT License.

The complete original license is preserved in `docs/reference/LICENSE` and is
included in every production build at `LICENSE-SRT-Tap-Timer.txt`. Attribution
comments accompany the timing engine and parsers. Source reference snapshots are
kept under `docs/reference/`; they are not part of the running app.

React, React DOM and Scheduler are MIT licensed. Their versions and complete
licenses are assembled into `public/THIRD_PARTY_NOTICES.txt` by the build and shipped
unchanged with `dist/`. Other development dependencies retain their licenses in
their npm packages; they are not copied into the application as runtime tools.

The original SRT Tap Timer repository and existing SYNTHIA repositories are not
modified, linked as Git remotes, or used as installation destinations.
