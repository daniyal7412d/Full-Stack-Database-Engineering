import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InvoiceForm from './invoice-form'

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: clients, error } = await supabase.from('clients').select('id, name').order('name')

  return (
    <section>
      <div className="flex items-end justify-between border-b border-[#dfe5dd] pb-8"><div><p className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Workspace / Invoices</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">New invoice</h1></div><Link href="/dashboard/invoices" className="sans text-sm underline">Cancel</Link></div>
      {error ? <p className="sans mt-8 text-sm text-[#9a4438]">Unable to load clients: {error.message}</p> : <InvoiceForm clients={clients ?? []} />}
    </section>
  )
}
