import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const CATEGORIES = ['rent', 'electricity', 'internet', 'salary', 'loan_emi', 'depreciation', 'misc']

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ category: 'misc', description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await api.get('/expenses')
    setExpenses(data.expenses)
  }

  async function handleSave() {
    if (!form.amount) return toast.error('Amount is required')
    await api.post('/expenses', form)
    toast.success('Expense recorded')
    setModalOpen(false)
    setForm({ category: 'misc', description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) })
    load()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500">Total recorded: ₹{total.toLocaleString('en-IN')}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Expense</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-slate-800">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 dark:border-slate-800/50">
                <td className="py-2.5 capitalize">{e.category.replace('_', ' ')}</td>
                <td className="py-2.5 text-gray-500">{e.description || '—'}</td>
                <td className="py-2.5">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                <td className="py-2.5 text-gray-500">{e.expense_date}</td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No expenses recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="card max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Expense</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-4.5 h-4.5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <F label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <F label="Amount (₹)" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
              <F label="Date" type="date" value={form.expenseDate} onChange={(v) => setForm({ ...form, expenseDate: v })} />
            </div>
            <button onClick={handleSave} className="btn-primary w-full !py-3 mt-4">Save Expense</button>
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
