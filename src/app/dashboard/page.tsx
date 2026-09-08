import Link from 'next/link'

export default function DashboardPage() {
  return (
    <section>
      <div className="flex flex-col justify-between gap-6 border-b border-[#dfe5dd] pb-10 md:flex-row md:items-end">
        <div><p className="sans text-xs font-bold uppercase tracking-[0.2em] text-[#718b12]">Tuesday, September 06</p><h1 className="mt-3 text-6xl tracking-[-0.05em]">Good morning.</h1></div>
        <Link href="/dashboard/invoices/new" className="sans w-fit bg-[#18211f] px-5 py-3 text-sm font-bold text-[#d9f36a]">+ New invoice</Link>
      </div>
      <div className="grid gap-px bg-[#dfe5dd] sm:grid-cols-3">
        {[['Outstanding', '$0.00'], ['Paid this month', '$0.00'], ['Active clients', '0']].map(([label, value]) => <div key={label} className="bg-[#f7f8f3] py-8 pr-8"><p className="sans text-xs uppercase tracking-[0.15em] text-[#6f7c76]">{label}</p><p className="mt-3 text-4xl tracking-[-0.04em]">{value}</p></div>)}
      </div>
      <div className="mt-16 border-t border-[#dfe5dd] pt-6"><p className="sans text-xs uppercase tracking-[0.2em] text-[#6f7c76]">Recent activity</p><p className="mt-8 font-serif text-2xl text-[#6f7c76]">Your workspace is ready for its first invoice.</p></div>
    </section>
  )
}
