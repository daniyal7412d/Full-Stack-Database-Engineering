'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Client name is required'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  tax_id: z.string().trim().optional(),
})

export async function createClientAccount(input: { name: string; email: string; tax_id?: string }) {
  const parsed = clientSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid client details.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: clientId, error } = await supabase.rpc('create_client', {
    p_name: parsed.data.name,
    p_email: parsed.data.email || null,
    p_tax_id: parsed.data.tax_id || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/invoices/new')
  return { clientId }
}
