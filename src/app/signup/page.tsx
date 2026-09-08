'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', organizationName: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const result = await response.json()
    setLoading(false)
    if (!response.ok) return setMessage(result.error)
    if (result.needsEmailConfirmation) return setMessage('Account created. Check your email to confirm it, then sign in.')
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] px-6 py-12 text-[#18211f]">
      <div className="mx-auto max-w-2xl">
        <a href="/login" className="sans text-xs font-bold uppercase tracking-[0.2em] text-[#718b12]">Ledgerline</a>
        <div className="mt-20 max-w-lg">
          <p className="sans text-xs font-bold uppercase tracking-[0.2em] text-[#718b12]">Start your workspace</p>
          <h1 className="mt-4 text-6xl leading-none tracking-[-0.05em]">Make invoices feel less like paperwork.</h1>
          <form onSubmit={submit} className="sans mt-12 space-y-6">
            {([['fullName', 'Your name', 'text'], ['organizationName', 'Organization name', 'text'], ['email', 'Work email', 'email'], ['password', 'Password', 'password']] as const).map(([key, label, type]) => <label key={key} className="block text-sm">{label}<input required type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 w-full border-b border-[#b9c5bb] bg-transparent px-0 py-3 outline-none focus:border-[#718b12]" /></label>)}
            <button disabled={loading} className="bg-[#18211f] px-8 py-4 text-sm font-bold text-[#d9f36a] disabled:opacity-50">{loading ? 'Creating workspace...' : 'Create workspace'}</button>
          </form>
          {message && <p className="sans mt-5 text-sm text-[#718b12]">{message}</p>}
        </div>
      </div>
    </main>
  )
}
