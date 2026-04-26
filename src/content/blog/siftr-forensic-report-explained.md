---
title: "Siftr's Forensic Report: 6-Pass Analysis That Replaces Hours of Log Reading"
description: "Siftr's Forensic Report runs a 6-pass analysis on any log file — time segmentation, error spike detection, message clustering, component health, lifecycle events, and synthesis."
date: 2026-04-18
tags: ["siftr", "deep-dive", "log-analysis", "debugging"]
author: Cord Rehn
---

## The 3am Scenario

It's 8am and you're looking at an alert that fired at 3:17am. Your IIS app pool recycled unexpectedly. There were errors. The on-call engineer restarted the service and it came back up, but nobody knows why it went down.

You have a 200MB log file covering the last 24 hours. The incident is in there somewhere.

You could open it in Notepad++, wait for it to load, Ctrl+F for "error," scroll through 14,000 error matches, try to piece together a timeline manually. That's an hour. Maybe two. And you might still miss the root cause if it's buried in an unusual message pattern you didn't think to search for.

Or you could run [Siftr](/siftr)'s Forensic Report.

## What the Forensic Report Is

The Forensic Report is a structured, automated analysis that runs six sequential passes over your log file, each designed to answer a different question about what happened. It synthesizes the results into an actionable summary.

Index time for a 200MB file in Siftr: under 4 seconds. Time to generate a Forensic Report: under 30 seconds. Total time from "I have a 200MB log file" to "here is what happened, when, and why" — less than a minute.

Here's what each pass does.

---

## Pass 1: Time Segmentation

**What it does:** Divides the log into time buckets (typically 5 or 15-minute windows depending on log density) and shows the distribution of log activity across the full timeline.

**What it answers:** When was the system most active? When was it quiet? Are there obvious activity anomalies?

**What you see:** A timeline view showing log volume per time bucket. Spikes are immediately visible. Gaps — times when the system produced unusually few log lines — are also surfaced. Gaps in production service logs are often as interesting as spikes.

**Example finding:** "Log activity drops to zero between 3:12am and 3:19am — consistent with an application restart or crash."

---

## Pass 2: Error Spike Detection

**What it does:** Calculates the baseline error rate across the log, then identifies time windows where the error rate was statistically elevated above baseline.

**What it answers:** When did errors increase? Was the 3am incident a sudden spike or a gradual accumulation?

**What you see:** Error rate overlaid on the timeline from Pass 1. Spike windows are highlighted. The magnitude of each spike (errors per minute vs baseline) is shown.

**Example finding:** "Error rate spiked to 47x baseline at 3:14am, sustained for 4 minutes, then dropped abruptly at 3:18am — consistent with a crash rather than a gradual degradation."

---

## Pass 3: Message Clustering

**What it does:** Groups log messages by similarity, using text analysis to identify recurring message patterns. Rather than showing you 14,000 individual lines, it groups them into clusters and shows the cluster frequency.

**What it answers:** What are the most common log messages? What's signal vs noise? Are there rare messages that appeared only during the incident window?

**What you see:** A ranked list of message clusters, each with: the message template, occurrence count, first/last occurrence time, and whether it spiked during the incident window.

**Example finding:** "Cluster: 'Object reference not set to an instance of an object in DataLayer.UserRepository' — 1,247 occurrences total, 1,244 occurred in the 4-minute incident window at 3:14–3:18am."

That's your root cause lead.

---

## Pass 4: Component Health

**What it does:** Maps log messages to named components (parsed from log4net logger names, namespace prefixes, or configurable patterns) and shows per-component error rates across the timeline.

**What it answers:** Which part of the application was unhealthy? Was the failure isolated to one component or system-wide?

**What you see:** A component grid showing each identified component's error rate over time. Healthy components show a flat baseline. The affected component lights up at the incident window.

**Example finding:** "DataLayer.UserRepository: error rate 0.02/min baseline → 847/min at 3:14am. All other components: normal. Failure was isolated to the data layer."

---

## Pass 5: Lifecycle Events

**What it does:** Scans for application lifecycle signatures — startup messages, shutdown sequences, recycle notifications, worker process events, health check patterns — and constructs an application lifecycle timeline.

**What it answers:** When did the application start, stop, recycle, or crash? Is the 3am event a crash or a scheduled recycle?

**What you see:** A lifecycle event timeline showing each detected event: startup, shutdown (clean vs abrupt), recycle, worker process spawn/exit.

**Example finding:** "Worker process exit (abrupt) at 3:17am — no graceful shutdown sequence detected. Followed by IIS spawn of new worker process at 3:19am. This is a crash, not a scheduled recycle."

---

## Pass 6: Synthesis

**What it does:** Takes the findings from Passes 1–5 and generates a human-readable summary: what happened, when it happened, what the likely cause is, and what log evidence supports that conclusion.

**What it answers:** The whole thing. The report you'd write after an hour of manual analysis, generated in 30 seconds.

**Example synthesis:**

> *The application experienced an unexpected crash at approximately 3:14am, following an error spike in the DataLayer.UserRepository component. The most frequent error during the incident window — 'Object reference not set to an instance of an object in DataLayer.UserRepository' — accounts for 1,244 of 1,247 occurrences in the dataset. The worker process exited abruptly at 3:17am without a graceful shutdown sequence. The IIS worker process respawned at 3:19am. No similar error pattern is present in the preceding 18 hours. Recommended investigation: DataLayer.UserRepository, specifically null handling in the UserRepository data access path.*

That's a root cause hypothesis, evidence summary, and next-step recommendation — derived from a 200MB log file without a human reading a single line.

## Manual vs Forensic Report: Time Comparison

| Task | Manual Analysis | Forensic Report |
|---|---|---|
| Open and load 200MB file | 2–5 minutes | 4 seconds |
| Identify error spike time window | 10–30 minutes (Ctrl+F, scroll) | Pass 2: automated |
| Find most common error messages | 15–40 minutes | Pass 3: automated |
| Determine which component failed | 10–20 minutes | Pass 4: automated |
| Identify crash vs recycle | 5–15 minutes | Pass 5: automated |
| Write incident summary | 10–20 minutes | Pass 6: automated |
| **Total** | **52–130 minutes** | **< 1 minute** |

This isn't a contrived scenario. Engineers spend real hours on this analysis every time there's an incident. The Forensic Report doesn't replace your judgment — it does the groundwork so you can apply your judgment to findings, not search.

## Supported Log Formats

Forensic Report works with any structured log format. Out of the box:

- **log4net** — full pattern support including logger name, level, message, exception
- **NLog** — standard layout patterns
- **Serilog JSON** — structured JSON log output
- **IIS access logs** — W3C and combined formats
- **Generic timestamped logs** — any format with a parseable timestamp prefix

---

[Download Siftr at sg57.dev/siftr](/siftr) — free, open-source, Windows desktop app. Indexes 200MB in under 4 seconds. Built because manual log analysis is one of the most time-consuming things engineers do and most of it is automatable.
