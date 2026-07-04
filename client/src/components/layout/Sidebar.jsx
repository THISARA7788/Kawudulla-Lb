import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const navItems = [
  { icon: "grid_view", label: "Dashboard", route: "/dashboard" },
  { icon: "library_books", label: "Book Management", route: "/books" },
  { icon: "book_5", label: "Issue Book", route: "/issue-book" },
  { icon: "assignment_return", label: "Return Book", route: "/return-book" },
  { icon: "person_check", label: "Pending Registration", route: "/pending-registration" },
  { icon: "group", label: "Members", route: "/members" },
  { icon: "history_edu", label: "Circulation Record", route: "/circulation" },
  { icon: "payments", label: "Fine Management", route: "/fines" },
  { icon: "assessment", label: "Reports", route: "/reports" },
  { icon: "qr_code_scanner", label: "QR Scanner", route: "/qr-scanner" },
]

const ms = {
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}

const msOutline = {
  fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleNav = (route) => {
    if (route && route !== '#') {
      navigate(route)
    }
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
      style={{ background: 'linear-gradient(180deg, #1E2A4A 0%, #0F1A33 100%)', padding: '1rem', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Profile */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <img
          src="/images/logo.png"
          alt="School Logo"
          className="w-12 h-12 object-contain flex-shrink-0"
        />
        <div>
          <h2 className="text-lg leading-tight" style={{ color: '#ffffff', fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}>Kawudulla Maha Vidyalaya Library</h2>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {navItems.map((item) => {
          const isActive = item.route !== '#' && location.pathname === item.route
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
                borderRadius: isActive ? '9999px' : '12px',
                fontWeight: 'bold',
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
              <span>{item.label}</span>
            </button>
          )
        })}

        {/* Settings */}
        <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => handleNav('/profile')}
            className="flex items-center gap-3 px-3 py-3 text-[13px] w-full transition-opacity hover:opacity-100"
            style={{ color: '#B0C4DE', borderRadius: '12px', opacity: location.pathname === '/profile' ? 1 : 0.6, backgroundColor: location.pathname === '/profile' ? 'rgba(64,98,187,0.3)' : 'transparent', fontWeight: location.pathname === '/profile' ? 'bold' : 500 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: location.pathname === '/profile' ? '#fff' : '#B0C4DE', ...msOutline }}>settings</span>
            <span>Profile & Settings</span>
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="flex items-center gap-3 px-3 py-3 w-full opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: '#D9645E', fontSize: '13px', fontWeight: 500, borderRadius: '12px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, ...msOutline }}>logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
