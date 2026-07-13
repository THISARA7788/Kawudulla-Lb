import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13',
];
const CLASS_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function RenewBook() {
  const { token } = useAuth();

  // Search states
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberGradeFilter, setMemberGradeFilter] = useState('all');
  const [memberClassFilter, setMemberClassFilter] = useState('all');
  const [memberResults, setMemberResults] = useState([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  // Borrowing states
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Renewal Modal state
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');

  // All users cache for offline-like search lookup
  const [allUsers, setAllUsers] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Initial load
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users', { headers: { Authorization: `Bearer ${token}` } });
        setAllUsers(res.data.users || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, [token]);

  // Live filter users based on selection criteria
  useEffect(() => {
    if (!memberSearch && memberRoleFilter === 'all' && memberGradeFilter === 'all' && memberClassFilter === 'all') {
      setMemberResults([]);
      return;
    }

    const filtered = allUsers.filter(u => {
      const matchText = !memberSearch || 
        u.name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
        u.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        u.memberId?.toLowerCase().includes(memberSearch.toLowerCase());

      const matchRole = memberRoleFilter === 'all' || u.role === memberRoleFilter;
      const matchGrade = memberGradeFilter === 'all' || u.grade === memberGradeFilter;
      const matchClass = memberClassFilter === 'all' || u.class === memberClassFilter;

      return matchText && matchRole && matchGrade && matchClass;
    });

    setMemberResults(filtered.slice(0, 8));
  }, [memberSearch, memberRoleFilter, memberGradeFilter, memberClassFilter, allUsers]);

  const handleSelectMember = async (member) => {
    setSelectedMember(member);
    setShowMemberSuggestions(false);
    setMemberSearch(member.name);
    setError('');

    try {
      const res = await api.get(`/library/transactions?userId=${member._id}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const active = (res.data.transactions || []).filter(t => !t.returnDate);
      setActiveBorrows(active);
    } catch (err) {
      console.error('Error fetching member borrows:', err);
      setError('Failed to fetch active borrowing history for this user.');
    }
  };

  const openRenewModal = (borrow) => {
    setSelectedBorrow(borrow);
    // Set default new due date to 14 days from current due date or today, whichever is later
    const baseDate = new Date(borrow.dueDate) > new Date() ? new Date(borrow.dueDate) : new Date();
    const futureDate = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    setNewDueDate(futureDate.toISOString().split('T')[0]);
    setShowRenewModal(true);
  };

  const executeRenewal = async () => {
    if (!selectedMember || !selectedBorrow || !newDueDate) return;
    setSaving(true);
    setError('');

    try {
      const res = await api.post('/library/renew', {
        userId: selectedMember._id,
        bookId: selectedBorrow.book._id,
        newDueDate: newDueDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`Successfully renewed "${selectedBorrow.book.title}"!`, 'success');
      setShowRenewModal(false);
      
      // Refresh active borrows list
      if (res.data && res.data.user) {
        // Fetch fresh list from server
        const freshRes = await api.get(`/library/transactions?userId=${selectedMember._id}&limit=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const active = (freshRes.data.transactions || []).filter(t => !t.returnDate);
        setActiveBorrows(active);
      }
    } catch (err) {
      console.error('Renewal request failed:', err);
      setError(err.response?.data?.message || 'Failed to renew book. Please try again.');
      showToast(err.response?.data?.message || 'Renewal failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      student: 'bg-green-100 text-green-800 border-green-300',
      teacher: 'bg-blue-100 text-blue-800 border-blue-300',
      librarian: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return classes[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-1 max-w-6xl mx-auto space-y-6">
        
        {/* Header Title Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#4C0000] flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
              <span className="material-symbols-outlined text-2xl font-bold">autorenew</span>
              Book Renewal Center
            </h1>
            <p className="text-slate-500 text-xs mt-1">Extend checkout periods for active borrows and update due dates.</p>
          </div>
        </div>

        {/* Outer Split Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Member Search Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider select-none flex items-center gap-1.5 border-b pb-2">
              <span className="material-symbols-outlined text-[16px]">person_search</span>
              Select Member
            </h3>

            {/* Member Search input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 18 }}>search</span>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowMemberSuggestions(true);
                  if (selectedMember && e.target.value !== selectedMember.name) {
                    setSelectedMember(null);
                    setActiveBorrows([]);
                  }
                }}
                placeholder="Search member name or ID..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none border border-slate-200 focus:border-[#9E0D0D] focus:ring-4 focus:ring-[#9E0D0D]/10 transition-all bg-white"
              />

              {/* Suggestions Dropdown */}
              {showMemberSuggestions && memberResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-50">
                  {memberResults.map(u => (
                    <div
                      key={u._id}
                      onClick={() => handleSelectMember(u)}
                      className="px-4 py-2.5 hover:bg-slate-55 transition-colors cursor-pointer text-left flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email} {u.grade ? `• ${u.grade}-${u.class}` : ''}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize border ${getRoleBadgeClass(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role Filter dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Role</label>
              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl outline-none border border-slate-200 focus:border-[#9E0D0D] transition-all bg-white cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            {/* Grade & Section Filters (Only shown if student filter is set) */}
            {memberRoleFilter === 'student' && (
              <div className="grid grid-cols-2 gap-2.5 animate-fadeIn">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grade</label>
                  <select
                    value={memberGradeFilter}
                    onChange={(e) => setMemberGradeFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl outline-none border border-slate-200 bg-white"
                  >
                    <option value="all">All Grades</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class</label>
                  <select
                    value={memberClassFilter}
                    onChange={(e) => setMemberClassFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl outline-none border border-slate-200 bg-white"
                  >
                    <option value="all">All Classes</option>
                    {CLASS_SECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Selected Member Detail Summary Card */}
            {selectedMember && (
              <div className="mt-4 p-4 rounded-xl border border-red-100 bg-red-50/5 text-left animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #4C0000 0%, #9E0D0D 100%)' }}>
                    {selectedMember.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{selectedMember.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedMember.memberId || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold">Role</span>
                    <span className="font-extrabold text-slate-700 capitalize">{selectedMember.role}</span>
                  </div>
                  {selectedMember.grade && (
                    <div>
                      <span className="text-slate-400 block uppercase font-bold">Grade</span>
                      <span className="font-extrabold text-slate-700">{selectedMember.grade} - {selectedMember.class || ''}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Active Borrows Table List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider select-none flex items-center gap-1.5 border-b pb-2">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              Active Borrows
            </h3>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {!selectedMember ? (
              <div className="text-center py-20 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
                <p className="text-xs text-slate-500 font-semibold">Please select a member to view active checkouts</p>
              </div>
            ) : activeBorrows.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">check_circle</span>
                <p className="text-xs text-slate-500 font-semibold">No active borrows found for this user.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[500px] text-left">
                  <thead className="bg-[#F5F3FC] text-[#4C0000] text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Book Info</th>
                      <th className="px-4 py-3">Borrow Date</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                    {activeBorrows.map(b => {
                      const isOverdue = new Date(b.dueDate) < new Date();
                      return (
                        <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {b.book?.coverImageUrl ? (
                                <img src={b.book.coverImageUrl} alt="Book cover" className="w-8 h-11 object-contain rounded shadow-sm border border-slate-100" />
                              ) : (
                                <div className="w-8 h-11 bg-slate-100 rounded flex items-center justify-center border border-dashed text-slate-400">
                                  <span className="material-symbols-outlined text-base">image</span>
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 leading-tight">{b.book?.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">by {b.book?.author || 'Unknown'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(b.issueDate)}</td>
                          <td className="px-4 py-3">
                            <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                              {formatDate(b.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="block text-[8px] bg-red-100 text-red-800 font-extrabold uppercase px-1 rounded-sm w-max mt-0.5 border border-red-200">
                                Overdue
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openRenewModal(b)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#4C0000] hover:bg-[#9E0D0D] transition-colors cursor-pointer active:scale-95 shadow-sm"
                            >
                              Renew Book
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Dialog: Date Picker Renewal Modal */}
      {showRenewModal && selectedBorrow && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRenewModal(false)}></div>
          
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden relative z-10 p-6 animate-fadeIn">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#9E0D0D] mb-4 border border-red-100">
                <span className="material-symbols-outlined text-2xl font-bold">autorenew</span>
              </div>
              <h3 className="text-lg font-bold text-[#4C0000] mb-1">Renew Book Borrow</h3>
              <p className="text-xs text-slate-500 mb-4">
                Extending borrowing period for <strong className="text-slate-800">"{selectedBorrow.book?.title}"</strong>
              </p>

              {/* Form Input fields */}
              <div className="w-full text-left space-y-3.5 mb-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Borrower</span>
                  <p className="text-xs font-bold text-slate-850 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{selectedMember.name} ({selectedMember.role})</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Due Date</span>
                    <p className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{formatDate(selectedBorrow.dueDate)}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Set New Due Date</span>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-bold rounded-lg outline-none border border-slate-200 focus:border-[#9E0D0D] focus:ring-4 focus:ring-[#9E0D0D]/10 bg-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowRenewModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRenewal}
                  disabled={saving || !newDueDate}
                  className="flex-1 px-4 py-2.5 bg-[#9E0D0D] hover:bg-[#7F0A0A] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Confirm Renewal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-3 left-0 lg:left-64 right-0 z-[9999] flex justify-center pointer-events-none">
          <div className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-xl text-white shadow-lg border animate-fadeIn ${
            toast.type === 'error' ? 'bg-amber-600 border-amber-500/50' : 'bg-emerald-600 border-emerald-500/50'
          }`}>
            <span className="material-symbols-outlined text-white font-bold" style={{ fontSize: 18 }}>
              {toast.type === 'error' ? 'warning' : 'check_circle'}
            </span>
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
