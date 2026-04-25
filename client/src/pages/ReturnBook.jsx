import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

export default function ReturnBook() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberGradeFilter, setMemberGradeFilter] = useState('All');
  const [allUsers, setAllUsers] = useState([]);
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const [activeBorrows, setActiveBorrows] = useState([]);
  const [selectedBorrow, setSelectedBorrow] = useState(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [allBooks, setAllBooks] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [usersRes, booksRes, txRes] = await Promise.all([
          api.get('/library/users'),
          api.get('/library/books'),
          api.get('/library/transactions?status=returned&limit=10'),
        ]);
        setAllUsers(usersRes.data.users || []);
        setAllBooks(booksRes.data.books || []);
      } catch (err) {
        console.error('Init error:', err);
      }
    };
    init();
  }, []);

  const ALL_GRADES = [
    'All', 'Student', 'Teacher',
    'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
    'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11',
    'Grade 12','Grade 13',
  ];

  // Filter members: grade filter uses the separate `grade` field in the database
  useEffect(() => {
    const filtered = allUsers.filter(u => u.role !== 'librarian');
    const withRole = memberGradeFilter === 'All' || memberGradeFilter === 'Student' || memberGradeFilter === 'Teacher'
      ? filtered.filter(u => {
          if (memberGradeFilter === 'Student') return u.role === 'student';
          if (memberGradeFilter === 'Teacher') return u.role === 'teacher';
          return true;
        })
      : filtered.filter(u => u.grade === memberGradeFilter);

    let results = withRole;
    if (memberSearch.length >= 1) {
      const q = memberSearch.toLowerCase();
      results = withRole.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.memberId && u.memberId.toLowerCase().includes(q))
      );
    }
    setMemberResults(results);
  }, [memberSearch, memberGradeFilter, allUsers]);

  const fetchBorrows = async (userId) => {
    try {
      const res = await api.get(`/library/users/${userId}/borrowing-info`);
      setActiveBorrows(res.data.borrowedBooks || []);
    } catch (err) {
      console.error('Fetch borrows error:', err);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setMemberSearch(member.name);
    setMemberResults([]);
    setStep(2);
    setSelectedBorrow(null);
    fetchBorrows(member._id);
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
      setStep(2);

      // Refresh books list
      const booksRes = await api.get('/library/books');
      setAllBooks(booksRes.data.books || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return book.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F3FC' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72" style={{ background: '#F5F3FC' }}>
        <TopBar />
        <main className="flex-1 pt-20 pb-4 overflow-y-auto px-4">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Return Book</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Receive a returned book from a member.</p>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>
          )}
          {successMsg && (
            <div className="mb-3 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>{successMsg}</div>
          )}

          <div className="max-w-2xl space-y-4">

            {/* Step 1: Select Member */}
              {step === 1 && (
                <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#fff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4F5B7D' }}>person_search</span>
                    </div>
                    <h2 className="text-base font-bold" style={{ color: '#1E2A4A' }}>1. Select Member</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
                        <input
                          type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search by name, email, or Member ID..."
                          className="w-full py-2 pl-10 pr-4 text-xs rounded-lg outline-none"
                          style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                        />
                      </div>
                      <select
                        value={memberGradeFilter} onChange={(e) => setMemberGradeFilter(e.target.value)}
                        className="py-2 px-2 text-xs rounded-lg outline-none whitespace-nowrap"
                        style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0', color: '#2C2C3E' }}
                      >
                        {ALL_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    {memberResults.length > 0 && (
                      <div className="rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                        {memberResults.slice(0, 15).map((u) => (
                          <button key={u._id} onClick={() => handleSelectMember(u)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#4F5B7D' }}>person</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold" style={{ color: '#1E2A4A' }}>{u.name}</div>
                              <div className="text-[10px]" style={{ color: '#94a3b8' }}>{u.memberId || '—'} • {u.grade || u.role}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Select book to return */}
              {step === 2 && (
                <div className="space-y-4">
                  <button onClick={() => { setStep(1); setSelectedMember(null); setMemberSearch(''); setActiveBorrows([]); setSelectedBorrow(null); }}
                    className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ color: '#4F5B7D' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back to Member Search
                  </button>

                  <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#fff' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#4F5B7D' }}>person</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold" style={{ color: '#1E2A4A' }}>{selectedMember?.name}</div>
                        <div className="text-xs" style={{ color: '#94a3b8' }}>
                          <span className="font-mono font-bold" style={{ color: '#1a1245' }}>{selectedMember?.memberId || '—'}</span>
                          {' '}\u2022 {selectedMember?.grade || selectedMember?.role}
                        </div>
                      </div>
                    </div>
                    <div className="h-px my-3" style={{ backgroundColor: '#f0f0f0' }} />
                    <p className="text-xs font-semibold mb-2" style={{ color: '#1E2A4A' }}>Active Borrowings ({activeBorrows.length})</p>

                    {activeBorrows.length === 0 ? (
                      <p className="text-xs py-4 text-center" style={{ color: '#94a3b8' }}>No active borrowings</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {activeBorrows.map((b, i) => {
                          const isOverdue = new Date(b.dueDate) < new Date();
                          const book = b.book || {};
                          return (
                            <button key={i} onClick={() => { setSelectedBorrow(b); setStep(3); }}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${selectedBorrow && selectedBorrow.book?._id === book._id ? 'ring-2 ring-indigo-500' : 'hover:bg-slate-50'}`}
                              style={{ backgroundColor: '#f8f9fc', border: '1px solid #e0e0e0' }}>
                              <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isOverdue ? '#FEE2E2' : '#E0E7FF' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: isOverdue ? '#DC2626' : '#4F5B7D' }}>menu_book</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold" style={{ color: '#1E2A4A' }}>{book.title || 'Book'}</div>
                                <div className="text-[10px]" style={{ color: '#94a3b8' }}>
                                  {book.author} {book.bookId ? `• ID: ${book.bookId}` : ''}
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: isOverdue ? '#b31b25' : '#94a3b8' }}>
                                  Due: {new Date(b.dueDate).toLocaleDateString()} {isOverdue && '• OVERDUE'}
                                </div>
                              </div>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isOverdue ? 'text-red-600 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                                {isOverdue ? 'Overdue' : 'Active'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirm Return */}
              {step === 3 && selectedBorrow && (
                <div className="space-y-4">
                  <button onClick={() => { setStep(2); setSelectedBorrow(null); }}
                    className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ color: '#4F5B7D' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back
                  </button>

                  <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#fff' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#166534' }}>assignment_return</span>
                      </div>
                      <h2 className="text-base font-bold" style={{ color: '#1E2A4A' }}>Return Details</h2>
                    </div>

                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#f8f9fc' }}>
                      <div className="text-sm font-bold" style={{ color: '#1E2A4A' }}>{selectedBorrow.book?.title}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>{selectedBorrow.book?.author} • Book ID: {selectedBorrow.book?.bookId || '—'}</div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="text-xs"><span style={{ color: '#94a3b8' }}>Borrowed:</span> <span style={{ color: '#1E2A4A', fontWeight: 600 }}>{new Date(selectedBorrow.borrowDate).toLocaleDateString()}</span></div>
                        <div className="text-xs"><span style={{ color: '#94a3b8' }}>Due:</span> <span style={{ color: '#1E2A4A', fontWeight: 600 }}>{new Date(selectedBorrow.dueDate).toLocaleDateString()}</span></div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Return Date</label>
                      <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg outline-none"
                        style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleReturn} disabled={saving}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: '#1E2A4A', color: '#fff', opacity: saving ? 0.5 : 1 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        {saving ? 'Processing...' : 'CONFIRM RETURN'}
                      </button>
                      <button onClick={() => { setStep(2); setSelectedBorrow(null); }}
                        className="px-5 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#f0f0f0', color: '#4F5B7D' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}
