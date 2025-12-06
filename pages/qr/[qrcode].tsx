// pages/qr/[qrcode].tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'

type Signature = {
  comic_title: string
  issue_number?: string
  signed_by: string
  signed_date: string
  signed_location?: string
  witnessed_by?: string
}

export default function QRPage() {
  const router = useRouter()
  const { qrcode } = router.query
  const [signature, setSignature] = useState<Signature | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!qrcode) return

    async function fetchSignature() {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('qr_id', qrcode)
        .single()

      if (error) {
        console.error('Error fetching COA:', error.message)
        setSignature(null)
      } else {
        setSignature(data)
      }
      setLoading(false)
    }

    fetchSignature()
  }, [qrcode])

  if (loading) return <div>Loading COA...</div>
  if (!signature) return <div>COA not found</div>

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Certificate of Authenticity</h1>
      <p><strong>Comic Title:</strong> {signature.comic_title}</p>
      {signature.issue_number && <p><strong>Issue:</strong> {signature.issue_number}</p>}
      <p><strong>Signed By:</strong> {signature.signed_by}</p>
      <p><strong>Date Signed:</strong> {signature.signed_date}</p>
      {signature.signed_location && <p><strong>Location:</strong> {signature.signed_location}</p>}
      {signature.witnessed_by && <p><strong>Witnessed By:</strong> {signature.witnessed_by}</p>}
    </div>
  )
}
