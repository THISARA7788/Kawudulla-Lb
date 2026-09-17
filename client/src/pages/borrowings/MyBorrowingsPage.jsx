import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../api/axios';

export default function MyBorrowingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [activeLoans, setActiveLoans] = useState([]);
  const [historyLoans, setHistoryLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/library/my-borrowings');
      setActiveLoans(res.data.active || []);
      setHistoryLoans(res.data.history || []);
    } catch (err) {
      console.error('Error fetching borrowings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const getDaysRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const currentList = activeTab === 'active' ? activeLoans : historyLoans;
  const filteredList = currentList.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const title = item.book?.title?.toLowerCase() || '';
    const author = item.book?.author?.toLowerCase() || '';
    const bookId = item.book?.bookId?.toLowerCase() || '';
    const trnId = item.transactionId?.toLowerCase() || '';
    return title.includes(q) || author.includes(q) || bookId.includes(q) || trnId.includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800" style={{ fontFamily: "'Manrope', sans-serif" }}>
              My Borrowings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeLoans.length} active loan{activeLoans.length === 1 ? '' : 's'} • {historyLoans.length} returned
            </p>
          </div>

          <button
            onClick={() => navigate('/books')}
            className="px-4 py-2 bg-[#9E0D0D] hover:bg-[#7F0A0A] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>library_books</span>
            Browse Catalog
          </button>
        </div>

        {/* Tabs & Search Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70 select-none">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Active Loans ({activeLoans.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Borrowing History ({historyLoans.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 18 }}>
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or author..."
              className="w-full py-1.5 pl-9 pr-3 text-xs rounded-xl bg-white border border-slate-200 outline-none focus:border-[#9E0D0D] transition-all"
            />
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: 32 }}>progress_activity</span>
            <p className="text-xs font-semibold">Loading borrowing records...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 40, opacity: 0.3 }}>
              {activeTab === 'active' ? 'book_2' : 'history'}
            </span>
            <p className="text-xs font-semibold">
              {search ? 'No matching books found' : activeTab === 'active' ? 'No active book loans' : 'No borrowing history yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Book Details</th>
                    <th className="py-3 px-4 font-semibold">Issued Date</th>
                    <th className="py-3 px-4 font-semibold">
                      {activeTab === 'active' ? 'Due Date' : 'Returned Date'}
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredList.map((item) => {
                    const daysLeft = getDaysRemaining(item.dueDate);
                    const isOverdue = !item.returnDate && daysLeft < 0;

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-12 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                              {item.book?.coverImageUrl ? (
                                <img src={item.book.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <span className="material-symbols-outlined text-xs">menu_book</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 line-clamp-1">{item.book?.title || 'Unknown Title'}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {item.book?.author || 'Unknown'} • ID: {item.book?.bookId || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {new Date(item.issueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {activeTab === 'active'
                            ? new Date(item.dueDate).toLocaleDateString()
                            : item.returnDate ? new Date(item.returnDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {activeTab === 'active' ? (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                                isOverdue
                                  ? 'bg-rose-100 text-rose-600'
                                  : daysLeft <= 2
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {isOverdue ? `${Math.abs(daysLeft)}d Overdue` : `${daysLeft}d left`}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 inline-block">
                              Returned
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
