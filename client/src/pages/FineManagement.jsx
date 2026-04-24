import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

const STATUS_OPTIONS = ['all', 'unpaid', 'paid', 'waived'];

function FineRow({ fine, onPay, onWaive, onDelete }) {
  const statusStyle = {
    unpaid: { bg: '#fef9c3', color: '#854d0e' },
    paid: { bg: '#dcfce7', color: '#166534' },
    waived: { bg: '#ece9f8', color: '#5b51d0' },
  }[fine.status] || { bg: '#f0f0f0', color: '#666' };

  return (
    <tr className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
      <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{fine.transaction?.transactionId || '—'}</td>
      <td className="py-3 px-4">
        <span className="text-xs font-semibold" style={{ color: '#1a1245' }}>{fine.user?.name || '—'}</span>
      </td>
      <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{fine.user?.memberId || '—'}</td>
      <td className="py-3 px-4 text-xs" style={{ color: '#595c5e' }}>{fine.book?.title || '—'} <span className="font-mono" style={{ color: '#94a3b8' }}>({fine.book?.bookId})</span></td>
      <td className="py-3 px-4 text-center font-semibold" style={{ color: '#b31b25' }}>{fine.daysOverdue}d</td>
      <td className="py-3 px-4 text-right font-bold" style={{ color: '#1a1245' }}>&#8360; {fine.amount.toFixed(2)}</td>
      <td className="py-3 px-4 text-center">
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>{fine.status}</span>
      </td>
      <td className="py-3 px-4 text-right">
        {fine.status === 'unpaid' && (
          <button onClick={() => onPay(fine)} className="mr-1 p-1 rounded hover:bg-slate-100" style={{ color: '#166534' }} title="Mark Paid">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
          </button>
        )}
        {fine.status === 'unpaid' && (
          <button onClick={() => onWaive(fine)} className="mr-1 p-1 rounded hover:bg-slate-100" style={{ color: '#2563eb' }} title="Waive Fine">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
          </button>
        )}
        <button onClick={() => onDelete(fine._id)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#b31b25' }} title="Delete">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
        </button>
      </td>
    </tr>
  );
}

export default function FineManagement() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [fines, setFines] = useState([]);
  const [pendingFines, setPendingFines] = useState([]);
  const [config, setConfig] = useState({ fineRatePerDay: 10, gracePeriodDays: 0 });
  const [stats, setStats] = useState({ unpaidTotal: 0, unpaidCount: 0, paidTotal: 0, paidCount: 0, waivedTotal: 0, waivedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState(null); // null | 'pay' | 'waive' | 'config'
  const [selected, setSelected] = useState(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newGrace, setNewGrace] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try { setLoading(true); await Promise.all([fetchFines(), fetchPending(), fetchStats(), fetchConfig()]); } finally { setLoading(false); }
  };

  const fetchFines = async () => {
    try {
      const params = { status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined, page, limit: 20 };
      const res = await api.get('/library/fines', { params, headers: { Authorization: `Bearer ${token}` } });
      setFines(res.data.fines || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) { console.error(err); }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get('/library/fines/pending', { headers: { Authorization: `Bearer ${token}` } });
      setPendingFines((res.data.pendingFines || []).filter((pf) => !pf.hasExistingFine));
      if (res.data.config) setConfig(res.data.config);
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try { const res = await api.get('/library/fines/stats', { headers: { Authorization: `Bearer ${token}` } }); setStats(res.data); } catch (err) { console.error(err); }
  };

  const fetchConfig = async () => {
    try { const res = await api.get('/library/fines/config', { headers: { Authorization: `Bearer ${token}` } }); setConfig(res.data.config); } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (search || statusFilter !== 'all' || page) fetchFines(); }, [search, statusFilter, page]);
  useEffect(() => { if (user && user.role !== 'librarian') navigate('/dashboard', { replace: true }); }, [user, navigate]);

  const openPay = (fine) => { setSelected(fine); setModal('pay'); setError(''); };
  const openWaive = (fine) => { setSelected(fine); setWaiveReason(''); setModal('waive'); setError(''); };

  const handlePay = async () => {
    setSaving(true);
    try { await api.put(`/library/fines/${selected._id}/pay`, {}, { headers: { Authorization: `Bearer ${token}` } }); setModal(null); fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleWaive = async () => {
    setSaving(true);
    try { await api.put(`/library/fines/${selected._id}/waive`, { reason: waiveReason }, { headers: { Authorization: `Bearer ${token}` } }); setModal(null); fetchData(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fine record?')) return;
    try { await api.delete(`/library/fines/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setFines((p) => p.filter((f) => f._id !== id)); fetchStats(); } catch (err) { alert('Failed'); }
  };

  const createFine = async (pf) => {
    if (!window.confirm(`Create fine of &#8360; ${pf.amount} for ${pf.transaction?.user?.name}? (${pf.daysOverdue} days overdue)`)) return;
    setSaving(true);
    try {
      await api.post('/library/fines', { transactionId: pf.transaction._id, amount: pf.amount, daysOverdue: pf.daysOverdue, ratePerDay: pf.ratePerDay }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create fine.'); }
    finally { setSaving(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/library/fines/config', { fineRatePerDay: Number(newRate) || config.fineRatePerDay, gracePeriodDays: Number(newGrace) ?? config.gracePeriodDays }, { headers: { Authorization: `Bearer ${token}` } });
      setConfig({ ...config, fineRatePerDay: Number(newRate) || config.fineRatePerDay, gracePeriodDays: Number(newGrace) ?? config.gracePeriodDays });
      setModal(null);
    } catch (err) { alert('Failed to update configuration.'); }
    finally { setSaving(false); }
  };

  const openConfig = () => { setNewRate(config.fineRatePerDay.toString()); setNewGrace(config.gracePeriodDays.toString()); setModal('config'); };

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F3FC' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72" style={{ background: '#F5F3FC' }}>
        <TopBar />
        <main className="flex-1 pt-20 pb-4 overflow-y-auto px-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Fine Management</h1>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Calculate, collect, and manage overdue book fines.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={openConfig} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#4062BB', color: '#fff' }}>
                <span className="material-symbols-outlined inline-block mr-1" style={{ fontSize: 16, verticalAlign: 'middle' }}>settings</span>
                Fine Settings
              </button>
            </div>
          </div>

          {/* Rate + Pending Fines */}
          {!loading && (
            <>
              <div className="flex items-center gap-4 mb-4 p-4 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Fine Rate</p>
                  <p className="text-xl font-bold" style={{ color: '#1a1245' }}>&#8360; {config.fineRatePerDay}/day</p>
                </div>
                <div style={{ width: 1, height: 40, backgroundColor: '#e0e0e0' }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Grace Period</p>
                  <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{config.gracePeriodDays} day{config.gracePeriodDays !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ width: 1, height: 40, backgroundColor: '#e0e0e0' }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Pending Fines</p>
                  <p className="text-xl font-bold" style={{ color: '#b31b25' }}>{pendingFines.length}</p>
                </div>
              </div>

              {/* Pending Fines Section */}
              {pendingFines.length > 0 && (
                <div className="mb-4 rounded-xl border" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <h3 className="text-sm font-semibold" style={{ color: '#1a1245' }}>Pending Overdue Fines</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                          {['Member', 'Book', 'Days Overdue', 'Fine Amount', ''].map((h) => (
                            <th key={h} className="py-2 px-4 text-xs text-slate-400 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendingFines.map((pf, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f8f8f8' }}>
                            <td className="py-2 px-4 text-xs font-semibold" style={{ color: '#1a1245' }}>{pf.transaction.user?.name}<br /><span style={{ color: '#94a3b8' }}>{pf.transaction.user?.memberId}</span></td>
                            <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{pf.transaction.book?.title} <span style={{ color: '#94a3b8' }}>({pf.transaction.book?.bookId})</span></td>
                            <td className="py-2 px-4 font-bold" style={{ color: '#b31b25' }}>{pf.daysOverdue} days</td>
                            <td className="py-2 px-4 font-bold" style={{ color: '#1a1245' }}>&#8360; {pf.amount.toFixed(2)}</td>
                            <td className="py-2 px-4">
                              <button onClick={() => createFine(pf)} disabled={saving} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff' }}>Create Fine</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Search + Filter */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by member, book, or transaction..." className="w-full py-2.5 pl-9 pr-4 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="py-2 px-3 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 120 }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Fines Table */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>Loading fines...
              </div>
            ) : fines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>payments</span>
                <p className="text-sm font-medium">No fines found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      {['Transaction', 'Member', 'Member ID', 'Book', 'Days Overdue', 'Amount', 'Status', ''].map((h) => (
                        <th key={h} className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map((f) => (
                      <FineRow key={f._id} fine={f} onPay={openPay} onWaive={openWaive} onDelete={handleDelete} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: page <= 1 ? '#f0f0f0' : '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', opacity: page <= 1 ? 0.5 : 1 }}>Previous</button>
              <span className="text-sm" style={{ color: '#94a3b8' }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: page >= totalPages ? '#f0f0f0' : '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', opacity: page >= totalPages ? 0.5 : 1 }}>Next</button>
            </div>
          )}

          {/* Stats */}
          {!loading && (
            <div className="flex gap-4 mt-4">
              {[['Unpaid', stats.unpaidCount, `&#8360; ${stats.unpaidTotal.toFixed(2)}`], ['Paid', stats.paidCount, `&#8360; ${stats.paidTotal.toFixed(2)}`], ['Waived', stats.waivedCount, `&#8360; ${stats.waivedTotal.toFixed(2)}`]].map(([label, count, total], i) => (
                <div key={label} className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                  <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{count} <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>(LKR {total})</span></p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Pay Modal */}
      {modal === 'pay' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Mark Fine as Paid</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Member: <strong>{selected.user?.name}</strong> <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>({selected.user?.memberId})</span></p>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Book: <strong>{selected.book?.title}</strong></p>
              <p className="text-lg font-bold" style={{ color: '#1a1245' }}>Amount: &#8360; {selected.amount.toFixed(2)}</p>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>}
            <div className="flex gap-3">
              <button onClick={handlePay} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#166534', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Processing...' : 'Confirm Payment'}</button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Waive Modal */}
      {modal === 'waive' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Waive Fine</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Member: <strong>{selected.user?.name}</strong></p>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Amount to waive: <strong style={{ color: '#b31b25' }}>&#8360; {selected.amount.toFixed(2)}</strong></p>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Reason (optional)</label>
              <textarea value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} placeholder="e.g. Book returned damaged, exceptional circumstances..." rows="3" className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleWaive} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Processing...' : 'Waive Fine'}</button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {modal === 'config' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Fine Settings</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Fine Rate per Day (LKR)</label>
                <input type="number" min="0" step="0.5" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Grace Period (Days)</label>
                <input type="number" min="0" value={newGrace} onChange={(e) => setNewGrace(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Number of days after due date before fines start applying.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveConfig} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Settings'}</button>
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
