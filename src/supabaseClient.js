import { createClient } from '@supabase/supabase-js'

/**
 * Supabase is optional for the prototype. The Diagnostics/Kinematic/Workout
 * views run entirely on local mock data, so if env vars are absent (e.g. a
 * static deploy), we export `null` instead of throwing at import time.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null
