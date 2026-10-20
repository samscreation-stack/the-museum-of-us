
"use strict";

// THE MUSEUM OF US
// PHASE 2C — READ THE CURRENT USER'S ROLE

window.museumAccess = {
  async getProfileForUser(userId) {
    if (!window.museumSupabase) {
      throw new Error("Supabase client is not available.");
    }

    const { data, error } = await window.museumSupabase
      .from("museum_profiles")
      .select("user_id, role, display_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
};
