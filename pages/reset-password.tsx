// pages/reset-password.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const next = typeof router.query.next === "string" ? router.query.next : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Supabase sets the session when arriving from the reset email link
    // We just check if user exists to determine readiness.
    let active = true;

    async function boot() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setReady(!!data?.user);
    }

    boot();
    return () => {
      active = false;
    };
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!ready) return setError("Reset link is invalid or expired. Please request a new one.");
    if (!password) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);

    const res = await supabase.auth.updateUser({ password });

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    setSuccess("Password updated. You can now log in.");
    setLoading(false);

    const loginHref = next
      ? `http://localhost:3000/login?next=${encodeURIComponent(next)}`
      : "http://localhost:3000/login";

    setTimeout(() => router.replace(loginHref), 900);
  }

  const forgotHref = next
    ? `http://localhost:3000/forgot-password?next=${encodeURIComponent(next)}`
    : "http://localhost:3000/forgot-password";

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>Choose a new password</h1>

        {!ready ? (
          <>
            <div style={errorBox}>
              Reset link is invalid or expired. Please request a new reset link.
            </div>
            <div style={footerRow}>
              <span style={{ color: "#64748b", fontWeight: 800 }}>Need a new link?</span>
              <Link href={forgotHref} style={linkStyle}>
                Reset password
              </Link>
            </div>
          </>
        ) : (
          <>
            {error ? <div style={errorBox}>{error}</div> : null}
            {success ? <div style={successBox}>{success}</div> : null}

            <form onSubmit={handleSetPassword}>
              <label style={label}>New password</label>
              <input
                style={input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                type="password"
                placeholder="Use 8+ characters"
              />

              <label style={label}>Confirm password</label>
              <input
                style={input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                type="password"
                placeholder="Re-enter password"
              />

              <button type="submit" style={btn} disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
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
