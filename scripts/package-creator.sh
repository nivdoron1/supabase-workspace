#!/bin/bash

# Package creation functions
# Sourced by generate-supabase-package.sh

create_package_json() {
    # Default command
    local db_push_cmd="supabase db push"
    
    # If Drizzle is enabled, generate migrations first, wait 3s, then push
    if [ "$WITH_DRIZZLE" = true ]; then
        db_push_cmd="npx drizzle-kit generate && sleep 3 && supabase db push"
    fi

    local deps='"@supabase/supabase-js": "^2.84.0", "@'$WORKSPACE_NAME'/supabase-core": "^1.0.0"'
    
    # Use the dynamic db_push_cmd variable in the scripts string
    local scripts='"build": "tsc", "dev": "tsc --watch", "db:push": "'"$db_push_cmd"'", "db:types": "npx supabase gen types typescript --project-id '$PROJECT_ID' --local > ../supabase-core/src/types.ts", "db:generate": "yarn db:types && node ../supabase-core/dist/generate.js", "db:master": "yarn db:push && yarn db:generate"'
    
    local dev_deps='"typescript": "^5.3.0", "vite": "^5.0.0"'
    
    [ "$WITH_STRIPE" = true ] && {
        deps+=', "@'$WORKSPACE_NAME'/stripe-core": "^1.0.0"'
        scripts+=', "add-stripe": "node ../stripe-core/dist/generate.js"'
    }
    
    [ "$WITH_DRIZZLE" = true ] && {
        deps+=', "drizzle-orm": "^0.44.7", "postgres": "^3.4.3" , "dotenv": "^17.2.3"'
        dev_deps+=', "drizzle-kit": "^0.31.7", "@types/pg": "^8.10.0"'
        scripts+=', "drizzle:generate": "drizzle-kit generate", "drizzle:push": "drizzle-kit push", "drizzle:studio": "drizzle-kit studio"'
    }
    
    cat > "$PACKAGE_DIR/package.json" << EOF
{
  "name": "@$WORKSPACE_NAME/supabase-$INSTANCE_NAME",
  "version": "1.0.0",
  "description": "Supabase client for $INSTANCE_NAME",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { $scripts },
  "license": "MIT",
  "dependencies": { $deps },
  "devDependencies": { $dev_deps }
}
EOF
}

create_tsconfig() {
    cat > "$PACKAGE_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "db/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
}

create_readme() {
    cat > "$PACKAGE_DIR/README.md" << EOF
# Supabase $INSTANCE_NAME

Supabase client and types for $INSTANCE_NAME instance.

## Usage

\`\`\`typescript
import { supabase, FRONTEND_URL } from '@$WORKSPACE_NAME/supabase-$INSTANCE_NAME';

const { data } = await supabase.from('table').select('*');
\`\`\`

## Environment Variables

- \`VITE_PUBLIC_SUPABASE_URL\` - Supabase URL
- \`VITE_PUBLIC_SUPABASE_ANON_KEY\` - Anon key
- \`PRODUCTION\` - Production flag (true/false)
EOF

    [ "$WITH_STRIPE" = true ] && cat >> "$PACKAGE_DIR/README.md" << 'EOF'

## Stripe

- \`STRIPE_SECRET_KEY\` - Stripe secret key
- \`STRIPE_WEBHOOK_SECRET\` - Webhook secret

Run \`yarn add-stripe\` to generate Edge Functions.
EOF

    [ "$WITH_DRIZZLE" = true ] && cat >> "$PACKAGE_DIR/README.md" << 'EOF'

## Drizzle ORM

- \`DATABASE_URL\` - PostgreSQL connection URL

Commands:
- \`yarn drizzle:generate\` - Generate migrations
- \`yarn drizzle:push\` - Push to database
- \`yarn drizzle:studio\` - Open Drizzle Studio
EOF
}

create_env_files() {
    # .env.example
    cat > "$PACKAGE_DIR/.env.example" << EOF
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
PRODUCTION=true
EOF

    [ "$WITH_STRIPE" = true ] && cat >> "$PACKAGE_DIR/.env.example" << 'EOF'
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EOF

    [ "$WITH_DRIZZLE" = true ] && cat >> "$PACKAGE_DIR/.env.example" << 'EOF'
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
EOF

    # .env
    cat > "$PACKAGE_DIR/.env" << EOF
VITE_PUBLIC_SUPABASE_URL=$SUPABASE_URL
VITE_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
PRODUCTION=false
EOF

    [ -n "$SERVICE_KEY" ] && echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY" >> "$PACKAGE_DIR/.env"
    
    if [ "$WITH_STRIPE" = true ]; then
        echo "" >> "$PACKAGE_DIR/.env"
        echo "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}" >> "$PACKAGE_DIR/.env"
        echo "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}" >> "$PACKAGE_DIR/.env"
    fi
    
    if [ "$WITH_DRIZZLE" = true ]; then
        echo "" >> "$PACKAGE_DIR/.env"
        echo "DATABASE_URL=${DATABASE_URL:-}" >> "$PACKAGE_DIR/.env"
    fi
}

create_src_files() {
    # config.ts
    cat > "$PACKAGE_DIR/src/config.ts" << 'EOF'
const isProduction = import.meta.env.PRODUCTION === 'true';
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;

export const FRONTEND_URL = isProduction ? supabaseUrl : 'http://localhost:3000';
export const IS_PRODUCTION = isProduction;
export const SUPABASE_URL = supabaseUrl;
EOF

    # client.ts
    cat > "$PACKAGE_DIR/src/client.ts" << EOF
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@$WORKSPACE_NAME/supabase-core';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});
EOF

    # index.ts
    local index_content="export { supabase } from './client';\nexport { FRONTEND_URL, IS_PRODUCTION, SUPABASE_URL } from './config';"
    [ "$WITH_STRIPE" = true ] && index_content+="\nexport { createStripeService } from '@$WORKSPACE_NAME/stripe-core';"
    echo -e "$index_content" > "$PACKAGE_DIR/src/index.ts"

    # vite-env.d.ts
    cat > "$PACKAGE_DIR/src/vite-env.d.ts" << 'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_SUPABASE_URL: string
  readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_KEY: string
  readonly PRODUCTION: string
EOF

    [ "$WITH_STRIPE" = true ] && cat >> "$PACKAGE_DIR/src/vite-env.d.ts" << 'EOF'
  readonly STRIPE_SECRET_KEY: string
  readonly STRIPE_WEBHOOK_SECRET: string
EOF

    [ "$WITH_DRIZZLE" = true ] && cat >> "$PACKAGE_DIR/src/vite-env.d.ts" << 'EOF'
  readonly DATABASE_URL: string
EOF

    cat >> "$PACKAGE_DIR/src/vite-env.d.ts" << 'EOF'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
EOF
}
