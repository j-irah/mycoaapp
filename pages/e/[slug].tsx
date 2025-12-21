// pages/e/[slug].tsx
// Public event page (QR landing).
// - No localhost hardcoding.
// - Removes the "Link:" debug box.
// - Fixes the login/signup loop by detecting auth state.
// - If logged in, shows "Request COA" and routes to /dashboard?event=<slug>

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type EventRow = {
  id: string;
  slug: string;
  artist_name: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  is_active: boolean;
};

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

export default function PublicEventPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : null;

  const [eventRow, setEventRow] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Auth detection (prevents “log in” loop)
  useEffect(() => {
    let alive = true;

    (async () => {
      setAuthLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;
      setIsLoggedIn(!!user);
      setAuthLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setAuthLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load event data
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!slug) return;

      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("events")
        .select("id, slug, artist_name, event_name, event_location, event_date, event_end_date, is_active")
        .eq("slug", slug)
        .single();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setEventRow(null);
      } else {
        setEventRow(data as EventRow);
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [slug]);

  const canSubmit = useMemo(() => {
    return !!eventRow?.is_active;
  }, [eventRow]);

  const nextBackToThisEvent = useMemo(() => {
    if (!slug) return "";
    return `/e/${slug}`;
  }, [slug]);

  const requestHref = useMemo(() => {
    if (!slug) return "/dashboard";
    return `/dashboard?event=${encodeURIComponent(slug)}`;
  }, [slug]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {loading ? (
          <>
            <h1 style={h1}>Loading…</h1>
            <p style={muted}>Please wait.</p>
          </>
        ) : err ? (
          <>
            <h1 style={h1}>Event not found</h1>
            <p style={muted}>{err}</p>
            <Link href="/" style={linkStyle}>
              Go home
            </Link>
          </>
        ) : !eventRow ? (
          <>
            <h1 style={h1}>Event not found</h1>
            <p style={muted}>This QR code may be invalid, or the event may not be available.</p>
            <Link href="/" style={linkStyle}>
              Go home
            </Link>
          </>
        ) : (
          <>
            <h1 style={h1}>{eventRow.event_name || "Signing Event"}</h1>
            <div style={{ fontWeight: 900, color: "#444", marginTop: 6 }}>
              {eventRow.artist_name || "Artist"}
            </div>

            <div style={{ marginTop: 14, color: "#444", lineHeight: 1.55 }}>
              <div>
                <strong>Dates:</strong> {fmtDateRange(eventRow.event_date, eventRow.event_end_date)}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Location:</strong> {eventRow.event_location || "—"}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Status:</strong>{" "}
                <span style={eventRow.is_active ? badgeActive : badgeInactive}>
                  {eventRow.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {!canSubmit ? (
              <div style={{ ...noticeBox, marginTop: 16 }}>
                This event is not accepting submissions right now.
              </div>
            ) : authLoading ? (
              <div style={{ ...noticeBox, marginTop: 16 }}>Checking login…</div>
            ) : isLoggedIn ? (
              <div style={{ marginTop: 16 }}>
                <p style={muted}>You’re logged in. Continue to submit your COA request.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button style={primaryBtn} onClick={() => router.push(requestHref)}>
                    Request COA
                  </button>
                  <Link href="/dashboard" style={secondaryLinkBtn}>
                    Go to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <p style={muted}>To request a COA, you’ll need to log in first (or create an account).</p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button
                    style={primaryBtn}
                    onClick={() => router.push(`/login?next=${encodeURIComponent(nextBackToThisEvent)}`)}
                  >
                    Log in to request COA
                  </button>
                  <Link
                    href={`/signup?next=${encodeURIComponent(nextBackToThisEvent)}`}
                    style={secondaryLinkBtn}
                  >
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f3f3",
  padding: "2rem",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  background: "#fff",
  borderRadius: 16,
  padding: "1.5rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
};

const h1: React.CSSProperties = { margin: 0, fontWeight: 900, fontSize: "2rem" };

const muted: React.CSSProperties = { marginTop: 10, color: "#666" };

const linkStyle: React.CSSProperties = { fontWeight: 900, color: "#6a1b9a", textDecoration: "underline" };

const primaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  padding: "0.8rem 1rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.8rem 1rem",
  fontWeight: 900,
  textDecoration: "none",
  color: "#333",
};

const noticeBox: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#333",
};

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
  fontSize: "0.9rem",
};
