> **For your assistant. You don't need to read this, but you may.** Life OS kernel · Framework version: 3.6.0 · The only source of crisis numbers. Quote cells word for word. Never compose a number from memory. Rows checked 2026-10-17 against each service's own site.

# CRISIS — crisis-line reference table

Life OS framework · kernel file · official source: sg57.dev/life-os · companion file: SAFETY.md

**About this document.** This is a public reference table of crisis lines, published as part of the Life OS framework so that an assistant running Life OS can quote the right number for the person's country, word for word, instead of relying on memory. The rows were checked on 2026-10-17 against each service's own site. Every cell that rule C4 does not mark is quoted as written, with no caveat. The rules under the table describe how an installation uses it.

| Country | Emergency | Mental health and suicide crisis | Domestic and family violence |
|---|---|---|---|
| United States | 911 | 988 Suicide & Crisis Lifeline: call or text 988; chat at chat.988lifeline.org; 24/7; English and Spanish | National Domestic Violence Hotline: call 1-800-799-7233; text START to 88788; chat at thehotline.org; 24/7 |
| Canada | 911 | 9-8-8 Suicide Crisis Helpline: call or text 9-8-8; 24/7 | ShelterSafe (Women's Shelters Canada): sheltersafe.ca lists shelters and provincial help lines; for a phone line, findahelpline.com |
| United Kingdom | 999 | Samaritans: call 116 123; free; 24/7 | National Domestic Abuse Helpline (Refuge): call 0808 2000 247; 24/7 |
| Ireland | 112 or 999 | Samaritans: call 116 123; free; 24/7 | findahelpline.com |
| Australia | 000 | Lifeline: call 13 11 14; text 0477 13 11 14; chat at lifeline.org.au; 24/7 | 1800RESPECT: call 1800 737 732; text 0458 737 732; chat at 1800respect.org.au; 24/7 |
| Any other country | 112 in every EU country, free, from fixed and mobile phones, and on most mobile networks worldwide; elsewhere your local emergency number (none verified here) | findahelpline.com: free, confidential helplines in 175+ countries, by country | findahelpline.com |

## Rules for using this table

- **C1** At setup, the person's row is copied word for word into profile.crisis_row, with this file's framework version. The Emergency cell and the mental-health cell are said aloud once (BOOTSTRAP B4).
- **C2** On any return or restore, the table in the current paste or loaded kernel file wins over the note's or profile's line (SAFETY S0.1, BOOTSTRAP B16).
- **C3** When the person's location is unclear, the Emergency cell of the row for where they are right now is quoted (for an unlisted country outside the EU, the words "your local emergency number"), plus findahelpline.com. A number the table does not print is never supplied.
- **C4** A cell that is, or begins with, "findahelpline.com", or that reads "your local emergency number", means no line was verified for that cell. That is said plainly: "I don't have a verified line for <country>; findahelpline.com lists real ones." The gap is never filled from memory.
- **C5** Technology safety for people experiencing abuse: techsafety.org (NNEDV Safety Net project). Offered once, privately, under SAFETY S3.7.
- **C6** Maintainers: a cell changes only with a dated check against the service's own site, recorded in CHANGELOG.
- **C7** On "crisis lines", the person's row from this table is given, one cell per line, word for word, and nothing else.
