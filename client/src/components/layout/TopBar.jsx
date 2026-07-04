// =========================================================================
// WHAT DOES THIS FILE DO?
// This is the top dashboard header panel. It displays a menu toggle button
// (hamburger menu) on mobile/tablet viewports, fetches and shows real-time
// unread notification badge alerts, and links directly to the member profile.
// =========================================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import NotificationsPanel from './NotificationsPanel'

export default function TopBar({ onMenuToggle }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (e) { /* ignore */ }
  }

  useEffect(() => { loadNotifications() }, [])

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (e) { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (e) { /* ignore */ }
  }

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
    loadNotifications()
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-14 flex items-center justify-between lg:justify-end px-4 lg:px-8 z-40" style={{ backgroundColor: 'rgba(15,26,51,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Hamburger menu on Mobile / Tablets */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
        style={{ color: '#B0C4DE' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24, verticalAlign: 'middle' }}>menu</span>
      </button>

      {/* Right side items */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={toggleNotifications}
            className="p-2 transition-colors hover:bg-white/5 rounded-xl"
            style={{ color: '#B0C4DE' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, verticalAlign: 'middle' }}>notifications</span>
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-end ml-1 cursor-pointer hover:bg-white/5 rounded-xl px-3 py-1 transition-colors"
        >
          <span className="text-sm font-semibold leading-tight" style={{ color: '#ffffff', fontFamily: "'Manrope', sans-serif" }}>{user?.name || 'User'}</span>
          {user?.role && <span className="text-[11px] leading-tight mt-0.5" style={{ color: '#f59e0b' }}>{user.role}</span>}
        </button>
      </div>

      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onRefresh={loadNotifications}
        />
      )}
    </header>
  )
}
