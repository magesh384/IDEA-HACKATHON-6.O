import { useEffect, useState } from 'react'
import { Search, Plus, Minus, Trash2, ScanBarcode, Printer, Mail, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function Billing() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([]) // [{ product, quantity, discount }]
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isInterstate, setIsInterstate] = useState(false)
  const [lastInvoice, setLastInvoice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProducts()
    loadCustomers()
  }, [])

  useEffect(() => {
    const t = setTimeout(loadProducts, 250)
    return () => clearTimeout(t)
  }, [search])

  async function loadProducts() {
    const { data } = await api.get('/products', { params: search ? { search } : {} })
    setProducts(data.products)
  }

  async function loadCustomers() {
    const { data } = await api.get('/customers')
    setCustomers(data.customers)
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing) {
        return prev.map((c) => (c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c))
      }
      return [...prev, { product, quantity: 1, discount: 0 }]
    })
  }

  function updateQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0)
    )
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((c) => c.product.id !== productId))
  }

  // Live GST calculation, mirrors backend logic for instant feedback
  const lineCalcs = cart.map(({ product, quantity, discount: lineDiscount }) => {
    const lineTotal = product.selling_price * quantity
    const taxable = lineTotal - (lineDiscount || 0)
    const gstAmount = (taxable * product.gst_rate) / 100
    const cgst = isInterstate ? 0 : gstAmount / 2
    const sgst = isInterstate ? 0 : gstAmount / 2
    const igst = isInterstate ? gstAmount : 0
    return { ...product, quantity, lineTotal, taxable, cgst, sgst, igst }
  })

  const subtotal = lineCalcs.reduce((s, l) => s + l.lineTotal, 0)
  const totalCgst = lineCalcs.reduce((s, l) => s + l.cgst, 0)
  const totalSgst = lineCalcs.reduce((s, l) => s + l.sgst, 0)
  const totalIgst = lineCalcs.reduce((s, l) => s + l.igst, 0)
  const grandTotal = subtotal - discount + totalCgst + totalSgst + totalIgst

  async function checkout() {
    if (cart.length === 0) return toast.error('Cart is empty')
    setSubmitting(true)
    try {
      const { data } = await api.post('/billing/invoices', {
        customerId: customerId || null,
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity, discount: c.discount || 0 })),
        discount: Number(discount) || 0,
        paymentMethod,
        isInterstate,
      })
      toast.success(`Invoice ${data.invoice.invoiceNumber} created`)
      setLastInvoice(data.invoice)
      setCart([])
      setDiscount(0)
      loadProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n) => `₹${Number(n).toFixed(2)}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Product search / catalog */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <ScanBarcode className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or scan barcode…"
              className="input !pl-10 !pr-10"
              autoFocus
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.quantity === 0}
              className="card text-left hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</div>
              <div className="text-xs text-gray-500 mt-1">{p.category}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-brand-600">₹{Number(p.selling_price).toFixed(2)}</span>
                <span className={`text-xs ${p.quantity <= p.reorder_level ? 'text-amber-600' : 'text-gray-400'}`}>{p.quantity} in stock</span>
              </div>
            </button>
          ))}
          {products.length === 0 && <div className="col-span-full text-center text-sm text-gray-400 py-10">No products found.</div>}
        </div>
      </div>

      {/* Cart / checkout panel */}
      <div className="card flex flex-col h-fit lg:sticky lg:top-20">
        <h3 className="font-medium mb-3">Current Bill</h3>

        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input mb-3">
          <option value="">Walk-in Customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex-1 max-h-72 overflow-y-auto space-y-2 mb-3">
          {cart.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Cart is empty — click a product to add it.</p>}
          {lineCalcs.map((line) => (
            <div key={line.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="truncate">{line.name}</div>
                <div className="text-xs text-gray-400">₹{Number(line.selling_price).toFixed(2)} × {line.quantity} = {fmt(line.lineTotal)}</div>
              </div>
              <button onClick={() => updateQty(line.id, -1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><Minus className="w-3.5 h-3.5" /></button>
              <span className="w-5 text-center">{line.quantity}</span>
              <button onClick={() => updateQty(line.id, 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><Plus className="w-3.5 h-3.5" /></button>
              <button onClick={() => removeItem(line.id)} className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 text-sm border-t border-gray-100 dark:border-slate-800 pt-3">
          <Row label="Subtotal" value={fmt(subtotal)} />
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Discount</span>
            <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24 text-right input !py-1 !px-2" />
          </div>
          <Row label="CGST" value={fmt(totalCgst)} />
          <Row label="SGST" value={fmt(totalSgst)} />
          {isInterstate && <Row label="IGST" value={fmt(totalIgst)} />}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800 font-semibold">
            <span>Grand Total</span>
            <span className="text-brand-600">{fmt(grandTotal)}</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-500 mt-3">
          <input type="checkbox" checked={isInterstate} onChange={(e) => setIsInterstate(e.target.checked)} className="rounded" />
          Inter-state sale (apply IGST instead of CGST+SGST)
        </label>

        <div className="grid grid-cols-3 gap-1.5 mt-3">
          {['cash', 'card', 'upi'].map((m) => (
            <button key={m} onClick={() => setPaymentMethod(m)} className={`text-xs py-2 rounded-lg border capitalize ${paymentMethod === m ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'}`}>
              {m}
            </button>
          ))}
        </div>

        <button onClick={checkout} disabled={submitting || cart.length === 0} className="btn-primary w-full !py-3 mt-4">
          {submitting ? 'Processing…' : `Generate Invoice — ${fmt(grandTotal)}`}
        </button>
      </div>

      {lastInvoice && <InvoiceModal invoice={lastInvoice} onClose={() => setLastInvoice(null)} />}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function InvoiceModal({ invoice, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Invoice {invoice.invoiceNumber}</h3>
          <button onClick={onClose}><X className="w-4.5 h-4.5" /></button>
        </div>
        <div className="space-y-1.5 text-sm mb-4">
          {invoice.items.map((it, i) => (
            <div key={i} className="flex justify-between"><span>{it.productName} × {it.quantity}</span><span>₹{Number(it.lineTotal).toFixed(2)}</span></div>
          ))}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-2 flex justify-between font-semibold">
            <span>Grand Total</span><span>₹{Number(invoice.grandTotal).toFixed(2)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => window.print()} className="btn-secondary"><Printer className="w-4 h-4" /> Print</button>
          <button onClick={() => toast.success('Invoice emailed (demo)')} className="btn-secondary"><Mail className="w-4 h-4" /> Email</button>
        </div>
      </div>
    </div>
  )
}
