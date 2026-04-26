---
title: "SG57 Labs in 2025–2026: Two Apps, One Website, and a Lot of Shipping"
description: "A look back at what SG57 Labs shipped in 2025–2026: Clide, Siftr, Text Easy, the Staples & Statements brand build, and the sg57.dev redesign. From Cord Rehn."
date: 2026-04-22
tags: ["sg57", "announcement", "retrospective"]
author: Cord Rehn
---

## We Shipped Things

I've spent most of my career building things for other people — client codebases, agency projects, consulting work. Good work. Work I'm proud of. But the nature of that work is that it mostly lives inside someone else's GitHub organization, behind someone else's brand, tied to someone else's roadmap.

The past 18 months have been different. This is a look back at what SG57 Labs shipped, what it felt like to build three products simultaneously while doing client work, and what's next.

---

## What Shipped

### Clide

[Clide](/clide) started as a genuine frustration. I was running multiple Claude Code sessions across different projects and managing them through Windows Terminal tabs. The problem: tabs hide state. You have no idea which sessions need your attention without clicking into each one.

I wanted a dashboard. Something that would tell me which sessions were active, blocked, or done — without requiring me to context-switch into each one manually.

Clide is that dashboard. Fleet Panel shows you the status of every AI session at a glance. Concierge monitors session output and sends you desktop notifications when agents are blocked. Steward handles multi-step workflow orchestration. There's a built-in Monaco scratchpad. Session naming uses the NATO phonetic alphabet so you can talk about sessions without saying "the fourth tab."

It's a **free Windows desktop app**. No subscription. No usage limits. It runs your AI coding session fleet the way mission control runs a satellite array — persistent visibility, low cognitive overhead, notifications for the things that matter.

The Electron-based architecture was the right call. Native desktop app behavior, full OS integration, Monaco editor without the browser overhead. The hard parts were the session state machine (tracking transitions between active/idle/blocked/done accurately) and the Concierge pattern matching (getting the regex triggers right without false positives).

### Siftr

[Siftr](/siftr) was built to scratch my own itch. I debug .NET applications for clients, and the log files are large. 200MB is not unusual. Opening those in Notepad++ meant watching the editor freeze for 30–60 seconds. Searching them meant waiting 5–10 seconds per Ctrl+F query.

I needed a log viewer that was fast at scale. I built one.

Siftr indexes a 200MB file in under 4 seconds, with a background worker thread so the UI stays responsive during indexing. Virtual scrolling keeps the DOM lean — never more than ~100 nodes regardless of file size. The heatmap scrollbar shows where errors cluster. F8 navigates directly to the next error. The Forensic Report runs a 6-pass automated analysis and synthesizes findings into a human-readable incident summary.

It's free and open-source. The log4net support is first-class because that's what I needed, but the format parser is extensible.

The hardest part technically was the virtual scrolling implementation — getting row heights to calculate correctly while maintaining smooth scrolling behavior took longer than I'd like to admit. The Forensic Report synthesis pass — generating the natural-language summary from structured analysis results — was the most satisfying part to build.

### Text Easy

[Text Easy](/text-easy) came from a different kind of frustration. Mobile typing is terrible and I kept falling back on terse, barely-adequate replies when what I actually wanted to say was longer and more considered.

Text Easy is a mobile app that generates SMS replies in your voice. You select intent (agree, decline, reschedule, clarify), choose a voice mode (casual, formal, brief), and it generates reply options that actually sound like you — not a generic AI assistant.

The BYOK (Bring Your Own Key) architecture was a design requirement, not an afterthought. For any conversation that's even remotely sensitive, you shouldn't need to trust a third party's server with your message content. BYOK routes calls from your device directly to OpenAI or Anthropic — SG57's servers are never in the data path.

Cloud Mode exists too, for users who want zero setup friction and don't have those privacy requirements.

The voice matching system — getting the generated replies to actually feel like the user wrote them rather than feeling like an AI wrote them — was the core UX challenge. The answer turned out to be the combination of explicit intent selection, voice mode, and refinement loops. Users steer the output rather than trying to prompt it from scratch.

### Staples & Statements

The first client project built under the SG57 Labs services umbrella. Danielle is a wardrobe stylist with a decade of expertise and nothing online to show for it. We built her brand from zero: logo, color palette, typography, custom website, SEO, Calendly integration, social media templates, professional email.

The result that keeps standing out: the Calendly integration now books **an average of 2 new paying clients per week** through the site, with no manual coordination from Danielle. That's a real outcome from a one-time investment. The math on that compounding over a year is compelling.

The Staples & Statements case study proved that the services model works — there's real demand for this kind of end-to-end brand build for service businesses, and the results are measurable.

Visit the site at [staplesandstatements.com](https://staplesandstatements.com).

### sg57.dev

The studio site itself got a proper overhaul. Design system. Real branding. Product pages that actually explain what the products do. Blog infrastructure for content like this.

Building your own site last is a rite of passage for any developer who does client work. The cobbler's shoes problem. It's done now.

---

## What Shipped Summary

| Product | Type | Status | Where |
|---|---|---|---|
| Clide | Windows desktop app | Live, free | [sg57.dev/clide](/clide) |
| Siftr | Windows desktop app | Live, free, open-source | [sg57.dev/siftr](/siftr) |
| Text Easy | Mobile app | Live, free | [sg57.dev/text-easy](/text-easy) |
| Staples & Statements | Client brand build | Live | [staplesandstatements.com](https://staplesandstatements.com) |
| sg57.dev | Studio site | Live | Here |

---

## On Building Three Products While Doing Client Work

The honest version: it's a lot. There were weeks where client work compressed everything else to evenings and weekends. There were stretches where I'd be in deep focus on Siftr's virtual scrolling implementation at 11pm knowing I had a client kickoff call at 9am.

The thing that made it sustainable was the same thing I've told clients for years: clear scope, clear boundaries, work in focused blocks. The products got better because I was also doing client work — real problems, real constraints, real feedback loops. The client work got more interesting because I was constantly building internal tools that fed ideas back into the products.

The case against doing it this way is obvious: you spread yourself thin, shipping velocity on each individual thing is slower than if you were focused on it full-time. The case for it is: you build things that reflect how software actually gets used, by a person who uses it.

I want to make things that exist after the engagement ends. Consulting work is important and I value it, but the work product lives on the client's side. Products are different. Clide exists. Siftr exists. Text Easy exists. Someone is using them right now. That's a different kind of accountability and a different kind of satisfaction.

---

## What's Next

**Siftr:** General availability launch with a broader marketing push. More format support (more structured JSON log providers, cloud logging formats). Potential for a team/server-side log analysis feature.

**Clide v2:** Steward improvements — better workflow orchestration, more complex step sequencing, improved output parsing. Possibly a collection sharing mechanism so teams can share fleet configurations.

**Text Easy:** More intent types, better voice configuration, Android release refinements.

**Services:** More clients like Staples & Statements. The model is proven. Service businesses with real expertise and zero web presence are the right fit.

---

Thanks for being here. If you use any of the products and have feedback, I want to hear it. And if you're a service business owner who's been putting off building your web presence — [let's talk](/services).
