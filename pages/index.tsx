// pages/index.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | null;

function isStaff(role: Role) {
  return role === "owner" || role === "admin" || role === "reviewer";
}

async function getMyRole(userId: string): Promise<Role> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) return null;
  return (data?.role ?? null) as Role;
}

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const role = await getMyRole(user.id);
      if (cancelled) return;

      router.replace(isStaff(role) ? "/admin" : "/dashboard");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
