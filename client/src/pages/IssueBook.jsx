import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

export default function IssueBook() {
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1: Member Selection
  const [memberSearch, setMemberSearch] = useState('');
  const [memberGradeFilter, setMemberGradeFilter] = useState('All');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);

  // Step 2: Book Selection
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);

  // Step 3: Issue Details
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Right panel: active borrowings
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [borrowLimit, setBorrowLimit] = useState(5);
  const [overdueCount, setOverdueCount] = useState(0);
  const [recentIssues, setRecentIssues] = useState([]);

  const ALL_GRADES = [
    'All', 'Student', 'Teacher',
    'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
    'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11',
    'Grade 12','Grade 13',
  ];

  // Load all users for search
  const [allUsers, setAllUsers] = useState([]);
  const [allBooks, setAllBooks] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [usersRes, booksRes, txRes] = await Promise.all([
          api.get('/library/users'),
          api.get('/library/books'),
          api.get('/library/transactions?status=active&limit=10'),
        ]);
        setAllUsers(usersRes.data.users || []);
        setAllBooks(booksRes.data.books || []);
        setRecentIssues(txRes.data.transactions || []);
      } catch (err) {
        console.error('Init error:', err);
      }
    };
    init();
  }, []);

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

  // Filter books
  useEffect(() => {
    if (bookSearch.length >= 2) {
      setBookLoading(true);
      const q = bookSearch.toLowerCase();
      const results = allBooks.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.bookId && b.bookId.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.toLowerCase().includes(q))
      );
      setBookResults(results);
      setBookLoading(false);
    } else {
      setBookResults([]);
    }
  }, [bookSearch, allBooks]);

  const fetchBorrowingInfo = async (userId) => {
    try {
      const res = await api.get(`/library/users/${userId}/borrowing-info`);
      setActiveBorrows(res.data.borrowedBooks || []);
      setBorrowLimit(res.data.limit || 5);
      setOverdueCount(res.data.overdueCount || 0);
    } catch (err) {
      console.error('Borrowing info error:', err);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setMemberSearch(member.name);
    setMemberResults([]);
    fetchBorrowingInfo(member._id);
  };

  const handleSelectBook = (book) => {
    if (book.availableCopies <= 0) return;
    setSelectedBook(book);
    setBookSearch(book.title);
    setBookResults([]);
  };

  const handleIssue = async () => {
    setError('');
    if (!selectedMember || !selectedBook) return;

    setSaving(true);
    try {
      await api.post('/library/issue', {
        userId: selectedMember._id,
        bookId: selectedBook._id,
        issueDate,
        dueDate,
        notes,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchBorrowingInfo(selectedMember._id);
      const [usersRes, booksRes, txRes] = await Promise.all([
        api.get('/library/users'),
        api.get('/library/books'),
        api.get('/library/transactions?status=active&limit=10'),
      ]);
      setAllUsers(usersRes.data.users || []);
      setAllBooks(booksRes.data.books || []);
      setRecentIssues(txRes.data.transactions || []);

      setSelectedMember(null);
      setSelectedBook(null);
      setMemberSearch('');
      setBookSearch('');
      setNotes('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      const d = new Date(); d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().split('T')[0]);
      setStep(1);

      alert('Book issued successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue book.');
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
            <h1 className="text-3xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Issue Book</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Issue a library book to a member.</p>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>
              {error}
            </div>
          )}

          <div className="flex gap-5">
            {/* Main content: 3 steps */}
            <div className="flex-1 space-y-4 max-w-2xl">

              {/* Step 1: Member Selection */}
              <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#fff' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4F5B7D' }}>person_search</span>
                  </div>
                  <h2 className="text-base font-bold" style={{ color: '#1E2A4A' }}>1. Member Selection</h2>
                </div>

                {!selectedMember ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search by name, email, or Member ID..."
                          className="w-full py-2 pl-10 pr-4 text-xs rounded-lg outline-none"
                          style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                        />
                      </div>
                      <select
                        value={memberGradeFilter}
                        onChange={(e) => setMemberGradeFilter(e.target.value)}
                        className="py-2 px-2 text-xs rounded-lg outline-none whitespace-nowrap"
                        style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0', color: '#2C2C3E' }}
                      >
                        {ALL_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    {memberResults.length > 0 && (
                      <div className="rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                        {memberResults.slice(0, 15).map((u) => (
                          <button
                            key={u._id}
                            onClick={() => handleSelectMember(u)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#4F5B7D' }}>person</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold" style={{ color: '#1E2A4A' }}>{u.name}</div>
                              <div className="text-[10px]" style={{ color: '#94a3b8' }}>{u.memberId || '—'} • {u.grade && u.class && !u.grade.startsWith('Grade 12') && !u.grade.startsWith('Grade 13') ? `${u.grade}-${u.class}` : (u.grade || u.role)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8f9fc', border: '1px solid #e0e0e0' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#4F5B7D' }}>person</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: '#1E2A4A' }}>{selectedMember.name}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>
                        <span className="font-mono font-bold" style={{ color: '#1a1245' }}>{selectedMember.memberId || '—'}</span>
                        {' '}\u2022 {selectedMember.grade || selectedMember.role}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Verified</span>
                    <button onClick={() => { setSelectedMember(null); setMemberSearch(''); setActiveBorrows([]); }}
                      className="p-1 rounded hover:bg-slate-200 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Book Selection */}
              <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#fff' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#DC2626' }}>library_books</span>
                  </div>
                  <h2 className="text-base font-bold" style={{ color: '#1E2A4A' }}>2. Book Selection</h2>
                </div>

                {!selectedBook ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
                      <input
                        type="text"
                        value={bookSearch}
                        onChange={(e) => setBookSearch(e.target.value)}
                        placeholder="Search by title, author, Book ID, or ISBN..."
                        className="w-full py-2 pl-10 pr-4 text-xs rounded-lg outline-none"
                        style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                      />
                      {bookResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                          {bookResults.filter(b => b.availableCopies > 0).slice(0, 10).map((b) => (
                            <button
                              key={b._id}
                              onClick={() => handleSelectBook(b)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#4F5B7D' }}>menu_book</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate" style={{ color: '#1E2A4A' }}>{b.title}</div>
                                <div className="text-[10px]" style={{ color: '#94a3b8' }}>{b.author} • {b.bookId || '—'}</div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                                {b.availableCopies} left
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8f9fc', border: '1px solid #e0e0e0' }}>
                    <div className="w-14 h-16 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#4F5B7D' }}>menu_book</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: '#1E2A4A' }}>{selectedBook.title}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>{selectedBook.author} • {selectedBook.isbn || '—'}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                        Book ID: <span className="font-mono font-bold" style={{ color: '#1a1245' }}>{selectedBook.bookId || '—'}</span>
                        {' '}\u2022 {selectedBook.category}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                      {selectedBook.availableCopies} available
                    </span>
                    <button onClick={() => { setSelectedBook(null); setBookSearch(''); }}
                      className="p-1 rounded hover:bg-slate-200 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Issue Details */}
              <div className="rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#fff' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4F5B7D' }}>calendar_month</span>
                  </div>
                  <h2 className="text-base font-bold" style={{ color: '#1E2A4A' }}>3. Issue Details</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Issue Date</label>
                    <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg outline-none"
                      style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg outline-none"
                      style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Librarian's Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="1" placeholder="Condition, special instructions..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg outline-none resize-none"
                    style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={handleIssue} disabled={saving || !selectedMember || !selectedBook}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: '#1E2A4A',
                      color: '#fff',
                      opacity: (saving || !selectedMember || !selectedBook) ? 0.5 : 1,
                      boxShadow: '0 4px 12px rgba(30,42,74,0.2)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    {saving ? 'Issuing...' : 'ISSUE BOOK NOW'}
                  </button>
                  <button onClick={() => {
                    setStep(1); setSelectedMember(null); setSelectedBook(null);
                    setMemberSearch(''); setBookSearch(''); setNotes('');
                  }}
                    className="px-5 py-2 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: '#f0f0f0', color: '#4F5B7D' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-64 space-y-4 flex-shrink-0" style={{ minWidth: '256px' }}>
              {/* Active Borrowings */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '2px solid #E0E7FF' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4F5B7D' }}>history</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#4F5B7D' }}>Active Borrowings</span>
                </div>

                {selectedMember ? (
                  <>
                    {activeBorrows.length === 0 ? (
                      <p className="text-xs py-3 text-center" style={{ color: '#94a3b8' }}>No active borrowings</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {activeBorrows.map((b, i) => {
                          const isOverdue = new Date(b.dueDate) < new Date();
                          return (
                            <div key={i} className="p-2.5 rounded-lg" style={{ backgroundColor: isOverdue ? '#FEF2F2' : '#F8F9FC' }}>
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold truncate" style={{ color: '#1E2A4A' }}>
                                  {b.book?.title || 'Unknown'}
                                </div>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isOverdue ? 'text-red-600 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                                  {isOverdue ? 'Overdue' : 'Active'}
                                </span>
                              </div>
                              <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>Due: {new Date(b.dueDate).toLocaleDateString()}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 pt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>Current Limit</span>
                        <span className="text-[10px] font-bold" style={{ color: '#1a1245' }}>{activeBorrows.length} / {borrowLimit}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#e0e0e0' }}>
                        <div className="h-1.5 rounded-full" style={{
                          width: `${Math.min((activeBorrows.length / borrowLimit) * 100, 100)}%`,
                          backgroundColor: activeBorrows.length >= borrowLimit ? '#b31b25' : '#4F5B7D',
                        }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-center py-3" style={{ color: '#94a3b8' }}>Select a member</p>
                )}
              </div>

              {/* Recent Issues */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '2px solid #E0E7FF' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4F5B7D' }}>receipt_long</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#4F5B7D' }}>Recent Issues</span>
                </div>

                {recentIssues.length === 0 ? (
                  <p className="text-[10px] text-center py-3" style={{ color: '#94a3b8' }}>No recent issues</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recentIssues.map((tx) => {
                      const isOverdue = new Date(tx.dueDate) < new Date();
                      const dueSoon = !isOverdue && new Date(tx.dueDate) - Date.now() < 3 * 24 * 60 * 60 * 1000;
                      return (
                        <div key={tx._id || tx.transactionId} className="p-2.5 rounded-lg" style={{
                          backgroundColor: isOverdue ? '#FEF2F2' : dueSoon ? '#FFFBEB' : '#F8F9FC'
                        }}>
                          <div className="text-xs font-semibold truncate" style={{ color: '#1E2A4A' }}>
                            {tx.book?.title || tx.transactionId || 'Unknown'}
                          </div>
                          <div className="text-[10px]" style={{ color: '#94a3b8' }}>
                            {tx.user?.name || 'Unknown'}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                              Due: {new Date(tx.dueDate).toLocaleDateString()}
                            </span>
                            {isOverdue ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-red-600 bg-red-100">Overdue</span>
                            ) : dueSoon ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-amber-700 bg-amber-100">Due Soon</span>
                            ) : (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-green-700 bg-green-100">Active</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
