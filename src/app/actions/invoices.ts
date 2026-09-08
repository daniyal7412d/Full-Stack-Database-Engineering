'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit_price: z.coerce.number().nonnegative('Unit price cannot be negative'),
})

const createInvoiceSchema = z.object({
  invoice_number: z.string().trim().min(1, 'Invoice number is required'),
  client_id: z.string().uuid('Choose a client'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code'),
  due_date: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(100),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

export async function createInvoice(input: CreateInvoiceInput) {
  const parsed = createInvoiceSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid invoice details.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: invoiceId, error } = await supabase.rpc('create_invoice_with_items', {
    p_invoice: {
      invoice_number: parsed.data.invoice_number,
      client_id: parsed.data.client_id,
      currency: parsed.data.currency,
      due_date: parsed.data.due_date ?? null,
      tax_rate: parsed.data.tax_rate,
      discount_rate: parsed.data.discount,
      status: 'draft',
    },
    p_items: parsed.data.items,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/invoices')
  return { invoiceId }
}
