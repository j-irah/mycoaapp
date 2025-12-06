// pages/api/qr/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('qr_id', slug)
    .single()

  if (error) return res.status(404).json({ error: 'Not found' })
  return res.status(200).json(data)
}
