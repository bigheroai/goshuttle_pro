# GoShuttle Pro

Shuttle booking and fleet operations platform, built with **Next.js (App Router)**, React 19, Tailwind CSS and Supabase, deployed on Netlify.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Project structure

```
app/                     # Next.js routes (one folder per URL) + API route handlers
  layout.jsx             # Root layout, global metadata and providers
  api/
    email/send/          # Server-side Resend fallback (requires signed-in user)
    payments/paymongo/   # config (public settings), checkout, refund (admin)
src/
  views/                 # Page components (formerly src/pages in the Vite app)
  components/            # Shared UI
  services/, utils/      # Supabase data access and helpers
  lib/router.jsx         # react-router-dom compatible API on top of next/navigation
  lib/helmet.jsx         # <Helmet> replacement (React 19 hoists <title>/<meta>)
  server/                # Server-only helpers (Supabase, PayMongo)
supabase/                # Database migrations and Edge Functions
```

Pages are currently client-rendered (`next/dynamic` with `ssr: false`) to keep
behaviour identical to the previous single-page app. Public pages can be moved
to server rendering one at a time.

## Adding a route

Create `app/<path>/page.jsx`:

```jsx
'use client';
import dynamic from 'next/dynamic';
const MyView = dynamic(() => import('@/views/my-view'), { ssr: false });
export default function Page() { return <MyView />; }
```

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase client |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | public | Maps |
| `RESEND_API_KEY` | server only | Email fallback route |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (optional) | Lets the server read PayMongo secrets once `app_settings` RLS is tightened |

The legacy `VITE_*` names for the public variables are still accepted.

AI chat completions (used by the admin fake-user scanner) are served by the
admin-only `app/api/ai/chat` route through Netlify AI Gateway, which injects
the OpenAI credentials at runtime — no API key needs to be configured.

`console.log`/`info`/`debug` calls are stripped from production builds
(`compiler.removeConsole` in `next.config.mjs`); `console.error` and
`console.warn` are kept.
