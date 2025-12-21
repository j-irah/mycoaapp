// pages/reset-password.tsx

import { useEffect, useMemo, useState } from "react";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const next = useMemo(() => safeNext(router.query.next), [router.query.next]);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  useEffect(() => {
    // Ensure the user has a recovery session (Supabase sets it via the reset link)
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // They might have opened the page directly without the recovery token
        // Send them back to login.
        router.replace("/login");
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: pw1 });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setMsg("Password updated. You can now log in.");
    setLoading(false);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>Reset password</h1>
        <p style={{ marginTop: 8, color: "#666" }}>Enter your new password.</p>

        {err ? <div style={errorBox}>{err}</div> : null}
        {msg ? <div style={successBox}>{msg}</div> : null}

        <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <label style={labelStyle}>New password</label>
          <input
            style={inputStyle}
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            type="password"
            required
          />

          <label style={{ ...labelStyle, marginTop: 12 }}>Confirm new password</label>
          <input
            style={inputStyle}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            type="password"
            required
          />

          <button style={primaryBtn} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
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
