import { createClient } from '@/lib/supabase/server'
import AnalyticsCharts from './analytics-charts'

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
const statusColors = { Paid: '#718b12', Pending: '#d5a62a', Overdue: '#b55647' }

function amount(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

function MetricCard({ label, value, change, note, inverse = false }: { label: string; value: string; change: number; note: string; inverse?: boolean }) {
  const positive = inverse ? change <= 0 : change >= 0
  return <div className="border border-[#dfe5dd] bg-[#fbfcf8] p-5 sm:p-6"><p className="sans text-[10px] uppercase tracking-[0.16em] text-[#6f7c76]">{label}</p><p className="mt-3 text-3xl tracking-[-0.04em] sm:text-4xl">{value}</p><div className="sans mt-5 flex items-center gap-2 text-xs"><span className={positive ? 'font-bold text-[#718b12]' : 'font-bold text-[#b55647]'}>{change >= 0 ? '+' : ''}{change}%</span><span className="text-[#6f7c76]">{note}</span></div></div>
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const now = new Date()
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [{ data: invoices, error: invoiceError }, { data: payments, error: paymentError }] = await Promise.all([
    supabase.from('invoices').select('id, status, currency, total_amount, created_at').gte('created_at', sixMonthsStart.toISOString()),
    supabase.from('payment_logs').select('invoice_id, received_at, status').eq('status', 'paid'),
  ])

  if (invoiceError || paymentError) return <section><p className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Workspace / Analytics</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">Analytics</h1><p className="sans mt-8 text-sm text-[#b55647]">Analytics data is temporarily unavailable.</p></section>

  const rows = invoices ?? []
  const currency = rows[0]?.currency ?? 'USD'
  const paid = rows.filter((invoice) => invoice.status === 'paid')
  const currentPaid = paid.filter((invoice) => new Date(invoice.created_at) >= currentStart).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const previousPaid = paid.filter((invoice) => { const date = new Date(invoice.created_at); return date >= previousStart && date < currentStart }).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const outstandingRows = rows.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
  const outstanding = outstandingRows.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const previousOutstanding = outstandingRows.filter((invoice) => new Date(invoice.created_at) < currentStart).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const paymentByInvoice = new Map((payments ?? []).map((payment) => [payment.invoice_id, payment]))
  const velocityDays = paid.reduce((sum, invoice) => { const payment = paymentByInvoice.get(invoice.id); return sum + (payment ? Math.max(0, new Date(payment.received_at).getTime() - new Date(invoice.created_at).getTime()) / 86400000 : 0) }, 0) / Math.max(paid.filter((invoice) => paymentByInvoice.has(invoice.id)).length, 1)
  const previousVelocity = velocityDays
  const statuses = ['paid', 'pending', 'overdue'].map((status) => ({ name: status[0].toUpperCase() + status.slice(1), value: rows.filter((invoice) => invoice.status === status).length, color: statusColors[status[0].toUpperCase() + status.slice(1) as keyof typeof statusColors] }))
  const revenue = Array.from({ length: 6 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1); return { month: monthFormatter.format(date), revenue: paid.filter((invoice) => { const created = new Date(invoice.created_at); return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth() }).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) } })
  const totalInvoices = rows.length
  const paidRate = totalInvoices ? Math.round((paid.length / totalInvoices) * 100) : 0

  return <section><div className="border-b border-[#dfe5dd] pb-10"><p className="sans text-xs uppercase tracking-[0.2em] text-[#718b12]">Workspace / Analytics</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">Analytics</h1><p className="sans mt-4 text-sm text-[#6f7c76]">Financial signals from your invoice portfolio.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Monthly recurring revenue" value={amount(currentPaid, currency)} change={percentChange(currentPaid, previousPaid)} note="vs last month" /><MetricCard label="Outstanding balance" value={amount(outstanding, currency)} change={percentChange(outstanding, previousOutstanding)} note="vs last month" inverse /><MetricCard label="Payment velocity" value={`${velocityDays.toFixed(1)} days`} change={percentChange(velocityDays, previousVelocity)} note="average time to paid" inverse /><MetricCard label="Paid invoice rate" value={`${paidRate}%`} change={paidRate} note="of invoice count" /></div><AnalyticsCharts revenue={revenue} statuses={statuses} currency={currency} /></section>
}
