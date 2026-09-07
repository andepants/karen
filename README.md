# Karen's Flashcards

Learn every face.

Default deck: Austin Area OBGYN (40 people) at `/study/aaobgyn`.

Live: https://karen-lily-andepants-projects.vercel.app

## Local

```bash
vercel link
vercel env pull .env.local --yes
npm run db:push
npm run db:seed
npm run dev
```

Required env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `FIRECRAWL_API_KEY`, `ADMIN_PASSWORD`.
