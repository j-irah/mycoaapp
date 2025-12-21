// pages/signup.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

function safeNext(next: string) {
  if (next && next.startsWith("/")) return next;
  return "";
}

export default function SignupPage() {
  const router = useRouter();
  const rawNext = typeof router.query.next === "string" ? router.query.next : "";
  const next = safeNext(rawNext);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [requestArtist, setRequestArtist] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const name = fullName.trim();
    const em = email.trim();

    if (!name) return setError("Full name is required.");
    if (!em) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);

    // Create auth user (collector by default; staff approves artist role later)
    const res = await supabase.auth.signUp({
      email: em,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    const userId = res.data?.user?.id;

    // If they requested artist, create an artist_request row
    if (requestArtist && userId) {
      const ar = await supabase.from("artist_requests").insert({
        user_id: userId,
        full_name: name,
        portfolio_url: portfolioUrl.trim() || null,
        message: message.trim() || null,
        status: "pending",
      });

      if (ar.error) {
        setError(ar.error.message);
        setLoading(false);
        return;
      }
    }

    // Prevent any immediate auto-routing in-app after signup
    await supabase.auth.signOut();

    setLoading(false);

    setSuccess(
      requestArtist
        ? "Account created. Your artist request is pending staff approval. Please sign in."
        : "Account created. Please sign in."
    );

    const loginHref = next
      ? `http://localhost:3000/login?next=${encodeURIComponent(next)}`
      : "http://localhost:3000/login";

    setTimeout(() => router.replace(loginHref), 900);
  }

  const loginHref = next
    ? `http://localhost:3000/login?next=${encodeURIComponent(next)}`
    : "http://localhost:3000/login";

  const forgotHref = next
    ? `http://localhost:3000/forgot-password?next=${encodeURIComponent(next)}`
    : "http://localhost:3000/forgot-password";

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>Create account</h1>

        {error ? <div style={errorBox}>{error}</div> : null}
        {success ? <div style={successBox}>{success}</div> : null}

        <form onSubmit={handleSignup}>
          <label style={label}>Full name</label>
          <input
            style={input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Artist"
          />

          <label style={label}>Email</label>
          <input
            style={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            type="email"
            required
          />

          <label style={label}>Password</label>
          <input
            style={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            type="password"
            placeholder="Use 8+ characters"
            required
          />

          <label style={label}>Confirm password</label>
          <input
            style={input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            type="password"
            placeholder="Re-enter password"
            required
          />

          <div style={{ marginTop: 12, ...softBox }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
              <input type="checkbox" checked={requestArtist} onChange={(e) => setRequestArtist(e.target.checked)} />
              Request Artist Account (requires staff approval)
            </label>

            {requestArtist ? (
              <div style={{ marginTop: 10 }}>
                <label style={labelSmall}>Portfolio URL (optional)</label>
                <input
                  style={input}
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://…"
                />

                <label style={labelSmall}>Message (optional)</label>
                <textarea
                  style={{ ...input, minHeight: 90, resize: "vertical" }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us where you’ll be signing, your socials, etc."
                />
              </div>
            ) : null}
          </div>

          <button type="submit" style={btn} disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <div style={footerCol}>
          <div style={footerRow}>
            <span style={{ color: "#64748b", fontWeight: 800 }}>Already have an account?</span>
            <Link href={loginHref} style={linkStyle}>
              Sign in
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

const labelSmall: React.CSSProperties = {
  display: "block",
  marginTop: 10,
  marginBottom: 6,
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 13,
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

const successBox: React.CSSProperties = {
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  padding: 12,
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: 10,
};

const softBox: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.04)",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 12,
  padding: 12,
};
