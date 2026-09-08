'use client'

import Link from 'next/link'
import { useState } from 'react'

const navigation = [
  { label: 'Invoices', href: '/dashboard/invoices' },
  { label: 'Clients', href: '/dashboard/clients' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Settings', href: '/dashboard/settings' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((current) => !current)} className="sans text-xs font-bold uppercase tracking-[0.15em] text-[#6f7c76]">
        {open ? 'Close' : 'Menu'}
      </button>
      {open && <nav id="mobile-navigation" className="absolute inset-x-0 top-[73px] z-10 border-b border-[#dfe5dd] bg-[#eef1e9] p-6 shadow-lg md:hidden">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-[#dfe5dd] py-4 text-sm font-bold">{item.label}</Link>)}</nav>}
    </>
  )
}
