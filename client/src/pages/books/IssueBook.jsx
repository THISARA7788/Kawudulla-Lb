import { useState, useEffect, useRef } from 'react';
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
  const { token } = useAuth();

  // Member state
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const memberInputRef = useRef(null);
  const [memberInputFocused, setMemberInputFocused] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Cart state for multi-book checkout
  const [cart, setCart] = useState([]);
  const [outstandingFines, setOutstandingFines] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // Book search state
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [showBookSuggestions, setShowBookSuggestions] = useState(true);

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
        
        console.log('Loaded users:', usersRes.data.users?.length || 0);
        console.log('Loaded books:', booksRes.data.books?.length || 0);
        console.log('Loaded recent issues:', txRes.data.transactions?.length || 0);
      } catch (err) {
        console.error('Init error:', err);
        setError('Failed to load initial data');
      }
    };
    init();
  }, [token]);

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
  }, [memberSearch, allUsers]);

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
      setOutstandingFines(res.data.outstandingFinesTotal || 0);
      setOverdueCount(res.data.overdueCount || 0);
      console.log(`Loaded active borrows: ${res.data.borrowedBooks?.length || 0}, fines: ${res.data.outstandingFinesTotal || 0} for user ${userId}`);
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
    setCart([]); // Clear cart when switching members
    setTimeout(() => {
      if (bookInputRef.current) bookInputRef.current.focus();
    }, 50);
  };

  const handleSelectBook = (b) => {
    // Check if book is already in cart
    if (cart.some(item => item.book._id === b._id)) {
      setBookError(`"${b.title}" is already in the checkout cart.`);
      return;
    }
    // Check if user already has this book borrowed
    if (activeBorrows.some(item => item.book && item.book._id === b._id)) {
      setBookError(`Member already has "${b.title}" borrowed.`);
      return;
    }
    // Check if cart + activeBorrows exceeds limit
    if (activeBorrows.length + cart.length >= borrowLimit) {
      setBookError(`Cannot add book. Borrower has reached their limit (${borrowLimit} books).`);
      return;
    }

    setCart([...cart, {
      book: b,
      dueDate: dueDate, // default to the global due date
      notes: '',
    }]);

    setBookSearch('');
    setShowBookSuggestions(true);
    setBookError('');

    setTimeout(() => {
      if (bookInputRef.current) {
        bookInputRef.current.value = '';
        bookInputRef.current.focus();
      }
    }, 50);
  };

  const removeFromCart = (bookId) => {
    setCart(cart.filter(item => item.book._id !== bookId));
  };

  const updateCartItemDueDate = (bookId, dateVal) => {
    setCart(cart.map(item => item.book._id === bookId ? { ...item, dueDate: dateVal } : item));
  };

  const updateCartItemNotes = (bookId, notesVal) => {
    setCart(cart.map(item => item.book._id === bookId ? { ...item, notes: notesVal } : item));
  };

  const applyPresetDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split('T')[0];
    setDueDate(newDateStr);
    
    // Also update all items currently in cart
    setCart(cart.map(item => ({ ...item, dueDate: newDateStr })));
  };

  const clearMember = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setActiveBorrows([]);
    setOutstandingFines(0);
    setOverdueCount(0);
    setCart([]);
    setShowMemberSuggestions(true);
    setMemberError('');
  };

  const clearBook = () => {
    setBookSearch('');
    setShowBookSuggestions(true);
    setBookError('');
  };

  const clearAll = () => {
    clearMember();
    clearBook();
    setNotes('');
    setCart([]);
  };

  // Reusable barcode processor
  const processBarcode = (query) => {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;

    // Check if it's a Member ID (starts with KMV or matches user memberId patterns)
    const isMemberId = cleanQuery.startsWith('KMV') || allUsers.some(u => u.memberId && u.memberId.toUpperCase() === cleanQuery);
    
    if (isMemberId) {
      const matchedUser = allUsers.find(
        u => u.memberId && u.memberId.toUpperCase() === cleanQuery
      );
      if (matchedUser) {
        handleSelectMember(matchedUser);
        setBookSearch('');
        setMemberSearch('');
        setBookError('');
        setMemberError('');
      } else {
        setMemberError(`No member found matching ID "${query}"`);
      }
    } else {
      // Treat as Book search / ISBN
      const cleanBookQuery = cleanQuery.replace(/[-\s]/g, '');
      const book = allBooks.find(b => 
        (b.bookId && b.bookId.toUpperCase() === cleanQuery) ||
        (b.isbn && b.isbn.replace(/[-\s]/g, '').toUpperCase() === cleanBookQuery)
      );

      if (book) {
        if (book.availableCopies <= 0) {
          setBookError(`Book "${book.title}" has no copies available.`);
          return;
        }
        handleSelectBook(book);
        setBookSearch('');
        setBookError('');
      } else {
        // Fallback to title/author filter results
        if (bookResults.length > 0) {
          const firstBook = bookResults[0];
          if (firstBook.availableCopies <= 0) {
            setBookError(`Book "${firstBook.title}" has no copies available.`);
            return;
          }
          handleSelectBook(firstBook);
          setBookSearch('');
          setBookError('');
        } else {
          if (cleanQuery.startsWith('BK') || /^\d{6,}/.test(query)) {
            setBookError(`No book found matching barcode/ISBN "${query}".`);
          }
        }
      }
    }
  };

  const handleMemberSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = memberSearch.trim();
      if (!query) return;

      // Check if exact match by name or member ID
      const matchedUser = allUsers.find(
        u => (u.memberId && u.memberId.toUpperCase() === query.toUpperCase()) || 
             u.name.toLowerCase() === query.toLowerCase()
      );

      if (matchedUser) {
        handleSelectMember(matchedUser);
        setMemberSearch('');
        setMemberError('');
      } else {
        // Fallback to top result
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
      e.preventDefault();
      const query = bookSearch.trim();
      if (!query) return;
      processBarcode(query);
    }
  };

  // Auto-focus inputs on state changes (immediate layout adjustment)
  useEffect(() => {
    if (!selectedMember) {
      if (memberInputRef.current) {
        memberInputRef.current.focus();
      }
    } else {
      if (bookInputRef.current) {
        bookInputRef.current.focus();
      }
    }
  }, [selectedMember]);

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
      } else {
        if (bookInputRef.current) {
          bookInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedMember, showSuccessModal]);

  // Automatic Barcode Scan Key Interceptor
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalScan = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT'
      ) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 200) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        const query = buffer.trim();
        if (query) {
          processBarcode(query);
          buffer = '';
        }
        e.preventDefault();
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalScan);
    return () => window.removeEventListener('keydown', handleGlobalScan);
  }, [allUsers, allBooks, cart, activeBorrows, borrowLimit, bookResults]);

  // Close success modal automatically when a new member scan or book scan starts
  useEffect(() => {
    if ((memberSearch || bookSearch) && showSuccessModal) {
      setShowSuccessModal(false);
      setIssuedDetails(null);
    }
  }, [memberSearch, bookSearch, showSuccessModal]);

  const canIssue = selectedMember && cart.length > 0 && !saving;

  const handleIssue = async () => {
    setError('');
    if (!canIssue) return;

    setSaving(true);
    try {
      const issuePayload = cart.map(item => ({
        bookId: item.book._id,
        dueDate: item.dueDate,
        notes: item.notes || notes,
        issueDate: issueDate
      }));

      await api.post('/library/issue/bulk', {
        userId: selectedMember._id,
        issues: issuePayload,
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
        books: cart.map(item => item.book),
        dueDate,
      });
      setShowSuccessModal(true);

      clearAll();
      setShowMemberSuggestions(true);
      setShowBookSuggestions(true);
      setIssueDate(new Date().toISOString().split('T')[0]);
      const d = new Date(); d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().split('T')[0]);
      console.log('Books issued successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue books.');
    } finally {
      setSaving(false);
    }
  };

  function gradeDisplay(u) {
    if (u.role === 'student') {
      if (u.grade && u.class) return `${u.grade.replace('Grade ', '')}-${u.class}`;
      if (u.grade) return u.grade.replace('Grade ', '');
      return 'Student';
    }
    if (u.role === 'teacher') return 'Teacher';
    return u.role;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto space-y-6" style={{ maxWidth: '1280px' }}>
        
        

        {error && (
          <div className="px-4 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-sm animate-fadeIn" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            <span className="material-symbols-outlined text-lg">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ========= MAIN COLUMN ========= */}
          <div className="flex-1 space-y-6">

            {/* Selection Grid: Member + Book */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* --- MEMBER SELECTION --- */}
              <div className="rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-300 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-50">
                      <span className="material-symbols-outlined text-indigo-600" style={{ fontSize: 18 }}>person_search</span>
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-700">
                      {memberSearch.length >= 1 ? `${memberResults.length} Results` : 'Select Member'}
                    </h2>
                  </div>
                  {selectedMember && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">Selected</span>
                  )}
                </div>



                {/* Search bar */}
                {selectedMember ? (
                  <div className="relative flex items-center justify-between w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 animate-fadeIn min-h-[46px] shadow-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" style={{ fontSize: 20 }}>person</span>
                    <div className="flex-1 min-w-0 pr-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-indigo-950 truncate">{selectedMember.name}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Member ID */}
                        <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase tracking-wide">
                          {selectedMember.memberId || '—'}
                        </span>
                        {/* Role */}
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wide ${
                          selectedMember.role === 'student' 
                            ? 'bg-sky-50 text-sky-700 border-sky-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {selectedMember.role}
                        </span>
                        {/* Grade (only for students with a grade) */}
                        {selectedMember.role === 'student' && selectedMember.grade && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-250 text-emerald-700 uppercase tracking-wide">
                            {gradeDisplay(selectedMember)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={clearMember} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-100/50 text-indigo-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: memberInputFocused ? '#6366F1' : '#9CA3AF', fontSize: 20 }}>person_search</span>
                    <input
                      ref={memberInputRef}
                      type="text"
                      value={memberSearch}
                      onChange={(e) => { setMemberSearch(e.target.value); setMemberError(''); }}
                      onKeyDown={handleMemberSearchKeyDown}
                      onFocus={(e) => {
                        setMemberInputFocused(true);
                        setShowMemberSuggestions(memberSearch.length === 0);
                        e.target.select();
                      }}
                      onBlur={() => setMemberInputFocused(false)}
                      onClick={(e) => e.target.select()}
                      placeholder="Type name, email, or member ID..."
                      className="w-full py-2.5 pl-10 pr-3 text-sm rounded-xl outline-none transition-all border bg-slate-50/50"
                      style={{ 
                        borderColor: memberInputFocused ? '#6366F1' : '#E5E7EB',
                        fontFamily: memberSearch.toUpperCase().startsWith('KMV') ? 'monospace' : 'inherit',
                        fontWeight: memberSearch.toUpperCase().startsWith('KMV') ? 'bold' : 'normal'
                      }}
                    />
                  </div>
                )}

                {memberError && (
                  <div className="mt-2.5 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-medium border border-red-100 bg-red-50/50 text-red-600">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {memberError}
                  </div>
                )}



                {/* Results list */}
                {memberSearch.length >= 1 && !selectedMember && (
                  <div className="mt-3 rounded-xl border border-slate-100 max-h-[220px] overflow-y-auto bg-slate-50/30">
                    {memberResults.length === 0 ? (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined mx-auto block mb-1 text-slate-300" style={{ fontSize: 32 }}>person_off</span>
                        <p className="text-xs text-slate-400 font-medium">No members found</p>
                      </div>
                    ) : (
                      memberResults.slice(0, 15).map(u => (
                        <button
                          key={u._id}
                          onClick={() => handleSelectMember(u)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-indigo-50/30 border-b border-slate-100 transition-colors last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-50">
                            <span className="material-symbols-outlined text-indigo-500" style={{ fontSize: 18 }}>person</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-700 truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {u.memberId || '—'} • {gradeDisplay(u)}
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            u.role === 'student' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {u.role === 'student' ? 'STUDENT' : 'TEACHER'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}


              </div>

              {/* --- BOOK SELECTION --- */}
              <div className="rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-300 bg-white" style={{ border: bookInputFocused ? '1px solid #F59E0B' : '1px solid #E5E7EB' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                      <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 18 }}>menu_book</span>
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-700">
                      {bookSearch.length >= 1 ? `${bookResults.length} Results` : 'Scan/Search Book'}
                    </h2>
                  </div>
                  {cart.length > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
                      {cart.length} in Cart
                    </span>
                  )}
                </div>

                {/* Book search input */}
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
                    onFocus={(e) => {
                      setBookInputFocused(true);
                      setShowBookSuggestions(bookSearch.length === 0);
                      e.target.select();
                    }}
                    onBlur={() => bookInputRef.current && setBookInputFocused(false)}
                    onClick={(e) => e.target.select()}
                    onKeyDown={handleBookSearchKeyDown}
                    disabled={!selectedMember}
                    placeholder={selectedMember ? "Scan barcode/ISBN or type title, author..." : "Please select a member first"}
                    className="w-full py-2.5 pl-10 pr-3 text-sm rounded-xl outline-none transition-all border font-medium bg-slate-50/50"
                    style={{ 
                      borderColor: bookInputFocused ? '#F59E0B' : '#E5E7EB',
                      fontFamily: bookSearch.startsWith('BK') || /^\d{6}/.test(bookSearch) ? 'monospace' : 'inherit',
                      cursor: selectedMember ? 'text' : 'not-allowed'
                    }}
                  />
                </div>

                {bookError && (
                  <div className="mt-2.5 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-medium border border-red-100 bg-red-50/50 text-red-600 animate-fadeIn">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {bookError}
                  </div>
                )}



                {/* Results list */}
                {bookSearch.length >= 1 && (
                  <div className="mt-3 rounded-xl border border-slate-100 max-h-[220px] overflow-y-auto bg-slate-50/30">
                    {bookResults.length === 0 ? (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined mx-auto block mb-1 text-slate-300" style={{ fontSize: 32 }}>search_off</span>
                        <p className="text-xs text-slate-400 font-medium">No available books found</p>
                      </div>
                    ) : (
                      bookResults.slice(0, 15).map(b => {
                        const inCart = cart.some(item => item.book._id === b._id);
                        return (
                          <button
                            key={b._id}
                            disabled={inCart}
                            onClick={() => handleSelectBook(b)}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left border-b border-slate-100 transition-colors last:border-0 ${
                              inCart ? 'opacity-40 cursor-not-allowed bg-slate-100/50' : 'hover:bg-amber-50/30'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                              <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 18 }}>menu_book</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-700 truncate">{b.title}</div>
                              <div className="text-[10px] text-slate-400">
                                {b.author} • ID: <span className="font-mono">{b.bookId || '—'}</span>
                              </div>
                            </div>
                            {inCart ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">IN CART</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                {b.availableCopies} Available
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* --- BORROWER WARNING WIDGETS --- */}
            {selectedMember && (outstandingFines > 0 || overdueCount > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                {outstandingFines > 0 && (
                  <div className="rounded-2xl p-4 flex gap-3 border border-amber-100 bg-amber-50/50 text-amber-800 shadow-sm">
                    <span className="material-symbols-outlined text-amber-600 text-2xl flex-shrink-0 mt-0.5 animate-bounce">warning_amber</span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">Unpaid Fines Alert</h4>
                      <p className="text-xs mt-1">This member has <span className="font-extrabold text-amber-950">LKR {outstandingFines}.00</span> in outstanding fines.</p>
                      <p className="text-[10px] text-amber-600/80 mt-1">Please advise them to clear it, but you may proceed to issue.</p>
                    </div>
                  </div>
                )}
                {overdueCount > 0 && (
                  <div className="rounded-2xl p-4 flex gap-3 border border-red-100 bg-red-50/50 text-red-800 shadow-sm">
                    <span className="material-symbols-outlined text-red-500 text-2xl flex-shrink-0 mt-0.5 animate-bounce">report_problem</span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-red-900">Overdue Books Alert</h4>
                      <p className="text-xs mt-1">This member currently has <span className="font-extrabold text-red-950">{overdueCount} overdue books</span> outstanding.</p>
                      <p className="text-[10px] text-red-500/80 mt-1">Please check their return status. You may bypass and issue.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- CHECKOUT CART / DRAFT LIST --- */}
            <div className="rounded-2xl p-5 border border-slate-100 shadow-sm bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50">
                    <span className="material-symbols-outlined text-indigo-600" style={{ fontSize: 18 }}>shopping_cart_checkout</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800">Checkout Cart</h2>
                    <p className="text-[11px] text-slate-400">Books selected for checkout in this batch</p>
                  </div>
                </div>

                {/* Global Date Presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Due Date Presets:</span>
                  <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => applyPresetDueDate(7)}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded hover:text-indigo-600 transition-all"
                    >+7d</button>
                    <button
                      type="button"
                      onClick={() => applyPresetDueDate(14)}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded hover:text-indigo-600 transition-all"
                    >+14d</button>
                    <button
                      type="button"
                      onClick={() => applyPresetDueDate(30)}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded hover:text-indigo-600 transition-all"
                    >+30d</button>
                  </div>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <span className="material-symbols-outlined text-slate-300 text-5xl mb-2.5">local_library</span>
                  <h3 className="text-xs font-bold text-slate-600">Checkout Cart is Empty</h3>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] mx-auto">
                    {selectedMember 
                      ? "Use the scanner or type in the Book Search box to add items here."
                      : "Please select a member first to begin adding books."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div 
                      key={item.book._id} 
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-indigo-50/20 hover:border-indigo-100 transition-all animate-fadeIn"
                    >
                      {/* Book Cover / Details */}
                      <div className="flex gap-3 items-center min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-amber-600 text-xl">menu_book</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-800 truncate">{item.book.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {item.book.author} • <span className="font-mono font-bold text-[9px]">{item.book.bookId}</span>
                          </div>
                        </div>
                      </div>

                      {/* Customization Inputs (DueDate & Notes) */}
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {/* Due Date field */}
                        <div className="flex flex-col">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</label>
                          <input 
                            type="date" 
                            value={item.dueDate} 
                            onChange={(e) => updateCartItemDueDate(item.book._id, e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                          />
                        </div>

                        {/* Notes field */}
                        <div className="flex flex-col flex-1 sm:flex-initial">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Notes</label>
                          <input 
                            type="text" 
                            placeholder="Optional notes..." 
                            value={item.notes} 
                            onChange={(e) => updateCartItemNotes(item.book._id, e.target.value)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-white min-w-[130px]"
                          />
                        </div>

                        {/* Remove item */}
                        <button 
                          type="button" 
                          onClick={() => removeFromCart(item.book._id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 mt-3 sm:mt-0"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Checkout Actions Panel */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Batch Issue Date</label>
                        <input 
                          type="date" 
                          value={issueDate} 
                          onChange={(e) => setIssueDate(e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 outline-none bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={clearAll}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                      >
                        Clear Cart
                      </button>
                      <button 
                        onClick={handleIssue} 
                        disabled={!canIssue}
                        className="px-6 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-md transition-all animate-fadeIn"
                        style={{
                          backgroundColor: canIssue ? '#1a1245' : '#D1D5DB',
                          boxShadow: canIssue ? '0 4px 12px rgba(26,18,69,0.25)' : 'none',
                          cursor: canIssue ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        {saving ? 'Processing...' : `Issue ${cart.length} Books`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========= RIGHT SIDEBAR ========= */}
          <div className="w-full lg:w-72 space-y-6 flex-shrink-0 animate-fadeIn">

            {/* Current Borrowings */}
            <div className="rounded-2xl p-5 border border-slate-100 shadow-sm bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600" style={{ fontSize: 18 }}>receipt_long</span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">Current Borrowings</span>
                </div>
                {selectedMember && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    activeBorrows.length >= borrowLimit 
                      ? 'bg-red-50 text-red-600 border-red-100' 
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                  }`}>
                    {activeBorrows.length} / {borrowLimit}
                  </span>
                )}
              </div>
              
              {selectedMember && (
                <div className="space-y-3.5">
                  <div className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 truncate">
                    Borrower: {selectedMember.name}
                  </div>
                  <ActiveBorrowsList
                    borrows={activeBorrows}
                    selectedMember={selectedMember}
                    maxHeight="160px"
                  />
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400 font-bold">
                      <span>Quota Allocation</span>
                      <span>{Math.min(activeBorrows.length, borrowLimit)} of {borrowLimit} used</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{
                        width: `${Math.min((activeBorrows.length / borrowLimit) * 100, 100)}%`,
                        backgroundColor: activeBorrows.length >= borrowLimit ? '#EF4444' : '#4F46E5',
                      }} />
                    </div>
                  </div>
                </div>
              )}
              {!selectedMember && (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined mx-auto block mb-1 text-slate-300" style={{ fontSize: 32 }}>person_outline</span>
                  <p className="text-xs text-slate-400 font-medium">Select member to view history</p>
                </div>
              )}
            </div>

            {/* Recent Issues */}
            <div className="rounded-2xl p-5 border border-slate-100 shadow-sm bg-white">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 18 }}>history</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">Recent Issues</span>
              </div>

              <RecentTransactionsList
                transactions={recentIssues}
                type="issues"
                maxHeight="240px"
              />
            </div>
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
            <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500" />
            
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 mt-2 animate-bounce">
              <span className="material-symbols-outlined text-4xl font-bold">check_circle</span>
            </div>

            <h3 className="text-xl font-black mb-1 text-indigo-950">
              Checkout Successful!
            </h3>
            <p className="text-slate-400 text-xs mb-5">Issued {issuedDetails.books ? issuedDetails.books.length : 1} books successfully</p>

            <div className="w-full rounded-2xl p-4 mb-6 border border-slate-100 bg-slate-50/50 flex flex-col gap-3.5 text-left text-xs">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>person</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Borrower</div>
                  <div className="font-extrabold text-slate-800 truncate">{issuedDetails.member.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{issuedDetails.member.memberId}</div>
                </div>
              </div>
              
              <div className="border-t border-dashed border-slate-200" />

              <div className="flex gap-3">
                <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>menu_book</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Issued Items</div>
                  <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                    {issuedDetails.books ? (
                      issuedDetails.books.map((bk) => (
                        <div key={bk._id} className="font-extrabold text-slate-800 text-xs py-0.5 flex justify-between items-center border-b border-slate-100 last:border-0 animate-fadeIn">
                          <span className="truncate pr-2">{bk.title}</span>
                          <span className="font-mono text-[9px] text-slate-400 flex-shrink-0">{bk.bookId}</span>
                        </div>
                      ))
                    ) : (
                      <div className="font-extrabold text-slate-800">{issuedDetails.book?.title}</div>
                    )}
                  </div>
                </div>
              </div>

              {issuedDetails.dueDate && (
                <>
                  <div className="border-t border-dashed border-slate-200" />
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-emerald-600 mt-0.5" style={{ fontSize: 18 }}>event</span>
                    <div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Default Return Due Date</div>
                      <div className="font-black text-emerald-700 text-sm mt-0.5">
                        {new Date(issuedDetails.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIssuedDetails(null);
                }}
                className="flex-1 py-3 rounded-xl text-xs font-black text-white transition-all hover:opacity-90 flex items-center justify-center gap-1.5 shadow-md bg-emerald-600 shadow-emerald-100"
              >
                Done (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
