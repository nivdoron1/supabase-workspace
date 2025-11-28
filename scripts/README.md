# Scripts

This directory contains utility scripts for the Social workspace.

## generate-supabase-package.sh

### Usage

```bash
yarn new supabase <name> --project-id <id> --anon-key <key> [OPTIONS]
```

### Required Arguments

- `<name>` - Instance name (lowercase, alphanumeric, hyphens only)
- `--project-id <id>` - Supabase project ID (e.g., `abc123xyz`)
- `--anon-key <key>` - Supabase anonymous/public key

### Optional Arguments

- `--service-key <key>` - Supabase service role key (for server-side operations)
- `--db-password <password>` - Database password

> **Note:** The Supabase URL is automatically generated from the project-id as `https://{project-id}.supabase.co`

### Example

```bash
yarn new supabase events \
  --project-id abc123xyz \
  --anon-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --db-password my_secure_password \
  --service-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### What it does

1. Creates `packages/supabase-{name}/` directory
2. Copies template structure from `supabase-wedding`
3. Updates `package.json` with new package name
4. Creates `.env` file with provided credentials
5. Updates all references in files

### After running

1. Review the generated `.env` file
2. Generate database types: `cd packages/supabase-{name} && npm run db:types`
3. Build the package: `npm run build`
4. Use in your app:
   ```typescript
   import { supabase } from '@supabase-workspace/supabase-{name}';
   ```
