---
title: "Clide's Concierge System: Never Miss an AI Agent Prompt Again"
description: "Clide's Concierge watches your AI sessions for prompts, questions, and errors — then alerts you via toast notification so blocked agents get unblocked immediately."
date: 2026-04-14
tags: ["clide", "deep-dive", "ai-tools", "automation"]
author: Cord Rehn
image: /clide/screenshots/terminal-session.webp
imageAlt: "Clide terminal session showing Concierge monitoring output patterns"
---

## The Blocking Problem

Here's a scenario you've probably lived through if you use Claude Code or GitHub Copilot CLI.

You give an agent a substantial task. It starts working. You shift focus to another session, or another tab, or just go get coffee. Three minutes later you come back to check — and the agent has been sitting on a prompt for two of those three minutes. It asked a question. It hit a `y/n` confirmation. It generated an error and is waiting for direction. And it's just been sitting there, blocking itself, wasting time, because you didn't see it.

Multiply that by 6 running sessions and you're constantly losing 2–5 minute windows because you didn't know a session needed you.

This is what [Clide](/clide)'s **Concierge** system is designed to eliminate.

## What Concierge Does

Concierge is a monitoring layer that watches the output of your active AI sessions in real time. When it detects a pattern that indicates your attention is needed — a prompt, a question, an error, a task completion — it surfaces a **toast notification** on your desktop.

You don't have to be watching the session. You don't have to cycle through Fleet Panel every 30 seconds. Concierge watches for you and taps you on the shoulder when something needs a human decision.

The result: blocked sessions get unblocked faster. Your agents spend more time working and less time waiting. Your overall throughput improves without you having to stay glued to a terminal.

## Watch Mode vs Autopilot Mode

Concierge operates in two modes:

| Feature | Watch Mode | Autopilot Mode |
|---|---|---|
| **Pattern monitoring** | ✓ | ✓ |
| **Toast notifications** | ✓ | ✓ (with override) |
| **Auto-respond to prompts** | ✗ | ✓ (configured responses) |
| **Grace period before auto-response** | N/A | Configurable (default: 5s) |
| **Audit log of auto-responses** | N/A | ✓ |
| **Manual override** | Always available | Always available |
| **Best for** | Active sessions where you want to approve each decision | Batch jobs with predictable prompts |

**Watch Mode** is the default. Concierge alerts you, you respond. Your agency is fully preserved.

**Autopilot Mode** is for sessions where you've already decided how you want to handle predictable prompts — confirming file overwrites, accepting linting suggestions, proceeding through known checkpoints. Concierge auto-responds after the grace period and logs every action it took, so you can review what happened without having been present for it.

## Patterns Concierge Detects

Concierge works through **pattern matching on terminal output** — it scans the text stream coming from each session and triggers on configured patterns. The default pattern set covers the most common Claude Code and Copilot CLI prompts:

| Pattern | Trigger | Suggested Response |
|---|---|---|
| `proceed? (y/n)` | Proceed confirmation | Autopilot: `y`, Watch: notify |
| `Continue? [Y/n]` | Generic confirmation | Autopilot: configurable |
| `Error:` | Any error prefix | Always notify (no auto-respond) |
| `Context limit` | Context window warning | Always notify |
| `Task complete` | Agent finished | Notify (session → Done in Fleet) |
| `Permission denied` | Access error | Always notify |
| `Conflict:` | Merge/file conflict | Always notify |
| `What would you like to do?` | Open-ended prompt | Always notify |

You can customize this list — add patterns specific to your workflow, adjust which patterns trigger autopilot vs watch-mode notification, and configure per-session overrides.

## Configuration: Personas

One of Concierge's more useful features is **persona configuration**. Rather than configuring patterns per session each time, you define named personas — "aggressive autopilot," "careful reviewer," "batch processor" — and apply a persona when you spawn a session.

This means your typical fleet launch is: spawn collection → apply "morning sprint" persona to the work agents → apply "careful" persona to the review agent → start. Done.

Personas capture:
- Which patterns trigger autopilot vs notify
- The grace period before auto-response
- Whether to require confirmation on destructive actions (file deletes, overwrites)
- Notification sound and visual priority

## Real Patterns in a Typical Sprint

During a 90-minute coding sprint with 5 agents, here's what Concierge typically surfaces:

- **3–5 proceed confirmations** — agents checking before writing files or running commands
- **1–2 task completions** — agents finishing their assigned scope
- **0–1 errors** — usually a missing dependency or path issue
- **Occasional context limit warnings** — Claude Code approaching its context window

Without Concierge, you'd catch most of these on your next manual check-in, which might be 5–10 minutes after they occurred. With Concierge, you catch them within the notification toast display time — usually seconds.

The difference over a 90-minute session: probably 15–25 minutes of recovered agent work time, just from faster unblocking.

## Concierge vs Steward: The Distinction

These two features are related but serve different purposes:

**Concierge** is reactive — it monitors existing session output and surfaces events that need your attention. It's always-on. It watches.

**Steward** is proactive — it's a multi-step workflow orchestrator. You define a sequence of tasks, and Steward executes them, passing outputs between steps, managing state, and handling the coordination work that would otherwise require manual handoffs between sessions.

Think of it this way: Concierge is your notification system. Steward is your automation layer. They work together — Steward uses Concierge's pattern detection to know when a step has completed and the next one should begin.

## Setting Up Concierge

Concierge is enabled by default in Clide. Default patterns are active from first launch. The setup is zero.

To customize:
1. Open Clide → Settings (Ctrl+Shift+P → "Settings")
2. Navigate to **Concierge**
3. Configure pattern list, autopilot rules, grace periods
4. Create personas for different workflow types
5. Assign personas to sessions in Fleet Panel or set defaults per collection

If you want to run with defaults and never touch the settings, it just works. The default pattern set covers 90% of what Claude Code and Copilot CLI will throw at you.

## The Bigger Picture

Concierge is one piece of what makes Clide different from just running terminals in Windows Terminal or iTerm2. The underlying philosophy: **AI agents are asynchronous workers, and managing them requires async-aware tooling.**

A terminal emulator shows you one session's output at a time. It has no cross-session awareness. There's no notification system for agents blocked in background tabs.

Clide is built around the reality that you're running multiple agents and your job is to keep them unblocked, reviewing their output, and assigning the next task. Concierge handles the "alert me when something needs attention" layer so your focus stays on the review and direction work — the part that actually requires you.

---

[Download Clide at sg57.dev/clide](/clide) — free, Windows. Concierge, Fleet Panel, Steward, Monaco scratchpad, command palette, collection batch spawn. All of it.
