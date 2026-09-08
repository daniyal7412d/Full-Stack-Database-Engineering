import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

type InvoiceItem = {
  description: string
  quantity: number | string
  unit_price: number | string
  total: number | string
}

type InvoicePDFProps = {
  invoice: {
    invoice_number: string
    status: string
    currency: string
    subtotal: number | string
    tax_rate: number | string
    discount_rate: number | string
    total_amount: number | string
    due_date: string | null
    created_at: string
  }
  client: {
    name: string
    email: string | null
    tax_id: string | null
    address_json: Record<string, string> | null
  }
  items: InvoiceItem[]
}

const styles = StyleSheet.create({
  page: { padding: 42, color: '#18211f', fontFamily: 'Helvetica', fontSize: 9 },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: 1, borderColor: '#dfe5dd', paddingBottom: 22 },
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#18211f' },
  accent: { color: '#718b12' },
  label: { fontSize: 7, color: '#6f7c76', letterSpacing: 1.2, textTransform: 'uppercase' },
  invoiceTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 5 },
  meta: { textAlign: 'right', lineHeight: 1.6 },
  section: { marginTop: 28 },
  columns: { flexDirection: 'row', justifyContent: 'space-between' },
  block: { width: '45%', lineHeight: 1.5 },
  strong: { fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 12, borderTop: 1, borderColor: '#18211f' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#eef1e9', padding: 8, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottom: 1, borderColor: '#dfe5dd' },
  description: { flex: 1 },
  qty: { width: 55, textAlign: 'right' },
  price: { width: 82, textAlign: 'right' },
  amount: { width: 82, textAlign: 'right' },
  totals: { marginTop: 18, marginLeft: 'auto', width: 235 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  grandTotal: { borderTop: 1, borderColor: '#18211f', marginTop: 5, paddingTop: 10, fontSize: 13, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', left: 42, right: 42, bottom: 32, borderTop: 1, borderColor: '#dfe5dd', paddingTop: 10, color: '#6f7c76', lineHeight: 1.5 },
})

function amount(value: number | string, currency: string) {
  return `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function address(address: Record<string, string> | null) {
  if (!address) return null
  return [address.line1, address.line2, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(', ')
}

export default function InvoicePDF({ invoice, client, items }: InvoicePDFProps) {
  const clientAddress = address(client.address_json)
  return <Document title={`Invoice ${invoice.invoice_number}`} author="Ledgerline"><Page size="A4" style={styles.page}><View style={styles.header}><View><Text style={styles.brand}>Ledgerline<Text style={styles.accent}>.</Text></Text><Text style={{ marginTop: 5, color: '#6f7c76' }}>Enterprise invoicing</Text></View><View style={styles.meta}><Text style={styles.label}>Invoice</Text><Text style={styles.invoiceTitle}>{invoice.invoice_number}</Text><Text>Status: {invoice.status.toUpperCase()}</Text><Text>Issued: {new Date(invoice.created_at).toLocaleDateString()}</Text></View></View><View style={[styles.section, styles.columns]}><View style={styles.block}><Text style={styles.label}>Bill to</Text><Text style={[styles.strong, { marginTop: 6 }]}>{client.name}</Text>{client.email && <Text>{client.email}</Text>}{client.tax_id && <Text>Tax ID: {client.tax_id}</Text>}{clientAddress && <Text>{clientAddress}</Text>}</View><View style={styles.block}><Text style={styles.label}>Payment terms</Text><Text style={{ marginTop: 6 }}>Due date: {invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString() : 'Upon receipt'}</Text><Text>Currency: {invoice.currency}</Text><Text>Thank you for your business.</Text></View></View><View style={styles.section}><Text style={styles.label}>Line items</Text><View style={styles.table}><View style={styles.tableHeader}><Text style={styles.description}>Description</Text><Text style={styles.qty}>Qty</Text><Text style={styles.price}>Unit price</Text><Text style={styles.amount}>Amount</Text></View>{items.map((item, index) => <View key={`${item.description}-${index}`} style={styles.tableRow}><Text style={styles.description}>{item.description}</Text><Text style={styles.qty}>{Number(item.quantity).toFixed(2)}</Text><Text style={styles.price}>{amount(item.unit_price, invoice.currency)}</Text><Text style={styles.amount}>{amount(item.total, invoice.currency)}</Text></View>)}</View></View><View style={styles.totals}><View style={styles.totalRow}><Text>Subtotal</Text><Text>{amount(invoice.subtotal, invoice.currency)}</Text></View><View style={styles.totalRow}><Text>Tax ({Number(invoice.tax_rate).toFixed(2)}%)</Text><Text>{amount(Number(invoice.total_amount) - Number(invoice.subtotal) * (1 - Number(invoice.discount_rate) / 100), invoice.currency)}</Text></View><View style={styles.totalRow}><Text>Discount ({Number(invoice.discount_rate).toFixed(2)}%)</Text><Text>- {amount(Number(invoice.subtotal) * (Number(invoice.discount_rate) / 100), invoice.currency)}</Text></View><View style={[styles.totalRow, styles.grandTotal]}><Text>Total</Text><Text>{amount(invoice.total_amount, invoice.currency)}</Text></View></View><View style={styles.footer}><Text style={styles.strong}>Payment terms</Text><Text>Payment is due by the date shown above. Please reference invoice {invoice.invoice_number} with your payment.</Text></View></Page></Document>
}
