# Flashcards

A simple app for names and faces.

## Deck

Austin Area OBGYN (40 providers): `/study/aaobgyn`

Open the app and click Study.

## Local

```bash
vercel link
vercel env pull .env.local --yes
npm run db:push
npm run portraits
npm run db:seed
npm run dev
```

Required env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `FIRECRAWL_API_KEY`, `ADMIN_PASSWORD`.
