import { useState, useEffect, useRef } from 'react'

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
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
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
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
      className="absolute top-12 right-0 w-[360px] max-h-[500px] overflow-hidden rounded-xl shadow-2xl z-50"
      style={{ backgroundColor: '#1e2a45', border: '1px solid rgba(255,255,255,0.08)', animation: 'fadeIn .15s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <h3 className="text-white font-semibold text-sm">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={() => { onMarkAllRead(); onRefresh() }} className="text-xs font-medium hover:underline" style={{ color: '#3b82f6' }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 transition-colors" style={{ color: '#B0C4DE' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[420px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 40, color: '#374151' }}>notifications_none</span>
            <p className="text-sm" style={{ color: '#6b7280' }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const c = config(n.type)
            return (
              <div
                key={n._id}
                className={`flex items-start gap-3 px-4 py-3 border-b transition-colors group ${!n.read ? 'bg-white/5' : ''}`}
                style={{ borderColor: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
                onClick={() => { onMarkRead(n._id); onRefresh() }}
              >
                <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: c.color }}>{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: c.color }}>{c.label}</p>
                    {!n.read && <span className="w-[6px] h-[6px] rounded-full bg-blue-400 flex-shrink-0" />}
                  </div>
                  <p className="text-sm leading-snug mt-0.5 line-clamp-2" style={{ color: '#d1d5db' }}>{n.message}</p>
                  <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>{timeAgo(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n._id) }}
                  className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#6b7280' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
