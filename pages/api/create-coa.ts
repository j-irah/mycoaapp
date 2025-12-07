// @ts-nocheck

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { generateSlug } from '../../lib/slugs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // These must match your JSON body and your Supabase columns
  const {
    comic_title,
    issue_number,
    signed_by,
    signed_date,
    signed_location,
    witnessed_by,
    image_url, // new optional field
  } = req.body;

  // Basic required fields
  if (!comic_title || !signed_by || !issue_number) {
    return res.status(400).json({
      error: 'comic_title, signed_by, and issue_number are required',
    });
  }

  // Generate a unique QR id / slug
  const qr_id = generateSlug();

  // Insert into the "signatures" table
  const { data, error } = await supabaseAdmin
    .from('signatures')
    .insert({
      comic_title,
      issue_number,
      signed_by,
      signed_date,
      signed_location,
      witnessed_by,
      image_url, // store image URL if provided
      qr_id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting COA:', error);
    return res.status(500).json({ error: error.message });
  }

  // Return the created row (including qr_id)
  return res.status(200).json(data);
}
