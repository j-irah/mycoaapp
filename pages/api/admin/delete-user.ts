// pages/api/admin/delete-user.ts
// @ts-nocheck

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_ANON || !SERVICE_ROLE) {
    return res.status(500).json({ error: "Missing SUPABASE env vars (URL/ANON/SERVICE_ROLE)." });
  }

  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: "Missing user_id" });

  // Caller token must be supplied from the browser
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  // Verify caller + staff using anon client (token-based)
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: caller, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller?.user) return res.status(401).json({ error: "Invalid session" });

  const { data: isStaff, error: staffErr } = await callerClient.rpc("is_staff");
  if (staffErr) return res.status(500).json({ error: staffErr.message });
  if (!isStaff) return res.status(403).json({ error: "Forbidden" });

  // Service client performs the destructive actions
  const service = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Delete auth user
  const delAuth = await service.auth.admin.deleteUser(user_id);
  if (delAuth.error) return res.status(500).json({ error: delAuth.error.message });

  // Delete profile row (cleanup)
  const delProfile = await service.from("profiles").delete().eq("id", user_id);
  if (delProfile.error) {
    // Auth user is already deleted; return partial failure
    return res.status(200).json({ ok: true, warning: delProfile.error.message });
  }

  return res.status(200).json({ ok: true });
}
