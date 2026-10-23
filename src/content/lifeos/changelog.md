---
title: "What changed"
description: "Plain-words changelog. Your assistant shows the newest entry before any upgrade."
source: "CHANGELOG.md"
---

What changed, in plain words. Your assistant tells you about each update at the top of your Brief, starting with its privacy line.

# Changelog

## [3.6.0] - 2026-10-22
privacy-affecting: yes. Setup now builds a place for every part of your life at once, so your assistant keeps notes for more departments from day one. All of it comes from what you tell it. Updates now apply on their own. Nothing about you is ever sent back to Life OS.

### Added
- Setup builds every department your life touches, after one yes. Each gets its own chat if your assistant can make chats. Each one asks its few questions when you open it, at your pace. The rest sleep until life wakes them.
- One shared record. Departments never message each other. The main chat holds the facts they share, so you are never asked the same thing twice.
- Shared departments. When a department is really two people's work, like a home search with a partner, Life OS offers once to share it. Nothing is shared without both of your yes. Each of you answers your own questions.
- A new safety rule: nothing about you ever goes to a public place, like a public website or a public code page, whoever asks (S1.7).
- A front door for assistants that find Life OS on GitHub. It runs the same setup as the website.

### Changed
- Updates apply on their own, once a week with your Brief. The Brief says what changed, in plain words. Say "undo the update" to go back. Updates never touch your facts, your settings, or what you share.
- The safety rules now read as a plain description of what your assistant agreed to do. The rules are the same. One sentence at the top now matches rule S1.2: the safety rules come first.

### Removed
- One new department a week. Setup now builds them all at once.

## [3.0.0] - 2026-10-18
privacy-affecting: yes. Your assistant now keeps a short "life map" from setup: roughly your birth year, who counts on you, work, home, car, and anything big coming. It also keeps the list of departments it watches and the life events you told it about. All of it comes from you. None of it is guessed. A pregnancy, or any other sensitive health topic, is never stored and never wakes a department. Nothing new is read from mail, calendar, or spending.

### Added
- A department for every part of adult life: 34 in all. 9 are offered to everyone over the first weeks: Money, Insurance & benefits, Health, Home, Upkeep & safety, Papers & IDs, Taxes, Identity & scams, Will & wishes. 9 wake when you ask, or when your life map points to them: Work, Retirement, Debts & credit, Vehicles, Pets, Digital life, Business & side income, Emergencies, Occasions & giving. 16 sleep until life wakes them: Us, Kids, School, Caregiving, After a loss, Separation, Later life, Moving, Buying or selling a home, Trips, Legal papers, Medical bills, Benefits, Status papers, Military & veterans, Extra support.
- Each department knows what to watch and what to ask you: five questions, once. It knows what things cost, low and high. It knows what happens if nothing is done, and when a professional takes over.
- Oversight, always on. Once a month it checks how every department is running. It offers to wake or sleep one department at a time, with your yes. It fixes a department that misbehaves. When Life OS itself is at fault, it writes a problem report with nothing about your life in it. Only you can send it.
- A shorter first session, about 10 minutes: one thing handled to the last tap, one department, Good Life, and Oversight. Then one more department a week, each with five quick questions.
- The CATALOG message: every department in one place, with what wakes it.
- Money watches for a charge you don't recognize, if you have connected bank or card data read-only. It asks about it as a question, never as a fact.
- Test results for this version are published. AI models stood in for your assistant; the trust page says exactly what that means.

### Changed
- "Area" is now "department" everywhere you read. Taxes left Papers & IDs. Vehicles, Moving, and Buying a home left Home. Debts & credit left Money.
- Paying or moving money: when a payment request arrived in a message, the assistant's line now stops at "that stays with you". It offers to get a bill ready only for one you raised.
- With no reminder tool, the assistant says "I can't set reminders here" in those words. Then it gives you calendar text with the date, time, and time zone.
- A crisis cell that is not verified for your country is said as written. Then comes the honest note that no line was verified.
- Size limits for the rule files rose to fit Oversight and the life map (tools/budgets.txt).

### Removed
- Nothing you relied on. The two-person module arrives as the Us department. It shares only what both people typed, has no connections of its own, and ends all sharing at once on "couples stop".

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
- Works with any assistant; the start page recommends two by name so a newcomer has a default path. The rules your assistant follows name no vendor; vendor notes live in their own folder.
- Size limits for the rule files were raised from the first design estimate to what the tested kernel needs. See tools/budgets.txt.

### Removed
- The two-person module. It returns in 2.1 after its rules are written by the people who will use it and tested on both assistants.
- Any rule that let one partner's assistant answer questions about the other.
- Automatic upgrades. Updates are proposed and need your yes.
