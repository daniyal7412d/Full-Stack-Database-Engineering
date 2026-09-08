'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientAccount } from '@/app/actions/clients'

export default function ClientForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(formData: FormData) {
    setSaving(true)
    setError('')
    const result = await createClientAccount({ name: String(formData.get('name') ?? ''), email: String(formData.get('email') ?? ''), tax_id: String(formData.get('tax_id') ?? '') })
    setSaving(false)
    if (result.error) return setError(result.error)
    setOpen(false)
    router.refresh()
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="sans w-fit bg-[#18211f] px-5 py-3 text-sm font-bold text-[#d9f36a]">+ New client</button>

  return <form action={submit} className="sans w-full max-w-xl border border-[#dfe5dd] bg-[#eef1e9] p-6"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm">Name<input name="name" required className="mt-2 w-full border-b border-[#b9c5bb] bg-transparent py-3 outline-none focus:border-[#718b12]" /></label><label className="text-sm">Email<input name="email" type="email" className="mt-2 w-full border-b border-[#b9c5bb] bg-transparent py-3 outline-none focus:border-[#718b12]" /></label><label className="text-sm">Tax ID<input name="tax_id" className="mt-2 w-full border-b border-[#b9c5bb] bg-transparent py-3 outline-none focus:border-[#718b12]" /></label></div>{error && <p className="mt-4 text-sm text-[#9a4438]">{error}</p>}<div className="mt-6 flex gap-3"><button disabled={saving} className="bg-[#18211f] px-5 py-3 text-sm font-bold text-[#d9f36a]">{saving ? 'Saving...' : 'Save client'}</button><button type="button" onClick={() => setOpen(false)} className="border border-[#b9c5bb] px-5 py-3 text-sm">Cancel</button></div></form>
}
