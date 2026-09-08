import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MobileNav from './mobile-nav'

const navigation = [
  { label: 'Invoices', href: '/dashboard/invoices', icon: '↗' },
  { label: 'Clients', href: '/dashboard/clients', icon: '◌' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '▥' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⊙' },
]

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-[#f7f8f3] text-[#18211f]">
      <aside className="sans hidden w-72 shrink-0 flex-col border-r border-[#dfe5dd] bg-[#eef1e9] p-7 md:flex">
        <div>
          <p className="font-serif text-2xl tracking-[-0.05em]">Ledgerline<span className="text-[#718b12]">.</span></p>
          <div className="mt-10 border-y border-[#dfe5dd] py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f7c76]">Organization</p>
            <Link href="/dashboard/settings" className="mt-2 flex w-full items-center justify-between text-left text-sm font-bold">Your organization <span className="text-[#718b12]">↗</span></Link>
          </div>
        </div>
        <nav className="mt-10 space-y-2">
          <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#6f7c76]">Workspace</p>
          {navigation.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-4 px-3 py-3 text-sm transition hover:bg-[#dfe5dd]"><span className="w-5 text-center text-[#718b12]">{item.icon}</span>{item.label}</Link>)}
        </nav>
        <div className="mt-auto border-t border-[#dfe5dd] pt-5 text-xs text-[#6f7c76]">{user.email}</div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="relative flex items-center justify-between border-b border-[#dfe5dd] px-6 py-5 md:hidden"><span className="font-serif text-2xl">Ledgerline<span className="text-[#718b12]">.</span></span><MobileNav /></header>
        <div className="mx-auto max-w-7xl p-6 md:p-12">{children}</div>
      </main>
    </div>
  )
}
