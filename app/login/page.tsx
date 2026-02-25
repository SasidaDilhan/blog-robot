"use client";

import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createSupabaseBrowserClient();

    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // This MUST match what you added in Supabase Auth URL Configuration Redirect URLs
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Continue with Google to use the blog automation app.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-6 w-full rounded-xl bg-black text-white py-2"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
