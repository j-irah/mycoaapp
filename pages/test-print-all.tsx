import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function TestPrintAll() {
  const [coas, setCoas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCOAs() {
      setLoading(true)
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .order('signed_date', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Supabase error:', error)
        setError(error.message)
      } else if (!data || data.length === 0) {
        setError('No COA records found.')
      } else {
        setCoas(data)
      }
      setLoading(false)
    }

    fetchCOAs()
  }, [])

  if (loading) return <div>Loading COAs...</div>
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>

  return (
    <div style={{ padding: '20px' }}>
      <button
        onClick={() => window.print()}
        style={{
          marginBottom: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Print All COAs
      </button>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        {coas.map((coa) => (
          <div
            key={coa.qr_id}
            className="coa-card"
            style={{
              width: '400px',
              padding: '20px',
              border: '1px solid #000',
              fontFamily: 'sans-serif',
              pageBreakInside: 'avoid',
            }}
          >
            <h2>Certificate of Authenticity</h2>
            <p><strong>Comic:</strong> {coa.comic_title} {coa.issue_number}</p>
            <p><strong>Signed by:</strong> {coa.signed_by}</p>
            <p><strong>Date:</strong> {coa.signed_date}</p>
            <p><strong>Location:</strong> {coa.signed_location}</p>
            <p><strong>Witnessed by:</strong> {coa.witnessed_by}</p>
            {coa.qr_code_base64 ? (
              <img
                src={coa.qr_code_base64}
                alt="QR Code"
                style={{ marginTop: '20px', width: '200px', height: '200px' }}
              />
            ) : (
              <p style={{ color: 'gray' }}>No QR code available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
