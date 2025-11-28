# Multi-Instance Supabase Workspace - Final Structure

## ✅ Completed Structure

Your workspace now supports multiple Supabase instances with this architecture:

### Package Organization

```
packages/
├── supabase-core/               # Shared utilities for all instances
│   ├── src/
│   │   ├── types.ts            # Shared database type definitions
│   │   ├── service.ts          # All database CRUD functions
│   │   ├── generate.ts         # Code generation script
│   │   └── index.ts            # Exports types & services
│   └── package.json
│
├── supabase-{service name}/        # Supabase instance
│   ├── .env                    # Supabase credentials
│   ├── src/
│   │   ├── client.ts           # Supabase client
│   │   └── index.ts            # Exports Supabase client
│   └── package.json
```

### How It Works

**@supabase-workspace/supabase-core**
- Contains shared database types
- Exports all service functions (getAll, insert, SupabaseService, etc.)
- Contains generate.ts for creating table-specific services
- No Supabase client (instance-agnostic)

**@supabase-workspace/supabase-{service name}**
- Has its own `.env` file with Supabase credentials
- Exports the Supabase client
- Depends on `@supabase-workspace/supabase-core` for types
- Scripts to generate types from Supabase instance

**Apps (e.g., apps/wedding)**
- Import client from `@supabase-workspace/supabase-{service name}`
- Import service functions from `@supabase-workspace/supabase-core`
- Use them together

## 📋 Fixed Issues

1. ✅ Fixed invalid template literal syntax in package.json
2. ✅ Set up generate script to use supabase-core package
3. ✅ Updated all import paths to new structure
4. ✅ Installed all dependencies successfully

## 🔧 Package Scripts

### In supabase-{service name} package:

```bash
# Generate TypeScript types from Supabase instance
npm run db:types

# Generate table services using supabase-core's generate script
npm run generate

# Build the package
npm run build
```

## 💡 Usage Example

```typescript
// In your app (e.g., apps/wedding)
import { supabase } from '@supabase-workspace/supabase-example';
import { SupabaseService, getAll } from '@supabase-workspace/supabase-core';

// Option 1: Direct functions
const guests = await getAll(supabase, 'guests');

// Option 2: Service object
const guestsService = SupabaseService(supabase, 'guests');
const allGuests = await guestsService.getAll();
```

## 🚀 Adding New Supabase Instances

To add a new Supabase instance (e.g., "events"):

### Quick Command

```bash
yarn new-supabase <name> --project-id <id> --anon-key <key> [OPTIONS]
```

### Example

```bash
yarn new-supabase events \
  --project-id abc123xyz \
  --anon-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --db-password my_secure_password \
  --service-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Note:** URL is auto-generated as `https://{project-id}.supabase.co`

This will:
1. Create `packages/supabase-events/`
2. Copy structure from `supabase-wedding`
3. Set up `.env` with your credentials
4. Update all package references

After creation:
```bash
cd packages/supabase-events
npm run db:types    # Generate database types
npm run build       # Build the package
```

Then use in your apps:
```typescript
import { supabase } from '@supabase-workspace/supabase-events';
import { SupabaseService } from '@supabase-workspace/supabase-core';
```

## 📝 Next Steps

1. Generate database types for wedding instance:
   ```bash
   cd packages/supabase-wedding
   npm run db:types
   ```

2. (Optional) Generate table-specific services:
   ```bash
   npm run generate
   ```

3. Start using in your wedding app!

---

Your workspace is now organized with clean separation between:
- **Shared utilities** (`supabase-core`)
- **Instance-specific clients** (`supabase-wedding`)
- **Applications** that consume them

## 🛠️ CLI Tool

This workspace includes a CLI tool to scaffold new workspaces or test the setup.

### Usage

To run the CLI from the root of this workspace:

```bash
yarn create-workspace <workspace-name>
```

This will:
1. Create a new directory with the specified name
2. Initialize a Yarn workspace structure
3. Generate `packages/supabase-core` with all shared utilities
4. Prompt to create an example Vite app
5. Configure `package.json` and generate `README.md`

### CLI Development

The CLI source code is located in `supabase-workspace-cli/`. To modify it:

1. Edit files in `supabase-workspace-cli/src/`
2. Build the CLI:
   ```bash
   cd supabase-workspace-cli
   npm run build
   ```
3. Test your changes:
   ```bash
   yarn create-workspace test-workspace
   ```