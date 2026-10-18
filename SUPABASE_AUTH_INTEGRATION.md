# Supabase Auth integration notes

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Render's environment settings. Use the browser-safe publishable/anon key only; never use a service_role key in frontend variables.
- `src/lib/supabaseAuth.ts` exposes `registerWithEmail` and `loginWithEmail`.
- If registration returns `needsEmailConfirmation: true`, show exactly: "Check your email and confirm your account before logging in." Do not redirect.
- Redirect to the dashboard only after `loginWithEmail` returns a non-null session.
- Wrap private React Router route elements with `SupabaseAuthGuard`; it checks `supabase.auth.getSession()` and redirects to `/login` if there is no session.
- This project currently uses a custom in-component portal and seed profiles rather than React Router routes. The guard is provided for private route elements, but must be mounted in the app's actual routing/auth flow before it protects the existing dashboard.
- The existing feed/polls/events/marketplace state in `src/App.tsx` still needs to be migrated module-by-module to these Supabase tables. Do not treat this PR as a completed UI data migration.
