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
      // 1) Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      // 2) Not logged in -> go to /login
      if (!user) {
        router.replace("http://localhost:3000/login");
        return;
      }

      // 3) Logged in -> role-based redirect
      const role = await getMyRole(user.id);

      if (cancelled) return;

      if (isStaff(role)) {
        router.replace("http://localhost:3000/admin");
      } else {
        router.replace("http://localhost:3000/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
