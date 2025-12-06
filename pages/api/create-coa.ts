import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { generateSlug } from '../../lib/slugs'
import QRCode from 'qrcode'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { comic_title, issue_number, signed_by, signed_date, signed_location, witnessed_by } = req.body

  const qr_id = generateSlug(12) // Unique QR ID
  const qrDataUrl = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_BASE_URL}/qr/${qr_id}`)

  const { data, error } = await supabaseAdmin
    .from('signatures')
    .insert([
      {
        comic_title,
        issue_number,
        signed_by,
        signed_date,
        signed_location,
        witnessed_by,
        qr_id,
        qr_code_base64: qrDataUrl
      }
    ])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ record: data[0] })
}
