// components/RequireAuth.tsx
// Global auth gate + safe logout handling
// NEVER hardcodes domains (uses window.location.origin)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Props = {
  children: React.ReactNode;

  /**
   * If true, only staff roles can access the page.
   * Staff roles: owner, admin, reviewer, staff
   */
  requireStaff?: boolean;

  /**
   * Backwards-compat alias (some pages/components might pass staffOnly).
   * If either requireStaff OR staffOnly is true, we enforce staff access.
   */
  staffOnly?: boolean;
};

export default function RequireAuth({ children, requireStaff = false, staffOnly = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
        return;
      }

      const enforceStaff = requireStaff || staffOnly;

      if (enforceStaff) {
        const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

        if (error) {
          // If we can't read the profile, fail closed (no admin access)
          router.replace("/dashboard");
          return;
        }

        const role = (data?.role || "").toLowerCase();
        const isStaff = role === "owner" || role === "admin" || role === "reviewer" || role === "staff";

        if (!isStaff) {
          router.replace("/dashboard");
          return;
        }
      }

      setLoading(false);
    }

    check();

    return () => {
      alive = false;
    };
  }, [router, requireStaff, staffOnly]);

  if (loading) return null;
  return <>{children}</>;
}

/**
 * SAFE logout helper
 * Use this everywhere instead of calling supabase.auth.signOut directly
 */
export async function safeLogout(router: ReturnType<typeof useRouter>) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  await supabase.auth.signOut();
  router.replace(origin ? `${origin}/login` : "/login");
}
