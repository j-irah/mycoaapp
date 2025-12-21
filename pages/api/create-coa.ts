// pages/api/create-coa.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { generateSlug } from "../../lib/generateSlug";

function isHttpUrl(v: string) {
  return /^https?:\/\//i.test(v);
}

function normalizePublicStorageUrl(bucket: string, path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  if (!base) return null;

  const cleanPath = String(path || "").replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

// Your bucket for cover images (based on your existing code/screenshots)
const BOOK_PHOTO_BUCKET = "request-books";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      comic_title,
      issue_number = null,
      signed_by = null,
      signed_date = null,
      signed_location = null,
      witnessed_by = null,

      // NEW: cover image coming from request
      book_image_url = null,
    } = req.body ?? {};

    if (!comic_title || typeof comic_title !== "string" || !comic_title.trim()) {
      return res.status(400).json({ error: "comic_title is required" });
    }

    const qr_id = generateSlug();

    // Determine what to store in signatures.image_url:
    // - if it's already an http(s) URL -> store as-is
    // - otherwise treat it as a storage path in BOOK_PHOTO_BUCKET and build a public URL
    let image_url: string | null = null;

    if (book_image_url && typeof book_image_url === "string" && book_image_url.trim()) {
      const raw = book_image_url.trim();

      if (isHttpUrl(raw)) {
        image_url = raw;
      } else {
        // storage path -> public URL
        image_url = normalizePublicStorageUrl(BOOK_PHOTO_BUCKET, raw);
      }
    }

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

        // NEW
        image_url,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Compatibility response for admin page
    return res.status(200).json({
      coa: data,
      id: data?.id ?? null,
      qr_id: data?.qr_id ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
