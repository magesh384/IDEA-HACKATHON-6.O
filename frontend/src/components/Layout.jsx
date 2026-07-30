import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, UserCog, Receipt, FileBarChart,
  Settings, Bell, Moon, Sun, LogOut, MessageCircle, Menu, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import ChatWidget from './ChatWidget'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/billing', label: 'Billing / POS', icon: ShoppingCart },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/employees', label: 'Employees', icon: UserCog },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications)
    } catch {
      /* silent — notifications are non-critical */
    }
  }

  async function markAllRead() {
    await api.put('/notifications/read-all')
    fetchNotifications()
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={`fixed lg:static z-30 inset-y-0 left-0 w-64 transform ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 glass lg:bg-white/80 lg:dark:bg-slate-900/80 border-r border-gray-100 dark:border-slate-800 flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">AI</div>
            <span className="font-semibold text-gray-900 dark:text-white">Business Assistant</span>
          </div>
          <button className="lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-slate-800">
          <div className="px-3 py-2 mb-1 text-xs text-gray-500 dark:text-gray-400 truncate">{user?.businessName}</div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4.5 h-4.5" /> Log out
          </button>
        </div>
      </aside>

      {mobileNavOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setMobileNavOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 glass lg:bg-white/70 lg:dark:bg-slate-900/70 border-b border-gray-100 dark:border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between">
          <button className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <button onClick={() => setDark((d) => !d)} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              {dark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-80 card p-0 overflow-hidden shadow-lg"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                      <span className="font-medium text-sm">Notifications</span>
                      <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="p-4 text-sm text-gray-500 text-center">You're all caught up.</div>
                      )}
                      {notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800/50 text-sm ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${n.severity === 'critical' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                            <span className="font-medium">{n.title}</span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setChatOpen(true)} className="btn-primary !py-2 !px-3.5 text-xs">
              <MessageCircle className="w-4 h-4" /> Ask AI
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
