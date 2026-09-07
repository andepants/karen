# Flashcards

A simple app for names and faces.

## Decks

- Practice (20 people): `/study/garden-test`
- Neighbors (8 people): `/study/studio-neighbors`

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
