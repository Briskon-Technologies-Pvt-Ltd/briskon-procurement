"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 🔹 Step 1: Sign in using Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (signInError) {
        console.error("Login error:", signInError.message);
        setError("Invalid email or password");
        return;
      }

      if (!data?.user) {
        setError("User not found");
        return;
      }

      // 🔹 Step 2: Fetch profile based on user_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("user_id", data.user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile fetch error:", profileError?.message);
        setError("Unable to fetch profile");
        return;
      }

      // 🔹 Step 3: Get role from metadata JSON
      const role = profile?.metadata?.role || "supplier";
      console.log("User role:", role);

      // 🔹 Step 4: Redirect based on role
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "buyer") {
        router.push("/buyer");
      } else {
        router.push("/supplier");
      }
    } catch (err: any) {
      console.error("Unexpected login error:", err.message);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>
      {error && <div className="error-message">{error}</div>}

      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <a href="/forgot-password" className="forgot-link">
        Forgot password?
      </a>
    </form>
  );
}
