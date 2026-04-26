---
title: "Text Easy BYOK Mode: Your AI Key, Your Data, Your Device"
description: "BYOK mode in Text Easy means your conversations go directly from your device to your AI provider — SG57 never sees them. Here's exactly how it works and how to set it up."
date: 2026-03-12
tags: ["text-easy", "privacy", "byok", "ai-tools"]
author: Cord Rehn
---

## What BYOK Actually Means

BYOK stands for **Bring Your Own Key**. In the context of [Text Easy](/text-easy), it means you provide your own API key from OpenAI or Anthropic, and Text Easy uses that key to make AI calls directly from your device — bypassing SG57's servers entirely.

That's not marketing language. It's a specific architectural choice with real, auditable consequences for your privacy.

When you use BYOK mode, the data path is:

```
Your device → AI provider API (OpenAI / Anthropic) → Your device
```

SG57 is not in that chain. Your messages don't touch our infrastructure. There's nothing to log because there's no server receiving the request.

## Why This Architecture Matters

Most AI-assisted apps — including many privacy-conscious ones — work like this:

```
Your device → App company's server → AI provider → App company's server → Your device
```

Your data touches their infrastructure at multiple points. It gets logged, possibly for debugging. It might be retained. The company's privacy policy governs what happens to it — and privacy policies can change.

BYOK mode exists because that architecture is unacceptable for certain use cases. If you're replying to client messages, handling legally sensitive communications, discussing financial matters, or simply value keeping your conversations private, the standard cloud relay architecture isn't good enough.

With BYOK, there's no policy to read, no retention schedule to worry about, no server to breach. The data doesn't go there.

## Exactly What Leaves Your Device

When you generate a reply in BYOK mode, Text Easy sends a single API call containing:

- The **incoming message** you're replying to
- Your selected **intent** (agree, decline, ask for clarification, etc.)
- Your selected **voice mode** (casual, formal, brief, warm)
- A **system prompt** defining your communication style preferences

This goes to your AI provider over HTTPS — the same encrypted connection your browser uses for banking.

### What Stays on Your Device

- Your **API key** — stored encrypted in device-local secure storage
- Your **voice preferences and style settings**
- Any **saved reply templates** you create
- The **messages themselves** — they are never forwarded to SG57

### What SG57 Never Sees

- The messages you're replying to
- The replies you generate
- Your API key
- Which contacts or threads you're managing
- Any metadata about your conversations

The only time anything touches SG57's infrastructure is if you explicitly opt into Cloud Mode.

## Setting Up BYOK Mode

Getting BYOK working takes roughly two minutes.

### Step 1: Get an API Key

**From OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create a free account
3. Navigate to **API Keys** → **Create new secret key**
4. Copy the key — it starts with `sk-...`

**From Anthropic:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **API Keys** → **Create Key**
4. Copy the key — it starts with `sk-ant-...`

Both providers offer free tiers or trial credits. You don't need a paid account to start.

### Step 2: Configure Text Easy

1. Open Text Easy
2. Go to **Settings → AI Provider**
3. Select OpenAI or Anthropic
4. Paste your key into the field
5. Tap **Save**

Text Easy validates the key against the live API before confirming. If the key is invalid or over its rate limit, you'll see a clear error. A working key shows a green confirmation and activates BYOK mode immediately.

That's it. Every reply generation from that point on goes directly to your provider.

## Common Questions

### "Is my API key safe stored in the app?"

Yes. Your key is stored using your device's native secure storage — iOS Keychain on Apple devices, EncryptedSharedPreferences backed by the Android Keystore on Android. These are hardware-backed encryption systems. Neither SG57 nor any third party can read your key without physical possession of your device and the capability to break your device's encryption.

### "What if I lose my phone?"

Revoke the key immediately from your provider's dashboard. OpenAI and Anthropic both support instant key revocation — it takes about 10 seconds. Once revoked, the key is dead even if someone has your device. Generate a new key, paste it into your replacement device, and you're back.

### "What will BYOK cost me?"

Very little for normal use. Here's the realistic math:

| Model | Approx. cost per reply |
|---|---|
| GPT-4o mini | ~$0.0002 |
| GPT-4o | ~$0.002 |
| Claude 3 Haiku | ~$0.0003 |
| Claude 3.5 Sonnet | ~$0.003 |

Someone generating 50 replies per day using GPT-4o mini spends roughly **$3/month**. Heavy users on flagship models might reach $15/month. Compare that to any AI subscription and BYOK almost certainly wins on cost, in addition to winning on privacy.

### "What about rate limits?"

Your API key has rate limits set by your provider. Free tiers are more constrained — OpenAI free tier caps at 3 requests per minute. Paid tiers are very generous (e.g., OpenAI Tier 1 allows 500 RPM). For normal Text Easy usage — replying to messages throughout the day — a paid tier will never throttle you.

### "Does BYOK work offline?"

No. BYOK still requires an internet connection to hit the AI provider API. Text Easy doesn't run a local model. If you need offline functionality, that's not something either BYOK or Cloud Mode can deliver with current model sizes.

## BYOK vs Cloud Mode: Full Comparison

| | BYOK Mode | Cloud Mode |
|---|---|---|
| **Data path** | Device → AI provider direct | Device → SG57 → AI provider |
| **SG57 sees your messages** | Never | Yes |
| **Setup required** | API key (~2 min) | None |
| **Monthly cost** | ~$2–15 depending on volume | Included |
| **Key management** | You own and control it | Not applicable |
| **Instant revocation** | Yes (provider dashboard) | N/A |
| **Works with OpenAI** | Yes | Yes (auto-selected) |
| **Works with Anthropic** | Yes | Yes (auto-selected) |
| **Recommended for** | Business, sensitive, developer use | Casual personal messages |

## Who Should Use BYOK Mode

**BYOK is the right choice if:**
- You reply to client or business messages on your phone
- You handle legally, professionally, or personally sensitive conversations
- You work in healthcare, legal, finance, or any field where data handling matters
- You're a developer who understands API keys and prefers control over convenience
- You want a verifiable privacy guarantee, not just a promise in a privacy policy

**Cloud Mode is appropriate if:**
- You're replying to casual personal messages (friends, family, group chats)
- You'd rather not think about API keys
- You're evaluating Text Easy before deciding whether BYOK is worth the setup

The architecture is a genuine choice, not a tiered feature gate. BYOK mode exists because we built this tool for people who think carefully about data. If that's you — and if you're replying to anything remotely sensitive on your phone — it's the right default.

---

[Download Text Easy at sg57.dev/text-easy](/text-easy) and set up BYOK mode in under two minutes. Your conversations are yours.
