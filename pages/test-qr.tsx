// pages/test-qr.tsx
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function TestQR() {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    // Replace with your actual COA slug or QR id
    const coaSlug = 'example-slug'
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${coaSlug}`

    // Generate QR code
    QRCode.toDataURL(url).then(setQrUrl)
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Test COA QR Code</h1>
      {qrUrl ? (
        <img src={qrUrl} alt="COA QR Code" />
      ) : (
        <p>Loading QR code...</p>
      )}
    </div>
  )
}
