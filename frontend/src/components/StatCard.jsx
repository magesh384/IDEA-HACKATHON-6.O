import { motion } from 'framer-motion'

export default function StatCard({ label, value, icon: Icon, tint = 'brand', suffix = '' }) {
  const tints = {
    brand: 'from-brand-500 to-brand-700',
    green: 'from-emerald-500 to-emerald-700',
    red: 'from-rose-500 to-rose-700',
    amber: 'from-amber-500 to-amber-700',
    slate: 'from-slate-500 to-slate-700',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tints[tint]} flex items-center justify-center text-white shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</div>
        <div className="text-xl font-semibold text-gray-900 dark:text-white truncate">{value}{suffix}</div>
      </div>
    </motion.div>
  )
}
