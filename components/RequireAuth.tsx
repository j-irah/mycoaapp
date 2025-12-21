// components/RequireAuth.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

type Props = {
  children: any;
  requireStaff?: boolean;   // true => must pass rpc is_staff()
  requireArtist?: boolean;  // true => profiles.role must be 'artist'
};

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

async function getMyRole(userId: string): Promise<Role> {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error) return null;
  return (data?.role ?? null) as Role;
}

export default function RequireAuth({ children, requireStaff = false, requireArtist = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefer ?next=, but also support legacy ?returnTo=
  const nextPath = useMemo(() => {
    const raw =
      (typeof router.query.next === "string" && router.query.next.trim()) ||
      (typeof router.query.returnTo === "string" && router.query.returnTo.trim()) ||
      "";

    if (!raw) return router.asPath || "/";
    if (!raw.startsWith("/")) return router.asPath || "/";
    return raw;
  }, [router.asPath, router.query.next, router.query.returnTo]);

  useEffect(() => {
    let active = true;

    async function check() {
      setLoading(true);
      setError(null);
      setAllowed(false);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (!active) return;

      // Not signed in -> go to login and include next
      if (userErr || !user) {
        const enc = encodeURIComponent(nextPath || "/");
        router.replace(`http://localhost:3000/login?next=${enc}`);
        return;
      }

      // Staff gate (Admin pages)
      if (requireStaff) {
        const { data: isStaff, error: staffErr } = await supabase.rpc("is_staff");
        if (!active) return;

        if (staffErr) {
          setError(staffErr.message);
          setAllowed(false);
          setLoading(false);
          return;
        }

        if (!isStaff) {
          setAllowed(false);
          setLoading(false);
          return;
        }
      }

      // Artist gate (Artist portal)
      if (requireArtist) {
        const role = await getMyRole(user.id);
        if (!active) return;

        if (role !== "artist") {
          setAllowed(false);
          setLoading(false);
          return;
        }
      }

      setAllowed(true);
      setLoading(false);
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [router, nextPath, requireStaff, requireArtist]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Checking session…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Auth Error</h2>
          <div style={{ color: "#7a0000", fontWeight: 800 }}>{error}</div>
          <div style={{ marginTop: "0.75rem" }}>
            <Link href="http://localhost:3000/login" style={{ fontWeight: 900 }}>
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    const showAdminHint = isAdminPath(router.asPath || "");

    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Access denied</h2>
          <p style={{ color: "#555" }}>
            You’re logged in, but your account does not have access to this area.
          </p>

          {showAdminHint ? (
            <p style={{ color: "#555" }}>
              If you believe you should have staff access, verify your <code>profiles.role</code> and your <code>is_staff()</code> function.
            </p>
          ) : null}

          <div style={{ marginTop: "0.75rem" }}>
            <Link href="http://localhost:3000" style={{ fontWeight: 900 }}>
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f1f1",
  fontFamily: "Arial, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  maxWidth: 560,
  width: "100%",
};
