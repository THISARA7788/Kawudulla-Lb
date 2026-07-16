import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

const ms = {
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
}

const pieColors = ['#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#FBBF24', '#F87171', '#818CF8', '#2DD4BF']

function PieChart({ data, size = 120 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const r = size / 2 - 5
  const cx = size / 2
  const cy = size / 2
  let cumulative = 0
  const slices = data.map((d, i) => {
    const pct = d.value / total
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2
    cumulative += pct
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2
    const largeArc = pct > 0.5 ? 1 : 0
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    return <path key={i} d={path} fill={pieColors[i % pieColors.length]} stroke="#fff" strokeWidth="1.5" />
  })
  return (
    <svg width={size} height={size} className="mx-auto my-2">
      <circle cx={cx} cy={cy} r={r} fill="#f0f0f0" />
      {slices}
      <circle cx={cx} cy={cy} r={r * 0.5} fill="#fff" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="text-sm font-bold" fill="#1a1245">{total}</text>
    </svg>
  )
}

function StatCard({ s }) {
  return (
    <div className="p-5 rounded-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: s.bg, minHeight: 90 }}>
      <span className="material-symbols-outlined absolute -right-4 -bottom-4 opacity-10" style={{ fontSize: 64 }}>{s.icon}</span>
      <div>
        <span className="font-semibold text-xs block mb-1" style={{ color: s.textColor }}>{s.label}</span>
        <span className="text-2xl font-bold font-headline" style={{ color: s.textColor }}>{s.value}</span>
      </div>
      <div className="mt-3 flex items-center text-xs font-medium" style={{ color: s.textColor }}>
        <span className="material-symbols-outlined text-xs mr-1" style={{ fontSize: 14 }}>{s.trendIcon}</span>
        {s.trend}
      </div>
    </div>
  )
}

const quickActionColors = {
  "Issue Book": { bg: '#DCFCE7', icon: '#166534' },
  "Return Book": { bg: '#DBEAFE', icon: '#1D4ED8' },
  "Add New Book": { bg: '#FFF3E0', icon: '#E65100' },
  "Manage Books": { bg: '#F3E8FF', icon: '#7C3AED' },
}

function QuickAction({ icon, label, onClick }) {
  const colors = quickActionColors[label] ?? { bg: '#f0f0f0', icon: '#4F5B7D' }
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 rounded-xl transition-all hover:shadow-lg group"
      style={{ backgroundColor: colors.bg, border: `2px solid ${colors.icon}33` }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
        style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
      >
        <span className="material-symbols-outlined" style={{ color: colors.icon, fontSize: 22 }}>{icon}</span>
      </div>
      <span className="text-xs font-semibold" style={{ color: colors.icon }}>{label}</span>
    </button>
  )
}

/* --- Main Component --- */
export default function LibrarianDashboardMain() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [showAllCategories, setShowAllCategories] = useState(false)

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get('/library/books')
        setBooks(res.data.books || [])
        const allBooks = res.data.books || []
        const catMap = {}
        allBooks.forEach(b => {
          const cat = b.category && b.category.trim() ? b.category.trim() : 'Uncategorized'
          catMap[cat] = (catMap[cat] || 0) + (b.availableCopies || 0)
        })
        setCategories(catMap)
      } catch (err) {
        console.error('Error fetching books:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBooks()
  }, [])

  const totalBooks = books.length
  const totalCopies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0)
  const availableCopies = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0)
  const issuedCopies = totalCopies - availableCopies

  const stats = [
    {
      label: "Total Books",
      value: loading ? '...' : totalBooks,
      trend: `${totalCopies} total copies`,
      trendIcon: "library_books",
      bg: "#B4B8ED",
      icon: "library_books",
    },
    {
      label: "Issued",
      value: loading ? '...' : issuedCopies,
      trend: `${availableCopies} available`,
      trendIcon: "output",
      bg: "#C5D7EE",
      icon: "output",
    },
    {
      label: "Categories",
      value: loading ? '...' : Object.keys(categories).length,
      trend: "Genres available",
      trendIcon: "category",
      bg: "#E8A5A5",
      icon: "category",
    },
    {
      label: "New Additions",
      value: loading ? '...' : books.filter(b => new Date(b.createdAt) > new Date(Date.now() - 7 * 86400000)).length,
      trend: "This week",
      trendIcon: "auto_awesome",
      bg: "#E5E5E5",
      icon: "person_add",
    },
  ]

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#2C2C3E' }}>
      {/* ===== Page Header ===== */}
      <header className="mb-3">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
          Librarian Dashboard
        </h1>
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          Manage the academic atelier's circulation and catalog records.
        </p>
      </header>

      {/* ===== Stats Bento Grid ===== */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map((s, i) => <StatCard key={i} s={s} />)}
      </section>

      {/* ===== Main Content Area ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT Column: Quick Actions + Last Added Books */}
        <div className="lg:col-span-2 space-y-4">

          {/* Quick Actions */}
          <section>
            <h3 className="text-base font-bold mb-2" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <QuickAction icon="book_5" label="Issue Book" onClick={() => navigate('/issue-book')} />
              <QuickAction icon="assignment_return" label="Return Book" onClick={() => navigate('/return-book')} />
              <QuickAction icon="add_circle" label="Add New Book" onClick={() => navigate('/books')} />
              <QuickAction icon="library_books" label="Manage Books" onClick={() => navigate('/books')} />
            </div>
          </section>

          {/* Last Added Books Table */}
          <section className="rounded-xl p-4 border" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
                Last Added Books
              </h3>
              <button onClick={() => navigate('/books')} className="text-xs font-semibold" style={{ color: '#4F5B7D' }}>Manage All</button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>
                Loading books...
              </div>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>inventory_2</span>
                <p className="text-sm font-medium">No books added yet</p>
                <button onClick={() => navigate('/books')} className="text-xs mt-2 font-semibold" style={{ color: '#1a1245' }}>+ Add your first book</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {['Title', 'Author', 'Category', 'Available', ''].map((h) => (
                        <th key={h} className="pb-3 text-xs text-slate-400 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: '1px solid #f0f0f0' }}>
                    {[...books].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 1).map((book) => {
                      const hasCopies = (book.availableCopies || 0) > 0
                      return (
                        <tr key={book._id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                          <td className="py-3">
                            <p className="font-semibold text-sm" style={{ color: '#2C2C3E' }}>{book.title}</p>
                            {book.isbn && <p className="text-xs" style={{ color: '#94a3b8' }}>ISBN: {book.isbn}</p>}
                          </td>
                          <td className="py-3 text-sm" style={{ color: '#595c5e' }}>{book.author}</td>
                          <td className="py-3">
                            <span className="text-xs font-bold uppercase px-2 py-1 rounded-full" style={{ backgroundColor: '#CAD6FF', color: '#3E4A6C' }}>
                              {book.category}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-xs font-bold" style={{ color: hasCopies ? '#166534' : '#b31b25' }}>
                              {book.availableCopies} / {book.totalCopies}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="material-symbols-outlined" style={{ color: '#c8c4db', fontSize: 20 }}>more_vert</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT Column: Category Breakdown + Insights */}
        <div className="space-y-5">

          {/* Category Breakdown */}
          <section className="rounded-xl p-5 border" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
            <h3 className="text-base font-bold mb-3" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
              Categories
            </h3>
            {loading ? (
              <div className="py-4" style={{ color: '#94a3b8' }}>Loading...</div>
            ) : books.length === 0 ? (
              <p className="text-sm" style={{ color: '#94a3b8' }}>No data yet.</p>
            ) : (
              <div className="flex items-center justify-around">
                <PieChart data={Object.entries(categories).map(([cat, count]) => ({
                  label: cat,
                  value: count,
                }))} size={90} />
                <div className="space-y-0.5 flex-1 ml-3">
                  {Object.entries(categories)
                    .slice(0, showAllCategories ? undefined : 4)
                    .map(([cat, catCopies], idx) => (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                          <span className="font-medium text-xs" style={{ color: '#2C2C3E' }}>{cat}</span>
                        </div>
                        <span className="font-bold text-xs" style={{ color: catCopies > 0 ? '#166534' : '#b31b25' }}>
                          {catCopies}
                        </span>
                      </div>
                    ))}
                  {Object.keys(categories).length > 4 && (
                    <button onClick={() => setShowAllCategories(s => !s)} className="text-xs font-semibold mt-1" style={{ color: '#6366F1' }}>
                      {showAllCategories ? 'Show Less' : 'Show More'} ({Object.keys(categories).length - 4})
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Weekly Insight Card */}
          <section className="rounded-xl p-5 relative overflow-hidden" style={{ backgroundColor: '#1a1245', color: '#fff' }}>
            <h4 className="text-xs font-semibold mb-1" style={{ color: '#A3B4F5' }}>Quick Tip</h4>
            <p className="text-sm font-bold leading-tight mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Keep the catalog updated. Add new books and track circulation to keep the library running smoothly.
            </p>
            <div className="flex items-center gap-2" style={{ color: '#A3B4F5' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>library_books</span>
              <span className="text-xs font-medium">Total inventory: {totalCopies} copies across {totalBooks} titles.</span>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <div className="absolute right-4 top-4 w-12 h-12 rounded-full border" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          </section>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/books')}
        title="Add New Book"
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        style={{ backgroundColor: '#1a1245', color: '#fff' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>
    </div>
  )
}
