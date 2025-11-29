#!/bin/bash

# Helper functions for Supabase package generator

# Auto-generate DATABASE_URL from Supabase credentials
generate_database_url() {
    local project_id=$1
    local db_password=$2
    local use_pooler=${3:-false}
    
    if [ "$use_pooler" = true ]; then
        # Connection pooler for serverless (recommended for Drizzle in serverless)
        echo "postgresql://postgres.${project_id}:${db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    else
        # Direct connection (for local development and Drizzle Studio)
        echo "postgresql://postgres:${db_password}@db.${project_id}.supabase.co:5432/postgres"
    fi
}

# Copy template file with variable substitution
copy_template() {
    local template_file=$1
    local target_file=$2
    shift 2
    # Rest are sed substitution patterns
    
    if [ ! -f "$template_file" ]; then
        echo "Warning: Template $template_file not found"
        return 1
    fi
    
    cp "$template_file" "$target_file"
    
    # Apply substitutions
    while [ $# -gt 0 ]; do
        local pattern=$1
        shift
        sed -i.bak "$pattern" "$target_file"
    done
    
    # Clean up backup files
    rm -f "${target_file}.bak"
}

# Create directory if it doesn't exist
ensure_dir() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Print colored output
color_print() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

export -f generate_database_url
export -f copy_template
export -f ensure_dir
export -f command_exists
export -f color_print
