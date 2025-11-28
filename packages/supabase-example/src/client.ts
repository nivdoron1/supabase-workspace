import { createClient } from '@supabase/supabase-js';
import type { Database } from '@supabase-workspace/supabase-core';

// example Supabase instance configuration
// Credentials are loaded from the package .env file
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'example Supabase credentials missing. Check packages/supabase-example/.env file'
    );
}

/**
 * Supabase client for the example instance
 * This client is configured specifically for the example project
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});
