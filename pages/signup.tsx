// pages/signup.tsx
// Signup (collectors by default). Optional request for partner access.
// NOTE: all navigation is relative.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

function safeNext(input: unknown) {
  const s = typeof input === "string" ? input : "";
  if (!s) return "";
  if (!s.startsWith("/")) return "";
  if (s.startsWith("//")) return "";
  return s;
}

export default function SignupPage() {
  const router = useRouter();
  const next = useMemo(() => safeNext(router.query.next), [router.query.next]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [requestPartner, setRequestPartner] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const forgotHref = next ? `/forgot-password?next=${encodeURIComponent(next)}` : "/forgot-password";
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw1,
      options: {
        // ✅ Updated metadata key
        data: { full_name: fullName, request_partner: requestPartner },
      },
    });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is enabled, user may be null. In either case, send to login.
    if (!data.user) {
      router.replace(loginHref);
      setLoading(false);
      return;
    }

    router.replace(next || "/dashboard");
    setLoading(false);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>Create account</h1>
        <p style={{ marginTop: 8, color: "#666" }}>Collectors default to the collector dashboard.</p>

        {err ? <div style={errorBox}>{err}</div> : null}

        <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <label style={labelStyle}>Full name</label>
          <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required />

          <label style={{ ...labelStyle, marginTop: 12 }}>Email</label>
          <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label style={{ ...labelStyle, marginTop: 12 }}>Password</label>
          <input style={inputStyle} value={pw1} onChange={(e) => setPw1(e.target.value)} type="password" required />

          <label style={{ ...labelStyle, marginTop: 12 }}>Confirm password</label>
          <input style={inputStyle} value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" required />

          <label style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
            <input type="checkbox" checked={requestPartner} onChange={(e) => setRequestPartner(e.target.checked)} />
            <span style={{ fontWeight: 900 }}>Request partner account</span>
          </label>

          <button style={primaryBtn} disabled={loading}>
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Link href={loginHref} style={linkStyle}>
            Back to login
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
  maxWidth: 460,
  background: "#fff",
  borderRadius: 14,
  padding: "1.25rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
};

const labelStyle: React.CSSProperties = { display: "block", fontWeight: 900, marginTop: 6 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
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
