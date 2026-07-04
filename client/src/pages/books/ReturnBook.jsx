import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import ActiveBorrowsList from '../../components/circulation/ActiveBorrowsList';
import RecentTransactionsList from '../../components/circulation/RecentTransactionsList';

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13',
];
const CLASS_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function ReturnBook() {
  const { token } = useAuth();

  // Search state
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberGradeFilter, setMemberGradeFilter] = useState('all');
  const [memberClassFilter, setMemberClassFilter] = useState('all');
  const [memberResults, setMemberResults] = useState([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  // Borrowing state
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [selectedBorrow, setSelectedBorrow] = useState(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [overdueFine, setOverdueFine] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data
  const [allUsers, setAllUsers] = useState([]);
  const [recentReturns, setRecentReturns] = useState([]);

  // Load data
  useEffect(() => {
    const init = async () => {
      try {
        const [usersRes, txRes] = await Promise.all([
          api.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/library/transactions?status=returned&limit=10'),
        ]);
        setAllUsers(usersRes.data.users || []);
        setRecentReturns(txRes.data.transactions || []);
        
        // Log data for debugging
        console.log('Loaded users:', usersRes.data.users?.length || 0);
        console.log('Loaded recent returns:', txRes.data.transactions?.length || 0);
      } catch (err) {
        console.error('Init error:', err);
        setError('Failed to load initial data');
      }
    };
    init();
  }, []);

  // Derived: grades and classes that exist
  const allStudents = allUsers.filter(u => u.role === 'student' && u.status !== 'rejected');
  const availableGrades = [...new Set(allStudents.map(u => u.grade).filter(Boolean))];
  const availableClasses = [...new Set(
    allStudents.filter(u => u.grade === memberGradeFilter && u.class).map(u => u.class)
  )];

  // Filter members
  useEffect(() => {
    let list = allUsers.filter(u =>
      u.status !== 'rejected' &&
      u.role !== 'librarian'
    );

    // Role filter
    if (memberRoleFilter === 'student') list = list.filter(u => u.role === 'student');
    if (memberRoleFilter === 'teacher') list = list.filter(u => u.role === 'teacher');

    // Grade filter
    if (memberGradeFilter !== 'all') {
      list = list.filter(u => {
        if (u.role === 'student') return u.grade === memberGradeFilter;
        return true;
      });
      // Class filter
      if (memberClassFilter !== 'all') {
        list = list.filter(u => {
          if (u.role === 'student') return u.class === memberClassFilter;
          return true;
        });
      }
    }

    // Text search
    if (memberSearch.length >= 1) {
      const q = memberSearch.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.memberId && u.memberId.toLowerCase().includes(q))
      );
    }

    setMemberResults(list);
  }, [memberSearch, memberRoleFilter, memberGradeFilter, memberClassFilter, allUsers]);

  // Recent members from returns
  const recentMembers = (() => {
    const seen = new Set();
    const result = [];
    for (const tx of recentReturns) {
      if (tx.user && !seen.has(tx.user._id)) {
        seen.add(tx.user._id);
        result.push(tx.user);
      }
      if (result.length >= 8) break;
    }
    return result;
  })();

  // Fetch borrows for a member
  const fetchBorrows = async (userId) => {
    try {
      const res = await api.get(`/library/users/${userId}/borrowing-info`);
      setActiveBorrows(res.data.borrowedBooks || []);
      console.log(`Loaded ${res.data.borrowedBooks?.length || 0} active borrows for user ${userId}`);
    } catch (err) {
      console.error('Fetch borrows error:', err);
      setError('Failed to load borrowing information');
    }
  };

  const handleSelectMember = (m) => {
    setSelectedMember(m);
    setMemberSearch(m.name);
    setShowMemberSuggestions(false);
    setSelectedBorrow(null);
    fetchBorrows(m._id);
  };

  const clearMember = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setActiveBorrows([]);
    setSelectedBorrow(null);
    setShowMemberSuggestions(true);
  };

  const clearAll = () => {
    clearMember();
    setReturnDate(new Date().toISOString().split('T')[0]);
    setError('');
    setSuccessMsg('');
  };

  const handleReturn = async () => {
    setError('');
    setSuccessMsg('');
    if (!selectedMember || !selectedBorrow) return;

    setSaving(true);
    try {
      await api.post('/library/return', {
        userId: selectedMember._id,
        bookId: selectedBorrow.book._id,
        returnDate,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMsg(`"${selectedBorrow.book.title}" returned successfully!`);
      await fetchBorrows(selectedMember._id);
      setSelectedBorrow(null);
      setReturnDate(new Date().toISOString().split('T')[0]);

      // Refresh recent returns
      const txRes = await api.get('/library/transactions?status=returned&limit=10');
      setRecentReturns(txRes.data.transactions || []);
      console.log('Book returned successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return book.');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnSelected = async () => {
    if (!selectedBorrow) return;
    handleReturn();
  };

  function gradeDisplay(u) {
    if (u.role === 'student') {
      if (u.grade && u.class) return `Gr.${u.grade.replace('Grade ', '')}-${u.class}`;
      if (u.grade) return `Gr.${u.grade.replace('Grade ', '')}`;
      return 'Student';
    }
    if (u.role === 'teacher') return 'Teacher';
    return u.role;
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F3FC' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72" style={{ background: '#F5F3FC' }}>
        <TopBar />
        <main className="flex-1 pt-20 pb-4 px-4 overflow-y-auto">

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Return Book</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Select a member and the book they are returning.</p>
          </div>

          {error && (
            <div className="mb-3 px-4 py-2 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-3 px-4 py-2 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              {successMsg}
            </div>
          )}

          <div className="flex gap-4" style={{ maxWidth: '1200px' }}>

            {/* ========= MAIN COLUMN ========= */}
            <div className="flex-1 space-y-4">

              {/* Member Search + Borrowings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* --- MEMBER SELECTION --- */}
                <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#fff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10B981' }}>
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>assignment_return</span>
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: '#1a1245' }}>
                      {memberSearch.length >= 1 ? `${memberResults.length} results` : 'Select Member'}
                    </h2>
                    {selectedMember && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Selected</span>
                    )}
                  </div>

                  {/* Filters row */}
                  <div className="flex gap-2 mb-3">
                    <select
                      value={memberRoleFilter}
                      onChange={(e) => { setMemberRoleFilter(e.target.value); setMemberGradeFilter('all'); setMemberClassFilter('all'); }}
                      className="py-2 px-2 text-xs rounded-lg outline-none cursor-pointer"
                      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
                    >
                      <option value="all">All Roles</option>
                      <option value="student">Students</option>
                      <option value="teacher">Teachers</option>
                    </select>
                    {(memberRoleFilter === 'all' || memberRoleFilter === 'student') && (
                      <select
                        value={memberGradeFilter}
                        onChange={(e) => { setMemberGradeFilter(e.target.value); setMemberClassFilter('all'); }}
                        className="flex-1 py-2 px-2 text-xs rounded-lg outline-none cursor-pointer"
                        style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
                      >
                        <option value="all">All Grades</option>
                        {GRADES.filter(g => availableGrades.includes(g)).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Class filter buttons */}
                  {memberGradeFilter !== 'all' && memberGradeFilter !== 'Grade 12' && memberGradeFilter !== 'Grade 13' && (
                    <div className="flex gap-1 mb-3 flex-wrap">
                      <button
                        onClick={() => setMemberClassFilter('all')}
                        className="px-2 py-1 text-[10px] rounded-md font-semibold transition-all"
                        style={{
                          backgroundColor: memberClassFilter === 'all' ? '#10B981' : '#F3F4F6',
                          color: memberClassFilter === 'all' ? '#fff' : '#6B7280',
                        }}
                      >All</button>
                      {CLASS_SECTIONS.filter(c => availableClasses.includes(c)).map(c => (
                        <button
                          key={c}
                          onClick={() => setMemberClassFilter(c === memberClassFilter ? 'all' : c)}
                          className="px-2 py-1 text-[10px] rounded-md font-semibold transition-all"
                          style={{
                            backgroundColor: memberClassFilter === c ? '#10B981' : '#F3F4F6',
                            color: memberClassFilter === c ? '#fff' : '#6B7280',
                          }}
                        >{c}</button>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF', fontSize: 20 }}>person_search</span>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onFocus={() => setShowMemberSuggestions(memberSearch.length === 0)}
                      placeholder="Type name, email, or member ID..."
                      className="w-full py-2 pl-10 pr-3 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                    />
                  </div>

                  {/* Suggestions (when idle) - Removed Recent Returns as requested */}

                  {/* Results (when searching) */}
                  {memberSearch.length >= 1 && (
                    <div className="mt-2 rounded-xl overflow-y-auto" style={{ maxHeight: '180px', backgroundColor: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                      {memberResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <span className="material-symbols-outlined mx-auto block mb-1" style={{ color: '#D1D5DB', fontSize: 28 }}>person_off</span>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>No members found</p>
                        </div>
                      ) : (
                        memberResults.slice(0, 15).map(u => (
                          <button
                            key={u._id}
                            onClick={() => handleSelectMember(u)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-green-50 transition-colors border-b"
                            style={{ borderColor: '#F3F4F6' }}
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D1FAE5' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10B981' }}>person</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold" style={{ color: '#1a1245' }}>{u.name}</div>
                              <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                                {u.memberId || '—'} \u2022 {gradeDisplay(u)}
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                              u.role === 'student' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {u.role === 'student' ? 'St' : 'Tc'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected card */}
                  {selectedMember && (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ border: '2px solid #D1FAE5', backgroundColor: '#ECFDF5' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10B981' }}>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>person</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: '#1a1245' }}>{selectedMember.name}</div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>
                          <span className="font-mono font-bold text-[10px]">{selectedMember.memberId || '—'}</span>
                          {' '}\u2022 {gradeDisplay(selectedMember)}
                        </div>
                      </div>
                      <button onClick={clearMember} className="p-1 rounded-lg hover:bg-red-50 flex-shrink-0">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>close</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* --- ACTIVE BORROWINGS --- */}
                <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#fff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F59E0B' }}>
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>receipt_long</span>
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: '#1a1245' }}>
                      {selectedMember ? `${activeBorrows.length} book(s)` : 'Active Borrowings'}
                    </h2>
                  </div>

                  <ActiveBorrowsList
                    borrows={activeBorrows}
                    selectedMember={selectedMember}
                    selectedBorrow={selectedBorrow}
                    onSelect={setSelectedBorrow}
                    maxHeight="340px"
                  />
                </div>
              </div>

              {/* --- CONFIRM RETURN --- */}
              <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#fff' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10B981' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>assignment_turned_in</span>
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: '#1a1245' }}>Confirm Return</h2>
                </div>

                {selectedBorrow ? (
                  <>
                    {/* Selected book details */}
                    <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: '#FAFBFC', border: '1px solid #E5E7EB' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1a1245' }}>
                          <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>menu_book</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: '#1a1245' }}>{selectedBorrow.book?.title}</div>
                          <div className="text-xs" style={{ color: '#6B7280' }}>
                            {selectedBorrow.book?.author} \u2022 ID: {selectedBorrow.book?.bookId || '—'}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                              Borrowed: <span className="font-semibold" style={{ color: '#374151' }}>{new Date(selectedBorrow.borrowDate).toLocaleDateString()}</span>
                            </span>
                            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                              Due: <span className={`font-semibold ${new Date(selectedBorrow.dueDate) < new Date() ? 'text-red-600' : 'text-green-600'}`}>{new Date(selectedBorrow.dueDate).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        {new Date(selectedBorrow.dueDate) < new Date() && (
                          <span className="text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                            OVERDUE {Math.floor((Date.now() - new Date(selectedBorrow.dueDate)) / 86400000)}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Return controls */}
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Return Date</label>
                        <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                          style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                        />
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={handleReturnSelected} disabled={saving}
                          className="py-2 px-6 rounded-xl text-sm font-bold flex items-center gap-2 transition-all text-white"
                          style={{
                            backgroundColor: !saving ? '#1a1245' : '#D1D5DB',
                            boxShadow: !saving ? '0 4px 14px rgba(26,18,69,0.3)' : 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>assignment_returned</span>
                          {saving ? 'Processing...' : 'Confirm Return'}
                        </button>
                        <button onClick={() => setSelectedBorrow(null)}
                          className="py-2 px-4 rounded-xl text-sm font-bold transition-all"
                          style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                ) : selectedMember && activeBorrows.length > 0 ? (
                  <div className="text-center py-4">
                    <span className="material-symbols-outlined mx-auto block mb-1" style={{ color: '#9CA3AF', fontSize: 28 }}>menu_book</span>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Click a book above to return it</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="material-symbols-outlined mx-auto block mb-1" style={{ color: '#D1D5DB', fontSize: 28 }}>assignment_return</span>
                    <p className="text-xs" style={{ color: '#D1D5DB' }}>Select a member and book to return</p>
                  </div>
                )}
              </div>
            </div>

            {/* ========= RIGHT SIDEBAR ========= */}
            <div className="w-72 space-y-4 flex-shrink-0">

              {/* Quick return summary */}
              {selectedMember && (
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#10B981' }}>person</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Member Info</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D1FAE5' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#10B981' }}>person</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: '#1a1245' }}>{selectedMember.name}</div>
                      <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                        {selectedMember.memberId || '—'} \u2022 {gradeDisplay(selectedMember)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Active books</span>
                      <span className="text-xs font-bold" style={{ color: activeBorrows.length > 3 ? '#DC2626' : '#1a1245' }}>{activeBorrows.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Returns */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#10B981' }}>assignment_returned</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Recent Returns</span>
                </div>

                <RecentTransactionsList
                  transactions={recentReturns}
                  type="returns"
                  maxHeight="256px"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
