# Supabase example Instance

This package contains the Supabase client and database types for the example project instance.

## Configuration

The package uses environment variables from `.env`:
- `VITE_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `VITE_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `VITE_PUBLIC_SUPABASE_DATABASE_PASSWORD` - Database password
- `SUPABASE_SERVICE_KEY` - Service role key (server-side only)

## Usage

```typescript
import { supabase } from '@supabase-workspace/supabase-example';

// Query data
const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

## Generate Types

To update database types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id abc123xyz > src/types.ts
```
