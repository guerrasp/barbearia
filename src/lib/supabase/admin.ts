import { createClient } from "@supabase/supabase-js";

// Client para uso em API Routes (server-side) - usa service role key para bypass de rate limits
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
