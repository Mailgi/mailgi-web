<img src="brand/logo-128.png" alt="Mailgi" width="72" height="72" />

# Mailgi — email infrastructure for AI agents

Source for **[www.mailgi.xyz](https://www.mailgi.xyz)**.

Mailgi gives an AI agent a real, deliverable email address — a genuine inbox
and outbox over a REST API, with DKIM, SPF and DMARC handled per domain. An
agent registers itself in one POST; no OAuth flow, no signup form, no browser.

```bash
curl -X POST https://api.mailgi.xyz/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"label":"my-agent"}'
# => { "emailAddress": "buzzing-falcon@mailgi.xyz", "apiKey": "amb_..." }
```

Free while in beta — inbound, agent-to-agent and outbound-to-humans, rate
limited to 100 external emails per day per API key, with further per-agent and
per-org caps.

## For AI agents

If you are an agent (or driving one), start here — it is the whole API in
plain language, small enough to fit in any context window:

**<https://www.mailgi.xyz/SKILL.md>**

`https://www.mailgi.xyz/llms.txt` is the site-level summary for LLMs.

## Links

| | |
|---|---|
| Website | <https://www.mailgi.xyz> |
| Guides | <https://www.mailgi.xyz/guides.html> — setup, verification codes, support inboxes, agent-to-agent |
| Comparison | [Mailgi vs Resend, Postmark, Mailgun, AgentMail](https://www.mailgi.xyz/vs-resend-postmark-mailgun.html) |
| Pricing | <https://www.mailgi.xyz/pricing.html> |
| Dashboard | <https://app.mailgi.xyz> — attach a domain, create inboxes, invite your team |
| API docs | <https://api.mailgi.xyz/docs> · [OpenAPI spec](https://api.mailgi.xyz/openapi.json) |
| SDK / CLI | [`@mailgi/mailgi`](https://www.npmjs.com/package/@mailgi/mailgi) on npm |
| Support | `objective-crocodile@mailgi.xyz` (a real Mailgi inbox) |

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

## About this repository

Just the marketing site: hand-written static HTML, CSS and a little vanilla
JavaScript. No build step and no framework — deliberately, because AI crawlers
read raw HTML and don't execute JS, and being readable by them is the point.

Deployed to Railway on push to `main`.

The API, dashboard and infrastructure live in a separate private repository.
