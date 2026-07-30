import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, X, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const EMPTY = {
  name: '', barcode: '', category: '', brand: '', buyingPrice: '', sellingPrice: '',
  hsnCode: '', gstRate: 0, quantity: '', reorderLevel: 5, expiryDate: '',
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [gstLoading, setGstLoading] = useState(false)

  useEffect(() => {
    load()
  }, [search])

  async function load() {
    const { data } = await api.get('/products', { params: search ? { search } : {} })
    setProducts(data.products)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      name: p.name, barcode: p.barcode || '', category: p.category || '', brand: p.brand || '',
      buyingPrice: p.buying_price, sellingPrice: p.selling_price, hsnCode: p.hsn_code || '',
      gstRate: p.gst_rate, quantity: p.quantity, reorderLevel: p.reorder_level, expiryDate: p.expiry_date || '',
    })
    setModalOpen(true)
  }

  async function fetchGstFromHsn() {
    if (!form.hsnCode) return toast.error('Enter an HSN code first')
    setGstLoading(true)
    try {
      const { data } = await api.get(`/products/gst-lookup/${form.hsnCode}`)
      if (data.found) {
        setForm((f) => ({ ...f, gstRate: Number(data.gst_rate) }))
        toast.success(`GST rate auto-filled: ${data.gst_rate}% (${data.description})`)
      } else {
        toast.error('HSN code not in reference table — please select GST rate manually')
      }
    } finally {
      setGstLoading(false)
    }
  }

  async function handleSave() {
    if (!form.name) return toast.error('Product name is required')
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form)
        toast.success('Product updated')
      } else {
        await api.post('/products', form)
        toast.success('Product added')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this product?')) return
    await api.delete(`/products/${id}`)
    toast.success('Product removed')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Products</h1>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Product</button>
      </div>

      <div className="card">
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="input !pl-10" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-slate-800">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Buy / Sell</th>
                <th className="pb-2 font-medium">GST</th>
                <th className="pb-2 font-medium">Stock</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 dark:border-slate-800/50">
                  <td className="py-2.5">
                    <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.barcode}</div>
                  </td>
                  <td className="py-2.5">{p.category || '—'}</td>
                  <td className="py-2.5">₹{p.buying_price} / ₹{p.selling_price}</td>
                  <td className="py-2.5">{p.gst_rate}%</td>
                  <td className="py-2.5">
                    <span className={p.quantity <= p.reorder_level ? 'text-amber-600 font-medium' : ''}>{p.quantity}</span>
                  </td>
                  <td className="py-2.5 text-right space-x-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">No products yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-4.5 h-4.5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="Product Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} className="col-span-2" />
              <F label="Barcode" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
              <F label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              <F label="Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
              <F label="Supplier" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
              <F label="Buying Price (₹)" type="number" value={form.buyingPrice} onChange={(v) => setForm({ ...form, buyingPrice: v })} />
              <F label="Selling Price (₹)" type="number" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />

              <div className="col-span-2">
                <label className="label">HSN Code</label>
                <div className="flex gap-2">
                  <input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} className="input flex-1" placeholder="e.g. 1006" />
                  <button onClick={fetchGstFromHsn} disabled={gstLoading} className="btn-secondary shrink-0">
                    <Wand2 className="w-4 h-4" /> {gstLoading ? '…' : 'Auto-fetch GST'}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">GST Rate</label>
                <select value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })} className="input">
                  {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <F label="Quantity" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
              <F label="Reorder Level" type="number" value={form.reorderLevel} onChange={(v) => setForm({ ...form, reorderLevel: v })} />
              <F label="Expiry Date (optional)" type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
            </div>

            <button onClick={handleSave} className="btn-primary w-full !py-3 mt-5">{editing ? 'Save Changes' : 'Add Product'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  )
}
