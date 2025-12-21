// pages/forgot-password.tsx
// @ts-nocheck

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const next = typeof router.query.next === "string" ? router.query.next : "";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const em = email.trim();
    if (!em) return setError("Email is required.");

    setLoading(true);

    const redirectTo = next
      ? `http://localhost:3000/reset-password?next=${encodeURIComponent(next)}`
      : "http://localhost:3000/reset-password";

    const res = await supabase.auth.resetPasswordForEmail(em, { redirectTo });

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    setSuccess("If that email exists, a password reset link has been sent.");
    setLoading(false);
  }

  const loginHref = next ? `http://localhost:3000/login?next=${encodeURIComponent(next)}` : "http://localhost:3000/login";

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>Reset password</h1>

        {error ? <div style={errorBox}>{error}</div> : null}
        {success ? <div style={successBox}>{success}</div> : null}

        <form onSubmit={handleSend}>
          <label style={label}>Email</label>
          <input
            style={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <button type="submit" style={btn} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div style={footerRow}>
          <span style={{ color: "#64748b", fontWeight: 800 }}>Remembered it?</span>
          <Link href={loginHref} style={linkStyle}>
            Back to login
          </Link>
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

const footerRow: React.CSSProperties = {
  marginTop: 14,
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

const successBox: React.CSSProperties = {
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  padding: 12,
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: 10,
};
