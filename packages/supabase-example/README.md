# Supabase example

Supabase client and types for example instance.

## Usage

```typescript
import { supabase, FRONTEND_URL } from '@supabase-workspace/supabase-example';

const { data } = await supabase.from('table').select('*');
```

## Environment Variables

- `VITE_PUBLIC_SUPABASE_URL` - Supabase URL
- `VITE_PUBLIC_SUPABASE_ANON_KEY` - Anon key
- `PRODUCTION` - Production flag (true/false)

## Stripe

- \`STRIPE_SECRET_KEY\` - Stripe secret key
- \`STRIPE_WEBHOOK_SECRET\` - Webhook secret

Run \`yarn add-stripe\` to generate Edge Functions.

## Drizzle ORM

- \`DATABASE_URL\` - PostgreSQL connection URL

Commands:
- \`yarn drizzle:generate\` - Generate migrations
- \`yarn drizzle:push\` - Push to database
- \`yarn drizzle:studio\` - Open Drizzle Studio
