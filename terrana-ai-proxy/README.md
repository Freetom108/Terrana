# Terrana AI Proxy (Cloudflare Worker)

Leitet strukturierte KI‑Extraktion an **Anthropic Claude Haiku** weiter. Die Terrana‑App soll nur noch `POST` mit `{ "text": "…" }` an diese URL schicken — **nicht** den API‑Key ausliefern.

## Setup

```bash
cd terrana-ai-proxy
npm install
```

### 1. KV für Rate Limits (5 Anfragen / Minute / IP)

```bash
npx wrangler kv namespace create TERRANA_AI_RATE_LIMIT
```

`id` aus der Ausgabe in `wrangler.toml` eintragen (Block `[[kv_namespaces]]` auskommentieren und `id = "…"` setzen).

### 2. Anthropic Secret

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

### 3. Lokal testen

```bash
npx wrangler dev
```

Sobald KV und Secret gesetzt sind, ohne **Deploy**:

- **Nicht** ausgeführt: `wrangler deploy` (erst nach deiner Prüfung).

### Request

- Methode: `POST`
- JSON: `{ "text": "… Nutzertext …" }` (**Pflichtfeld** `text`)
- Text wird auf **max. 15.000 Zeichen** gekürzt
- Rate Limit über KV: **max. 5 Requests pro Minute pro Client‑IP** (`CF-Connecting-IP`)

### Response

Rohantwort der Anthropic **Messages API** (JSON), Statuscode wie von Anthropic — kompatibel mit der bisherigen Client‑Logik in `services/ai/extractor.ts`.

## Account

`account_id` steht in `wrangler.toml` (von dir vorgegeben).
