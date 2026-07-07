import { useState, useEffect, useRef } from 'react'
import api from '../../api/axios'

const TYPE_CONFIG = {
  book_borrowed: { icon: 'menu_book', label: 'Book Borrowed', color: '#3b82f6' },
  book_returned: { icon: 'assignment_returned', label: 'Book Returned', color: '#22c55e' },
  overdue: { icon: 'warning', label: 'Overdue', color: '#ef4444' },
  fine: { icon: 'payments', label: 'Fine Issued', color: '#f59e0b' },
  registration_approved: { icon: 'check_circle', label: 'Registration Approved', color: '#22c55e' },
  registration_rejected: { icon: 'cancel', label: 'Registration Rejected', color: '#ef4444' },
  general: { icon: 'notifications', label: 'Notification', color: '#8b5cf6' }
}

export default function NotificationsPanel({ notifications, onClose, onMarkRead, onMarkAllRead, onRefresh }) {
  const nodeRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (nodeRef.current && !nodeRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      onRefresh()
    } catch (e) { /* ignore */ }
  }

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const config = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.general

  return (
    <div
      ref={nodeRef}
      className="absolute top-12 right-0 w-[360px] max-h-[500px] overflow-hidden rounded-xl shadow-2xl z-50 border"
      style={{ 
        backgroundColor: 'rgba(15, 23, 42, 0.92)', 
        backdropFilter: 'blur(10px) saturate(130%)',
        WebkitBackdropFilter: 'blur(10px) saturate(130%)',
        borderColor: 'rgba(255, 255, 255, 0.08)', 
        animation: 'fadeIn .15s ease-out', 
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.4), 0 0 15px rgba(99, 102, 241, 0.05)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
        <h3 className="text-white font-bold text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={async () => { await onMarkAllRead(); onRefresh() }} className="text-xs font-bold hover:underline" style={{ color: '#38bdf8' }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 transition-colors hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
            <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>close</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[420px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <span className="material-symbols-outlined mb-2 text-slate-600" style={{ fontSize: 40 }}>notifications_none</span>
            <p className="text-sm font-semibold text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const c = config(n.type)
            return (
              <div
                key={n._id}
                className={`flex items-start gap-3 px-4 py-3 border-b transition-colors group ${!n.read ? 'bg-white/[0.04]' : 'bg-transparent hover:bg-white/[0.06]'}`}
                style={{ borderColor: 'rgba(255, 255, 255, 0.04)', cursor: 'pointer' }}
                onClick={async () => { await onMarkRead(n._id); onRefresh() }}
              >
                <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + '25' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: c.color }}>{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-wide uppercase text-slate-400">{c.label}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 animate-pulse shadow-[0_0_8px_#38bdf8]" />}
                  </div>
                  <p className="text-sm font-medium leading-snug mt-0.5 line-clamp-2 text-slate-200">{n.message}</p>
                  <p className="text-[10px] font-bold mt-1 text-slate-500">{timeAgo(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n._id) }}
                  className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-all text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                  style={{ color: '#94a3b8' }}
                  title="Delete notification"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>delete</span>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
