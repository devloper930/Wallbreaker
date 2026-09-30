import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env from project root is loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://qgzyekzzaxfieomdkkfg.supabase.co';

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.warn(
    '[SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.'
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
