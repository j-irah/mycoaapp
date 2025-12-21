// pages/api/create-coa.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { generateSlug } from "../../lib/generateSlug";

// This API stays compatible with older admin pages that POST to /api/create-coa.
// Only comic_title is required. Everything else is optional.
// Uses service role (supabaseAdmin) so it bypasses RLS safely for server-side creation.
//
// IMPORTANT: Response includes top-level `id` + `qr_id` for compatibility with admin pages.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      comic_title,
      issue_number = null,
      signed_by = null,
      signed_date = null,
      signed_location = null,
      witnessed_by = null,
      // request_id is currently ignored here to avoid schema mismatch risk
      // request_id = null,
    } = req.body ?? {};

    if (!comic_title || typeof comic_title !== "string" || !comic_title.trim()) {
      return res.status(400).json({
        error: "comic_title is required",
      });
    }

    const qr_id = generateSlug();

    const { data, error } = await supabaseAdmin
      .from("signatures")
      .insert({
        comic_title: comic_title.trim(),
        issue_number: issue_number ? String(issue_number).trim() : null,
        signed_by: signed_by ? String(signed_by).trim() : null,
        signed_date: signed_date ? String(signed_date).trim() : null,
        signed_location: signed_location ? String(signed_location).trim() : null,
        witnessed_by: witnessed_by ? String(witnessed_by).trim() : null,
        qr_id,
        status: "active",
        needs_review: false,
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Compatibility response:
    // - `coa` keeps existing shape
    // - `id` and `qr_id` allow admin page to store issued_coa_id
    return res.status(200).json({
      coa: data,
      id: data?.id ?? null,
      qr_id: data?.qr_id ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
