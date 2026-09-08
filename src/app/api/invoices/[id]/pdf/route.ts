import { NextResponse } from 'next/server'
import React from 'react'
import { Readable } from 'node:stream'
import { renderToStream, type DocumentProps } from '@react-pdf/renderer'
import InvoicePDF from '@/components/pdf/InvoicePDF'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (profileError || !profile) return NextResponse.json({ error: 'Organization membership required.' }, { status: 403 })

  const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('invoice_number, status, currency, subtotal, tax_rate, discount_rate, total_amount, due_date, created_at, org_id, client_id').eq('id', id).single()
  if (invoiceError || !invoice || invoice.org_id !== profile.org_id) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })

  const [{ data: client, error: clientError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('clients').select('name, email, tax_id, address_json').eq('id', invoice.client_id).eq('org_id', profile.org_id).single(),
    supabase.from('invoice_items').select('description, quantity, unit_price, total').eq('invoice_id', id).eq('org_id', profile.org_id).order('created_at'),
  ])
  if (clientError || !client || itemsError) return NextResponse.json({ error: 'Invoice details are unavailable.' }, { status: 404 })

  const pdfStream = await renderToStream(React.createElement(InvoicePDF, { invoice, client, items: items ?? [] }) as unknown as React.ReactElement<DocumentProps>)
  const webStream = Readable.toWeb(pdfStream as Readable) as ReadableStream
  return new NextResponse(webStream, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`, 'Cache-Control': 'private, no-store' } })
}
