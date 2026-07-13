import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../api/axios';

function PendingRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // userId of user being acted on
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState({ show: false, type: '', userId: '', userName: '' });
  const [rejectReason, setRejectReason] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  useEffect(() => {
    if (user && user.role !== 'librarian') {
      navigate('/dashboard');
      return;
    }
    fetchPendingUsers();
  }, [user, navigate]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/pending');
      setPendingUsers((res.data.users || []).filter(u => u.role !== 'librarian'));
      setError('');
    } catch (err) {
      console.error('Fetch pending error:', err.response?.data || err.message);
      setError('Failed to load pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const triggerApprove = (userId, userName) => {
    setModal({ show: true, type: 'approve', userId, userName });
  };

  const triggerReject = (userId, userName) => {
    setModal({ show: true, type: 'reject', userId, userName });
    setRejectReason('');
  };

  const closeModal = () => {
    setModal({ show: false, type: '', userId: '', userName: '' });
    setRejectReason('');
  };

  const executeApprove = async () => {
    const { userId, userName } = modal;
    closeModal();
    try {
      setActionLoading(userId);
      await api.put(`/auth/approve/${userId}`);
      fetchPendingUsers();
      showToast(`Approved ${userName}!`, 'success');
    } catch (err) {
      console.error('Approve error:', err.response?.data || err.message);
      showToast('Failed to approve: ' + (err.response?.data?.message || 'Server error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeReject = async () => {
    const { userId, userName } = modal;
    closeModal();
    try {
      setActionLoading(userId);
      await api.put(`/auth/reject/${userId}`, { reason: rejectReason });
      fetchPendingUsers();
      showToast(`Rejected ${userName}.`, 'delete');
    } catch (err) {
      console.error('Reject error:', err.response?.data || err.message);
      showToast('Failed to reject: ' + (err.response?.data?.message || 'Server error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getGradeDisplay = (u) => {
    if (!u.grade) return '-';
    if (u.grade !== 'Grade 12' && u.grade !== 'Grade 13') {
      return u.class ? `${u.grade}-${u.class}` : u.grade;
    }
    // Grade 12 & 13 use stream instead of class section
    return u.stream ? `${u.grade} – ${u.stream}` : u.grade;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      student: 'bg-green-100 text-green-800 border-green-300',
      teacher: 'bg-blue-100 text-blue-800 border-blue-300',
      librarian: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return classes[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <DashboardLayout>
      <div className="p-1">

        {/* Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}


        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div
                className="inline-block w-10 h-10 border-4 border-t-[#1a1245] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"
              ></div>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Loading pending registrations...</p>
            </div>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <span className="material-symbols-outlined text-6xl mb-4" style={{ color: '#94a3b8' }}>check_circle</span>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1a1245' }}>All Caught Up!</h3>
            <p style={{ color: '#64748b' }}>No pending registration requests at the moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead style={{ background: '#F5F3FC' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      <div className="flex items-center gap-1.5">
                        <span>Name</span>
                        {pendingUsers.length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {pendingUsers.length}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      Grade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      Registered
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: 'linear-gradient(135deg, #1a1245 0%, #4062BB 100%)' }}
                          >
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold text-sm" style={{ color: '#1a1245' }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium" style={{ color: '#64748b' }}>
                        {u.email}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold" style={{ color: '#1a1245' }}>
                        {getGradeDisplay(u)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getRoleBadgeClass(u.role)}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium" style={{ color: '#64748b' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => triggerApprove(u._id, u.name)}
                            disabled={actionLoading === u._id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#1a1245] hover:bg-[#4062BB] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading === u._id ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[12px] font-black">check</span>
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => triggerReject(u._id, u.name)}
                            disabled={actionLoading === u._id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#D9645E] hover:bg-[#B84A45] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading === u._id ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[12px] font-black">close</span>
                                Reject
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed top-3 left-0 lg:left-64 right-0 z-[9999] flex justify-center pointer-events-none">
          <style>{`
            @keyframes toast-enter {
              from { transform: translateY(-15px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            .toast-popup {
              animation: toast-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className={`toast-popup pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-xl text-white shadow-lg border ${
            toast.type === 'error'
              ? 'bg-amber-600 border-amber-500/50'
              : toast.type === 'delete' 
                ? 'bg-rose-600 border-rose-500/50' 
                : 'bg-emerald-600 border-emerald-500/50'
          }`}>
            <span className="material-symbols-outlined text-white font-bold" style={{ fontSize: 18 }}>
              {toast.type === 'error' ? 'warning' : toast.type === 'delete' ? 'delete_forever' : 'check_circle'}
            </span>
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Custom Confirmation / Rejection Modal */}
      {modal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
          
          {/* Modal Panel */}
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden relative z-10 p-6 animate-[toast-enter_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex flex-col items-center text-center">
              {modal.type === 'approve' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
                    <span className="material-symbols-outlined text-2xl font-bold">check_circle</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a1245] mb-2">Approve User Registration?</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Are you sure you want to approve <strong className="text-slate-800">{modal.userName}</strong>? They will be granted access to log into the library system.
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeApprove}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
                    <span className="material-symbols-outlined text-2xl font-bold">cancel</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a1245] mb-2">Reject User Registration?</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Please provide a reason for rejecting <strong className="text-slate-800">{modal.userName}</strong>.
                  </p>
                  
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason (optional)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-[#1a1245]/20 focus:border-[#1a1245] transition-all"
                  />
                  
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeReject}
                      className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Reject User
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default PendingRegistration;
