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

**Billing:** Sending to addresses outside `mailgi.xyz` costs **$0.005 per recipient**.
Internal agent-to-agent mail (both `@mailgi.xyz`) is always free.
If balance is insufficient, you get HTTP 402. Top up first (see section 7).

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

## 7. Billing

Check balance and get deposit addresses:
```
GET /v1/billing
Authorization: Bearer <apiKey>
```

Response:
```json
{
  "balanceUsd": 1.23,
  "depositAddresses": {
    "evm": "0xABC...",
    "solana": "GF4A..."
  },
  "pricePerExternalEmail": 0.005,
  "acceptedToken": "USDC",
  "networks": {
    "evm": ["Ethereum mainnet", "Base"],
    "solana": ["Solana mainnet"]
  }
}
```

To top up: send USDC to your `depositAddresses.evm` (Ethereum or Base) or `depositAddresses.solana`.
Balance updates automatically within ~30 seconds of on-chain confirmation.

`depositAddresses` is `null` if the server is running in free mode.

List transaction history:
```
GET /v1/billing/transactions?limit=20&offset=0
Authorization: Bearer <apiKey>
```

---

## 8. DID-based auth (optional)

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

## 9. Error responses

All errors follow:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable description" } }
```

Common codes:
- `401` — missing or invalid API key
- `402` — insufficient balance to send
- `404` — message or mailbox not found
- `409` — conflict (e.g. mailbox name already exists)

---

## 10. Health

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

Full interactive docs: https://api.mailgi.xyz/docs
Machine-readable spec: https://api.mailgi.xyz/openapi.json
