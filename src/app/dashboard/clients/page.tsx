import { createClient } from '@/lib/supabase/server'
import ClientForm from './client-form'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients, error } = await supabase.from('clients').select('id, name, email, tax_id, created_at').order('name')

  return <section><div className="flex flex-col justify-between gap-6 border-b border-[#dfe5dd] pb-10 md:flex-row md:items-end"><div><p className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Workspace / Clients</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">Clients</h1><p className="sans mt-4 text-sm text-[#6f7c76]">Manage the people and companies you invoice.</p></div><ClientForm /></div>{error ? <p className="sans mt-8 text-sm text-[#9a4438]">Unable to load clients: {error.message}</p> : <div className="sans mt-10 overflow-x-auto border-y border-[#dfe5dd]"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-[#dfe5dd] text-[10px] uppercase tracking-[0.15em] text-[#6f7c76]"><tr><th className="py-4">Name</th><th>Email</th><th>Tax ID</th><th>Added</th></tr></thead><tbody className="divide-y divide-[#dfe5dd]">{(clients ?? []).map((client) => <tr key={client.id} className="hover:bg-[#eef1e9]"><td className="py-5 font-bold">{client.name}</td><td>{client.email ?? 'No email'}</td><td>{client.tax_id ?? '—'}</td><td>{new Date(client.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{(clients ?? []).length === 0 && <p className="py-12 text-center text-sm text-[#6f7c76]">No clients yet. Add one to create an invoice.</p>}</div>}</section>
}
