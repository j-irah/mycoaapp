import React from 'react'
import { useRouter } from 'next/router'

const CertPage = () => {
  const router = useRouter()
  const { slug } = router.query

  return (
    <div>
      <h1>Certificate of Authenticity</h1>
      <p>Slug: {slug}</p>
      {/* Here you can render your COA details */}
    </div>
  )
}

export default CertPage
