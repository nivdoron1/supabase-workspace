#!/bin/bash

# Script to create a new Supabase instance package
# Usage: ./scripts/new-supabase.sh <name> --project-id <id> --anon-key <key> [OPTIONS]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine workspace name from the root directory
# Assuming script is in /scripts/ and run from root or /scripts/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Go up one level from scripts/ to get to root
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Get the name of the root directory (e.g., supabase-workspace)
WORKSPACE_NAME="$(basename "$PROJECT_ROOT")"

# Function to show usage
show_usage() {
    echo "Usage: $0 <name> --project-id <id> --anon-key <key> [OPTIONS]"
    echo ""
    echo "Required arguments:"
    echo "  <name>                    Instance name (lowercase, alphanumeric, hyphens only)"
    echo "  --project-id <id>         Supabase project ID (URL will be auto-generated)"
    echo "  --anon-key <key>          Supabase anonymous/public key"
    echo ""
    echo "Optional arguments:"
    echo "  --service-key <key>       Supabase service role key (for server-side operations)"
    echo "  --db-password <password>  Database password"
    echo ""
    echo "Example:"
    echo "  $0 events --project-id abc123xyz --anon-key eyJhbGc..."
    echo "  $0 events --project-id abc123 --anon-key eyJ... --db-password mypass --service-key srv_key"
    exit 1
}

# Check if at least name is provided
if [ "$#" -lt 1 ]; then
    echo -e "${RED}Error: Missing instance name${NC}"
    show_usage
fi

# Parse arguments
INSTANCE_NAME=$1
shift

# Initialize variables
PROJECT_ID=""
ANON_KEY=""
SERVICE_KEY=""
DB_PASSWORD=""

# Parse named arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --anon-key)
            ANON_KEY="$2"
            shift 2
            ;;
        --service-key)
            SERVICE_KEY="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo -e "${RED}Error: Unknown argument: $1${NC}"
            show_usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: --project-id is required${NC}"
    show_usage
fi

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}Error: --anon-key is required${NC}"
    show_usage
fi

# Validate instance name (lowercase, alphanumeric, hyphens only)
if ! [[ "$INSTANCE_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}Error: Instance name must be lowercase alphanumeric with hyphens only${NC}"
    exit 1
fi

# Auto-generate Supabase URL from project ID
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"

# Paths
PACKAGE_DIR="packages/supabase-$INSTANCE_NAME"

echo -e "${BLUE}Creating new Supabase instance: $INSTANCE_NAME${NC}"
echo -e "${BLUE}Workspace: $WORKSPACE_NAME${NC}"
echo -e "${BLUE}Project ID: $PROJECT_ID${NC}"
echo -e "${BLUE}URL: $SUPABASE_URL${NC}"

# Check if package already exists
if [ -d "$PACKAGE_DIR" ]; then
    echo -e "${RED}Error: Package $PACKAGE_DIR already exists${NC}"
    exit 1
fi

# Create package directory structure
echo -e "${GREEN}✓${NC} Creating package directory: $PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/src"

# Create package.json
echo -e "${GREEN}✓${NC} Creating package.json..."
cat > "$PACKAGE_DIR/package.json" << EOF
{
    "name": "@$WORKSPACE_NAME/supabase-$INSTANCE_NAME",
    "version": "1.0.0",
    "description": "Supabase client and types for $INSTANCE_NAME instance",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
        "build": "tsc",
        "dev": "tsc --watch",
        "db:push": "supabase db push",
        "db:types": "npx supabase gen types typescript --project-id $PROJECT_ID --local > ../supabase-core/src/types.ts",
        "db:generate": "yarn run db:types && node ../supabase-core/dist/generate.js",
        "db:master": "yarn db:push && yarn db:generate"
    },
    "keywords": [
        "supabase",
        "$INSTANCE_NAME"
    ],
    "license": "MIT",
    "dependencies": {
        "@supabase/supabase-js": "^2.84.0",
        "@$WORKSPACE_NAME/supabase-core": "^1.0.0"
    },
    "devDependencies": {
        "typescript": "^5.3.0",
        "vite": "^5.0.0"
    }
}
EOF

# Create tsconfig.json
echo -e "${GREEN}✓${NC} Creating tsconfig.json..."
cat > "$PACKAGE_DIR/tsconfig.json" << EOF
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": [
            "ES2020",
            "DOM"
        ],
        "declaration": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "types": [
            "vite/client"
        ]
    },
    "include": [
        "src/**/*"
    ],
    "exclude": [
        "node_modules",
        "dist"
    ]
}
EOF

# Create README.md
echo -e "${GREEN}✓${NC} Creating README.md..."
cat > "$PACKAGE_DIR/README.md" << EOF
# Supabase $INSTANCE_NAME Instance

This package contains the Supabase client and database types for the $INSTANCE_NAME project instance.

## Configuration

The package uses environment variables from \`.env\`:
- \`VITE_PUBLIC_SUPABASE_URL\` - Your Supabase project URL
- \`VITE_PUBLIC_SUPABASE_ANON_KEY\` - Public anonymous key
- \`VITE_PUBLIC_SUPABASE_DATABASE_PASSWORD\` - Database password
- \`SUPABASE_SERVICE_KEY\` - Service role key (server-side only)

## Usage

\`\`\`typescript
import { supabase } from '@$WORKSPACE_NAME/supabase-$INSTANCE_NAME';

// Query data
const { data, error } = await supabase
  .from('table_name')
  .select('*');
\`\`\`

## Generate Types

To update database types from your Supabase schema:

\`\`\`bash
npx supabase gen types typescript --project-id $PROJECT_ID > src/types.ts
\`\`\`
EOF

# Create .env.example file
echo -e "${GREEN}✓${NC} Creating .env.example..."
cat > "$PACKAGE_DIR/.env.example" << EOF
# $INSTANCE_NAME Supabase Instance Environment Variables

# Get these from your Supabase project dashboard
# Project URL: https://app.supabase.com/project/YOUR_PROJECT_ID

VITE_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
VITE_PUBLIC_SUPABASE_DATABASE_PASSWORD=your-database-password
SUPABASE_SERVICE_KEY=your-service-role-key
EOF

# Create .env file with provided credentials
echo -e "${GREEN}✓${NC} Creating .env file..."
ENV_FILE="$PACKAGE_DIR/.env"
cat > "$ENV_FILE" << EOF
VITE_PUBLIC_SUPABASE_URL=$SUPABASE_URL
VITE_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
EOF

if [ -n "$DB_PASSWORD" ]; then
    echo "VITE_PUBLIC_SUPABASE_DATABASE_PASSWORD=$DB_PASSWORD" >> "$ENV_FILE"
fi

if [ -n "$SERVICE_KEY" ]; then
    echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY" >> "$ENV_FILE"
fi

# Create src/client.ts
echo -e "${GREEN}✓${NC} Creating src/client.ts..."
cat > "$PACKAGE_DIR/src/client.ts" << 'EOF_CLIENT'
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@WORKSPACE_NAME_PLACEHOLDER/supabase-core';

// INSTANCE_NAME_PLACEHOLDER Supabase instance configuration
// Credentials are loaded from the package .env file
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'INSTANCE_NAME_PLACEHOLDER Supabase credentials missing. Check packages/supabase-INSTANCE_NAME_PLACEHOLDER/.env file'
    );
}

/**
 * Supabase client for the INSTANCE_NAME_PLACEHOLDER instance
 * This client is configured specifically for the INSTANCE_NAME_PLACEHOLDER project
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});
EOF_CLIENT

# Replace placeholders in client.ts
sed -i.bak "s/INSTANCE_NAME_PLACEHOLDER/$INSTANCE_NAME/g" "$PACKAGE_DIR/src/client.ts"
sed -i.bak "s/WORKSPACE_NAME_PLACEHOLDER/$WORKSPACE_NAME/g" "$PACKAGE_DIR/src/client.ts"
rm "$PACKAGE_DIR/src/client.ts.bak"

# Create src/index.ts
echo -e "${GREEN}✓${NC} Creating src/index.ts..."
cat > "$PACKAGE_DIR/src/index.ts" << EOF
// Export Supabase client for $INSTANCE_NAME instance
export { supabase } from './client';
EOF

# Create src/vite-env.d.ts
echo -e "${GREEN}✓${NC} Creating src/vite-env.d.ts..."
cat > "$PACKAGE_DIR/src/vite-env.d.ts" << 'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PUBLIC_SUPABASE_URL: string
    readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string
    readonly VITE_PUBLIC_SUPABASE_DATABASE_PASSWORD: string
    readonly SUPABASE_SERVICE_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
EOF

echo ""
echo -e "${GREEN}🎉 Successfully created Supabase instance: $INSTANCE_NAME${NC}"
echo ""
echo "Package: @$WORKSPACE_NAME/supabase-$INSTANCE_NAME"
echo "Location: $PACKAGE_DIR"
echo "URL: $SUPABASE_URL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd $PACKAGE_DIR"
echo "  2. Review the .env file"
echo "  3. Run: yarn run db:types (to generate database types)"
echo "  4. Run: yarn run build"
echo ""
echo -e "${YELLOW}To use in your app:${NC}"
echo "  import { supabase } from '@$WORKSPACE_NAME/supabase-$INSTANCE_NAME';"
echo "  import { SupabaseService } from '@$WORKSPACE_NAME/supabase-core';"
echo ""