import { useEffect, useState } from 'react'
import { Plus, X, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', position: '', monthlySalary: '', phone: '', hireDate: '' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await api.get('/employees')
    setEmployees(data.employees)
  }

  async function handleSave() {
    if (!form.name) return toast.error('Name is required')
    await api.post('/employees', form)
    toast.success('Employee added')
    setModalOpen(false)
    setForm({ name: '', position: '', monthlySalary: '', phone: '', hireDate: '' })
    load()
  }

  async function runPayroll(id, name, salary) {
    const month = new Date().toISOString().slice(0, 7)
    if (!confirm(`Run payroll for ${name} — ₹${salary} for ${month}?`)) return
    await api.post(`/employees/${id}/payroll`, { month })
    toast.success('Payroll processed and logged as an expense')
  }

  const totalPayroll = employees.reduce((s, e) => s + Number(e.monthly_salary), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-500">Total monthly payroll: ₹{totalPayroll.toLocaleString('en-IN')}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Employee</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((e) => (
          <div key={e.id} className="card">
            <div className="font-medium text-gray-900 dark:text-white">{e.name}</div>
            <div className="text-sm text-gray-500">{e.position || 'No position set'}</div>
            <div className="text-lg font-semibold text-brand-600 mt-2">₹{Number(e.monthly_salary).toLocaleString('en-IN')}<span className="text-xs text-gray-400 font-normal">/mo</span></div>
            <button onClick={() => runPayroll(e.id, e.name, e.monthly_salary)} className="btn-secondary w-full mt-3 !py-2 text-xs">
              <IndianRupee className="w-3.5 h-3.5" /> Run this month's payroll
            </button>
          </div>
        ))}
        {employees.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">No employees yet.</div>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="card max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Employee</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-4.5 h-4.5" /></button>
            </div>
            <div className="space-y-3">
              <F label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <F label="Position" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
              <F label="Monthly Salary (₹)" type="number" value={form.monthlySalary} onChange={(v) => setForm({ ...form, monthlySalary: v })} />
              <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <F label="Hire Date" type="date" value={form.hireDate} onChange={(v) => setForm({ ...form, hireDate: v })} />
            </div>
            <button onClick={handleSave} className="btn-primary w-full !py-3 mt-4">Add Employee</button>
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
