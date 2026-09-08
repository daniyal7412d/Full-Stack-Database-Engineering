'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOut() {
  const router = useRouter()
  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return <button type="button" onClick={signOut} className="border border-[#9a4438] px-5 py-3 text-sm text-[#9a4438]">Sign out</button>
}
