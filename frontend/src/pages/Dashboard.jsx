import { useEffect, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  IndianRupee, TrendingUp, Receipt, ShoppingBag, AlertTriangle, PackageX,
  HeartPulse, Sparkles, Clock, Lightbulb,
} from 'lucide-react'
import api from '../api/client'
import StatCard from '../components/StatCard'
import '../charts/setup'
import { CHART_COLORS } from '../charts/setup'

export default function Dashboard() {
  const [widgets, setWidgets] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, c, r] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/charts'),
        api.get('/ai/recommendations'),
      ])
      setWidgets(s.data.widgets)
      setCharts(c.data.charts)
      setRecommendations(r.data.recommendations)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !widgets || !charts) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const revenueTrendData = {
    labels: charts.revenueTrend.map((d) => d.date.slice(5)),
    datasets: [
      { label: 'Revenue', data: charts.revenueTrend.map((d) => d.revenue), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.35 },
      { label: 'Profit', data: charts.revenueTrend.map((d) => d.profit), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.35 },
    ],
  }

  const expenseData = {
    labels: charts.expenseBreakdown.map((e) => e.category),
    datasets: [{ data: charts.expenseBreakdown.map((e) => e.total), backgroundColor: CHART_COLORS }],
  }

  const topProductsData = {
    labels: charts.topProducts.map((p) => p.name),
    datasets: [{ label: 'Profit (₹)', data: charts.topProducts.map((p) => p.profit), backgroundColor: '#6366f1', borderRadius: 6 }],
  }

  const chartOpts = { responsive: true, plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 11 } } } }, maintainAspectRatio: false }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Executive Dashboard</h1>
        <p className="text-sm text-gray-500">Live overview of your business — updates in real time</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={fmt(widgets.todaySales)} icon={IndianRupee} tint="brand" />
        <StatCard label="Today's Profit" value={fmt(widgets.todayProfit)} icon={TrendingUp} tint="green" />
        <StatCard label="Today's Tax" value={fmt(widgets.todayTax)} icon={Receipt} tint="amber" />
        <StatCard label="Today's Orders" value={widgets.todayOrders} icon={ShoppingBag} tint="slate" />
        <StatCard label="Pending Payments" value={fmt(widgets.pendingPayments)} icon={Clock} tint="amber" />
        <StatCard label="Low Stock Items" value={widgets.lowStockCount} icon={AlertTriangle} tint="amber" />
        <StatCard label="Out of Stock" value={widgets.outOfStockCount} icon={PackageX} tint="red" />
        <StatCard label="Business Health" value={widgets.businessHealthScore} suffix="/100" icon={HeartPulse} tint={widgets.businessHealthScore >= 60 ? 'green' : 'red'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-medium mb-3">Revenue &amp; Profit — last 30 days</h3>
          <div className="h-64"><Line data={revenueTrendData} options={chartOpts} /></div>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium mb-3">Expense Breakdown</h3>
          <div className="h-64"><Doughnut data={expenseData} options={chartOpts} /></div>
        </div>
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-medium mb-3">Top Products by Profit</h3>
          <div className="h-64"><Bar data={topProductsData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium mb-3">Cash Flow (30 days)</h3>
          <div className="space-y-3 mt-4">
            <Row label="Cash In" value={fmt(charts.cashFlow.cashIn)} color="text-emerald-600" />
            <Row label="Cash Out" value={fmt(charts.cashFlow.cashOut)} color="text-rose-600" />
            <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
              <Row label="Net Cash Flow" value={fmt(charts.cashFlow.netCashFlow)} color={charts.cashFlow.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'} bold />
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4.5 h-4.5 text-brand-600" />
          <h3 className="text-sm font-medium">AI Recommendations</h3>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-400">No active recommendations right now — your business looks steady.</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r) => (
              <div key={r.id} className="flex gap-3 p-3 rounded-xl bg-brand-50/60 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/10">
                <Lightbulb className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`${color} ${bold ? 'font-semibold' : 'font-medium'}`}>{value}</span>
    </div>
  )
}
