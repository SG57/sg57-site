---
title: "What changed"
description: "Plain-words changelog. Your assistant shows the newest entry before any upgrade."
source: "CHANGELOG.md"
---

## [2.0.0] - 2026-10-17
privacy-affecting: yes. This release defines what your assistant may hold, share, and do. Read TRUST.md before you install.

### Added
- Everything. Version 1 was one person's private setup. Version 2 is a kit anyone can paste into their own assistant.
- A safety kernel: who may give instructions, which actions need your yes, a crisis floor, honesty rules about facts, and upgrades by proposal only.
- One weekly Brief instead of lists you keep yourself.
- Six areas: Money, Protection, Health, Home, Paperwork, Pets. Good Life is built in and always on.
- A yearly calendar that raises dates even if you install no area.
- Paste bundles for every kind of assistant: one for setup, one to return with your note, one to keep in an assistant's settings, and one per area. Each carries the official source and a fingerprint.
- A fictional example (Maya), a trust page, eval scenarios, and maintainer tools.

### Changed
- Works with any assistant. Vendor-specific notes live in their own folder.
- Size limits for the rule files were raised from the first design estimate to what the tested kernel needs. See tools/budgets.txt.

### Removed
- The two-person module. It returns in 2.1 after its rules are written by the people who will use it and tested on both assistants.
- Any rule that let one partner's assistant answer questions about the other.
- Automatic upgrades. Updates are proposed and need your yes.
