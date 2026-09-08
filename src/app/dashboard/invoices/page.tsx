import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const pageSize = 10
const statusStyles: Record<string, string> = {
	draft: 'bg-[#e8ece5] text-[#58675e]',
	pending: 'bg-[#fff0c7] text-[#896b16]',
	paid: 'bg-[#dff2dc] text-[#3f7444]',
	overdue: 'bg-[#f8d9d4] text-[#9a4438]',
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
	const page = Math.max(Number((await searchParams).page ?? '1') || 1, 1)
	const supabase = await createClient()
	const from = (page - 1) * pageSize
	const to = from + pageSize - 1
	const { data: invoices, count, error } = await supabase
		.from('invoices')
		.select('id, invoice_number, status, currency, total_amount, due_date, clients(name)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(from, to)
	const totalPages = Math.max(Math.ceil((count ?? 0) / pageSize), 1)

	return (
		<section>
			<div className="flex flex-col justify-between gap-6 border-b border-[#dfe5dd] pb-10 md:flex-row md:items-end">
				<div><p className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Workspace / Invoices</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">Invoices</h1><p className="sans mt-4 text-sm text-[#6f7c76]">A clear register of every client commitment.</p></div>
				<Link href="/dashboard/invoices/new" className="sans w-fit bg-[#18211f] px-5 py-3 text-sm font-bold text-[#d9f36a]">+ New invoice</Link>
			</div>
			{error ? <p className="sans mt-8 text-sm text-[#9a4438]">Unable to load invoices: {error.message}</p> : <>
				<div className="mt-10 overflow-x-auto border-y border-[#dfe5dd]">
					<table className="sans w-full min-w-[800px] text-left text-sm"><thead className="border-b border-[#dfe5dd] text-[10px] uppercase tracking-[0.15em] text-[#6f7c76]"><tr><th className="py-4">Invoice number</th><th>Client</th><th>Due date</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#dfe5dd]">
														{(invoices ?? []).map((invoice) => { const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients; return <tr key={invoice.id} className="transition hover:bg-[#eef1e9]"><td className="py-5 font-bold"><Link href={`/dashboard/invoices/${invoice.id}`} className="underline-offset-4 hover:underline">{invoice.invoice_number}</Link></td><td>{client?.name ?? 'Unknown client'}</td><td>{invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString() : 'No due date'}</td><td><span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyles[invoice.status] ?? statusStyles.draft}`}>{invoice.status}</span></td><td className="text-right font-bold">{invoice.currency} {Number(invoice.total_amount).toFixed(2)}</td><td className="text-right"><Link target="_blank" rel="noreferrer" href={`/api/invoices/${invoice.id}/pdf`} className="font-bold text-[#718b12] underline-offset-4 hover:underline">PDF</Link></td></tr> })}
					</tbody></table>
					{(invoices ?? []).length === 0 && <p className="sans py-12 text-center text-sm text-[#6f7c76]">No invoices yet. Create your first one.</p>}
				</div>
				<div className="sans mt-6 flex items-center justify-between text-sm text-[#6f7c76]"><span>{count ?? 0} invoice{count === 1 ? '' : 's'}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} className={`border border-[#dfe5dd] px-3 py-2 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`} href={`/dashboard/invoices?page=${page - 1}`}>Previous</Link><span className="px-3 py-2">{page} / {totalPages}</span><Link aria-disabled={page >= totalPages} className={`border border-[#dfe5dd] px-3 py-2 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`} href={`/dashboard/invoices?page=${page + 1}`}>Next</Link></div></div>
			</>}
		</section>
	)
}
