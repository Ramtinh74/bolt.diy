import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/supabase-generated';

// Create a single supabase client for interacting with your database
export const createSupabaseClient = (supabaseUrl: string, supabaseKey: string) => {
  return createClient<Database>(supabaseUrl, supabaseKey);
};