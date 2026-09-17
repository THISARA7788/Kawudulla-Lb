import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../api/axios';

const CATEGORIES = ['Fiction', 'Science', 'History', 'Math', 'Reference', 'Technology', 'Biography', 'General', 'Other'];

export default function BookRequestsPage() {
  const { user } = useAuth();
  const isLibrarian = user?.role === 'librarian';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    author: '',
    category: 'General',
    isbn: '',
    reason: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const endpoint = isLibrarian ? '/book-requests' : '/book-requests/my';
      const res = await api.get(endpoint);
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Error fetching book requests:', err);
      showToast('Failed to load requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [isLibrarian]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      showToast('Title and author are required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/book-requests', form);
      setRequests((prev) => [res.data.request, ...prev]);
      setShowModal(false);
      setForm({ title: '', author: '', category: 'General', isbn: '', reason: '' });
      showToast('Book request submitted successfully.');
    } catch (err) {
      console.error('Error submitting book request:', err);
      showToast(err.response?.data?.message || 'Error submitting request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/book-requests/${id}`);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      showToast('Request removed.', 'delete');
    } catch (err) {
      console.error('Error deleting request:', err);
      showToast('Failed to delete request.', 'error');
    }
  };

  const handleQuickStatus = async (id, status) => {
    try {
      const res = await api.put(`/book-requests/${id}/status`, { status });
      setRequests((prev) => prev.map((r) => (r._id === id ? res.data.request : r)));
      showToast(`Request marked as ${status}.`);
    } catch (err) {
      console.error('Error quick updating status:', err);
      showToast('Failed to update status.', 'error');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Approved</span>;
      case 'declined':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">Declined</span>;
      case 'pending':
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">Pending</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-0 lg:left-64 right-0 z-50 flex justify-center pointer-events-none">
            <div
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-auto ${
                toast.type === 'error'
                  ? 'bg-amber-600'
                  : toast.type === 'delete'
                  ? 'bg-rose-600'
                  : 'bg-emerald-600'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {toast.type === 'error' ? 'warning' : toast.type === 'delete' ? 'delete' : 'check_circle'}
              </span>
              {toast.message}
            </div>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-2xl shadow-inner select-none w-fit overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-[#9E0D0D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              All Requested
            </button>

            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-[#9E0D0D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              Pending
            </button>

            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-[#9E0D0D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              Approved
            </button>

            <button
              onClick={() => setFilterStatus('declined')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === 'declined'
                  ? 'bg-[#9E0D0D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              Declined
            </button>
          </div>

          {!isLibrarian && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#9E0D0D] hover:bg-[#7F0A0A] text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm hover:shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              {user?.role === 'teacher' ? 'Recommend a Book' : 'Request a Book'}
            </button>
          )}
        </div>

        {/* Request List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: 32 }}>progress_activity</span>
            <p className="text-xs font-semibold">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 40, opacity: 0.3 }}>
              mark_email_unread
            </span>
            <p className="text-xs font-semibold">No requests found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Book Title & Author</th>
                    {isLibrarian && <th className="py-3 px-4 font-semibold">Requested By</th>}
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{req.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">by {req.author} {req.isbn && `• ISBN: ${req.isbn}`}</p>
                        {req.reason && (
                          <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-1">"{req.reason}"</p>
                        )}
                      </td>
                      {isLibrarian && (
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-700">{req.user?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {req.user?.role} {req.user?.grade && `• ${req.user.grade}`}
                          </p>
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {req.category}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isLibrarian ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleQuickStatus(req._id, 'approved')}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                                  title="Approve Request"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
                                </button>
                                <button
                                  onClick={() => handleQuickStatus(req._id, 'declined')}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                                  title="Decline Request"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(req._id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 hover:border-rose-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                              title="Delete Record"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            {req.status === 'pending' ? (
                              <button
                                onClick={() => handleDelete(req._id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 hover:border-rose-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                                title="Cancel Request"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs pr-2">-</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submit Request Modal (Student / Teacher) */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {user?.role === 'teacher' ? 'Recommend Book for Library' : 'Request a New Book'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Madol Doova"
                    className="w-full p-2 rounded-xl border border-slate-200 outline-none focus:border-[#9E0D0D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="e.g. Martin Wickramasinghe"
                    className="w-full p-2 rounded-xl border border-slate-200 outline-none focus:border-[#9E0D0D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 outline-none focus:border-[#9E0D0D] bg-white cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ISBN (Optional)</label>
                    <input
                      type="text"
                      value={form.isbn}
                      onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                      placeholder="e.g. 978955..."
                      className="w-full p-2 rounded-xl border border-slate-200 outline-none focus:border-[#9E0D0D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Why would this book be valuable for students or curriculum?"
                    className="w-full p-2 rounded-xl border border-slate-200 outline-none focus:border-[#9E0D0D]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-[#9E0D0D] hover:bg-[#7F0A0A] text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {saving ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
