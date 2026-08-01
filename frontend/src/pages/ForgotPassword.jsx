import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md card">
        <Link to="/login" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        {sent ? (
          <div className="text-center py-6">
            <h1 className="text-lg font-semibold mb-2">Check your email</h1>
            <p className="text-sm text-gray-500">If an account exists for {email}, a reset link has been sent.</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Reset your password</h1>
            <p className="text-sm text-gray-500 mb-6">We'll send you a link to reset it.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Business Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input !pl-10" placeholder="you@business.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
