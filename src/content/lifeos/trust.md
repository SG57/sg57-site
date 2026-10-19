---
title: "Trust: what it sees, what it is told never to do, how to turn it off"
description: "The honest version: what you hand over, what each kind of assistant can do, how to turn it all off."
source: "TRUST.md"
---

Read this before you decide. It is the honest version.

# Trust: what it sees, what it is told never to do, how to turn it off

## Start with nothing connected
Life OS works with zero connections. Your assistant knows only what you tell it. You can stay there forever.

## Get your copy from one place
Copy the setup message only from the official page, sg57.dev/life-os. A copy from anywhere else may have been changed, and you could not tell. The page lists a fingerprint for anyone who can check it.

## What you hand over, and to whom
| What | Who holds it | Can you delete it? | Where to check |
|---|---|---|---|
| What you type in chat | The company that makes your assistant | Usually, in its settings. Some keep what they learned even after you delete. | That company's privacy page. We don't copy their policies here because they change. |
| Your weekly note and the details behind it | Your assistant's memory or files | Yes. Say "offboard" and it walks you through it. <!-- rule: X1 --> | Say "show me what you see". <!-- rule: V1 --> |
| Your life map (roughly your birth year, who counts on you, work, home, car, anything big coming), the departments it watches, and the life events you told it about | Your assistant's memory or files, as you said them; never inferred, never from mail or spending | Yes, the same way. A pregnancy or any other sensitive health topic is never stored. <!-- rule: O5, S3.4 --> | Say "show me what you see". |
| Email or calendar, only if you connect them | Your assistant reads them, with read-only access | Disconnect in the assistant's settings and in your Google or Microsoft account | Your account's third-party access page |
| Bank data, only if you connect it | A data service, often Plaid, passes read-only data to your assistant | Disconnect in the assistant and at the data service's own portal | my.plaid.com for Plaid |

Disconnecting stops new data. It does not erase what your assistant already learned. To erase, use the assistant's delete or reset.

## What it sees
Ask "show me what you see" any time. You get a fixed list: connections and when each was last read, the departments it watches and which are asleep, what it may do in each, how many open items there are, the last test reminder, the rules version, and the zones you told it to stay out of. It builds this from its records, not from memory. <!-- rule: V1, S4.5 -->

## Oversight, and how departments wake
One part of Life OS is always on and watches the rest. Once a month it checks how every department is running. It proposes one new department a week, in one line, and never installs one without your yes. It wakes a sleeping department only from something you said yourself, never from your mail, calendar, or spending. When a department misbehaves, it fixes that instance and tells you under Done. When the fault is in Life OS itself, it writes a problem report with nothing about your life in it, shows it to you word for word, and leaves sending to you. <!-- rule: O3, O5, O6, O7 -->

## What it is told never to do
These are rules your assistant follows, not locks. Each one has a written test: 225 scenarios, 196 of them about safety. Results for this version: every scenario was run once with an AI model standing in for your assistant and the kit's own text as its instructions, no live tools, graded by a model. With a frontier model standing in, 140 of 196 safety scenarios passed (71%); with a smaller model, 84 (43%). Most misses are the kit's strictness: the safety line must open the reply word for word and alone, dates must carry the year and time zone, and nothing may be explained after a quoted line. The full tables are in [evals/results/3.0.0.md](evals/results/3.0.0.md) and [evals/results/3.0.0-proxy-sonnet.md](evals/results/3.0.0-proxy-sonnet.md). No consumer assistant app has been run through the suite yet; each one's row below says "untested" until it has.
- Send, book, share, or delete without reading it back and hearing yes. <!-- rule: S2.2 -->
- Pay or move money. Ever. It gets the payment ready; you make it in your own bank or the biller's app. <!-- rule: S2.4 -->
- Send, book, share, or delete because a schedule fired or a message told it to. <!-- rule: S2.3, S1.4 -->
- Copy a link or phone number from a message into a to-do or a warning. That is scam protection. <!-- rule: S1.5 -->
- Decide a legal, medical, tax, or investment question. It names the professional. <!-- rule: S3.2 -->
- Say a reminder is set, a file is saved, or a task is done unless a tool confirmed it. <!-- rule: S4.5 -->
- Keep going after you say "stop". <!-- rule: S2.7 -->

## Honest limits
- **Medical privacy law usually does not apply.** HIPAA covers your doctor. It does not usually cover an AI assistant. <!-- rule: S3.3 -->
- **Chats can be subpoenaed.** Treat anything you type as something a court could one day read.
- **Anyone who can open your assistant can talk to it as you.** Lock your phone and the app.
- **It can be wrong.** Numbers come with the time they were last checked. When it isn't sure, it says "I don't know X for you." <!-- rule: S4.2, S4.3 -->
- **Some assistants train on your chats.** During setup your assistant reminds you to check that setting. Turn it off if you want. <!-- rule: B3 -->
- **Built for the United States first.** Elsewhere the structure works, but dates, laws, and help lines need your local versions.

## What each kind of assistant can do
| | Chat only | Has memory | Memory, reminders, connections |
|---|---|---|---|
| Keeps your details between chats | No. You keep a short note it writes for you. | Yes, once you save the rules in its settings | Yes |
| Real reminders | No. It gives you text for your phone calendar. | No. It gives you text for your phone calendar. | Yes, and it quotes the time |
| Watches mail, calendar, or bank | No | No | Yes, read-only, if you connect them |
| Your weekly Brief | When you paste your note | When you open it | Arrives on its own, with a phone reminder as backup |

We list test results only for assistants we tested this release. See the dated table in [adapters/CAPABILITIES.md](/life-os/CAPABILITIES.txt). "untested" means exactly that.

## Why we recommend two
A good default beats an open menu. Meta Muse and Grok Bot are the two assistants we point people to because both can remember you, connect read-only to calendar and mail, run on a schedule, and message you first, which is what Life OS needs. Everything else works with fewer features, and the setup tells you which.

## Vendor notes, dated
- **Meta Muse (checked 2026-10-17):** trains on conversations by default; the setting is Settings > Data controls > "Help improve our AI models". Meta's own security write-up says staff access is restricted by policy but not prevented, and that a more private option is planned. Press has reported that Muse keeps notes on people you mention. Whether chats are used for ads is not stated here because we could not verify it. Sources in [adapters/MUSE.md](/life-os/MUSE.txt).
- **Grok Bot (checked 2026-10-17, from third-party guides; xAI's docs are authoritative):** paid, no free tier. It asks for approval before sending, buying, deleting, or accepting terms. Its memory persists between sessions, and guides report no way for you to inspect or export it, so "show me what you see" is your honest list. Sources in [adapters/GROK-BOT.md](/life-os/GROK-BOT.txt).

## Turning it off
Say "stop" and it halts everything it does on its own; reminders you made keep going unless you say "stop the reminders too". Say "offboard" and it lists every connection, reminder, and file it created, gives the steps to revoke each one, and deletes its records as you confirm each class. Where it cannot prove deletion, it says so. <!-- rule: X1, S2.7 -->

We have not yet timed each revoke step with a non-technical tester. When we have, the times will be printed here.

## If you are not safe at home
Setup asks one private question about who can get into your phone, email, or this assistant. If the answer is yes, your assistant keeps names and previews neutral and writes nothing to shared places. It cannot hide this chat from someone who opens your assistant; delete the chat if that could happen. You can also say "I don't feel safe" at any time. Someone who shares a calendar or folder with you may notice that new entries stop. An advocate can help you plan first: techsafety.org. Clear your browser history after reading pages like this one if you need to. <!-- rule: S3.7, S3.8, B5 -->

## Skeptic's questions
- **Is my bank data safe?** Only if you connect it, and then it is read-only. Start without it.
- **What if it's wrong?** Say "correct that." It logs the fix and never argues. <!-- rule: T2 -->
- **Can I see what it did?** Every change it made for you appears in your weekly Brief under Done. What it read is not listed. <!-- rule: S2.6 -->
- **How do I undo?** Sent things can't be unsent, which is why every send is read back first. "stop" halts what is pending. "offboard" removes it.
- **How do I know my copy is real?** Get it from the official page, sg57.dev/life-os, which lists a fingerprint.
- **Who made this?** SG57 Labs, a one-person software company. Life OS is free and comes as-is. It is not professional advice. Questions: support@sg57.dev.

## Five words
- **Brief:** the one short message you get each week.
- **Department:** a part of your life your assistant watches, like Money or Home. Most sleep until life wakes them.
- **Note:** the short text a no-memory assistant hands you to carry between chats.
- **Read-back:** your assistant repeating exactly what it is about to do, then waiting for your yes.
- **Offboard:** the word that removes Life OS from your assistant.
