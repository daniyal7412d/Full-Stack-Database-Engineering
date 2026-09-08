'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setMessage(error.message)
    router.push('/dashboard')
    router.refresh()
  }

  async function sendMagicLink() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
    setMessage(error ? error.message : 'Check your email for a secure sign-in link.')
  }

  return (
    <main className="min-h-screen bg-[#18211f] px-6 py-10 text-[#f7f8f3]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-between gap-16">
        <section className="hidden max-w-xl lg:block">
          <p className="sans mb-8 text-xs uppercase tracking-[0.3em] text-[#d9f36a]">Ledgerline / 01</p>
          <h1 className="text-7xl leading-[0.95] tracking-[-0.05em]">Invoices with a clearer point of view.</h1>
          <p className="sans mt-8 max-w-md text-sm leading-6 text-[#b7c1b8]">A calm operating space for teams that take every client promise seriously.</p>
        </section>
        <section className="w-full max-w-md rounded-[2px] bg-[#f7f8f3] p-8 text-[#18211f] shadow-2xl sm:p-12">
          <p className="sans text-xs font-bold uppercase tracking-[0.2em] text-[#718b12]">Welcome back</p>
          <h2 className="mt-3 text-4xl tracking-[-0.04em]">Sign in</h2>
          <form onSubmit={signIn} className="sans mt-10 space-y-5">
            <label className="block text-sm">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border-b border-[#b9c5bb] bg-transparent px-0 py-3 outline-none focus:border-[#718b12]" /></label>
            <label className="block text-sm">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full border-b border-[#b9c5bb] bg-transparent px-0 py-3 outline-none focus:border-[#718b12]" /></label>
            <button disabled={loading} className="w-full bg-[#18211f] px-5 py-3 text-sm font-bold text-[#d9f36a] transition hover:bg-[#718b12] disabled:opacity-50">{loading ? 'Working...' : 'Sign in'}</button>
            <button type="button" disabled={loading || !email} onClick={sendMagicLink} className="w-full border border-[#b9c5bb] px-5 py-3 text-sm transition hover:border-[#718b12]">Send magic link</button>
          </form>
          {message && <p className="sans mt-5 text-sm text-[#718b12]">{message}</p>}
          <p className="sans mt-8 text-sm text-[#6f7c76]">New here? <a className="font-bold text-[#18211f] underline" href="/signup">Create an account</a></p>
        </section>
      </div>
    </main>
  )
}
