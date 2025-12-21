// components/RequireAuth.tsx
// Global auth gate + safe logout handling
// NEVER hardcodes domains (uses window.location.origin)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Props = {
  children: React.ReactNode;
  staffOnly?: boolean;
};

export default function RequireAuth({ children, staffOnly = false }: Props) {
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

      if (staffOnly) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = data?.role;
        const isStaff = role === "owner" || role === "admin" || role === "reviewer";

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
  }, [router, staffOnly]);

  if (loading) return null;
  return <>{children}</>;
}

/**
 * SAFE logout helper
 * Use this everywhere instead of calling supabase.auth.signOut directly
 */
export async function safeLogout(router: ReturnType<typeof useRouter>) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  await supabase.auth.signOut();

  // Always return to production domain, preview, or localhost automatically
  router.replace(`${origin}/login`);
}
