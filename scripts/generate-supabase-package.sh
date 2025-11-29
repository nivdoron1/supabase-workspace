#!/bin/bash

# Supabase Package Generator - Modular Version
# Creates Supabase instance packages with optional Stripe and Drizzle integration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory and load helpers
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WORKSPACE_NAME="$(basename "$PROJECT_ROOT")"
TEMPLATES_DIR="$SCRIPT_DIR/templates"

# Source helper functions
source "$SCRIPT_DIR/helpers.sh"

show_usage() {
    cat << EOF
Usage: $0 <name> --project-id <id> --anon-key <key> [OPTIONS]

Required:
  <name>                       Instance name (lowercase, alphanumeric, hyphens)
  --project-id <id>            Supabase project ID
  --anon-key <key>             Supabase anonymous key

Optional:
  --service-key <key>          Supabase service role key
  --db-password <password>     Database password (for DATABASE_URL auto-generation)
  --database-url <url>         Direct PostgreSQL URL (overrides auto-generation)
  --with-stripe                Include Stripe integration
  --stripe-secret-key <key>    Stripe secret key
  --stripe-webhook-secret <s>  Stripe webhook secret
  --with-drizzle               Include Drizzle ORM

Examples:
  $0 my-app --project-id abc123 --anon-key eyJ... --db-password mypass
  $0 my-app --project-id abc123 --anon-key eyJ... --with-stripe --db-password mypass
EOF
    exit 1
}

#=================================================================
# Parse arguments
#=================================================================

[ "$#" -lt 1 ] && show_usage

INSTANCE_NAME=$1
shift

# Initialize variables
PROJECT_ID=""
ANON_KEY=""
SERVICE_KEY=""
DB_PASSWORD=""
DATABASE_URL=""
WITH_STRIPE=false
WITH_DRIZZLE=false
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id) PROJECT_ID="$2"; shift 2 ;;
        --anon-key) ANON_KEY="$2"; shift 2 ;;
        --service-key) SERVICE_KEY="$2"; shift 2 ;;
        --db-password) DB_PASSWORD="$2"; shift 2 ;;
        --database-url) DATABASE_URL="$2"; shift 2 ;;
        --with-stripe) WITH_STRIPE=true; WITH_DRIZZLE=true; shift ;;
        --stripe-secret-key) STRIPE_SECRET_KEY="$2"; shift 2 ;;
        --stripe-webhook-secret) STRIPE_WEBHOOK_SECRET="$2"; shift 2 ;;
        --with-drizzle) WITH_DRIZZLE=true; shift ;;
        -h|--help) show_usage ;;
        *) echo -e "${RED}Unknown argument: $1${NC}"; show_usage ;;
    esac
done

# Validate
[ -z "$PROJECT_ID" ] && { echo -e "${RED}Error: --project-id required${NC}"; show_usage; }
[ -z "$ANON_KEY" ] && { echo -e "${RED}Error: --anon-key required${NC}"; show_usage; }
[[ ! "$INSTANCE_NAME" =~ ^[a-z0-9-]+$ ]] && { echo -e "${RED}Error: Invalid instance name${NC}"; exit 1; }

SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
PACKAGE_DIR="packages/supabase-$INSTANCE_NAME"

# Auto-generate DATABASE_URL if password provided and URL not specified
if [ -n "$DB_PASSWORD" ] && [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(generate_database_url "$PROJECT_ID" "$DB_PASSWORD" false)
    echo -e "${BLUE}Auto-generated DATABASE_URL${NC}"
fi

#=================================================================
# Display configuration
#=================================================================

echo -e "${BLUE}Creating: $INSTANCE_NAME${NC}"
echo -e "${BLUE}Project ID: $PROJECT_ID${NC}"
echo -e "${BLUE}URL: $SUPABASE_URL${NC}"
[ "$WITH_STRIPE" = true ] && echo -e "${BLUE}Stripe: Enabled${NC}"
[ "$WITH_DRIZZLE" = true ] && echo -e "${BLUE}Drizzle: Enabled${NC}"

[ -d "$PACKAGE_DIR" ] && { echo -e "${RED}Error: Package exists${NC}"; exit 1; }

#=================================================================
# Create package structure
#=================================================================

echo -e "${GREEN}✓${NC} Creating package structure..."
mkdir -p "$PACKAGE_DIR/src"

# Source package creation functions
source "$SCRIPT_DIR/package-creator.sh"

create_package_json
create_tsconfig
create_readme
create_env_files
create_src_files

#=================================================================
# Drizzle setup
#=================================================================

if [ "$WITH_DRIZZLE" = true ]; then
    echo -e "${GREEN}✓${NC} Setting up Drizzle ORM..."
    mkdir -p "$PACKAGE_DIR/src/db/auth"
    mkdir -p "$PACKAGE_DIR/src/db/public"
    
    # Extract and write templates using the template extractor
    node "$SCRIPT_DIR/extract-template.js" "auth-schema.template.ts" "AUTH_SCHEMA_TEMPLATE" > "$PACKAGE_DIR/src/db/auth/schema.ts"

    if [ "$WITH_STRIPE" = true ]; then
        node "$SCRIPT_DIR/extract-template.js" "public-schema-stripe.template.ts" "PUBLIC_SCHEMA_STRIPE_TEMPLATE" > "$PACKAGE_DIR/src/db/public/schema.ts"
    else
        node "$SCRIPT_DIR/extract-template.js" "public-schema-basic.template.ts" "PUBLIC_SCHEMA_BASIC_TEMPLATE" > "$PACKAGE_DIR/src/db/public/schema.ts"
    fi
    
    # Create db/schema.ts
    cat > "$PACKAGE_DIR/src/db/schema.ts" << 'EOF'
import * as authSchema from './auth/schema';
import * as publicSchema from './public/schema';

export const schema = { ...authSchema, ...publicSchema };
EOF
    
    # Create drizzle.config.ts without @ts-check
    cat > "$PACKAGE_DIR/drizzle.config.ts" << 'EOF'
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

EOF
fi

#=================================================================
# Stripe migration - Always create when Stripe is enabled
#=================================================================

if [ "$WITH_STRIPE" = true ]; then
    echo -e "${GREEN}✓${NC} Creating Stripe migration..."
    mkdir -p "$PACKAGE_DIR/supabase/migrations"
    cp "$TEMPLATES_DIR/stripe-migration.sql" \
       "$PACKAGE_DIR/supabase/migrations/00001_stripe_integration.sql"
fi

#=================================================================
# Install dependencies and generate
#=================================================================

echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PACKAGE_DIR"
yarn install --silent
cd "$PROJECT_ROOT"
echo -e "${GREEN}✓${NC} Dependencies installed"

# Generate Stripe functions
if [ "$WITH_STRIPE" = true ]; then
    echo -e "${YELLOW}Generating Stripe Edge Functions...${NC}"
    if [ -d "$PROJECT_ROOT/packages/stripe-core" ]; then
        cd "$PROJECT_ROOT/packages/stripe-core"
        yarn build
        yarn generate "$PROJECT_ROOT/$PACKAGE_DIR" 2>/dev/null
        cd "$PROJECT_ROOT"
        echo -e "${GREEN}✓${NC} Stripe functions generated"
    fi
fi

#=================================================================
# Summary
#=================================================================

echo ""
echo -e "${GREEN}🎉 Success: $INSTANCE_NAME${NC}"
echo ""
echo "Package: @$WORKSPACE_NAME/supabase-$INSTANCE_NAME"
echo "Location: $PACKAGE_DIR"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd $PACKAGE_DIR"
[ -z "$STRIPE_SECRET_KEY" ] && [ "$WITH_STRIPE" = true ] && echo "  2. Set STRIPE_SECRET_KEY in .env"
[ -z "$DATABASE_URL" ] && [ "$WITH_DRIZZLE" = true ] && echo "  3. Set DATABASE_URL in .env"
[ "$WITH_DRIZZLE" = true ] && echo "  4. Run: yarn drizzle:generate"
echo "  5. Run: yarn build"
echo ""