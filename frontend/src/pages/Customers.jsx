import { useEffect, useState } from 'react'
import { Plus, X, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', creditLimit: '' })
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await api.get('/customers')
    setCustomers(data.customers)
  }

  async function handleSave() {
    if (!form.name) return toast.error('Name is required')
    await api.post('/customers', form)
    toast.success('Customer added')
    setModalOpen(false)
    setForm({ name: '', phone: '', email: '', creditLimit: '' })
    load()
  }

  async function viewInsights(id) {
    const { data } = await api.get(`/customers/${id}/insights`)
    setInsights(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customers</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Customer</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-slate-800">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Phone</th>
              <th className="pb-2 font-medium">Credit Limit</th>
              <th className="pb-2 font-medium">Pending Balance</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 dark:border-slate-800/50">
                <td className="py-2.5 font-medium text-gray-900 dark:text-white">{c.name}</td>
                <td className="py-2.5">{c.phone || '—'}</td>
                <td className="py-2.5">₹{Number(c.credit_limit).toLocaleString('en-IN')}</td>
                <td className="py-2.5">
                  <span className={Number(c.pending_balance) > 0 ? 'text-amber-600 font-medium' : ''}>
                    ₹{Number(c.pending_balance).toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button onClick={() => viewInsights(c.id)} className="text-xs text-brand-600 hover:underline">View insights</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="card max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Customer</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-4.5 h-4.5" /></button>
            </div>
            <div className="space-y-3">
              <F label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <F label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <F label="Credit Limit (₹)" type="number" value={form.creditLimit} onChange={(v) => setForm({ ...form, creditLimit: v })} />
            </div>
            <button onClick={handleSave} className="btn-primary w-full !py-3 mt-4">Add Customer</button>
          </div>
        </div>
      )}

      {insights && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{insights.customer.name}</h3>
              <button onClick={() => setInsights(null)}><X className="w-4.5 h-4.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Lifetime Value" value={`₹${Number(insights.lifetimeValue).toLocaleString('en-IN')}`} />
              <Stat label="Churn Risk" value={insights.churnRisk} highlight={insights.churnRisk === 'high'} />
            </div>
            {insights.recommendedOffer && (
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm mb-4">
                <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" /> {insights.recommendedOffer}
              </div>
            )}
            <div className="text-sm font-medium mb-2">Purchase History</div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {insights.purchaseHistory.map((inv) => (
                <div key={inv.id} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>{inv.invoice_number}</span>
                  <span>₹{Number(inv.grand_total).toFixed(2)}</span>
                </div>
              ))}
              {insights.purchaseHistory.length === 0 && <p className="text-sm text-gray-400">No purchases yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm font-semibold capitalize ${highlight ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
  )
}
