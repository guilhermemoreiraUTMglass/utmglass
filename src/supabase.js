import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://xegsmdeloprpmrogdbrz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZ3NtZGVsb3BycG1yb2dkYnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODY4ODQsImV4cCI6MjA5ODI2Mjg4NH0.NrjT2uQDEIEh67eFbeJolzLIzikf88hQvQd3hu5WLmA"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
