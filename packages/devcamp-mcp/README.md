# AI DevCamp MCP

## Two audiences (do not mix them up)

| Who | What they use |
|-----|----------------|
| **Attendees** (Claude, ChatGPT, Cursor for *learning*) | Live site [aidevcamp.gdg.london](https://aidevcamp.gdg.london/) → [`/faq`](https://aidevcamp.gdg.london/faq) + [`/mcp`](https://aidevcamp.gdg.london/mcp) token → connect LLM to **hosted** MCP HTTP. No git clone. No `.claude/skills`. |
| **Maintainers** (editing this repo) | This package + `src/lib/learning-chat/*`. Optional local `npm run mcp:devcamp` / `mcp:http` with Firebase Admin env. `.claude/skills/learning-chat` is a coding checklist only. |

All learning tool **runtime** code is in this repo’s application packages — not in `.claude/`.

---

## Access tiers (Firestore)

| Tier | Who | Data | Tools |
|------|-----|------|-------|
| **Public** | any valid token | `sessions` schedule | `list_public_sessions`, `get_public_session` |
| **Attendee** | enrolled + learning scope | materials corpus, **own** tasks | RAG, flashcards, quiz, Learning Guide, my tasks |
| **Admin** | staff + admin scope | users, assignments, writes | `admin_*` |

---

## Attendees: preferred path

1. Sign in at https://aidevcamp.gdg.london  
2. Mint `dcmcp_…` on `/mcp`  
3. Point Claude / ChatGPT / Cursor at the organisers’ MCP HTTP URL with  
   `Authorization: Bearer dcmcp_…`  
4. Or use the in-site Learning Assistant (no MCP needed)

Example remote client config:

```json
{
  "mcpServers": {
    "ai-devcamp": {
      "url": "https://MCP_HOST_FROM_ORGANISERS/mcp",
      "headers": {
        "Authorization": "Bearer dcmcp_REPLACE"
      }
    }
  }
}
```

---

## Maintainers: run locally / host MCP

```bash
# HTTP (share this URL with attendees after deploy)
npm run mcp:http
# DEVCAMP_MCP_HOST=0.0.0.0 DEVCAMP_MCP_PORT=3100

# stdio (your machine only)
set DEVCAMP_MCP_ACCESS_TOKEN=dcmcp_…
npm run mcp:devcamp
```

Requires `.env.local` Firebase Admin vars. Token mint APIs: `POST /api/mcp/tokens`, admin `POST /api/admin/mcp/tokens`.

Set `NEXT_PUBLIC_MCP_HTTP_URL` on the Next app so `/mcp` shows the public endpoint.

## Security

- Tokens hashed in `mcpAccessTokens` (Admin SDK only); revoke on `/mcp`
- Admin tools need staff role **and** admin scope
- Never put Admin private keys in attendee client configs
