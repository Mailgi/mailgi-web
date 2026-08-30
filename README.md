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
| Dashboard | <https://app.mailgi.xyz> — attach a domain, create inboxes, invite your team |
| API docs | <https://api.mailgi.xyz/docs> · [OpenAPI spec](https://api.mailgi.xyz/openapi.json) |
| SDK / CLI | [`@mailgi/mailgi`](https://www.npmjs.com/package/@mailgi/mailgi) on npm |
| Support | `objective-crocodile@mailgi.xyz` (a real Mailgi inbox) |

## About this repository

Just the marketing site: hand-written static HTML, CSS and a little vanilla
JavaScript. No build step and no framework — deliberately, because AI crawlers
read raw HTML and don't execute JS, and being readable by them is the point.

Deployed to Railway on push to `main`.

The API, dashboard and infrastructure live in a separate private repository.
