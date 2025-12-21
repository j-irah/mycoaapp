// pages/login.tsx
// NOTE: All routing is relative so it works on production domains (no localhost hardcoding).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type StaffRole = "owner" | "admin" | "reviewer";
type Role = StaffRole | "artist" | null;

const STAFF_ROLES: StaffRole[] = ["owner", "admin", "reviewer"];
const COLLECTOR_HOME = "/dashboard";

function safeNext(input: unknown) {
  const s = typeof input === "string" ? input : "";
  if (!s) return "";
  if (!s.startsWith("/")) return "";
  if (s.startsWith("//")) return "";
  return s;
}

async function fetchRole(userId: string): Promise<Role> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return (data?.role ?? null) as Role;
}

async function routeByRole(router: ReturnType<typeof useRouter>, nextUrl: string) {
  const safe = safeNext(nextUrl);

  if (safe) {
    router.replace(safe);
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.replace("/login");
    return;
  }

  const role = await fetchRole(user.id);

  if (role === "artist") {
    router.replace("/artist/dashboard");
    return;
  }

  if (role && STAFF_ROLES.includes(role as StaffRole)) {
    router.replace("/admin");
    return;
  }

  router.replace(COLLECTOR_HOME);
}

export default function LoginPage() {
  const router = useRouter();
  const next = useMemo(() => safeNext(router.query.next), [router.query.next]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
  const forgotHref = next ? `/forgot-password?next=${encodeURIComponent(next)}` : "/forgot-password";

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;
      if (user) await routeByRole(router, next);
    })();

    return () => {
      alive = false;
    };
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    await routeByRole(router, next);
    setLoading(false);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>Login</h1>
        <p style={{ marginTop: 8, color: "#666" }}>Use your email + password.</p>

        {err ? <div style={errorBox}>{err}</div> : null}

        <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
          />

          <label style={{ ...labelStyle, marginTop: 12 }}>Password</label>
          <input
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />

          <button style={primaryBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Link href={signupHref} style={linkStyle}>
            Create account
          </Link>
          <Link href={forgotHref} style={linkStyle}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3f3f3",
  padding: "2rem",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  borderRadius: 14,
  padding: "1.25rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
};

const labelStyle: React.CSSProperties = { display: "block", fontWeight: 900, marginTop: 6 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  borderRadius: 12,
  border: "1px solid #ddd",
  padding: "0.7rem 0.8rem",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  marginTop: 14,
  width: "100%",
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  padding: "0.75rem 1rem",
  fontWeight: 900,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = { fontWeight: 900, textDecoration: "none", color: "#1976d2" };

const errorBox: React.CSSProperties = {
  marginTop: 10,
  padding: "0.8rem",
  borderRadius: 12,
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 900,
};
