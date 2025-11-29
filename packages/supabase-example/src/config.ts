const isProduction = import.meta.env.PRODUCTION === 'true';
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;

export const FRONTEND_URL = isProduction ? supabaseUrl : 'http://localhost:3000';
export const IS_PRODUCTION = isProduction;
export const SUPABASE_URL = supabaseUrl;
