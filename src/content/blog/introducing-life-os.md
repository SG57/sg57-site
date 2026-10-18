---
title: "Introducing Life OS — A Back Office for Your Life, Built Out of Instructions, Not Code"
description: "Life OS is a set of instructions for the AI assistant you already use. No app, no account, no vendor lock-in. I'm starting to dogfood 2.0.0 on my own life today."
date: 2026-10-17
tags: ["life-os", "announcement", "ai-tools"]
author: Cord Rehn
---

Clide and Siftr are apps. Life OS isn't.

Life OS is a set of instructions for the AI assistant you already have open right now. You paste one message, answer questions for about twenty minutes, and from then on you get one short note a week instead of a list you have to keep yourself. There's nothing to install and nothing new to sign up for -- it runs inside Muse, ChatGPT, Claude, Gemini, Grok, or anything else that can hold a conversation and follow written rules.

I built it around Muse because that's the assistant I already run day to day, and I wanted to know it would actually hold up before I asked anyone else to trust it. But nothing in the kernel is Muse-specific. The [capabilities table](/life-os/trust) spells out what changes by tier -- chat-only, memory, or memory plus read-only connections -- precisely so the instructions don't assume a vendor. If your assistant is Grok, or whatever ships next year, the same kit should run on it, with the honest fallbacks written in for whatever it can't do yet.

## Why this exists

Version 1 was four files I wrote for myself. Version 2.0.0 is a public-ready kit: a safety kernel (who may give it instructions, which actions need your explicit yes, a crisis floor, a never-list for money and legal/medical/tax decisions), six areas (Money, Protection, Health, Home, Paperwork, Pets), paste bundles for every tier of assistant, and a trust page that doesn't soften the honest limits -- what a vendor keeps, what a subpoena could expose, what "stop" does and doesn't undo.

It went through two verification rounds (scenarios answered blind by two different models, simulated installs, a red-team pass, a legal read, a fact check) before I'd call it done enough to run on my own life.

## Where things actually stand

I'm not telling you to paste this into your assistant tonight. I'm telling you I'm starting to: this is day one of running 2.0.0 on my own setup, the same kit linked from [sg57.dev/life-os](/life-os). If you want to watch that happen -- including the rough edges -- that's what this post is for.

The honest-limits section of the [trust page](/life-os/trust) says plainly that the "turn it off" steps haven't yet been timed with a non-technical tester. That's next, not done. The public, install-it-yourself release comes after the dogfood period and its own release checks pass, not before.

## Start here

- [sg57.dev/life-os](/life-os) -- the one page you need to read, and where the setup message actually lives
- [The trust page](/life-os/trust) -- what it sees, what it's told never to do, how to turn it off
- [A fictional example](/life-os/example) -- a first setup and first week, written to follow the real script

Questions or a worse idea than mine: [support@sg57.dev](mailto:support@sg57.dev).
