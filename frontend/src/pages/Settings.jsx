import { useEffect, useState } from 'react'
import { Save, PiggyBank, ShieldCheck, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function Settings() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [advice, setAdvice] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await api.get('/business/settings')
    setForm(data.business)
  }

  async function save() {
    setSaving(true)
    try {
      await api.put('/business/settings', form)
      toast.success('Settings updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function loadAdvice() {
    const { data } = await api.get('/ai/investment-advice')
    setAdvice(data)
  }

  if (!form) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>

      <div className="card">
        <h3 className="font-medium mb-4 flex items-center gap-2"><ShieldCheck className="w-4.5 h-4.5 text-brand-600" /> Business Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Business Name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
          <F label="Owner Name" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} />
          <F label="GST Number" value={form.gst_number || ''} onChange={(v) => setForm({ ...form, gst_number: v })} />
          <F label="PAN Number" value={form.pan_number || ''} onChange={(v) => setForm({ ...form, pan_number: v })} />
          <F label="City" value={form.city || ''} onChange={(v) => setForm({ ...form, city: v })} />
          <F label="State" value={form.state || ''} onChange={(v) => setForm({ ...form, state: v })} />
          <F label="Monthly Rent (₹)" type="number" value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
          <F label="Electricity (₹)" type="number" value={form.electricity_cost} onChange={(v) => setForm({ ...form, electricity_cost: v })} />
          <div>
            <label className="label">Theme</label>
            <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className="input">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary mt-5"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}</button>
      </div>

      <div className="card">
        <h3 className="font-medium mb-4 flex items-center gap-2"><PiggyBank className="w-4.5 h-4.5 text-brand-600" /> Investment Advisor</h3>
        {!advice ? (
          <button onClick={loadAdvice} className="btn-secondary">Get low-risk investment ideas</button>
        ) : (
          <div>
            <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs mb-4">
              <Info className="w-4 h-4 shrink-0 mt-0.5" /> {advice.note}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {advice.options.map((o) => (
                <div key={o.name} className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                  <div className="font-medium text-sm mb-1.5">{o.name}</div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Risk: <span className="text-gray-700 dark:text-gray-300">{o.risk}</span></div>
                    <div>Returns: <span className="text-gray-700 dark:text-gray-300">{o.expectedReturns}</span></div>
                    <div>Liquidity: <span className="text-gray-700 dark:text-gray-300">{o.liquidity}</span></div>
                    <div>Period: <span className="text-gray-700 dark:text-gray-300">{o.period}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
