---
title: "Introducing Siftr — 200MB Log Files in 3 Seconds"
description: "When your IIS crashes and leaves you a 180MB log file, you need Siftr."
date: 2026-02-19
tags: ["siftr", "announcement", "log-analysis"]
---

It's 2 AM. Your IIS application pool just recycled unexpectedly, and the log file it left behind is 180MB of log4net output. You open it in klogg -- it freezes. You try Notepad++ -- it allocates a gigabyte of RAM and crawls. You resort to PowerShell `Select-String` and scroll through thousands of lines of raw text looking for the needle. There has to be a better way.

**Siftr** is a high-performance log viewer built specifically for this scenario. It indexes a 200MB file in under 4 seconds using worker threads with 1MB chunked reads, builds a complete line-offset and entry-boundary map, and presents the entire file through a virtual scrolling renderer that never holds more than 100 DOM nodes regardless of file size. Memory stays under 100MB for a 200MB file. Scrolling stays at 60fps. The file is opened read-only with full share permissions, so it never locks active log files.

Beyond raw performance, Siftr gives you tools that text editors cannot. A heatmap scrollbar shows the density and distribution of errors and warnings across the entire file at a glance. Error navigation (F8/Shift+F8) jumps between error entries instantly. Regex search runs in a background worker with live results streaming. Level filters let you toggle DEBUG, INFO, WARN, ERROR, and FATAL visibility with a single click. And the **Forensic Report** -- a six-pass analysis engine -- automatically segments your log into time periods, detects error spikes, clusters repeated messages, maps component health, identifies application lifecycle events, and synthesizes findings into an actionable report. It turns hours of manual log reading into minutes.

Siftr supports log4net format with auto-detection, drag-and-drop file opening, multi-file support with log chain detection, session persistence across restarts, and a dark-mode-default ALTIMIT-inspired interface. It's free, open-source, and built for the .NET/IIS ecosystem. Download it at [sg57.dev/siftr](/siftr).
