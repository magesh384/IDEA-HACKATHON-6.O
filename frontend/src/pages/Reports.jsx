import { useState } from 'react'
import { FileText, Receipt, TrendingUp, Wallet, Download } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'pl', label: 'Profit & Loss', icon: TrendingUp },
  { key: 'gst', label: 'GST Report', icon: Receipt },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
]

export default function Reports() {
  const [tab, setTab] = useState('pl')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runReport() {
    setLoading(true)
    try {
      const params = from && to ? { from, to } : {}
      const endpoint = { pl: '/reports/profit-loss', gst: '/reports/gst', invoices: '/reports/invoices', expenses: '/reports/expenses' }[tab]
      const { data: res } = await api.get(endpoint, { params })
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!data) return toast.error('Run a report first')
    let rows = []
    if (tab === 'invoices') rows = data.invoices
    else if (tab === 'expenses') rows = data.expenses
    else return toast('CSV export is available for Invoices and Expenses reports', { icon: 'ℹ️' })

    if (rows.length === 0) return toast.error('No data to export')
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tab}-report.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reports</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setData(null) }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border ${tab === key ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </div>
        <button onClick={runReport} disabled={loading} className="btn-primary">{loading ? 'Loading…' : 'Generate Report'}</button>
        <button onClick={exportCsv} className="btn-secondary"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {data && (
        <div className="card">
          {tab === 'pl' && <ProfitLossView pl={data.report} />}
          {tab === 'gst' && <GstView gst={data} />}
          {tab === 'invoices' && <TableView rows={data.invoices} columns={['invoice_number', 'subtotal', 'discount', 'grand_total', 'payment_status', 'created_at']} />}
          {tab === 'expenses' && <TableView rows={data.expenses} columns={['category', 'description', 'amount', 'expense_date']} />}
        </div>
      )}
    </div>
  )
}

function ProfitLossView({ pl }) {
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  return (
    <div className="space-y-2 text-sm max-w-md">
      <Row label="Revenue" value={fmt(pl.revenue)} />
      <Row label="Cost of Goods" value={fmt(pl.costOfGoods)} />
      <Row label="Gross Profit" value={fmt(pl.grossProfit)} bold />
      <div className="border-t border-gray-100 dark:border-slate-800 my-2" />
      {Object.entries(pl.expensesByCategory).map(([k, v]) => <Row key={k} label={`Expense: ${k}`} value={fmt(v)} />)}
      <Row label="Employee Salaries" value={fmt(pl.employeeSalaries)} />
      <Row label="Loan EMI" value={fmt(pl.loanEmi)} />
      <div className="border-t border-gray-100 dark:border-slate-800 my-2" />
      <Row label="Net Business Profit" value={fmt(pl.netBusinessProfit)} bold color={pl.netBusinessProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
    </div>
  )
}

function GstView({ gst }) {
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="CGST" value={fmt(gst.totals.cgst)} />
        <Stat label="SGST" value={fmt(gst.totals.sgst)} />
        <Stat label="IGST" value={fmt(gst.totals.igst)} />
        <Stat label="Cess" value={fmt(gst.totals.cess)} />
        <Stat label="Total GST" value={fmt(gst.totals.total_gst)} highlight />
      </div>
      <TableView rows={gst.byRate} columns={['gst_rate', 'taxable_value', 'gst_amount']} />
    </div>
  )
}

function TableView({ rows, columns }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-gray-400 text-center py-6">No data for this period.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-slate-800">
            {columns.map((c) => <th key={c} className="pb-2 font-medium capitalize">{c.replace(/_/g, ' ')}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 dark:border-slate-800/50">
              {columns.map((c) => <td key={c} className="py-2">{String(r[c] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ label, value, bold, color }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color || ''}`}>{value}</span>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-brand-50 dark:bg-brand-500/10' : 'bg-gray-50 dark:bg-slate-800'}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-brand-600' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
  )
}
