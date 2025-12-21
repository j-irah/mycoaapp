// pages/login.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const COLLECTOR_HOME = "http://localhost:3000/collector/dashboard";

function isStaffRole(role: string | null) {
  return role === "owner" || role === "admin" || role === "reviewer";
}

function safeNext(next: string) {
  if (next && next.startsWith("/")) return next;
  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const rawNext = typeof router.query.next === "string" ? router.query.next : "";
  const next = safeNext(rawNext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, route immediately based on role
  useEffect(() => {
    let active = true;

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) return;

      await routeByRole(user.id, next);
    }

    boot();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  async function routeByRole(userId: string, nextUrl?: string) {
    // If next exists, prefer it (return-to-event flow)
    if (nextUrl && nextUrl.startsWith("/")) {
      router.replace(`http://localhost:3000${nextUrl}`);
      return;
    }

    const pr = await supabase.from("profiles").select("role").eq("id", userId).single();
    const role = pr?.data?.role ?? null;

    if (role === "artist") {
      router.replace("http://localhost:3000/artist/dashboard");
      return;
    }

    if (isStaffRole(role)) {
      router.replace("http://localhost:3000/admin");
      return;
    }

    // Collector (role null)
    router.replace(COLLECTOR_HOME);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (res.error) {
      setError(res.error.message || "Login failed.");
      setLoading(false);
      return;
    }

    const userId = res.data?.user?.id;
    if (!userId) {
      setError("Login succeeded but no user session was returned.");
      setLoading(false);
      return;
    }

    await routeByRole(userId, next);
    setLoading(false);
  }

  const signupHref = next
    ? `http://localhost:3000/signup?next=${encodeURIComponent(next)}`
    : "http://localhost:3000/signup";

  const forgotHref = next
    ? `http://localhost:3000/forgot-password?next=${encodeURIComponent(next)}`
    : "http://localhost:3000/forgot-password";

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>Login</h1>

        {error ? <div style={errorBox}>{error}</div> : null}

        <form onSubmit={handleLogin}>
          <label style={label}>Email</label>
          <input
            style={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label style={label}>Password</label>
          <input
            style={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            type="password"
            placeholder="••••••••"
          />

          <button type="submit" style={btn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={footerCol}>
          <div style={footerRow}>
            <span style={{ color: "#64748b", fontWeight: 800 }}>Don’t have an account?</span>
            <Link href={signupHref} style={linkStyle}>
              Sign up
            </Link>
          </div>

          <div style={footerRow}>
            <span style={{ color: "#64748b", fontWeight: 800 }}>Forgot your password?</span>
            <Link href={forgotHref} style={linkStyle}>
              Reset it
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  padding: 16,
  fontFamily: "Arial, sans-serif",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "white",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const label: React.CSSProperties = {
  display: "block",
  marginTop: 10,
  marginBottom: 6,
  fontWeight: 900,
  color: "#0f172a",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.16)",
  fontWeight: 800,
  boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 12,
  background: "#1976d2",
  color: "white",
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
};

const footerCol: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const footerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  padding: 12,
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: 10,
};
