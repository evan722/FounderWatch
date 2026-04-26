# FounderWatch

## Environment Variables

```bash
npm run dev
```

## Environment Variables

Create `.env.local` with:

```bash
PROXYCURL_API_KEY=your_proxycurl_key
CRON_SECRET=your_random_secret
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Automated Monitoring (Clay-free)

- Founders are stored in Firestore.
- Vercel Cron calls `/api/cron/monitor` daily at `00:00 UTC`.
- The monitor fetches LinkedIn snapshots from Proxycurl.
- If role/company changed, it writes a signal, scores with OpenAI, updates founder fields, and sends high-priority alerts via Resend.

You can test manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/monitor
```
