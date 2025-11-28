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
