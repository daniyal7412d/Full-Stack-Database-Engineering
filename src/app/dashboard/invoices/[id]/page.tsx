import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DownloadPDFButton from './download-pdf-button'

const statusStyles: Record<string, string> = { draft: 'bg-[#e8ece5] text-[#58675e]', pending: 'bg-[#fff0c7] text-[#896b16]', paid: 'bg-[#dff2dc] text-[#3f7444]', overdue: 'bg-[#f8d9d4] text-[#9a4438]' }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase.from('invoices').select('id, invoice_number, status, currency, subtotal, tax_rate, discount_rate, total_amount, due_date, created_at, clients(name, email)').eq('id', id).single()
  if (!invoice) notFound()
  const { data: items } = await supabase.from('invoice_items').select('id, description, quantity, unit_price, total').eq('invoice_id', id).order('created_at')
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
  const taxAmount = Number(invoice.subtotal) * Number(invoice.tax_rate) / 100
  const discountAmount = Number(invoice.subtotal) * Number(invoice.discount_rate) / 100

  return <section><div className="flex flex-col justify-between gap-6 border-b border-[#dfe5dd] pb-8 md:flex-row md:items-end"><div><Link href="/dashboard/invoices" className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Back to invoices</Link><h1 className="mt-3 text-6xl tracking-[-0.05em]">{invoice.invoice_number}</h1><span className={`sans mt-4 inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyles[invoice.status] ?? statusStyles.draft}`}>{invoice.status}</span></div><DownloadPDFButton invoiceId={invoice.id} /></div><div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]"><div><div className="border-y border-[#dfe5dd]"><div className="grid grid-cols-[1fr_110px_150px] border-b border-[#dfe5dd] py-4 sans text-[10px] uppercase tracking-[0.15em] text-[#6f7c76]"><span>Description</span><span className="text-right">Quantity</span><span className="text-right">Amount</span></div>{(items ?? []).map((item) => <div key={item.id} className="grid grid-cols-[1fr_110px_150px] border-b border-[#dfe5dd] py-5 sans text-sm"><span>{item.description}</span><span className="text-right">{Number(item.quantity).toFixed(2)}</span><span className="text-right font-bold">{invoice.currency} {Number(item.total).toFixed(2)}</span></div>)}{(items ?? []).length === 0 && <p className="sans py-10 text-sm text-[#6f7c76]">No line items.</p>}</div></div><aside className="h-fit border-t border-[#dfe5dd] pt-6 lg:border-l lg:border-t-0 lg:pl-8"><p className="sans text-xs uppercase tracking-[0.15em] text-[#6f7c76]">Billing details</p><h2 className="mt-3 text-2xl">{client?.name ?? 'Unknown client'}</h2><p className="sans mt-2 text-sm text-[#6f7c76]">{client?.email ?? 'No email'}</p><dl className="sans mt-10 space-y-4 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</dd></div><div className="flex justify-between"><dt>Tax ({Number(invoice.tax_rate).toFixed(2)}%)</dt><dd>{invoice.currency} {taxAmount.toFixed(2)}</dd></div><div className="flex justify-between"><dt>Discount ({Number(invoice.discount_rate).toFixed(2)}%)</dt><dd>- {invoice.currency} {discountAmount.toFixed(2)}</dd></div><div className="flex justify-between border-t border-[#dfe5dd] pt-4 text-lg font-bold"><dt>Total</dt><dd>{invoice.currency} {Number(invoice.total_amount).toFixed(2)}</dd></div></dl><p className="sans mt-8 text-xs text-[#6f7c76]">Due {invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString() : 'upon receipt'}</p></aside></div></section>
}
