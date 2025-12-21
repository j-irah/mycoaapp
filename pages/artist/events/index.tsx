// pages/artist/events/index.tsx
// Artist "My Events" page with inline nav + logout redirect to current origin.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import RequireAuth from "../../../components/RequireAuth";
import { supabase } from "../../../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

type EventRow = {
  id: string;
  slug: string;
  artist_user_id: string;
  artist_name: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  is_active: boolean;
};

function isArtist(role: Role) {
  return role === "artist";
}

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

export default function ArtistEventsIndexPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setLoadingRole(false);
        return;
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!alive) return;

      setRole((data?.role ?? null) as Role);
      setLoadingRole(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function loadMyEvents() {
    setLoading(true);
    setErr(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("id, slug, artist_user_id, artist_name, event_name, event_location, event_date, event_end_date, is_active")
      .eq("artist_user_id", user.id)
      .order("event_date", { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as EventRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      await loadMyEvents();
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function onLogout() {
    await supabase.auth.signOut();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    router.replace(origin ? `${origin}/login` : "/login");
  }

  const navItems = useMemo(
    () => [
      { label: "Dashboard", href: "/artist/dashboard" },
      { label: "My Events", href: "/artist/events" },
      { label: "Create Event", href: "/artist/events/new" },
    ],
    []
  );

  return (
    <RequireAuth>
      <div style={pageStyle}>
        <nav style={navStyle}>
          <div style={navInner}>
            <Link href="/artist/dashboard" style={brandStyle}>
              Raw Authentics
            </Link>

            <div style={navLinks}>
              {navItems.map((item) => {
                const active =
                  router.pathname === item.href ||
                  (item.href !== "/artist/dashboard" && router.asPath.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ ...navLinkStyle, ...(active ? activeNavLinkStyle : null) }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <button onClick={onLogout} style={logoutBtn}>
              Logout
            </button>
          </div>
        </nav>

        <div style={containerStyle}>
          <div style={topRow}>
            <h1 style={{ margin: 0, fontWeight: 900 }}>My Events</h1>
            <Link href="/artist/events/new" style={primaryLinkBtn}>
              Create Event
            </Link>
          </div>

          {loadingRole ? (
            <div style={{ ...cardStyle, marginTop: "1rem" }}>Loading…</div>
          ) : !isArtist(role) ? (
            <div style={{ ...cardStyle, marginTop: "1rem" }}>
              <div style={{ fontWeight: 900 }}>Access denied</div>
              <div style={{ color: "#666", marginTop: 6 }}>You must be an approved artist to view this page.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard" style={linkStyle}>
                  Go to dashboard
                </Link>
              </div>
            </div>
          ) : loading ? (
            <div style={{ ...cardStyle, marginTop: "1rem" }}>Loading your events…</div>
          ) : err ? (
            <div style={{ ...cardStyle, ...errorBox, marginTop: "1rem" }}>{err}</div>
          ) : rows.length === 0 ? (
            <div style={{ ...cardStyle, marginTop: "1rem" }}>
              <div style={{ fontWeight: 900 }}>No events yet.</div>
              <div style={{ color: "#666", marginTop: 6 }}>Create your first event to generate a QR code.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/artist/events/new" style={linkStyle}>
                  Create an event
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
              {rows.map((r) => (
                <div key={r.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>{r.event_name || "Event"}</div>
                      <div style={{ marginTop: 4, color: "#666", fontWeight: 900 }}>
                        {fmtDateRange(r.event_date, r.event_end_date)} • {r.event_location || "—"}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <span style={r.is_active ? badgeActive : badgeInactive}>
                          {r.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <Link href={`/artist/events/${r.id}`} style={secondaryLinkBtn}>
                        View / Edit
                      </Link>
                      <Link href={`/artist/events/qr/${r.slug}`} style={secondaryLinkBtn}>
                        QR / Print
                      </Link>
                      <Link href={`/e/${r.slug}`} style={secondaryLinkBtn} target="_blank" rel="noreferrer">
                        Public Page
                      </Link>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, color: "#666", fontSize: "0.95rem" }}>
                    Slug: <code style={codePill}>{r.slug}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#f3f3f3", fontFamily: "Arial, sans-serif" };
const containerStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "1.5rem" };

const topRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" };

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "1.1rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const primaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 12,
  background: "#1976d2",
  color: "#fff",
  padding: "0.7rem 0.95rem",
  fontWeight: 900,
  textDecoration: "none",
};

const secondaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.65rem 0.9rem",
  fontWeight: 900,
  textDecoration: "none",
  color: "#111",
};

const linkStyle: React.CSSProperties = { fontWeight: 900, color: "#1976d2", textDecoration: "none" };

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 900,
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

const codePill: React.CSSProperties = {
  display: "inline-block",
  background: "#f5f5f5",
  border: "1px solid #ddd",
  padding: "0.25rem 0.55rem",
  borderRadius: 10,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

// Nav styles
const navStyle: React.CSSProperties = { background: "#fff", borderBottom: "1px solid #eaeaea" };

const navInner: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0.9rem 1.25rem",
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  justifyContent: "space-between",
};

const brandStyle: React.CSSProperties = {
  fontWeight: 900,
  textDecoration: "none",
  color: "#111",
  fontSize: "1.05rem",
  whiteSpace: "nowrap",
};

const navLinks: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1.1rem",
  flexWrap: "wrap",
  justifyContent: "center",
  flex: 1,
};

const navLinkStyle: React.CSSProperties = { textDecoration: "none", color: "#111", fontWeight: 900, padding: "0.25rem 0.15rem" };

const activeNavLinkStyle: React.CSSProperties = { color: "#1976d2", textDecoration: "underline", textUnderlineOffset: 6 };

const logoutBtn: React.CSSProperties = {
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.5rem 0.75rem",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};
