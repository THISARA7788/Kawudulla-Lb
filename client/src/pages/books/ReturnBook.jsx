import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
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

  // Scanner state
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [scanLog, setScanLog] = useState([]);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [scannerFocused, setScannerFocused] = useState(false);
  const scannerRef = useRef(null);

  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [returnedDetails, setReturnedDetails] = useState(null);

  // Multiple Borrowers inline state
  const [multipleBorrowers, setMultipleBorrowers] = useState([]);
  const [scannedBook, setScannedBook] = useState(null);

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
  const allStudents = allUsers.filter(u => u.role === 'student' && u.status === 'active');
  const availableGrades = [...new Set(allStudents.map(u => u.grade).filter(Boolean))];
  const availableClasses = [...new Set(
    allStudents.filter(u => u.grade === memberGradeFilter && u.class).map(u => u.class)
  )];

  // Filter members
  useEffect(() => {
    let list = allUsers.filter(u =>
      u.status === 'active' &&
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

  const playBeep = (type = 'success') => {
    // Audio feedback disabled per user preference
  };

  const performReturnDirectly = async (memberId, bookId, bookTitle, memberName) => {
    setError('');
    setScanSuccess('');
    setSaving(true);
    try {
      const res = await api.post('/library/return', {
        userId: memberId,
        bookId: bookId,
        returnDate,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMsg(`"${bookTitle}" returned successfully!`);
      setScanSuccess(`"${bookTitle}" returned successfully (Borrower: ${memberName})`);
      setScanLog(prev => [{ text: `Returned: ${bookTitle}`, time: new Date().toLocaleTimeString(), type: 'success' }, ...prev].slice(0, 5));
      playBeep('success_double');

      const { transaction, user: returnedUser, book: returnedBook } = res.data;
      setReturnedDetails({
        member: returnedUser || { name: memberName },
        book: returnedBook || { title: bookTitle },
        returnDate: returnDate || new Date(),
        overdueDays: transaction ? transaction.overdueDays : 0,
      });
      setShowSuccessModal(true);

      if (selectedMember && selectedMember._id === memberId) {
        await fetchBorrows(memberId);
      }
      setSelectedBorrow(null);

      const txRes = await api.get('/library/transactions?status=returned&limit=10');
      setRecentReturns(txRes.data.transactions || []);
      console.log('Book returned successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to return book.';
      setError(errMsg);
      setScanError(errMsg);
      playBeep('error');
    } finally {
      setSaving(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    setScanError('');
    setScanSuccess('');
    const query = scanInput.trim();
    if (!query) return;

    try {
      const res = await api.get(`/library/quick-lookup/${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = res.data;
      if (data.type === 'book') {
        const book = data.book;
        const activeTxs = data.activeTransactions || [];

        if (activeTxs.length === 0) {
          playBeep('error');
          setScanError(`Book "${book.title}" is not currently borrowed.`);
          setScanInput('');
          return;
        }

        if (activeTxs.length === 1) {
          const activeTx = activeTxs[0];
          const borrower = activeTx.user;

          if (autoSubmit) {
            await performReturnDirectly(borrower._id, book._id, book.title, borrower.name);
            setScanInput('');
          } else {
            setSelectedMember(borrower);
            await fetchBorrows(borrower._id);
            setSelectedBorrow(activeTx);
            playBeep('success');
            setScanSuccess(`Book "${book.title}" selected (Borrower: ${borrower.name})`);
            setScanLog(prev => [{ text: `Book: ${book.title}`, time: new Date().toLocaleTimeString(), type: 'book' }, ...prev].slice(0, 5));
            setScanInput('');
          }
        } else {
          // Multiple active borrowers for this book (same ISBN/title)
          playBeep('success');
          setMultipleBorrowers(activeTxs);
          setScannedBook(book);
          setScanInput('');
        }
      } else {
        playBeep('error');
        setScanError(`Barcode matched a member, but this scanner only accepts books.`);
        setScanInput('');
      }
    } catch (err) {
      playBeep('error');
      setScanError(err.response?.data?.message || `No book found matching "${query}".`);
      setScanInput('');
    }
  };

  // Auto-trigger scan processing when typing/scanning stops (hands-free processing)
  useEffect(() => {
    const trimmedInput = scanInput.trim();
    if (!trimmedInput) return;

    // Detect if it is likely a completed barcode scan (BKxxx or ISBN digits)
    const isReady = 
      (trimmedInput.toUpperCase().startsWith('BK') && trimmedInput.length >= 5) || 
      (/^\d+$/.test(trimmedInput) && trimmedInput.length >= 10) ||
      (trimmedInput.length >= 13);

    // Use a very short 150ms delay for completed formats, or a 400ms delay for manual typing pauses
    const delay = isReady ? 150 : 400;

    const timer = setTimeout(() => {
      const mockEvent = { preventDefault: () => {} };
      handleScanSubmit(mockEvent);
    }, delay);

    return () => clearTimeout(timer);
  }, [scanInput]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showSuccessModal) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setShowSuccessModal(false);
          setReturnedDetails(null);
          if (scannerRef.current) {
            scannerRef.current.focus();
          }
          return;
        }
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) return;

      if (
        scannerRef.current &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.tagName !== 'SELECT'
      ) {
        scannerRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSuccessModal]);

  // Close success modal automatically when a new scan starts typing
  useEffect(() => {
    if (scanInput && showSuccessModal) {
      setShowSuccessModal(false);
      setReturnedDetails(null);
    }
  }, [scanInput, showSuccessModal]);

  // Autofocus scanner input on mount
  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  }, []);

  const handleReturn = async () => {
    setError('');
    setSuccessMsg('');
    if (!selectedMember || !selectedBorrow) return;

    setSaving(true);
    try {
      const res = await api.post('/library/return', {
        userId: selectedMember._id,
        bookId: selectedBorrow.book._id,
        returnDate,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMsg(`"${selectedBorrow.book.title}" returned successfully!`);

      const { transaction, user: returnedUser, book: returnedBook } = res.data;
      setReturnedDetails({
        member: returnedUser || selectedMember,
        book: returnedBook || selectedBorrow.book,
        returnDate: returnDate || new Date(),
        overdueDays: transaction ? transaction.overdueDays : 0,
      });
      setShowSuccessModal(true);

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
    <DashboardLayout>



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

              {/* --- BARCODE SCANNER WORKSPACE --- */}
              <div className="rounded-2xl p-4 shadow-sm transition-all" style={{ backgroundColor: '#fff', border: scannerFocused ? '2px solid #10B981' : '1px solid #E5E7EB' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${scannerFocused ? 'bg-emerald-600' : 'bg-slate-500'}`}>
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>qr_code_scanner</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold" style={{ color: '#1a1245' }}>Smart Book Barcode Return Scanner</h2>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>Scan a Book barcode (Book ID / ISBN) to auto-return or auto-select the borrower.</p>
                    </div>
                  </div>
                  
                  {/* Auto-submit mode & Status Indicator */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={autoSubmit} 
                        onChange={(e) => setAutoSubmit(e.target.checked)} 
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        style={{ width: 14, height: 14 }}
                      />
                      <span className="text-[10px] font-bold" style={{ color: autoSubmit ? '#10B981' : '#6B7280' }}>⚡ Auto-Submit Return</span>
                    </label>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: scannerFocused ? '#ECFDF5' : '#F3F4F6' }}>
                      <span className={`w-2 h-2 rounded-full ${scannerFocused ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      <span className="text-[10px] font-semibold" style={{ color: scannerFocused ? '#047857' : '#6B7280' }}>
                        {scannerFocused ? 'Scanner Ready' : 'Click Input to Connect'}
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleScanSubmit} className="w-full">
                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: scannerFocused ? '#10B981' : '#9CA3AF', fontSize: 20 }}>barcode</span>
                    <input
                      ref={scannerRef}
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onFocus={(e) => {
                        setScannerFocused(true);
                        e.target.select();
                      }}
                      onBlur={() => setScannerFocused(false)}
                      onClick={(e) => e.target.select()}
                      placeholder="Scan Book Barcode (BKXXX / ISBN)..."
                      className="w-full py-2.5 pl-10 pr-3 text-sm rounded-xl outline-none transition-all font-mono font-bold"
                      style={{ 
                        backgroundColor: '#F9FAFB', 
                        border: scannerFocused ? '1px solid #10B981' : '1px solid #E5E7EB',
                        color: '#1a1245'
                      }}
                    />
                  </div>
                </form>

                {/* Feedback Messages */}
                {scanError && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {scanError}
                  </div>
                )}
                {scanSuccess && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    {scanSuccess}
                  </div>
                )}


                {/* Scanned History Row */}
                {scanLog.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last scanned in this session</p>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {scanLog.map((log, index) => (
                        <div key={index} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap"
                          style={{ 
                            backgroundColor: log.type === 'member' ? '#E0E7FF' : log.type === 'success' ? '#D1FAE5' : '#FFFBEB',
                            color: log.type === 'member' ? '#4338CA' : log.type === 'success' ? '#065F46' : '#B45309',
                            border: log.type === 'member' ? '1px solid #C7D2FE' : log.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                          }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                            {log.type === 'member' ? 'person' : log.type === 'success' ? 'assignment_turned_in' : 'menu_book'}
                          </span>
                          <span className="font-semibold">{log.text}</span>
                          <span className="text-[8px] opacity-60">@{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                      {multipleBorrowers.length > 0 && !selectedMember
                        ? `Multiple Borrowers (${multipleBorrowers.length})`
                        : selectedMember ? `${activeBorrows.length} book(s)` : 'Active Borrowings'}
                    </h2>
                  </div>

                  {multipleBorrowers.length > 0 && !selectedMember ? (
                    <div className="space-y-2 overflow-y-auto pr-1 animate-fadeIn" style={{ maxHeight: '340px' }}>
                      <style>{`
                        @keyframes fadeIn {
                          from { opacity: 0; transform: translateY(-4px); }
                          to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fadeIn {
                          animation: fadeIn 0.18s ease-out forwards;
                        }
                      `}</style>
                      <div className="p-2.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/20 text-xs mb-2 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-amber-800">Scanned: "{scannedBook.title}"</span>
                          <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Select borrower returning this copy:</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setMultipleBorrowers([]); setScannedBook(null); }}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-2">
                        {multipleBorrowers.map((tx) => {
                          const borrower = tx.user || {};
                          const isOverdue = new Date(tx.dueDate) < new Date();
                          return (
                            <button
                              key={tx._id}
                              type="button"
                              onClick={async () => {
                                const bBook = scannedBook;
                                setMultipleBorrowers([]);
                                setScannedBook(null);
                                if (autoSubmit) {
                                  await performReturnDirectly(borrower._id, bBook._id, bBook.title, borrower.name);
                                } else {
                                  setSelectedMember(borrower);
                                  await fetchBorrows(borrower._id);
                                  setSelectedBorrow(tx);
                                }
                              }}
                              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-400 hover:bg-amber-50/30 transition-all text-left animate-fadeIn"
                              style={{ backgroundColor: '#F9FAFB' }}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">{borrower.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  ID: {borrower.memberId} {borrower.grade ? `• Gr.${borrower.grade.replace('Grade ', '')}-${borrower.class || ''}` : ''}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end flex-shrink-0 ml-2">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isOverdue ? 'text-red-600 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                                  {isOverdue ? 'Overdue' : 'Active'}
                                </span>
                                <span className="text-[9px] text-slate-400 mt-1">Due: {new Date(tx.dueDate).toLocaleDateString()}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <ActiveBorrowsList
                      borrows={activeBorrows}
                      selectedMember={selectedMember}
                      selectedBorrow={selectedBorrow}
                      onSelect={setSelectedBorrow}
                      maxHeight="340px"
                    />
                  )}
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
                              Borrowed: <span className="font-semibold" style={{ color: '#374151' }}>{new Date(selectedBorrow.borrowDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
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

                      {/* Overdue Warnings format */}
                      {(() => {
                        const diffTime = new Date(returnDate) - new Date(selectedBorrow.dueDate);
                        const days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                        const fine = days * 10;
                        if (days > 0) {
                          return (
                            <div className="mt-3 p-3 rounded-xl border flex items-start gap-2.5 bg-red-50/50 border-red-200 animate-fadeIn">
                              <span className="material-symbols-outlined text-red-600 mt-0.5" style={{ fontSize: 18 }}>warning</span>
                              <div className="text-xs">
                                <p className="font-extrabold text-red-700">Overdue Return Warning</p>
                                <p className="text-red-600 mt-0.5 font-medium">
                                  This return is <span className="font-bold">{days} days overdue</span>. 
                                  An automated overdue fine of <span className="font-extrabold text-red-700 bg-red-100/50 px-1.5 py-0.5 rounded">LKR {fine}.00</span> will be generated upon return.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
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

          {/* Success Modal Overlay */}
          {showSuccessModal && returnedDetails && (
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
                {/* Elegant top background shape */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500" />
                
                {/* Checkmark icon */}
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 mt-2 animate-bounce">
                  <span className="material-symbols-outlined text-4xl font-bold">assignment_turned_in</span>
                </div>

                <h3 className="text-xl font-extrabold mb-1" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
                  Book Returned Successfully!
                </h3>
                <p className="text-slate-400 text-xs mb-5">Return transaction completed and recorded</p>

                {/* Details Box */}
                <div className="w-full rounded-2xl p-4 mb-6 border border-slate-100 bg-slate-50/50 flex flex-col gap-3.5 text-left text-xs">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>person</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Returned By</div>
                      <div className="font-bold text-slate-800 truncate">{returnedDetails.member.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{returnedDetails.member.memberId || '—'}</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-200" />

                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>menu_book</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Book Details</div>
                      <div className="font-bold text-slate-800 truncate">{returnedDetails.book.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Catalog ID: {returnedDetails.book.bookId || '—'}</div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200" />

                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-400 mt-0.5" style={{ fontSize: 18 }}>event</span>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Returned</div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {new Date(returnedDetails.returnDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Overdue/Fine info */}
                  {returnedDetails.overdueDays > 0 && (
                    <>
                      <div className="border-t border-dashed border-slate-200" />
                      <div className="flex gap-3 p-3 rounded-xl bg-red-50 border border-red-150 text-left animate-fadeIn">
                        <span className="material-symbols-outlined text-red-600 mt-0.5" style={{ fontSize: 20 }}>warning</span>
                        <div className="text-xs">
                          <div className="font-extrabold text-red-800 uppercase tracking-wider text-[10px]">Overdue Fine Charged</div>
                          <div className="font-extrabold text-red-600 text-sm mt-0.5">
                            LKR {returnedDetails.overdueDays * 10}.00 ({returnedDetails.overdueDays} days late)
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Billed and added to the borrower's account status.</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Close Button */}
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      setReturnedDetails(null);
                      if (scannerRef.current) {
                        scannerRef.current.focus();
                      }
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
