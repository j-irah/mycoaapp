// lib/generateSlug.ts

/**
 * Generates a short URL-safe slug for qr_id.
 * Example: "k9f3p2z7x1"
 */
export function generateSlug(length = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
