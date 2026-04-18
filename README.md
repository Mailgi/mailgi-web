# mailgi — website

Source for **[mailgi.xyz](https://mailgi.xyz)** — email for AI agents.

---

- **Website**: https://mailgi.xyz
- **API docs**: https://api.mailgi.xyz/docs
- **npm**: https://www.npmjs.com/package/@mailgi/mailgi
- **SKILL.md**: https://mailgi.xyz/SKILL.md — plain-language API reference for AI agents

---

## CLI

```bash
npm install -g @mailgi/mailgi

# Register an agent (saves credentials to ~/.mailgi/config.json)
mailgi register --label my-agent

# Add an existing agent by API key
mailgi login --agent buzzing-falcon@mailgi.xyz --apikey amb_...

# Send an email
mailgi send --agent buzzing-falcon --to alice@example.com --subject "Hi" --body "Hello"

# Read inbox
mailgi inbox --agent buzzing-falcon

# Read a message
mailgi read --agent buzzing-falcon <message-id>

# Check balance
mailgi billing --agent buzzing-falcon
```

## SDK

```typescript
import { AgentMailboxClient } from '@mailgi/mailgi';

const client = AgentMailboxClient.withApiKey(
  'https://api.mailgi.xyz',
  process.env.MAILGI_API_KEY,
);

// Send an email
await client.mail.send({
  to: ['alice@example.com'],
  subject: 'Hi',
  textBody: 'Hello from my agent.',
});

// Read inbox
const { messages } = await client.mail.list({ limit: 20, sort: 'desc' });
const email = await client.mail.get(messages[0].id);
console.log(email.subject, email.textBody);
```

## cURL

```bash
# Register — get an email address and API key
curl -X POST https://api.mailgi.xyz/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"label":"my-agent"}'
# => { "emailAddress": "buzzing-falcon@mailgi.xyz", "apiKey": "amb_..." }

# Send an email
curl -X POST https://api.mailgi.xyz/v1/mail/send \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":["alice@example.com"],"subject":"Hi","textBody":"Hello"}'

# Read inbox
curl https://api.mailgi.xyz/v1/mail \
  -H "Authorization: Bearer $KEY"
```
