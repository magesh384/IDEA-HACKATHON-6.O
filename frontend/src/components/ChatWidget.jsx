import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function ChatWidget({ open, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) loadHistory()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadHistory() {
    try {
      const { data } = await api.get('/ai/chat/history')
      if (data.history.length > 0) {
        setMessages(data.history.map((h) => ({ role: h.role, content: h.content })))
      } else {
        setMessages([{ role: 'assistant', content: "Hi! I'm your AI business assistant. Ask me about sales, profit, inventory, GST, or anything else about your business." }])
      }
    } catch {
      /* start fresh */
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const { data } = await api.post('/ai/chat', { message: text })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      const msg = err.response?.data?.message || 'The AI assistant is unavailable right now.'
      toast.error(msg)
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${msg}` }])
    } finally {
      setSending(false)
    }
  }

  const suggestions = ['Why is my profit decreasing?', 'Which products should I discontinue?', 'How much GST do I owe this month?']

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          className="fixed bottom-4 right-4 z-50 w-[92vw] max-w-sm h-[600px] max-h-[80vh] card p-0 flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-brand-600" />
              <span className="font-medium text-sm">AI Business Assistant</span>
            </div>
            <button onClick={onClose}><X className="w-4.5 h-4.5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-400">Thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="text-xs px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your business…"
              className="input !py-2"
            />
            <button onClick={sendMessage} disabled={sending} className="btn-primary !p-2.5 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
