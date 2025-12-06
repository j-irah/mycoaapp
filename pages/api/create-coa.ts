// pages/api/create-coa.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { generateSlug } from '../../lib/slugs'
import QRCode from 'qrcode'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { comic_title, signed_by, signed_date, location, witness } = req.body
    const qr_id = generateSlug() // unique ID for COA

    // Insert COA record in Supabase
    const { data, error } = await supabaseAdmin
      .from('signatures')
      .insert({ comic_title, signed_by, signed_date, location, witness, qr_id })
      .select()
    
    if (error) throw error
    if (!data || data.length === 0) throw new Error('No COA created')

    // Generate QR code pointing to production URL
    const qrUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${qr_id}`
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl)

    return res.status(200).json({ coa: data[0], qrCode: qrCodeDataUrl })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}

