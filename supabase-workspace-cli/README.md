# Supabase Workspace CLI

A CLI tool to scaffold a complete Supabase monorepo workspace with Yarn workspaces.

## Features

- 🚀 Creates a Yarn monorepo workspace structure
- 📦 Generates `packages/supabase-core` with:
  - Generic database types (`database.types.ts`)
  - Comprehensive database service functions (`database.service.ts`)
  - Code generation utilities (`generate.ts`)
  - TypeScript configuration
- 📜 Copies utility scripts for creating new Supabase instances
- ⚡ Optional Vite React app creation
- 🎯 Ready-to-use workspace structure

## Installation

### Local Development

```bash
# Clone or navigate to the CLI directory
cd supabase-workspace-cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Link globally for local testing
npm link
```

### From NPM (when published)

```bash
npx supabase-workspace-cli my-workspace
```

## Usage

```bash
# Using the linked command
supabase-workspace my-workspace-name

# Or run directly
node ./dist/cli.js my-workspace-name

# Default name is 'supabase-workspace' if not specified
supabase-workspace
```

## What Gets Created

```
my-workspace/
├── package.json (Yarn workspaces config)
├── packages/
│   └── supabase-core/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── database.types.ts
│           ├── database.service.ts
│           ├── generate.ts
│           └── vite-env.d.ts
├── scripts/
│   ├── generate-supabase-package.sh
│   └── README.md
└── apps/ (optional)
    └── example/ (Vite React app)
```

## Next Steps After Generation

1. Navigate to your workspace:
   ```bash
   cd my-workspace
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the core package:
   ```bash
   cd packages/supabase-core
   yarn build
   ```

4. Create a new Supabase instance (optional):
   ```bash
   # From workspace root
   ./scripts/generate-supabase-package.sh my-instance --project-id abc123 --anon-key eyJ...
   ```

5. Run the example app (if created):
   ```bash
   cd apps/example
   yarn dev
   ```

## Publishing to NPM

To publish this CLI to npm:

1. Update `package.json` with your desired package name
2. Build the project: `npm run build`
3. Login to npm: `npm login`
4. Publish: `npm publish`

Then users can run:
```bash
npx your-package-name my-workspace
```

## License

MIT
