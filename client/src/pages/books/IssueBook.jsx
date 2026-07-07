import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ActiveBorrowsList from '../../components/circulation/ActiveBorrowsList';
import RecentTransactionsList from '../../components/circulation/RecentTransactionsList';

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13',
];
const CLASS_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function IssueBook() {
  const { user, token } = useAuth();

  // Member state
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberGradeFilter, setMemberGradeFilter] = useState('all');
  const [memberClassFilter, setMemberClassFilter] = useState('all');
  const [memberResults, setMemberResults] = useState([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const memberInputRef = useRef(null);
  const [memberInputFocused, setMemberInputFocused] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Book state
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [showBookSuggestions, setShowBookSuggestions] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);

  // Issue details
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [issuedDetails, setIssuedDetails] = useState(null);

  // Right panel
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [borrowLimit, setBorrowLimit] = useState(5);
  const [recentIssues, setRecentIssues] = useState([]);

  // Unified scanner / manual book search state
  const [bookInputFocused, setBookInputFocused] = useState(false);
  const bookInputRef = useRef(null);
  const [bookError, setBookError] = useState('');

  // Data
  const [allUsers, setAllUsers] = useState([]);
  const [allBooks, setAllBooks] = useState([]);

  // Load data on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [usersRes, booksRes, txRes] = await Promise.all([
          api.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/library/books'),
          api.get('/library/transactions?status=active&limit=10'),
        ]);
        setAllUsers(usersRes.data.users || []);
        setAllBooks(booksRes.data.books || []);
        setRecentIssues(txRes.data.transactions || []);
        
        // Log data for debugging
        console.log('Loaded users:', usersRes.data.users?.length || 0);
        console.log('Loaded books:', booksRes.data.books?.length || 0);
        console.log('Loaded recent issues:', txRes.data.transactions?.length || 0);
      } catch (err) {
        console.error('Init error:', err);
        setError('Failed to load initial data');
      }
    };
    init();
  }, []);

  // Derived: grades and classes that exist in the data
  const allStudents = allUsers.filter(u => u.role === 'student' && u.status === 'active');
  const availableGrades = [...new Set(allStudents.map(u => u.grade).filter(Boolean))];
  const availableClasses = [...new Set(
    allStudents.filter(u => u.grade === memberGradeFilter && u.class).map(u => u.class)
  )];

  // Suggestion data: unique recent books from recentIssues
  const recentBooks = (() => {
    const seen = new Set();
    const result = [];
    for (const tx of recentIssues) {
      if (tx.book && !seen.has(tx.book._id)) {
        seen.add(tx.book._id);
        result.push(tx.book);
      }
      if (result.length >= 6) break;
    }
    return result;
  })();

  // Suggestion data: unique recent members from recentIssues
  const recentMembers = (() => {
    const seen = new Set();
    const result = [];
    for (const tx of recentIssues) {
      if (tx.user && !seen.has(tx.user._id)) {
        seen.add(tx.user._id);
        result.push(tx.user);
      }
      if (result.length >= 8) break;
    }
    return result;
  })();

  // Filter members
  useEffect(() => {
    let list = allUsers.filter(u => u.status === 'active' && u.role !== 'librarian');

    // Role filter
    if (memberRoleFilter === 'student') list = list.filter(u => u.role === 'student');
    if (memberRoleFilter === 'teacher') list = list.filter(u => u.role === 'teacher');

    // Grade filter (only affects students)
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

  // Filter books
  useEffect(() => {
    if (bookSearch.length >= 1) {
      const q = bookSearch.toLowerCase();
      const results = allBooks.filter(b =>
        b.availableCopies > 0 && (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.bookId && b.bookId.toLowerCase().includes(q)) ||
          (b.isbn && b.isbn.toLowerCase().includes(q)) ||
          b.category.toLowerCase().includes(q)
        )
      );
      setBookResults(results);
    } else {
      setBookResults([]);
    }
  }, [bookSearch, allBooks]);

  // Fetch borrowing info
  const fetchBorrowingInfo = async (userId) => {
    try {
      const res = await api.get(`/library/users/${userId}/borrowing-info`);
      setActiveBorrows(res.data.borrowedBooks || []);
      setBorrowLimit(res.data.limit || 5);
      console.log(`Loaded ${res.data.borrowedBooks?.length || 0} active borrows for user ${userId}`);
    } catch (err) {
      console.error('Borrowing info error:', err);
      setError('Failed to load borrowing information');
    }
  };

  const handleSelectMember = (m) => {
    setSelectedMember(m);
    setMemberSearch(m.name);
    setShowMemberSuggestions(false);
    setMemberError('');
    fetchBorrowingInfo(m._id);
  };

  const handleSelectBook = (b) => {
    setSelectedBook(b);
    setBookSearch(b.isbn || b.bookId || '');
    setShowBookSuggestions(false);
    setBookError('');
  };

  const clearMember = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setActiveBorrows([]);
    setShowMemberSuggestions(true);
    setMemberError('');
  };

  const clearBook = () => {
    setSelectedBook(null);
    setBookSearch('');
    setShowBookSuggestions(true);
    setBookError('');
  };

  const clearAll = () => {
    clearMember();
    clearBook();
    setNotes('');
  };

  const playBeep = useCallback((type = 'success') => {
    // Audio feedback disabled per user preference
  }, []);

  const handleMemberSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const query = memberSearch.trim().toUpperCase();
      if (!query) return;

      e.preventDefault();

      // Find in allUsers directly to avoid dependency on React's render/useEffect timing
      const matchedUser = allUsers.find(
        u => u.memberId && u.memberId.toUpperCase() === query
      );

      if (matchedUser) {
        handleSelectMember(matchedUser);
        setMemberSearch('');
        setMemberError('');
      } else {
        // Fallback to checking partial/name matches in memberResults
        if (memberResults.length > 0) {
          handleSelectMember(memberResults[0]);
          setMemberSearch('');
          setMemberError('');
        } else {
          setMemberError(`No member found matching ID/name "${memberSearch}"`);
        }
      }
    }
  };

  const handleBookSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const query = bookSearch.trim();
      if (!query) return;

      const upperQuery = query.toUpperCase();
      const queryClean = query.replace(/[-\s]/g, '').toUpperCase();

      const book = allBooks.find(b => 
        (b.bookId && b.bookId.toUpperCase() === upperQuery) ||
        (b.isbn && b.isbn.replace(/[-\s]/g, '').toUpperCase() === queryClean)
      );

      if (book) {
        e.preventDefault();
        setBookError('');
        if (book.availableCopies <= 0) {
          playBeep('error');
          setBookError(`Book "${book.title}" has no copies available.`);
          return;
        }
        if (selectedMember && selectedMember.borrowedBooks && selectedMember.borrowedBooks.some(b => b.book.toString() === book._id && !b.returnDate)) {
          playBeep('error');
          setBookError(`Member already has "${book.title}" borrowed.`);
          return;
        }

        handleSelectBook(book);
        playBeep('success');
      } else {
        // Fallback to checking partial/name matches in bookResults
        if (bookResults.length > 0) {
          e.preventDefault();
          const firstBook = bookResults[0];
          
          if (firstBook.availableCopies <= 0) {
            playBeep('error');
            setBookError(`Book "${firstBook.title}" has no copies available.`);
            return;
          }
          if (selectedMember && selectedMember.borrowedBooks && selectedMember.borrowedBooks.some(b => b.book.toString() === firstBook._id && !b.returnDate)) {
            playBeep('error');
            setBookError(`Member already has "${firstBook.title}" borrowed.`);
            return;
          }

          handleSelectBook(firstBook);
          playBeep('success');
          setBookSearch('');
          setBookError('');
        } else {
          if (upperQuery.startsWith('BK') || /^\d{6,}/.test(query)) {
            e.preventDefault();
            playBeep('error');
            setBookError(`No book found matching barcode/ISBN "${query}".`);
          }
        }
      }
    }
  };

  // Auto-focus inputs on state changes (immediate layout adjustment)
  useEffect(() => {
    if (!selectedMember) {
      if (memberInputRef.current) {
        memberInputRef.current.focus();
      }
    } else if (!selectedBook) {
      if (bookInputRef.current) {
        bookInputRef.current.focus();
      }
    }
  }, [selectedMember, selectedBook]);

  // Global keydown scanner interceptor
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showSuccessModal) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setShowSuccessModal(false);
          setIssuedDetails(null);
          if (!selectedMember) {
            if (memberInputRef.current) memberInputRef.current.focus();
          } else {
            if (bookInputRef.current) bookInputRef.current.focus();
          }
          return;
        }

        // Alphanumeric character indicating a new scan started
        if (e.key.length === 1) {
          setShowSuccessModal(false);
          setIssuedDetails(null);
          if (!selectedMember) {
            if (memberInputRef.current) memberInputRef.current.focus();
          } else {
            if (bookInputRef.current) bookInputRef.current.focus();
          }
          return; // Let character pass through to the now-focused input
        }
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) return;

      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT'
      ) {
        return;
      }

      if (!selectedMember) {
        if (memberInputRef.current) {
          memberInputRef.current.focus();
        }
      } else if (!selectedBook) {
        if (bookInputRef.current) {
          bookInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedMember, selectedBook, showSuccessModal]);

  const canIssue = selectedMember && selectedBook && !saving;

  const handleIssue = async () => {
    setError('');
    if (!canIssue) return;

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

      const [usersRes, booksRes, txRes] = await Promise.all([
        api.get('/users', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/library/books'),
        api.get('/library/transactions?status=active&limit=10'),
      ]);
      setAllUsers(usersRes.data.users || []);
      setAllBooks(booksRes.data.books || []);
      setRecentIssues(txRes.data.transactions || []);

      // Keep details for the success popup before clearing states
      setIssuedDetails({
        member: selectedMember,
        book: selectedBook,
        dueDate,
      });
      setShowSuccessModal(true);

      clearAll();
      setShowMemberSuggestions(true);
      setShowBookSuggestions(true);
      setIssueDate(new Date().toISOString().split('T')[0]);
      const d = new Date(); d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().split('T')[0]);
      console.log('Book issued successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue book.');
    } finally {
      setSaving(false);
    }
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
    <DashboardLayout>



          {error && (
            <div className="mb-3 px-4 py-2 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error}
            </div>
          )}

          <div className="flex gap-4" style={{ maxWidth: '1200px' }}>

            {/* ========= MAIN COLUMN ========= */}
            <div className="flex-1 space-y-4">

              {/* Member + Book side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* --- MEMBER SELECTION --- */}
                <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#fff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6366F1' }}>
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>person_search</span>
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
                          backgroundColor: memberClassFilter === 'all' ? '#6366F1' : '#F3F4F6',
                          color: memberClassFilter === 'all' ? '#fff' : '#6B7280',
                        }}
                      >All</button>
                      {CLASS_SECTIONS.filter(c => availableClasses.includes(c)).map(c => (
                        <button
                          key={c}
                          onClick={() => setMemberClassFilter(c === memberClassFilter ? 'all' : c)}
                          className="px-2 py-1 text-[10px] rounded-md font-semibold transition-all"
                          style={{
                            backgroundColor: memberClassFilter === c ? '#6366F1' : '#F3F4F6',
                            color: memberClassFilter === c ? '#fff' : '#6B7280',
                          }}
                        >{c}</button>
                      ))}
                    </div>
                  )}

                  {/* Search bar */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: memberInputFocused ? '#6366F1' : '#9CA3AF', fontSize: 20 }}>person_search</span>
                    <input
                      ref={memberInputRef}
                      type="text"
                      value={memberSearch}
                      onChange={(e) => { setMemberSearch(e.target.value); setMemberError(''); }}
                      onKeyDown={handleMemberSearchKeyDown}
                      onFocus={() => { setMemberInputFocused(true); setShowMemberSuggestions(memberSearch.length === 0); }}
                      onBlur={() => setMemberInputFocused(false)}
                      placeholder="Type name, email, or member ID..."
                      className="w-full py-2 pl-10 pr-3 text-sm rounded-xl outline-none transition-all"
                      style={{ 
                        backgroundColor: '#F9FAFB', 
                        border: memberInputFocused ? '2px solid #6366F1' : '1px solid #E5E7EB',
                        fontFamily: memberSearch.toUpperCase().startsWith('KMV') ? 'monospace' : 'inherit',
                        fontWeight: memberSearch.toUpperCase().startsWith('KMV') ? 'bold' : 'normal'
                      }}
                    />
                  </div>

                  {memberError && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                      {memberError}
                    </div>
                  )}

                  {/* Suggestions (when search is empty) */}
                  {showMemberSuggestions && !selectedMember && memberSearch.length === 0 && (
                    <div className="mt-2">
                      {/* Recent members */}
                      {recentMembers.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Recent Members</p>
                          <div className="rounded-xl overflow-y-auto mb-2" style={{ maxHeight: '120px', backgroundColor: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                            {recentMembers.map(u => (
                              <button
                                key={u._id}
                                onClick={() => handleSelectMember(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors border-b"
                                style={{ borderColor: '#F3F4F6' }}
                              >
                                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#6366F1' }}>history</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold" style={{ color: '#1a1245' }}>{u.name}</div>
                                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{u.memberId || '—'}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Results list (when searching) */}
                  {memberSearch.length >= 1 && (
                    <div className="mt-2 rounded-xl overflow-y-auto" style={{ maxHeight: '200px', backgroundColor: '#FAFBFC', border: '1px solid #F3F4F6' }}>
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
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-indigo-50 transition-colors border-b"
                            style={{ borderColor: '#F3F4F6' }}
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#6366F1' }}>person</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold" style={{ color: '#1a1245' }}>{u.name}</div>
                              <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                                {u.memberId || '—'} \u2022 {gradeDisplay(u)}
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                              u.role === 'student' ? 'bg-blue-50 text-blue-600' :
                              u.role === 'teacher' ? 'bg-amber-50 text-amber-700' : ''
                            }`}>
                              {u.role === 'student' ? 'St' : u.role === 'teacher' ? 'Tc' : u.role}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected member card */}
                  {selectedMember && (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ border: '2px solid #E0E7FF', backgroundColor: '#F0F0FF' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6366F1' }}>
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

                {/* --- BOOK SELECTION --- */}
                <div className="rounded-2xl p-4 shadow-sm transition-all" style={{ backgroundColor: '#fff', border: bookInputFocused ? '2px solid #F59E0B' : '1px solid #E5E7EB' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F59E0B' }}>
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>menu_book</span>
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: '#1a1245' }}>
                      {bookSearch.length >= 1 ? `${bookResults.length} results` : 'Select Book'}
                    </h2>
                    {selectedBook && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Selected</span>
                    )}
                  </div>

                  {/* Book search / Scan */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: bookInputFocused ? '#F59E0B' : '#9CA3AF', fontSize: 20 }}>
                      {bookInputFocused ? 'qr_code_scanner' : 'search'}
                    </span>
                    <input
                      ref={bookInputRef}
                      id="book-search-input"
                      type="text"
                      value={bookSearch}
                      onChange={(e) => { setBookSearch(e.target.value); setBookError(''); }}
                      onFocus={() => { setBookInputFocused(true); setShowBookSuggestions(bookSearch.length === 0); }}
                      onBlur={() => setBookInputFocused(false)}
                      onKeyDown={handleBookSearchKeyDown}
                      placeholder="Scan book barcode / ISBN or type title, author..."
                      className="w-full py-2 pl-10 pr-3 text-sm rounded-xl outline-none transition-all font-medium"
                      style={{ 
                        backgroundColor: '#F9FAFB', 
                        border: bookInputFocused ? '1px solid #F59E0B' : '1px solid #E5E7EB',
                        fontFamily: bookSearch.startsWith('BK') || /^\d{6}/.test(bookSearch) ? 'monospace' : 'inherit'
                      }}
                    />
                  </div>

                  {bookError && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                      {bookError}
                    </div>
                  )}

                  {/* Suggestions (when search is empty) */}
                  {showBookSuggestions && !selectedBook && bookSearch.length === 0 && (
                    <div className="mt-2">
                      {recentBooks.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Recently Issued</p>
                          <div className="rounded-xl overflow-y-auto mb-2" style={{ maxHeight: '120px', backgroundColor: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                            {recentBooks.filter(b => b.availableCopies > 0).slice(0, 4).map(b => (
                              <button
                                key={b._id}
                                onClick={() => handleSelectBook(b)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50 transition-colors border-b"
                                style={{ borderColor: '#F3F4F6' }}
                              >
                                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#F59E0B' }}>history</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold truncate" style={{ color: '#1a1245' }}>{b.title}</div>
                                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{b.author} \u2022 {b.bookId || '—'}</div>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                                  {b.availableCopies}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Results list (when searching) */}
                  {bookSearch.length >= 1 && (
                    <div className="mt-2 rounded-xl overflow-y-auto" style={{ maxHeight: '200px', backgroundColor: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                      {bookResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <span className="material-symbols-outlined mx-auto block mb-1" style={{ color: '#D1D5DB', fontSize: 28 }}>search_off</span>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>No available books found</p>
                        </div>
                      ) : (
                        bookResults.slice(0, 15).map(b => (
                          <button
                            key={b._id}
                            onClick={() => handleSelectBook(b)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-amber-50 transition-colors border-b"
                            style={{ borderColor: '#F3F4F6' }}
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#F59E0B' }}>menu_book</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate" style={{ color: '#1a1245' }}>{b.title}</div>
                              <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                                {b.author} \u2022 {b.category} \u2022 {b.bookId || '—'}
                              </div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                              {b.availableCopies}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected book card */}
                  {selectedBook && (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ border: '2px solid #FEF3C7', backgroundColor: '#FFFBEB' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F59E0B' }}>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>menu_book</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: '#1a1245' }}>{selectedBook.title}</div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>
                          {selectedBook.author} {'\u2022'} {selectedBook.category}
                        </div>
                        <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                          ID: <span className="font-mono font-bold">{selectedBook.bookId || '—'}</span>
                          {selectedBook.isbn && <> \u2022 ISBN: {selectedBook.isbn}</>}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                        {selectedBook.availableCopies} left
                      </span>
                      <button onClick={clearBook} className="p-1 rounded-lg hover:bg-red-50 flex-shrink-0">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* --- ISSUE DETAILS --- */}
              <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#fff' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10B981' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>calendar_today</span>
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: '#1a1245' }}>Issue Details</h2>
                  {selectedMember && selectedBook && (
                    <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: '#6B7280' }}>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#6366F1' }}>person</span>
                        {selectedMember.name}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#D1D5DB' }}>arrow_right_alt</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#F59E0B' }}>menu_book</span>
                        {selectedBook.title}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Issue Date</label>
                    <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                    />
                  </div>
                  <div className="flex-[1.5]">
                    <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Notes</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Condition, special instructions..."
                      className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                    />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handleIssue} disabled={!canIssue}
                      className="py-2 px-6 rounded-xl text-sm font-bold flex items-center gap-2 transition-all text-white"
                      style={{
                        backgroundColor: canIssue ? '#1a1245' : '#D1D5DB',
                        boxShadow: canIssue ? '0 4px 14px rgba(26,18,69,0.3)' : 'none',
                        cursor: canIssue ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                      {saving ? 'Issuing...' : 'Issue'}
                    </button>
                    <button onClick={clearAll}
                      className="py-2 px-4 rounded-xl text-sm font-bold transition-all"
                      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ========= RIGHT SIDEBAR ========= */}
            <div className="w-72 space-y-4 flex-shrink-0">

              {/* Current Borrowings */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6366F1' }}>receipt_long</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Current Borrowings</span>
                </div>
                {selectedMember && (
                  <>
                    <div className="mb-2 text-xs font-semibold truncate" style={{ color: '#6366F1' }}>{selectedMember.name}</div>
                    <ActiveBorrowsList
                      borrows={activeBorrows}
                      selectedMember={selectedMember}
                      maxHeight="128px"
                    />
                    <div className="mt-3 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Borrow limit</span>
                        <span className="text-xs font-bold" style={{ color: '#1a1245' }}>{activeBorrows.length} / {borrowLimit}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{
                          width: `${Math.min((activeBorrows.length / borrowLimit) * 100, 100)}%`,
                          backgroundColor: activeBorrows.length >= borrowLimit ? '#DC2626' : '#6366F1',
                        }} />
                      </div>
                    </div>
                  </>
                )}
                {!selectedMember && (
                  <div className="text-center py-4">
                    <span className="material-symbols-outlined mx-auto block mb-1" style={{ color: '#D1D5DB', fontSize: 28 }}>person_outline</span>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Select a member to view</p>
                  </div>
                )}
              </div>

              {/* Recent Issues */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#10B981' }}>history</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Recent Issues</span>
                </div>

                <RecentTransactionsList
                  transactions={recentIssues}
                  type="issues"
                  maxHeight="192px"
                />
              </div>
            </div>
          </div>

          {/* Success Modal Overlay */}
          {showSuccessModal && issuedDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes scaleUp {
                  from { transform: scale(0.95); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
                .animate-fadeIn {
                  animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scaleUp {
                  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
              `}</style>
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl transition-all border border-slate-100 flex flex-col items-center text-center relative overflow-hidden animate-scaleUp">
                {/* Elegant top background shape for a premium feel */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500" />
                
                {/* Icon checkmark inside a container */}
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 mt-2 animate-bounce">
                  <span className="material-symbols-outlined text-4xl font-bold">check_circle</span>
                </div>

                <h3 className="text-xl font-extrabold mb-1" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
                  Book Issued Successfully!
                </h3>
                <p className="text-slate-400 text-xs mb-5">Checkout transaction completed and recorded</p>

                {/* Issued Details Box */}
                <div className="w-full rounded-2xl p-4 mb-6 border border-slate-100 bg-slate-50/50 flex flex-col gap-3.5 text-left text-xs">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>person</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Borrower</div>
                      <div className="font-bold text-slate-800 truncate">{issuedDetails.member.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{issuedDetails.member.memberId}</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-200" />

                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>menu_book</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issued Item</div>
                      <div className="font-bold text-slate-800 truncate">{issuedDetails.book.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Catalog ID: {issuedDetails.book.bookId}</div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200" />

                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-emerald-600 mt-0.5" style={{ fontSize: 18 }}>event</span>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Return Due Date</div>
                      <div className="font-extrabold text-emerald-700 text-sm mt-0.5">
                        {new Date(issuedDetails.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      setIssuedDetails(null);
                    }}
                    className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-700/20"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">qr_code_scanner</span>
                    Scan Next Book (Enter)
                  </button>
                </div>
              </div>
            </div>
          )}
    </DashboardLayout>
  );
}
