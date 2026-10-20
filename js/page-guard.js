
"use strict";

// ==========================================
// THE MUSEUM OF US
// PHASE 2C — PROTECTED-PAGE GUARD
// ==========================================

(async function protectCurrentPage() {
  const client = window.museumSupabase;
  const access = window.museumAccess;

  const pageType = document.body.dataset.pageType;

  const allowedRoles = (
    document.body.dataset.allowedRoles || ""
  )
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  const protectedContent =
    document.getElementById("protected-app");

  const accessMessage =
    document.getElementById("access-message");

  const accessMessageText =
    document.getElementById("access-message-text");

  const signOutButton =
    document.getElementById("global-sign-out");

  const pageNotice =
    document.getElementById("page-notice");


  // ----------------------------------------
  // SHOW AN ACCESS ERROR
  // ----------------------------------------

  function showAccessError(message) {
    if (protectedContent) {
      protectedContent.hidden = true;
    }

    if (accessMessageText) {
      accessMessageText.textContent = message;
    }

    if (accessMessage) {
      accessMessage.hidden = false;
    }

    document.documentElement.classList.remove("access-pending");
  }


  // ----------------------------------------
  // CHECK THAT THE SERVICES EXIST
  // ----------------------------------------

  if (!client || !access) {
    showAccessError(
      "The authentication service did not load. " +
      "Check your Supabase configuration and script order."
    );

    return;
  }


  try {
    // First check whether a session exists.
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData.session) {
      window.location.replace(
        "./index.html?reason=login-required"
      );

      return;
    }


    // Validate the current user with Supabase Auth.
    const { data: userData, error: userError } =
      await client.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!userData.user) {
      window.location.replace(
        "./index.html?reason=login-required"
      );

      return;
    }


    // Fetch the role assigned by the database.
    const profile = await access.getProfileForUser(
      userData.user.id
    );

    if (
      !profile ||
      !["admin", "visitor"].includes(profile.role)
    ) {
      await client.auth.signOut();

      window.location.replace(
        "./index.html?reason=role-missing"
      );

      return;
    }


    // Deny visitors access to the administrator page.
    if (!allowedRoles.includes(profile.role)) {
      if (
        profile.role === "visitor" &&
        pageType === "admin"
      ) {
        window.location.replace(
          "./museum.html?notice=admin-only"
        );

        return;
      }

      showAccessError(
        "Your account is not authorised to open this page."
      );

      return;
    }


    // --------------------------------------
    // ACCESS APPROVED FOR THIS PAGE
    // --------------------------------------

    const signedInName =
      document.getElementById("signed-in-name");

    if (signedInName) {
      signedInName.textContent =
        profile.display_name || userData.user.email || "Visitor";
    }


    // Show the visitor an explanatory notice if redirected
    // away from the administrator page.
    const params = new URLSearchParams(
      window.location.search
    );

    if (
      pageNotice &&
      params.get("notice") === "admin-only"
    ) {
      pageNotice.textContent =
        "Your visitor account doesn't have curator permissions.";

      pageNotice.hidden = false;
    }


    // --------------------------------------
    // SIGN OUT
    // --------------------------------------

    if (signOutButton) {
      signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;

        try {
          const { error } = await client.auth.signOut();

          if (error) {
            throw error;
          }

          window.location.replace("./index.html");

        } catch (error) {
          console.error("Sign-out failed:", error);

          if (pageNotice) {
            pageNotice.textContent =
              "Sign-out failed. Check your connection and try again.";

            pageNotice.hidden = false;
          }

          signOutButton.disabled = false;
        }
      });
    }


    // Reveal the page only after the role check succeeds.
    document.documentElement.classList.remove("access-pending");

  } catch (error) {
    console.error("Page access check failed:", error);

    showAccessError(
      "We couldn't verify your access. Check your connection, " +
      "profile record, RLS policy, and browser console."
    );
  }

})();
