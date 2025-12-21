// pages/forgot-password.tsx

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const next = useMemo(() => safeNext(router.query.next), [router.query.next]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const redirectTo = next
    ? `/reset-password?next=${encodeURIComponent(next)}`
    : "/reset-password";

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setMsg("If that email exists, you’ll receive a reset link.");
    setLoading(false);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>Forgot password</h1>
        <p style={{ marginTop: 8, color: "#666" }}>We’ll email you a reset link.</p>

        {err ? <div style={errorBox}>{err}</div> : null}
        {msg ? <div style={successBox}>{msg}</div> : null}

        <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <button style={primaryBtn} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div style={{ marginTop: 14 }}>
          <Link href={loginHref} style={linkStyle}>
            Back to login
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

const successBox: React.CSSProperties = {
  marginTop: 10,
  padding: "0.8rem",
  borderRadius: 12,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
};
