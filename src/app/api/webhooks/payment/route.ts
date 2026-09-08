import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const paymentPayloadSchema = z.object({
  invoice_id: z.string().uuid(),
  status: z.literal('paid'),
  transaction_reference: z.string().trim().min(1).max(200),
}).passthrough()

function hasValidSecret(received: string | null | undefined, expected: string | undefined) {
  if (!received || !expected) return false
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(request: Request) {
  const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET
  const receivedSecret = request.headers.get('x-webhook-secret')
    ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!hasValidSecret(receivedSecret, configuredSecret)) {
    return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 })
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = paymentPayloadSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment payload.', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()
    const { data, error } = await admin.rpc('process_payment_webhook', {
      p_invoice_id: parsed.data.invoice_id,
      p_status: parsed.data.status,
      p_transaction_reference: parsed.data.transaction_reference,
      p_payload: rawPayload,
    })

    if (error) {
      if (error.message.includes('invoice not found')) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Payment could not be processed.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, ...data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Payment could not be processed.' }, { status: 500 })
  }
}
