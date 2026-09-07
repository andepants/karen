# Karen

Lily-themed flashcards. Paste a team page, then study faces with FSRS — the same scheduler family Anki uses.

## Sets

- Garden Test (20 people, face + name cards): `/study/garden-test`
- Studio Neighbors (8 people, second deck): `/study/studio-neighbors`

Study one set at a time. Each person is an Anki-style note with two cards: photo→name and name→photo.

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
