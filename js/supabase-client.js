
"use strict";

// =========================================
// THE MUSEUM OF US
// PHASE 02 — SUPABASE CLIENT
// =========================================

// Replace BOTH placeholder values below.
// Keep the quotation marks.

const SUPABASE_URL = "https://zhlobntcuapjtkfoexin.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_q54M_4F7_X3JvDpLotRpiQ_5akc6uYz";


// Check that the Supabase library loaded.
if (
  !window.supabase ||
  typeof window.supabase.createClient !== "function"
) {
  console.error(
    "Supabase CDN failed to load. Check your internet connection."
  );

} else if (
  SUPABASE_URL.includes("PASTE_") ||
  SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")
) {
  console.error(
    "Add your Supabase URL and publishable key to supabase-client.js."
  );

} else {

  // Create one reusable Supabase client.
  window.museumSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );

  console.log("Museum Supabase client initialized.");
}
