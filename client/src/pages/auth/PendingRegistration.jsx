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

  useEffect(() => {
    fetchPendingUsers();
  }, []);

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

  const handleApprove = async (userId, userName) => {
    if (!window.confirm(`Approve ${userName}? They will be able to log in.`)) return;

    try {
      setActionLoading(userId);
      await api.put(`/auth/approve/${userId}`);
      fetchPendingUsers();
    } catch (err) {
      console.error('Approve error:', err.response?.data || err.message);
      alert('Failed to approve: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId, userName) => {
    const reason = window.prompt('Enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      setActionLoading(userId);
      await api.put(`/auth/reject/${userId}`, { reason });
      fetchPendingUsers();
    } catch (err) {
      console.error('Reject error:', err.response?.data || err.message);
      alert('Failed to reject: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setActionLoading(null);
    }
  };

const getGradeDisplay = (u) => {
    if (!u.grade) return '-';
    if (u.grade !== 'Grade 12' && u.grade !== 'Grade 13' && u.class) {
      return `${u.grade}-${u.class}`;
    }
    if ((u.grade === 'Grade 12' || u.grade === 'Grade 13') && u.class) {
      return `${u.grade} – ${u.class}`;
    }
    return u.grade;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
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


          {/* Content */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
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
              <table className="w-full">
                <thead style={{ background: '#F5F3FC' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1245' }}>
                      Name
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
                          <span className="font-semibold" style={{ color: '#1a1245' }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: '#64748b' }}>
                        {u.email}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#1a1245' }}>
                        {getGradeDisplay(u)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeClass(u.role)}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ color: '#64748b' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(u._id, u.name)}
                            disabled={actionLoading === u._id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all"
                            style={{ background: '#1a1245' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#4062BB';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#1a1245';
                            }}
                          >
                            {actionLoading === u._id ? (
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">check</span>
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(u._id, u.name)}
                            disabled={actionLoading === u._id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all"
                            style={{ background: '#D9645E' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#B84A45';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#D9645E';
                            }}
                          >
                            {actionLoading === u._id ? (
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">close</span>
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
          )}
    </DashboardLayout>
  );
}

export default PendingRegistration;
