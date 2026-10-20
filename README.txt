THE MUSEUM OF US — REFINED PROJECT
===================================

PROJECT STRUCTURE
- index.html: private sign-in page
- museum.html: protected visitor museum
- admin.html: protected curator dashboard and memory editor
- css/style.css: shared foundation and sign-in/shared protected-page styles
- css/museum.css: museum-specific welcome, collections, cards, and memory viewer
- css/admin.css: curator dashboard and memory-editor styles
- js/app.js: sign-in and role-based routing
- js/supabase-client.js: Supabase client configuration
- js/access-control.js: profile/role lookup
- js/page-guard.js: protected-page access checks and sign-out
- js/museum-gallery.js: published gallery, collections, post-type rendering, and memory viewer
- js/admin-memory-editor.js: curator memory CRUD, upload validation, and image cleanup
- assets/: existing project artwork

IMPORTANT
- The project continues to use the existing Supabase backend.
- The browser uses the Supabase publishable key in js/supabase-client.js.
  Never place a Supabase service-role key or database password in browser code.
- The database must already contain the project's museum_profiles and museum_memories
  tables, the is_featured column, and the post_type column.
- The private Storage bucket must remain named museum-photos and its existing
  access policies should be kept. This refinement does not change database
  policies or storage permissions.
- Letters and short notes are text-first and do not require a photo.
- Collection determines where a memory appears; post_type determines how it looks.
- The admin stylesheet is loaded after style.css so it can use shared design tokens.

INSTALL
1. Keep a backup of your current project folder.
2. Extract the entire ZIP.
3. Copy the contents of the included the-museum-of-us folder into your project
   folder, allowing the refined files to replace the old versions.
4. Keep the folder structure unchanged; do not move HTML, CSS, JS, or assets
   files out of their folders.
5. Open index.html through your usual local development server or deployment
   preview. Avoid opening a protected page as a substitute for signing in.

CHECKS PERFORMED ON THIS PACKAGE
- JavaScript syntax checked with Node.js.
- CSS parsed for syntax errors.
- HTML structure and local script/stylesheet references checked.
- Source review performed for role checks, post-type handling, and required
  database fields.

STILL REQUIRED IN YOUR BROWSER
- Sign in with the existing visitor account and confirm the museum opens.
- Sign in with the existing admin account and confirm the editor loads.
- Create an unpublished text-only letter and a text-only note.
- Publish one photo memory and one milestone, then confirm the images load.
- Edit an existing memory and verify its post type and featured checkbox persist.
- Confirm visitors cannot access admin.html or the locked Hidden Exhibition.
- Test the sign-out button, collection navigation, and memory viewer on mobile
  and desktop.

This package has not been connected to your live Supabase project for an
authenticated end-to-end browser test. Complete the browser checks above before
deploying.
