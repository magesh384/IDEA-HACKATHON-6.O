import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const STEPS = ['Business Details', 'Financials', 'Employees', 'Settings']

export default function RegisterBusiness() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    businessName: '', ownerName: '', gstNumber: '', panNumber: '', businessType: '', industry: '',
    storeCategory: '', address: '', city: '', state: '', country: 'India', pincode: '',
    initialInvestment: '', workingCapital: '', monthlyRent: '', electricityCost: '', internetCost: '', otherExpenses: '',
    gstRegistered: true, currency: 'INR', financialYear: '2026-2027', taxRegime: 'new',
    employees: [{ name: '', position: '', monthlySalary: '' }],
  })

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setEmployee(idx, field, value) {
    setForm((f) => {
      const employees = [...f.employees]
      employees[idx] = { ...employees[idx], [field]: value }
      return { ...f, employees }
    })
  }

  function addEmployee() {
    setForm((f) => ({ ...f, employees: [...f.employees, { name: '', position: '', monthlySalary: '' }] }))
  }

  function removeEmployee(idx) {
    setForm((f) => ({ ...f, employees: f.employees.filter((_, i) => i !== idx) }))
  }

  function validateStep() {
    if (step === 0 && (!form.businessName || !form.ownerName)) {
      toast.error('Business name and owner name are required')
      return false
    }
    return true
  }

  function next() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data } = await api.post('/business/register', form)
      localStorage.setItem('accessToken', data.accessToken)
      updateUser({ businessId: data.business.id, businessName: data.business.businessName, onboardingComplete: true })
      toast.success('Business registered! Welcome aboard.')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Set up your business</h1>
        <p className="text-sm text-gray-500 mb-6">This helps us tailor your dashboard, GST, and P&amp;L calculations.</p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-500/20' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-brand-600' : 'bg-gray-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="font-medium text-gray-900 dark:text-white mb-2">{STEPS[0]}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Business Name" value={form.businessName} onChange={(v) => set('businessName', v)} required />
                    <Field label="Owner Name" value={form.ownerName} onChange={(v) => set('ownerName', v)} required />
                    <Field label="GST Number" value={form.gstNumber} onChange={(v) => set('gstNumber', v)} />
                    <Field label="PAN Number" value={form.panNumber} onChange={(v) => set('panNumber', v)} />
                    <Field label="Business Type" value={form.businessType} onChange={(v) => set('businessType', v)} placeholder="Retail, Wholesale…" />
                    <Field label="Industry" value={form.industry} onChange={(v) => set('industry', v)} placeholder="Grocery, Apparel…" />
                    <Field label="Store Category" value={form.storeCategory} onChange={(v) => set('storeCategory', v)} />
                    <Field label="Pincode" value={form.pincode} onChange={(v) => set('pincode', v)} />
                    <Field label="Address" value={form.address} onChange={(v) => set('address', v)} className="col-span-2" />
                    <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
                    <Field label="State" value={form.state} onChange={(v) => set('state', v)} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-medium text-gray-900 dark:text-white mb-2">{STEPS[1]}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Initial Investment (₹)" type="number" value={form.initialInvestment} onChange={(v) => set('initialInvestment', v)} />
                    <Field label="Working Capital (₹)" type="number" value={form.workingCapital} onChange={(v) => set('workingCapital', v)} />
                    <Field label="Monthly Rent (₹)" type="number" value={form.monthlyRent} onChange={(v) => set('monthlyRent', v)} />
                    <Field label="Electricity Cost (₹)" type="number" value={form.electricityCost} onChange={(v) => set('electricityCost', v)} />
                    <Field label="Internet Cost (₹)" type="number" value={form.internetCost} onChange={(v) => set('internetCost', v)} />
                    <Field label="Other Expenses (₹)" type="number" value={form.otherExpenses} onChange={(v) => set('otherExpenses', v)} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-medium text-gray-900 dark:text-white">{STEPS[2]}</h2>
                    <button onClick={addEmployee} className="btn-secondary !py-1.5 !px-3 text-xs"><Plus className="w-3.5 h-3.5" /> Add employee</button>
                  </div>
                  <div className="space-y-3">
                    {form.employees.map((emp, idx) => (
                      <div key={idx} className="grid grid-cols-[2fr_2fr_1.5fr_auto] gap-2 items-end">
                        <Field label={idx === 0 ? 'Name' : ''} value={emp.name} onChange={(v) => setEmployee(idx, 'name', v)} />
                        <Field label={idx === 0 ? 'Position' : ''} value={emp.position} onChange={(v) => setEmployee(idx, 'position', v)} />
                        <Field label={idx === 0 ? 'Monthly Salary (₹)' : ''} type="number" value={emp.monthlySalary} onChange={(v) => setEmployee(idx, 'monthlySalary', v)} />
                        <button onClick={() => removeEmployee(idx)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {form.employees.length === 0 && <p className="text-sm text-gray-400">No employees added yet — that's fine, you can add them later.</p>}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-medium text-gray-900 dark:text-white mb-2">{STEPS[3]}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">GST Registered</label>
                      <select value={form.gstRegistered ? 'yes' : 'no'} onChange={(e) => set('gstRegistered', e.target.value === 'yes')} className="input">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Currency</label>
                      <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="input">
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>
                    <Field label="Financial Year" value={form.financialYear} onChange={(v) => set('financialYear', v)} />
                    <div>
                      <label className="label">Tax Regime</label>
                      <select value={form.taxRegime} onChange={(e) => set('taxRegime', e.target.value)} className="input">
                        <option value="new">New Regime</option>
                        <option value="old">Old Regime</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100 dark:border-slate-800">
            <button onClick={back} disabled={step === 0} className="btn-secondary disabled:opacity-0">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="btn-primary">Next <ArrowRight className="w-4 h-4" /></button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting ? 'Setting up…' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}{required && ' *'}</label>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </div>
  )
}
