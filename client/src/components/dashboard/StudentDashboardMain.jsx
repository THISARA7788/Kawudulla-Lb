import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const ms = {
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
};

export default function StudentDashboardMain() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [profileRes, booksRes] = await Promise.all([
          api.get(`/library/quick-lookup/${user._id}`),
          api.get('/library/books'),
        ]);
        setData(profileRes.data);
        setNewArrivals(booksRes.data.books || []);
      } catch (err) {
        console.error('Error fetching student dashboard data:', err);
        setError('Failed to load borrowing profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: 32 }}>progress_activity</span>
        <p className="text-sm font-semibold">Loading library profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 rounded-xl p-5 border border-red-100 max-w-xl mx-auto my-10 text-center animate-fadeIn">
        <span className="material-symbols-outlined mb-2" style={{ fontSize: 36 }}>error</span>
        <h3 className="font-bold text-base">Error Loading Profile</h3>
        <p className="text-xs mt-1">{error || 'Your member profile could not be located. Please contact the librarian.'}</p>
      </div>
    );
  }

  const { activeBorrows = [], totalBorrows = 0, activeFines = [] } = data;
  
  // Calculate total outstanding fines
  const totalFineAmount = activeFines.reduce((sum, f) => sum + (f.amount || 0), 0);

  // Check if any checkouts are overdue
  const overdueBorrows = activeBorrows.filter(
    (b) => !b.returnDate && new Date(b.dueDate) < new Date()
  );

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl relative overflow-hidden text-white animate-fadeIn" style={{ background: 'linear-gradient(135deg, #9E0D0D 0%, #7F0A0A 100%)' }}>
        <div className="absolute right-[-40px] top-[-40px] w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Welcome Back</span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {user?.name}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Access your digital library profile, inspect checked out books, and browse our complete catalog online.
            </p>
          </div>
          <div className="flex-shrink-0 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
            <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">Member ID</p>
            <p className="text-sm font-mono font-bold">{user?.memberId}</p>
            {user?.grade && (
              <p className="text-xs text-slate-300 mt-0.5">
                Grade: {user.grade.replace('Grade ', '')} {user.class && `• Section ${user.class}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        {/* Total Borrows */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#9E0D0D] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>history_edu</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All-Time Borrowed</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalBorrows}</p>
          </div>
        </div>

        {/* Active Borrows */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>book_5</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Issued</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{activeBorrows.length}</p>
          </div>
        </div>

        {/* Overdue Borrows */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 24, ...(overdueBorrows.length > 0 ? ms : {}) }}>warning</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue Returns</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: overdueBorrows.length > 0 ? '#e11d48' : '#1e293b' }}>
              {overdueBorrows.length}
            </p>
          </div>
        </div>

        {/* Total Fines */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>payments</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Fines</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: totalFineAmount > 0 ? '#d97706' : '#1e293b' }}>
              Rs. {totalFineAmount}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Issued Books list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Currently Checked Out Books
            </h3>
            <button
              onClick={() => navigate('/books')}
              className="text-xs font-bold text-[#9E0D0D] hover:text-[#7F0A0A] flex items-center gap-1 cursor-pointer"
            >
              Browse Catalog
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </button>
          </div>

          {activeBorrows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
              <span className="material-symbols-outlined mb-2" style={{ fontSize: 44, opacity: 0.3 }}>book_2</span>
              <p className="text-xs font-semibold">You have no active checkouts.</p>
              <button
                onClick={() => navigate('/books')}
                className="mt-3 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Find books to borrow
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 font-semibold">Book Details</th>
                    <th className="pb-2.5 font-semibold">Issue Date</th>
                    <th className="pb-2.5 font-semibold">Due Date</th>
                    <th className="pb-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeBorrows.map((tx) => {
                    const isOverdue = new Date(tx.dueDate) < new Date();
                    return (
                      <tr key={tx._id} className={`group transition-colors ${isOverdue ? 'bg-rose-50/10 hover:bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-3 flex items-center gap-3">
                          <div className="w-8 h-11 rounded-lg bg-slate-50 border border-slate-150 overflow-hidden flex-shrink-0 shadow-xs">
                            {tx.book?.coverImageUrl ? (
                              <img src={tx.book.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-350 bg-slate-100/50">
                                <span className="material-symbols-outlined text-sm">menu_book</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 line-clamp-1">{tx.book?.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{tx.book?.author} • ID: {tx.book?.bookId}</p>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500 font-medium">
                          {new Date(tx.issueDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 text-slate-500 font-medium">
                          {new Date(tx.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isOverdue ? 'Overdue' : 'Issued'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Fines and Alerts panel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
          <h3 className="font-extrabold text-slate-800 mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Unpaid Dues & Fines
          </h3>

          {activeFines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>check_circle</span>
              </div>
              <p className="text-xs font-semibold text-slate-700">You have no unpaid fines!</p>
              <p className="text-[10px] text-slate-400 text-center mt-1 px-4 leading-relaxed">Great job returning books on time.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[260px] pr-1">
              {activeFines.map((f) => (
                <div key={f._id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-100/50 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 line-clamp-1">{f.book?.title}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">
                      Overdue: {f.daysOverdue} days • Rs. {f.ratePerDay}/day
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-extrabold text-amber-700">Rs. {f.amount}</p>
                    <span className="text-[8px] uppercase tracking-wide font-extrabold text-amber-600 block mt-0.5">Unpaid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: New Arrivals */}
      {newArrivals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800" style={{ fontFamily: "'Manrope', sans-serif" }}>
              📚 New Arrivals & Catalog Highlights
            </h3>
            <button
              onClick={() => navigate('/books')}
              className="text-xs font-bold text-[#9E0D0D] hover:text-[#7F0A0A] flex items-center gap-1 cursor-pointer"
            >
              View Full Catalog
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {newArrivals.slice(0, 4).map((book) => (
               <div 
                 key={book._id}
                 onClick={() => navigate('/books')}
                 className="bg-slate-50/20 rounded-2xl p-3 border border-slate-100 hover:shadow-md hover:border-emerald-250 transition-all duration-350 cursor-pointer flex flex-col group select-none"
               >
                 <div className="w-full aspect-[3/4] rounded-xl bg-slate-50 border border-slate-150 overflow-hidden mb-3 relative shadow-xs">
                   {book.coverImageUrl ? (
                     <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-350 bg-slate-100/50">
                       <span className="material-symbols-outlined text-3xl">menu_book</span>
                     </div>
                   )}
                 </div>
                 <h4 className="text-xs font-black text-slate-850 line-clamp-1 leading-snug group-hover:text-[#9E0D0D] transition-colors">{book.title}</h4>
                 <p className="text-[10px] text-slate-400 mt-0.5 truncate">{book.author || 'Unknown Author'}</p>
               </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}
