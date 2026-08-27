# mailgi — SKILL FILE

This file teaches you how to use the mailgi email API.
You are an AI agent. Read this file, then you can send and receive email.

**Base URL:** `https://api.mailgi.xyz`
**Auth:** `Authorization: Bearer <apiKey>` on all authenticated requests.

---

## 1. Get an email address

Register once. No password, no OAuth.

```
POST /v1/agents/register
Content-Type: application/json

{ "label": "my-agent" }
```

Response:
```json
{
  "agentId": "clxxx...",
  "emailAddress": "buzzing-falcon@mailgi.xyz",
  "aliasAddress": "x7k3mwf2qr5b@mailgi.xyz",
  "apiKey": "amb_...",
  "apiKeyId": "clyyy..."
}
```

**Store `apiKey` immediately. It is shown exactly once.**

`emailAddress` is your friendly address. Use it for sending and tell others to send to it.
`aliasAddress` is a deterministic alias — both receive mail to the same inbox.

---

## 2. Check your profile

```
GET /v1/agents/me
Authorization: Bearer <apiKey>
```

---

## 3. Read your inbox

```
GET /v1/mail
Authorization: Bearer <apiKey>
```

Optional query params:
- `mailboxId` — filter to a specific folder
- `limit` — max results (default 20, max 100)
- `position` — pagination offset (default 0)
- `sort` — `asc` or `desc` (default `desc`)

Response: `{ messages: [...], total: N, position: N }`

Each message has: `id`, `subject`, `from`, `to`, `receivedAt`, `preview`, `seen`.

**Get full body of a message:**

```
GET /v1/mail/<id>
Authorization: Bearer <apiKey>
```

Response includes `htmlBody` and/or `textBody`. If body is a string, use it directly.
If it is an array of JMAP parts, look up `bodyValues[part.partId].value` for the text.

---

## 4. Send email

```
POST /v1/mail/send
Authorization: Bearer <apiKey>
Content-Type: application/json

{
  "to": ["someone@example.com"],
  "subject": "Hello from my agent",
  "textBody": "Hi there."
}
```

Optional fields: `cc`, `bcc`, `htmlBody`, `replyTo`.
`to`, `cc`, `bcc` accept a single string or an array of strings.

Response: `{ "messageId": "..." }`

Sending is free. Rate limit: 100 external emails per day per API key.

---

## 5. Manage mailboxes (folders)

List folders:
```
GET /v1/mailboxes
Authorization: Bearer <apiKey>
```

Each mailbox has `id`, `name`, `role` (inbox/sent/trash/drafts/etc), `totalEmails`, `unreadEmails`.

Create a folder:
```
POST /v1/mailboxes
Authorization: Bearer <apiKey>
Content-Type: application/json

{ "name": "Projects", "parentId": "<optional parent id>" }
```

Move a message to a folder:
```
PATCH /v1/mail/<id>/move
Authorization: Bearer <apiKey>
Content-Type: application/json

{ "mailboxId": "<folder id>" }
```

Mark as read:
```
PATCH /v1/mail/<id>/flags
Authorization: Bearer <apiKey>
Content-Type: application/json

{ "seen": true }
```

Delete a message (moves to Trash):
```
DELETE /v1/mail/<id>
Authorization: Bearer <apiKey>
```

---

## 6. API keys

You can create additional API keys (e.g. one per task):

```
POST /v1/apikeys
Authorization: Bearer <apiKey>
Content-Type: application/json

{ "label": "task-runner", "expiresAt": "2026-12-31T00:00:00Z" }
```

Response includes `apiKey` (raw, shown once) and `id`.

List keys: `GET /v1/apikeys`
Revoke a key: `DELETE /v1/apikeys/<keyId>`

---

## 7. DID-based auth (optional)

If you registered with a `did:key:` DID, you can authenticate without an API key:

1. Request a challenge:
```
POST /v1/auth/challenge
Content-Type: application/json

{ "did": "did:key:z6Mk..." }
```

2. Sign the returned `nonce` with your Ed25519 private key (base64url), then verify:
```
POST /v1/auth/verify
Content-Type: application/json

{ "did": "did:key:z6Mk...", "nonce": "...", "signature": "<base64url Ed25519 sig>" }
```

Response: `{ "token": "...", "expiresIn": 3600 }` — use as `Authorization: Bearer <token>`.

---

## 8. Error responses

All errors follow:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable description" } }
```

Common codes:
- `401` — missing or invalid API key
- `404` — message or mailbox not found
- `409` — conflict (e.g. mailbox name already exists)
- `429` — rate limit exceeded

---

## 9. Health

```
GET /health        — liveness (always 200 if server is up)
GET /health/ready  — readiness (checks DB + mail server)
```

---

## Quick start (copy-paste)

```bash
# 1. Register
RESP=$(curl -s -X POST https://api.mailgi.xyz/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"label":"my-agent"}')
EMAIL=$(echo $RESP | jq -r .emailAddress)
KEY=$(echo $RESP | jq -r .apiKey)

# 2. Send a message
curl -s -X POST https://api.mailgi.xyz/v1/mail/send \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"to\":[\"someone@example.com\"],\"subject\":\"Hi\",\"textBody\":\"Hello from $EMAIL\"}"

# 3. Read inbox
curl -s https://api.mailgi.xyz/v1/mail \
  -H "Authorization: Bearer $KEY"
```

---

## 10. TypeScript / Node.js SDK

Install:
```bash
npm install @mailgi/mailgi
```

```typescript
import { AgentMailboxClient } from '@mailgi/mailgi';

// Construct from a stored API key
const client = AgentMailboxClient.withApiKey(
  'https://api.mailgi.xyz',
  process.env.MAILGI_API_KEY!,
);

// Register a new agent (first time only — save the returned apiKey)
const reg = await client.agents.register({ label: 'my-agent' });
// reg.emailAddress => 'buzzing-falcon@mailgi.xyz'
// reg.apiKey       => 'amb_...'  (shown once — store it)
client.apiKey = reg.apiKey;

// Send email
const { messageId } = await client.mail.send({
  to: ['someone@example.com'],
  subject: 'Hello',
  textBody: 'Hi from my agent.',
});

// Read inbox
const { messages } = await client.mail.list({ limit: 20, sort: 'desc' });
const email = await client.mail.get(messages[0].id);
console.log(email.subject, email.textBody);

// Mark as read
await client.mail.setFlags(email.id, { seen: true });
```

All SDK methods map 1-to-1 to the REST endpoints above. Errors extend `AgentMailboxError` with `statusCode` and `code`:

```typescript
import { NotFoundError, UnauthorizedError } from '@mailgi/mailgi';

try {
  await client.mail.get('bad-id');
} catch (err) {
  if (err instanceof NotFoundError) console.error('Not found');
  if (err instanceof UnauthorizedError) console.error('Bad API key');
}
```

---

## 11. CLI

Install globally:
```bash
npm install -g @mailgi/mailgi
```

All commands require `--agent <email-or-username>`.

```bash
# Register a new agent (saves API key to ~/.mailgi/config.json)
mailgi register --label my-agent --agent me@mailgi.xyz

# Save an existing agent by API key
mailgi login --agent buzzing-falcon@mailgi.xyz --apikey amb_...

# List saved agents
mailgi agents

# Show agent profile (live from API)
mailgi me --agent buzzing-falcon

# Read inbox
mailgi inbox --agent buzzing-falcon
mailgi inbox --agent buzzing-falcon --limit 50

# Read a message (auto-marks as seen)
mailgi read --agent buzzing-falcon <message-id>

# Send email
mailgi send --agent buzzing-falcon --to alice@example.com --subject "Hi" --body "Hello"
mailgi send --agent buzzing-falcon --to alice@example.com --subject "Hi" --body-file ./message.txt

# Delete a message
mailgi delete --agent buzzing-falcon <message-id>

# Mailboxes
mailgi mailboxes --agent buzzing-falcon
mailgi mailboxes create "Projects" --agent buzzing-falcon
mailgi mailboxes delete <id> --agent buzzing-falcon

# API keys
mailgi keys --agent buzzing-falcon
mailgi keys create --label task-key --agent buzzing-falcon
mailgi keys revoke <key-id> --agent buzzing-falcon

# Config
mailgi config show
mailgi config set-url https://api.mailgi.xyz

# Remove saved agent
mailgi logout --agent buzzing-falcon --yes

# Raw JSON output (any command)
mailgi inbox --agent buzzing-falcon --json
```

---

## 12. Custom domains & registration tokens

Everything above registers your agent on the shared `@mailgi.xyz` domain.
If a human wants their agents to send as `you@theircompany.com` instead,
that's a **custom domain** — a separate, dashboard-driven feature, not
something an agent sets up for itself.

**This part is done by a human, in a browser, not by an API call:**

1. They sign in at **https://app.mailgi.xyz** (email + one-time code, or
   GitHub/Google if configured) and create/join an organization.
2. They attach their domain and add the DNS records the dashboard shows
   them (TXT + MX for inbound; once that's verified, DKIM/MAIL-FROM/DMARC
   records appear for outbound sending — all auto-generated, nothing to
   configure by hand).
3. Once the domain shows verified, they create a **registration token**
   for it (`POST /v1/orgs/:orgId/domains/:domainId/registration-tokens`,
   requires their dashboard session — not an API key). This returns a
   token string **shown exactly once**, meant to be handed to an agent.

**This part is you, the agent** — once you're given that token and a
local part to claim (e.g. "register as `support` on this token"):

```
POST /v1/agents/register
Content-Type: application/json

{ "domainToken": "<token from the human>", "localPart": "support" }
```

Response is the same shape as a normal registration, except
`emailAddress` is now `support@theircompany.com` instead of a random
`@mailgi.xyz` handle:
```json
{
  "agentId": "...",
  "emailAddress": "support@theircompany.com",
  "aliasAddress": "x7k3mwf2qr5b@theircompany.com",
  "apiKey": "amb_...",
  "apiKeyId": "..."
}
```

Everything from section 2 onward (profile, inbox, send, mailboxes, API
keys) works exactly the same afterward — the only difference custom
domains make is which address you register with. `localPart` must be
lowercase alphanumeric (`.`/`_`/`-` allowed as separators), 1–64 chars,
and can't be a reserved name (`postmaster`, `abuse`, etc.) or already
taken on that domain.

A registration token can mint many agents on the same domain — a human
might hand you one token and ask you to self-register several teammates
(`support`, `sales`, `billing`, ...) in one go.

If the token is invalid, revoked, or the domain isn't verified yet, you
get back a generic `401 Invalid or unusable registration token` —
deliberately the same error for all three cases, so tell the human to
check the dashboard rather than guessing which one it is.

---

Full interactive docs: https://api.mailgi.xyz/docs
Machine-readable spec: https://api.mailgi.xyz/openapi.json

---

## Support

Questions or issues? Email **objective-crocodile@mailgi.xyz** — yes, it's a real mailgi inbox.
