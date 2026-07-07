// =========================================================================
// WHAT DOES THIS FILE DO?
// This is the left-aligned navigation drawer panel for the library system.
// It maps lists of pages (like Books, Issues, Fines, Scanner) and dynamically
// highlights the active menu link using path matching. Supports mobile
// devices by sliding off-screen using open/close drawer states.
// =========================================================================

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import api from '../../api/axios'

const navItems = [
  { icon: "grid_view", label: "Dashboard", route: "/dashboard" },
  { icon: "library_books", label: "Books Catalog", route: "/books" },
  { icon: "book_5", label: "Issue Book", route: "/issue-book" },
  { icon: "assignment_return", label: "Return Book", route: "/return-book" },
  { icon: "person_check", label: "Pending Registration", route: "/pending-registration" },
  { icon: "group", label: "Members", route: "/members" },
  { icon: "history_edu", label: "Circulation", route: "/circulation" },
  { icon: "payments", label: "Fines", route: "/fines" },
  { icon: "assessment", label: "Reports", route: "/reports" },
]

const ms = {
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}

const msOutline = {
  fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (user?.role !== 'librarian') return

    const fetchPending = async () => {
      try {
        const res = await api.get('/auth/pending')
        if (res.data && typeof res.data.count === 'number') {
          setPendingCount(res.data.count)
        }
      } catch (err) {
        console.error('Error fetching pending registrations:', err)
      }
    }

    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [user])

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleNav = (route) => {
    if (route && route !== '#') {
      navigate(route)
      if (typeof setIsOpen === 'function') {
        setIsOpen(false)
      }
    }
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ background: 'linear-gradient(180deg, #1E2A4A 0%, #0F1A33 100%)', padding: '1rem', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Profile / Brand Header */}
      <div className="flex items-center justify-between gap-3 px-2 mb-8">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.png"
            alt="School Logo"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <div>
            <h2 className="text-[13px] leading-tight" style={{ color: '#ffffff', fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}>Kawudulla Maha Vidyalaya Library</h2>
          </div>
        </div>
        {/* Close mobile drawer toggle */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 rounded-xl hover:bg-white/10"
          style={{ color: '#B0C4DE' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {navItems
          .map((item) => {
            if (user?.role !== 'librarian' && item.route === '/books') {
              return { ...item, label: "Browse Books" };
            }
            return item;
          })
          .filter((item) => {
            if (user?.role === 'librarian') return true;
            return item.route === '/dashboard' || item.route === '/books';
          })
          .map((item) => {
            const isActive = item.route !== '#' && (
              location.pathname === item.route || 
              (item.route !== '/dashboard' && location.pathname.startsWith(item.route))
            )
          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.route)}
              className="flex items-center gap-3 font-bold transition-all duration-300 text-base w-full text-left"
              style={{
                padding: '0.55rem 0.85rem',
                margin: '0',
                color: isActive ? '#fff' : '#B0C4DE',
                backgroundColor: isActive ? '#4062BB' : 'transparent',
                borderRadius: '12px',
                boxShadow: isActive ? '0 2px 8px rgba(64,98,187,0.4)' : 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: isActive ? '#fff' : '#B0C4DE', ...ms }}>{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.route === '/pending-registration' && pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}

      </nav>

      {/* User Info Profile Card & Logout */}
      <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between gap-2 px-1">
        <div 
          onClick={() => handleNav('/profile')}
          className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1 rounded-xl flex-1 min-w-0 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#facc15] text-[#1e293b] flex items-center justify-center font-black text-sm flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate leading-tight">{user?.name || 'User'}</span>
            <span className="text-[10px] text-slate-400 capitalize mt-0.5 leading-none">{user?.role || 'Member'}</span>
          </div>
        </div>
        
        {/* Logout button */}
        <button
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex-shrink-0"
          title="Logout"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, ...msOutline }}>logout</span>
        </button>
      </div>
    </aside>
  )
}
