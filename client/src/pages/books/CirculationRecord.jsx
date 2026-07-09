import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function CirculationRecord() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = { page, status: statusFilter, limit: 20 };
      const res = await api.get('/library/transactions', { params });
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter]);

  const filteredTransactions = transactions.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.user?.name?.toLowerCase().includes(q) ||
      t.book?.title?.toLowerCase().includes(q) ||
      t.book?.bookId?.toLowerCase().includes(q) ||
      t.transactionId?.toLowerCase().includes(q)
    );
  });

  const statusBadge = (status) => {
    if (status === 'returned') return { bg: '#DCFCE7', color: '#166534', text: 'Returned' };
    if (status === 'overdue') return { bg: '#FEF2F2', color: '#b31b25', text: 'Overdue' };
    return { bg: '#DBEAFE', color: '#1D4ED8', text: 'Active' };
  };

  return (
    <DashboardLayout>


      <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, book title, Book ID, or transaction ID..."
                className="w-full py-2.5 pl-9 pr-4 text-sm rounded-xl outline-none"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="py-2 px-3 text-sm rounded-xl outline-none"
              style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>
                Loading transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>receipt_long</span>
                <p className="text-sm font-medium">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      {['Transaction ID', 'Member', 'Book', 'Issue Date', 'Due Date', 'Return Date', 'Status'].map((h) => (
                        <th key={h} className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider" style={{ borderBottom: '2px solid #f0f0f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => {
                      const isCurrentlyOverdue = !t.returnDate && new Date(t.dueDate) < new Date();
                      const wasReturnedOverdue = t.returnDate && t.overdueDays > 0;
                      const daysOverdue = isCurrentlyOverdue
                        ? Math.floor((Date.now() - new Date(t.dueDate)) / 86400000)
                        : (wasReturnedOverdue ? t.overdueDays : 0);

                      let badge;
                      if (isCurrentlyOverdue) {
                        badge = { bg: '#FEF2F2', color: '#b31b25', text: `Overdue (${daysOverdue}d)` };
                      } else if (wasReturnedOverdue) {
                        badge = { bg: '#FEF2F2', color: '#b31b25', text: `Returned (Overdue ${daysOverdue}d)` };
                      } else {
                        badge = statusBadge(t.status);
                      }

                      const showRedDueDate = isCurrentlyOverdue || wasReturnedOverdue;

                      return (
                        <tr key={t._id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
                          <td className="py-3 px-4 text-[11px] font-mono" style={{ color: '#4F5B7D' }}>{t.transactionId || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold" style={{ color: '#2C2C3E' }}>{t.user?.name || '—'}</div>
                            <div className="text-[11px]" style={{ color: '#94a3b8' }}>
                              <span className="font-mono font-bold" style={{ color: '#1a1245' }}>{t.user?.memberId || '—'}</span>
                              {' '}• {t.user?.grade || t.user?.role || ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold" style={{ color: '#2C2C3E' }}>{t.book?.title || '—'}</div>
                            <div className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>{t.book?.bookId || ''}</div>
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: '#595c5e' }}>{new Date(t.issueDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                          <td className="py-3 px-4 text-xs font-semibold" style={{ color: showRedDueDate ? '#b31b25' : '#595c5e' }}>
                            {new Date(t.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: t.returnDate ? '#166534' : '#94a3b8' }}>
                            {t.returnDate ? new Date(t.returnDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>
                              {badge.text}
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

          {/* Stats & Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                <p className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>Total</p>
                <p className="text-lg font-bold" style={{ color: '#1a1245' }}>{total}</p>
              </div>
              <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                <p className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>Showing</p>
                <p className="text-lg font-bold" style={{ color: '#1a1245' }}>{filteredTransactions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: page <= 1 ? '#ccc' : '#4F5B7D', cursor: page <= 1 ? 'default' : 'pointer' }}>
                Previous
              </button>
              <span className="text-sm font-semibold px-3" style={{ color: '#1a1245' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: page >= totalPages ? '#ccc' : '#4F5B7D', cursor: page >= totalPages ? 'default' : 'pointer' }}>
                Next
              </button>
            </div>
          </div>
    </DashboardLayout>
  );
}
