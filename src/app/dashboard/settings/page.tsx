import { createClient } from '@/lib/supabase/server'
import SignOut from './sign-out'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, role, org_id, organizations(name)').eq('id', user?.id ?? '').single()
  const organization = Array.isArray(profile?.organizations) ? profile.organizations[0] : profile?.organizations

  return <section><div className="border-b border-[#dfe5dd] pb-10"><p className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Workspace / Settings</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">Settings</h1><p className="sans mt-4 text-sm text-[#6f7c76]">Your account and organization details.</p></div><div className="mt-10 grid max-w-3xl gap-6 md:grid-cols-2"><div className="border border-[#dfe5dd] p-6"><p className="sans text-xs uppercase tracking-[0.15em] text-[#6f7c76]">Account</p><dl className="sans mt-6 space-y-4 text-sm"><div><dt className="text-[#6f7c76]">Name</dt><dd className="mt-1 font-bold">{profile?.full_name ?? 'Not set'}</dd></div><div><dt className="text-[#6f7c76]">Email</dt><dd className="mt-1 font-bold">{user?.email ?? 'Not available'}</dd></div><div><dt className="text-[#6f7c76]">Role</dt><dd className="mt-1 font-bold capitalize">{profile?.role ?? 'member'}</dd></div></dl></div><div className="border border-[#dfe5dd] p-6"><p className="sans text-xs uppercase tracking-[0.15em] text-[#6f7c76]">Organization</p><dl className="sans mt-6 space-y-4 text-sm"><div><dt className="text-[#6f7c76]">Name</dt><dd className="mt-1 font-bold">{organization?.name ?? 'Not set'}</dd></div><div><dt className="text-[#6f7c76]">Organization ID</dt><dd className="mt-1 break-all font-mono text-xs">{profile?.org_id ?? 'Not available'}</dd></div></dl></div></div><div className="mt-10 border-t border-[#dfe5dd] pt-6"><SignOut /></div></section>
}
