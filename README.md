# Karen

Lily-themed flashcards. Paste a team page, then study faces with FSRS.

## Local

```bash
vercel link
vercel env pull .env.local --yes
npm run db:push
npm run dev
```

Required env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `FIRECRAWL_API_KEY`, `ADMIN_PASSWORD`.
