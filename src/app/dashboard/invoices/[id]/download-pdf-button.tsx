'use client'

import { useState } from 'react'

export default function DownloadPDFButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!response.ok) throw new Error('Unable to generate the PDF.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to generate the PDF.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="sans flex flex-col items-end gap-2"><button type="button" onClick={download} disabled={loading} className="bg-[#18211f] px-5 py-3 text-sm font-bold text-[#d9f36a] disabled:opacity-50">{loading ? 'Generating PDF...' : 'Download PDF'}</button>{error && <span className="text-xs text-[#9a4438]">{error}</span>}</div>
}
