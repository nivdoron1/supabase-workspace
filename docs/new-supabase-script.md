# New Supabase Instance Script

## ✅ Created Script

I've created an automation script to quickly set up new Supabase instance packages!

### Files Created

1. **[scripts/generate-supabase-package.sh](file:///Users/nivdoron/Desktop/Code/Social/scripts/generate-supabase-package.sh)** - Main automation script
2. **[scripts/README.md](file:///Users/nivdoron/Desktop/Code/Social/scripts/README.md)** - Script documentation

### Command Added to package.json

```json
"new-supabase": "./scripts/new-supabase.sh"
```

## 🚀 Usage

Create a new Supabase instance with one command:

```bash
yarn new supabase <name> --project-id <id> --anon-key <key> [OPTIONS]
```

### Example

```bash
yarn new supabase events \
  --project-id abc123xyz \
  --anon-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --db-password my_secure_password \
  --service-key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** The URL is automatically generated as `https://{project-id}.supabase.co`

## 📋 What the Script Does

1. ✅ Validates input parameters
2. ✅ Creates `packages/supabase-{name}/` directory
3. ✅ Updates `package.json` with new package name `@supabase-workspace/supabase-{name}`
4. ✅ Creates `.env` file with provided credentials
5. ✅ Updates README.md and client.ts with new instance name
6. ✅ Updates project-id in scripts for type generation

## 📦 After Running

The script outputs:

```
🎉 Successfully created Supabase instance: events

Package created at: packages/supabase-events

Next steps:
  1. cd packages/supabase-events
  2. Review the .env file
  3. Run: npm run db:types (to generate database types)
  4. Run: npm run build

To use in your app:
  import { supabase } from '@supabase-workspace/supabase-events';
  import { SupabaseService } from '@supabase-workspace/supabase-core';
```

## 🎯 Generated Package Structure

When you run the script, it creates:

```
packages/supabase-{name}/
├── .env                    # Your credentials
├── .env.example           # Template for others
├── package.json           # Updated with @supabase-workspace/supabase-{name}
├── tsconfig.json          
├── README.md              # Updated documentation
└── src/
    ├── client.ts          # Supabase client for this instance
    ├── index.ts           # Exports
    └── vite-env.d.ts      # Type definitions
```

## ✨ Benefits

- **Fast**: Create new instances in seconds
- **Consistent**: Same structure every time
- **No manual work**: Automatically updates all references
- **Safe**: Validates inputs and checks for existing packages
- **Complete**: Ready to use immediately

Perfect for multi-tenant setups or separate Supabase projects! 🚀
