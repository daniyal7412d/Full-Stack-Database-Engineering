'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createInvoice, type CreateInvoiceInput } from '@/app/actions/invoices'

const formSchema = z.object({
  invoice_number: z.string().min(1, 'Required'),
  client_id: z.string().uuid('Choose a client'),
  currency: z.string().regex(/^[A-Z]{3}$/),
  due_date: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(100),
  items: z.array(z.object({ description: z.string().min(1, 'Required'), quantity: z.coerce.number().positive(), unit_price: z.coerce.number().nonnegative() })).min(1),
})

type FormValues = z.infer<typeof formSchema>
type Client = { id: string; name: string }
const currencies = [
  ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['PKR', 'Pakistani Rupee'],
  ['INR', 'Indian Rupee'], ['AED', 'UAE Dirham'], ['SAR', 'Saudi Riyal'], ['CAD', 'Canadian Dollar'],
  ['AUD', 'Australian Dollar'], ['JPY', 'Japanese Yen'], ['CNY', 'Chinese Yuan'], ['CHF', 'Swiss Franc'],
] as const
const inputClass = 'mt-2 w-full border-b border-[#b9c5bb] bg-transparent px-0 py-3 outline-none focus:border-[#718b12]'

export default function InvoiceForm({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { currency: 'USD', tax_rate: 0, discount: 0, items: [{ description: '', quantity: 1, unit_price: 0 }] } })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const values = watch()
  const subtotal = (values.items ?? []).reduce((sum, item) => sum + (Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0) * (Number.isFinite(Number(item.unit_price)) ? Number(item.unit_price) : 0), 0)
  const taxRate = Number.isFinite(Number(values.tax_rate)) ? Number(values.tax_rate) : 0
  const discountRate = Number.isFinite(Number(values.discount)) ? Number(values.discount) : 0
  const tax = subtotal * (taxRate / 100)
  const discount = subtotal * (discountRate / 100)
  const finalAmount = Math.max(subtotal + tax - discount, 0)
  const currency = values.currency || 'USD'

  async function submit(input: FormValues) {
    setServerError('')
    const result = await createInvoice(input as CreateInvoiceInput)
    if (result.error) return setServerError(result.error)
    router.push('/dashboard/invoices')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="sans mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2"><label className="text-sm">Invoice number<input {...register('invoice_number')} placeholder="INV-0001" className={inputClass} />{errors.invoice_number && <span className="text-xs text-[#9a4438]">{errors.invoice_number.message}</span>}</label><label className="text-sm">Client<select {...register('client_id')} className={inputClass}><option value="">{clients.length ? 'Choose client' : 'No clients yet'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>{clients.length === 0 && <span className="mt-2 block text-xs text-[#6f7c76]">Create a client first: <Link href="/dashboard/clients" className="font-bold text-[#718b12] underline">Add client</Link></span>}{errors.client_id && <span className="text-xs text-[#9a4438]">{errors.client_id.message}</span>}</label><label className="text-sm">Due date<input {...register('due_date')} type="date" className={inputClass} /></label><label className="text-sm">Currency<select {...register('currency')} className={inputClass}>{currencies.map(([code, name]) => <option key={code} value={code}>{code} - {name}</option>)}</select></label></div>
        <div><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl">Line items</h2><button type="button" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })} className="border border-[#18211f] px-3 py-2 text-sm font-bold">+ Add item</button></div><div className="space-y-3">{fields.map((field, index) => <div key={field.id} className="grid gap-3 border border-[#dfe5dd] p-4 sm:grid-cols-[1fr_100px_130px_28px] sm:items-end"><label className="text-sm">Description<input {...register(`items.${index}.description`)} placeholder="Consulting services" className={inputClass} /></label><label className="text-sm">Qty<input {...register(`items.${index}.quantity`)} type="number" min="0.001" step="0.001" className={inputClass} /></label><label className="text-sm">Unit price<input {...register(`items.${index}.unit_price`)} type="number" min="0" step="0.01" className={inputClass} /></label><button type="button" aria-label="Remove item" disabled={fields.length === 1} onClick={() => remove(index)} className="h-12 text-xl text-[#9a4438] disabled:opacity-30">×</button></div>)}</div></div>
        {serverError && <p className="text-sm text-[#9a4438]">{serverError}</p>}
        <button disabled={isSubmitting} className="bg-[#18211f] px-6 py-4 font-bold text-[#d9f36a] disabled:opacity-50">{isSubmitting ? 'Saving invoice...' : 'Save draft invoice'}</button>
      </div>
      <aside className="h-fit border-t border-[#dfe5dd] pt-6 lg:border-l lg:border-t-0 lg:pl-8"><h2 className="text-2xl">Summary <span className="sans text-xs text-[#6f7c76]">({currency})</span></h2><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{currency} {subtotal.toFixed(2)}</strong></div><label className="flex items-center justify-between gap-4">Tax percentage<input {...register('tax_rate', { valueAsNumber: true })} type="number" min="0" max="100" step="0.01" className="w-24 border border-[#dfe5dd] px-2 py-2 text-right" /></label><div className="flex justify-between text-[#6f7c76]"><span>Tax amount</span><span>{currency} {tax.toFixed(2)}</span></div><label className="flex items-center justify-between gap-4">Discount percentage<input {...register('discount', { valueAsNumber: true })} type="number" min="0" max="100" step="0.01" className="w-24 border border-[#dfe5dd] px-2 py-2 text-right" /></label><div className="flex justify-between text-[#6f7c76]"><span>Discount ({discountRate.toFixed(2)}%)</span><span>- {currency} {discount.toFixed(2)}</span></div><div className="border-t border-[#dfe5dd] pt-4"><div className="flex justify-between text-lg"><span>Final amount</span><strong>{currency} {finalAmount.toFixed(2)}</strong></div></div></div></aside>
    </form>
  )
}
