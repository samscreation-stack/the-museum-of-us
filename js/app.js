
"use strict";

// ==========================================
// THE MUSEUM OF US
// PHASE 2C — ROLE-BASED LOGIN
// ==========================================

const museumSupabase = window.museumSupabase;

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("visitor-email");
const passwordInput = document.getElementById("visitor-password");

const passwordToggle = document.getElementById("toggle-password");
const authStatus = document.getElementById("auth-status");
const signOutButton = document.getElementById("sign-out-button");

const submitButton = loginForm.querySelector(
  'button[type="submit"]'
);

const submitLabel = submitButton.querySelector("span:first-child");

let isSubmitting = false;


// ------------------------------------------
// STATUS MESSAGE
// ------------------------------------------

function showStatus(message, isSuccess = false) {
  authStatus.textContent = message;
  authStatus.hidden = false;

  authStatus.classList.toggle("is-success", isSuccess);
}


// ------------------------------------------
// SIGNED-OUT INTERFACE
// ------------------------------------------

function showSignedOut() {
  loginForm.hidden = false;

  authStatus.textContent = "";
  authStatus.hidden = true;
  authStatus.classList.remove("is-success");

  signOutButton.hidden = true;
  signOutButton.disabled = false;
}


// ------------------------------------------
// SUBMIT BUTTON STATE
// ------------------------------------------

function setLoading(isLoading) {
  submitButton.disabled = isLoading;

  submitButton.setAttribute(
    "aria-busy",
    String(isLoading)
  );

  submitLabel.textContent = isLoading
    ? "Checking access..."
    : "Enter the museum";
}


// ------------------------------------------
// PASSWORD SHOW / HIDE
// ------------------------------------------

passwordToggle.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";
  passwordToggle.textContent = isHidden ? "Hide" : "Show";

  passwordToggle.setAttribute(
    "aria-pressed",
    String(isHidden)
  );
});


// ------------------------------------------
// CHECK ROLE AND REDIRECT
// ------------------------------------------

async function routeUserByRole(user) {
  try {
    if (!window.museumAccess) {
      throw new Error("Role helper did not load.");
    }

    const profile = await window.museumAccess
      .getProfileForUser(user.id);

    if (
      !profile ||
      !["admin", "visitor"].includes(profile.role)
    ) {
      await museumSupabase.auth.signOut();

      showSignedOut();

      showStatus(
        "This account has no valid museum role. " +
        "Check the user's record in public.museum_profiles."
      );

      return;
    }

    // The role comes from Supabase, not from a form field.
    const destination =
      profile.role === "admin"
        ? "./admin.html"
        : "./museum.html";

    window.location.replace(destination);

  } catch (error) {
    console.error("Could not verify the museum role:", error);

    showStatus(
      "Your login could not be connected to a museum role. " +
      "Check the database table, RLS policy, and browser console."
    );
  }
}


// ------------------------------------------
// RESTORE AN EXISTING SESSION
// ------------------------------------------

async function routeExistingSession() {
  try {
    const { data, error } =
      await museumSupabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!data.session) {
      return;
    }

    // Validate the user with Supabase Auth.
    const { data: userData, error: userError } =
      await museumSupabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (userData.user) {
      await routeUserByRole(userData.user);
    }

  } catch (error) {
    console.error("Could not restore the session:", error);

    showStatus(
      "We couldn't verify your existing session. " +
      "Check your connection and try again."
    );
  }
}


// ------------------------------------------
// SIGN-IN FORM
// ------------------------------------------

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  if (!museumSupabase || !window.museumAccess) {
    showStatus(
      "The authentication system is not ready. " +
      "Check your script order and Supabase configuration."
    );

    return;
  }

  isSubmitting = true;
  setLoading(true);

  try {
    const { data, error } =
      await museumSupabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value
      });

    if (error) {
      showStatus(
        "We couldn't sign you in. Check the email and password, " +
        "and confirm that the account exists in Supabase."
      );

      return;
    }

    if (!data.user) {
      showStatus(
        "No user was returned. Please try again."
      );

      return;
    }

    // Do not leave the password in the input.
    passwordInput.value = "";
    passwordInput.type = "password";

    passwordToggle.textContent = "Show";
    passwordToggle.setAttribute("aria-pressed", "false");

    await routeUserByRole(data.user);

  } catch (error) {
    console.error("Login request failed:", error);

    showStatus(
      "We couldn't complete the login. Check the connection " +
      "and browser console, then try again."
    );

  } finally {
    isSubmitting = false;
    setLoading(false);
  }
});


// ------------------------------------------
// SIGNED-OUT EVENT
// ------------------------------------------

if (museumSupabase) {
  museumSupabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      showSignedOut();
    }
  });
}


// ------------------------------------------
// MESSAGES FROM PROTECTED PAGES
// ------------------------------------------

const params = new URLSearchParams(window.location.search);

if (params.get("reason") === "login-required") {
  showStatus("Please sign in before entering the museum.");

} else if (params.get("reason") === "role-missing") {
  showStatus(
    "This account has no assigned museum role. " +
    "Ask the curator to check the role records."
  );
}


// ------------------------------------------
// INITIALISE
// ------------------------------------------

if (!museumSupabase) {
  showStatus(
    "Supabase is unavailable. Check supabase-client.js."
  );

} else {
  routeExistingSession();
}
