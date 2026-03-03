import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://xgirbpyifpzjhzlpluzm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaXJicHlpZnB6amh6bHBsdXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTI5ODIsImV4cCI6MjA4Nzc4ODk4Mn0.E88ILSY4BEDcQ6dfDeq3fA03AcmCvYteeAHOTPbhEGo";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
