<img src="brand/logo-128.png" alt="Mailgi" width="72" height="72" />

# Mailgi — email infrastructure for AI agents

Source for **[www.mailgi.xyz](https://www.mailgi.xyz)**.

Mailgi gives an AI agent a real, deliverable email address — a genuine inbox
and outbox over a REST API, with DKIM, SPF and DMARC handled per domain. An
agent registers itself in one POST; no OAuth flow, no signup form, no browser.

## Why this exists

An AI agent needs an email address of its own. Email is the one identity every
service on the internet already accepts: to finish a signup the agent has to
receive a verification code, to hold a conversation people have to be able to
write back, and to be accountable its mail has to come from an address that is
not a human's.

The usual workarounds each fail somewhere:

- **A human's Gmail or Outlook** — the agent can read everything else in that
  mailbox and every message it sends is from that person. Shipping it to users
  means OAuth verification and an annual security assessment for restricted
  scopes.
- **A transactional send API** — excellent at sending; receiving is a webhook
  you host and store yourself, not a mailbox the agent can come back to.
- **A disposable inbox** — public, blocklisted by the sites worth signing up
  for, and gone tomorrow.
- **An agent-email product that needs a human to sign up first** — fine if a
  person is around; not if the agent has to set itself up.

Mailgi is the version where the program does it alone: one call returns an
address and a key, and the agent can receive and send straight away.

## The whole loop

```bash
# 1. Register — no auth, no signup form
RESP=$(curl -s -X POST https://api.mailgi.xyz/v1/agents/register \
  -H "Content-Type: application/json" -d '{"label":"my-agent"}')
EMAIL=$(echo "$RESP" | jq -r .emailAddress)   # e.g. buzzing-falcon@mailgi.xyz
KEY=$(echo "$RESP" | jq -r .apiKey)           # shown once — store it

# 2. Send (free between Mailgi addresses; give the mailbox a few seconds first)
sleep 3
curl -s -X POST https://api.mailgi.xyz/v1/mail/send \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"to\":[\"$EMAIL\"],\"subject\":\"Hi\",\"textBody\":\"Hello\"}"

# 3. Read the inbox
curl -s https://api.mailgi.xyz/v1/mail -H "Authorization: Bearer $KEY"
```

Also available as a [hosted MCP server](https://www.mailgi.xyz/mcp.html)
(`https://api.mailgi.xyz/mcp`) for Claude Code, Claude Desktop and Cursor, and
as a TypeScript SDK and CLI (`npm install @mailgi/mailgi`).

## Pricing and limits

No subscription. Receiving is free, and so is mail between your own agents and
custom domains. Mail that leaves Mailgi is paid from a prepaid balance:
**$0.0005 per external recipient**, plus **$0.02 once** the first time an agent
writes to an address that has never written to it, and $0.25 per GB-month of
storage above 10 MB per mailbox. Anyone can top up an agent by card at
<https://app.mailgi.xyz/topup>, no account needed.

Sending is rate-limited in layers (per API key, per agent, per organisation by
domain age). Every number is on the [pricing page](https://www.mailgi.xyz/pricing.html).

## Status — what is not built yet

Honest list, so nobody builds on a feature that isn't there:

- **No search.** List by folder and page; match messages yourself.
- **No threading headers.** Replies are new messages with `Re:` in the subject.
- **No attachments**, in either direction.
- **No WebSocket.** Poll, or register a signed webhook.
- **No SOC 2 report** and no dedicated IPs.

The [changelog](https://www.mailgi.xyz/changelog.html) lists what has shipped, with dates.

## For AI agents

If you are an agent (or driving one), start here — it is the whole API in
plain language, small enough to fit in any context window:

**<https://www.mailgi.xyz/SKILL.md>**

`https://www.mailgi.xyz/llms.txt` is the site-level summary for LLMs, and
`https://www.mailgi.xyz/llms-full.txt` is every page as one plain-text file.

## Links

| | |
|---|---|
| Website | <https://www.mailgi.xyz> |
| Guides | <https://www.mailgi.xyz/guides.html> — setup, verification codes, support inboxes, agent-to-agent, OpenAI Agents SDK, LangChain |
| Comparison | [Best email API for AI agents](https://www.mailgi.xyz/best-email-api-for-ai-agents.html) · [vs AgentMail](https://www.mailgi.xyz/agentmail-alternative.html) · [vs Resend, Postmark, Mailgun](https://www.mailgi.xyz/vs-resend-postmark-mailgun.html) |
| FAQ | <https://www.mailgi.xyz/faq.html> |
| Pricing | <https://www.mailgi.xyz/pricing.html> |
| Dashboard | <https://app.mailgi.xyz> — attach a domain, create inboxes, invite your team |
| API docs | <https://api.mailgi.xyz/docs> · [OpenAPI spec](https://api.mailgi.xyz/openapi.json) |
| SDK / CLI | [`@mailgi/mailgi`](https://www.npmjs.com/package/@mailgi/mailgi) on npm |
| Support | `hello@mailgi.xyz` — run on Mailgi itself, read by a human |

## Publishing the skill to ClawHub

`SKILL.md` is also published as the [`@oyagev/mailgi`](https://clawhub.ai/oyagev/skills/mailgi)
skill. ClawHub wants a folder named after the skill, but this file has to stay at
the repo root because agents fetch it from `https://www.mailgi.xyz/SKILL.md`. So
the folder is assembled at publish time and never committed — there is one
`SKILL.md` in git and nothing to drift.

```bash
npm i -g clawhub && clawhub login   # first time only
bin/publish-skill.sh --dry-run      # preview
bin/publish-skill.sh                # publish
```

Bump `version:` in the SKILL.md frontmatter first; the script publishes whatever
is declared there and refuses anything that isn't semver.

## Brand assets

`brand/` holds the logo and the two scripts that generate it. Both are
deterministic, so the mark can be regenerated at any size without drift:

```bash
python3 brand/genlogo.py   # logo.svg + logo-<n>.png, and favicon.svg's geometry
python3 brand/genog.py     # og.png, the 1200x630 social card
```

The mark is built from geometry rather than set as text, deliberately — a live
`<text>` element in a webfont silently renders a different letterform anywhere
the font is missing. The palette in `genog.py` is converted from the same oklch
values as `styles.css`, so the card cannot drift from the site.

## Editing the site

Plain HTML, no build step at deploy. A few scripts keep the files that must
agree with each other in agreement; run them before committing:

```bash
python3 bin/sync-chrome.py       # nav, footer, "Keep reading" from bin/chrome/ into every page
python3 bin/update-sitemap.py    # <lastmod> from each page's dateModified
python3 bin/build-llms-full.py   # llms-full.txt from the pages
python3 bin/check-site.py        # metadata, sitemap/llms.txt coverage, FAQ JSON-LD parity, links
bin/indexnow.sh                  # after deploy: tell Bing & co. what changed
```

## About this repository

Just the marketing site: hand-written static HTML, CSS and a little vanilla
JavaScript. No build step and no framework — deliberately, because AI crawlers
read raw HTML and don't execute JS, and being readable by them is the point.

Deployed to Railway on push to `main`.

The API, dashboard and infrastructure live in a separate private repository.
