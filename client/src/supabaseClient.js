import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || "https://kyjupformsmvsesironi.supabase.co";
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "sb_publishable_aAfklMGN15z1Q2SMkVMSsg_wY7yJS46";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
