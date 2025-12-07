// @ts-nocheck

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { qr_id, image_url } = req.body;

  if (!qr_id || !image_url) {
    return res.status(400).json({ error: 'qr_id and image_url are required' });
  }

  const { data, error } = await supabaseAdmin
    .from('signatures')
    .update({ image_url })
    .eq('qr_id', qr_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating image_url:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
