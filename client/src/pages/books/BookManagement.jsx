import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import BookTable from '../../components/books/BookTable';
import BookGrid from '../../components/books/BookGrid';
import BookFormModal from '../../components/books/BookFormModal';

const CATEGORIES = ['Fiction', 'Science', 'History', 'Math', 'Reference', 'Technology', 'Biography', 'Other'];

const emptyForm = {
  title: '',
  author: '',
  isbn: '',
  category: 'Fiction',
  description: '',
  totalCopies: 1,
  publisher: '',
  publishedYear: '',
  coverImageUrl: '',
  status: 'Available',
};

export default function BookManagement() {
  const { user, token } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('bookId');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('book_catalog_view_mode') || 'table');
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [bookToDelete, setBookToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  const fetchBooks = async (q = '') => {
    try {
      setLoading(true);
      const res = await api.get('/library/books', { params: { search: q || undefined } });
      setBooks(res.data.books || []);
    } catch (err) {
      console.error('Fetch books error:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('book_catalog_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) return;

      if (showModal) return;

      if (
        searchInputRef.current &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.tagName !== 'SELECT'
      ) {
        searchInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showModal]);

  const categories = ['All', ...new Set(books.map((b) => b.category))];

  const filtered = books.filter((b) => {
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase())) ||
      (b.bookId && b.bookId.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'All' || b.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    let compareVal = 0;
    if (sortBy === 'title') {
      compareVal = a.title.localeCompare(b.title);
    } else if (sortBy === 'author') {
      compareVal = a.author.localeCompare(b.author);
    } else if (sortBy === 'copies') {
      compareVal = (a.availableCopies || 0) - (b.availableCopies || 0);
    } else if (sortBy === 'bookId') {
      compareVal = (a.bookId || '').localeCompare(b.bookId || '');
    }
    return sortOrder === 'asc' ? compareVal : -compareVal;
  });

  const itemsPerPage = 30;
  const totalPages = Math.ceil(sortedAndFiltered.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAndFiltered.slice(indexOfFirstItem, indexOfLastItem);

  const openAdd = () => {
    setEditingBook(null);
    setForm(emptyForm);
    setCustomCategory('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || 'Fiction',
      description: book.description || '',
      totalCopies: book.totalCopies || 1,
      publisher: book.publisher || '',
      publishedYear: book.publishedYear || '',
      coverImageUrl: book.coverImageUrl || '',
      status: book.status || 'Available',
    });
    setCustomCategory(!CATEGORIES.includes(book.category) ? book.category : '');
    setForm((prev) => ({ ...prev, category: !CATEGORIES.includes(book.category) ? 'Other' : book.category }));
    setError('');
    setShowModal(true);
  };

  const handleDelete = (id) => {
    const book = books.find((b) => b._id === id);
    if (book) {
      setBookToDelete(book);
    }
  };

  const executeDelete = async () => {
    if (!bookToDelete) return;
    try {
      await api.delete(`/library/books/${bookToDelete._id}`);
      setBooks((prev) => prev.filter((b) => b._id !== bookToDelete._id));
      setBookToDelete(null);
      showToast(`Book "${bookToDelete.title}" deleted successfully!`, 'delete');
    } catch (err) {
      alert('Failed to delete book.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!form.title || !form.author || !form.category) {
      setError('Title, author, and category are required.');
      setSaving(false);
      return;
    }

    const body = {
      ...form,
      category: form.category === 'Other' ? (customCategory.trim() || form.category) : form.category,
      totalCopies: Number(form.totalCopies) || 1,
      publishedYear: form.publishedYear ? Number(form.publishedYear) : undefined,
    };

    try {
      if (editingBook) {
        const res = await api.put(`/library/books/${editingBook._id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBooks((prev) => prev.map((b) => (b._id === editingBook._id ? res.data.book : b)));
        showToast('Book details updated successfully!');
      } else {
        const res = await api.post('/books', body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBooks((prev) => [res.data.book, ...prev]);
        showToast('New book cataloged successfully!');
      }
      setShowModal(false);
      setForm(emptyForm);
      setCustomCategory('');
      setEditingBook(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <DashboardLayout>
      {/* Control Panel: Search, Category, Sort, View Mode Toggle, and Actions */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch xl:items-center justify-between" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200" style={{ color: searchFocused ? '#6366f1' : '#94a3b8', fontSize: 20 }}>
            {searchFocused ? 'qr_code_scanner' : 'search'}
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search catalog by title, author, ISBN, or ID..."
            className="w-full py-2.5 pl-10 pr-4 text-sm rounded-2xl outline-none border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white shadow-sm"
          />
        </div>
        
        {/* Dropdowns, toggle and Add button */}
        <div className="flex flex-wrap xl:flex-nowrap gap-3 items-center justify-end">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl py-2 px-3 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-sm" style={{ fontSize: 18 }}>filter_list</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold outline-none bg-transparent text-slate-700 cursor-pointer pr-4"
              style={{ minWidth: 100 }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-205 rounded-2xl py-2 px-3 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-sm" style={{ fontSize: 18 }}>swap_vert</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold outline-none bg-transparent text-slate-700 cursor-pointer pr-4"
              style={{ minWidth: 110 }}
            >
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="copies">Copies Stock</option>
              <option value="bookId">Book ID</option>
            </select>
          </div>

          {/* Sort Direction Toggle Button */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center bg-white border border-slate-205 hover:border-slate-350 hover:bg-slate-50/50 rounded-2xl p-2.5 shadow-sm text-slate-500 hover:text-slate-700 transition-all active:scale-95 cursor-pointer"
            title={sortOrder === 'asc' ? 'Ascending Order (Click for Descending)' : 'Descending Order (Click for Ascending)'}
          >
            <span 
              className="material-symbols-outlined transition-transform duration-300"
              style={{ 
                fontSize: 18, 
                transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)' 
              }}
            >
              arrow_upward
            </span>
          </button>

          {/* View Toggle Buttons */}
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-2xl shadow-inner select-none animate-fadeIn">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-750'
              }`}
              style={{ color: viewMode === 'grid' ? '#1E2A4A' : undefined }}
              title="Grid View"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${
                viewMode === 'table'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-750'
              }`}
              style={{ color: viewMode === 'table' ? '#1E2A4A' : undefined }}
              title="Table List View"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>view_list</span>
            </button>
          </div>

          {/* Add New Book Action */}
          {user?.role === 'librarian' && (
            <button
              onClick={openAdd}
              className="px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:opacity-95 hover:shadow-lg transition-all whitespace-nowrap active:scale-95"
              style={{ backgroundColor: '#1a1245', color: '#fff', boxShadow: '0 4px 12px rgba(26,18,69,0.2)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              Add New Book
            </button>
          )}
        </div>
      </div>

      {/* Book List/Grid Container */}
      {viewMode === 'grid' ? (
        <BookGrid
          loading={loading}
          filtered={currentItems}
          openEdit={openEdit}
          handleDelete={handleDelete}
          openAdd={openAdd}
          role={user?.role}
        />
      ) : (
        <div className="rounded-2xl border overflow-hidden bg-white shadow-sm border-slate-100 animate-fadeIn">
          <BookTable
            loading={loading}
            filtered={currentItems}
            openEdit={openEdit}
            handleDelete={handleDelete}
            openAdd={openAdd}
            role={user?.role}
          />
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm gap-4 select-none animate-fadeIn" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="text-xs font-bold text-slate-400">
            Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedAndFiltered.length)} of {sortedAndFiltered.length} books
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-all border flex items-center justify-center cursor-pointer active:scale-95 ${
                  currentPage === p
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-750 hover:bg-slate-55'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
        </div>
      )}

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
            toast.type === 'delete' 
              ? 'bg-rose-600 border-rose-500/50' 
              : 'bg-emerald-600 border-emerald-500/50'
          }`}>
            <span className="material-symbols-outlined text-white font-bold" style={{ fontSize: 18 }}>
              {toast.type === 'delete' ? 'delete_forever' : 'check_circle'}
            </span>
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      <BookFormModal
        showModal={showModal}
        editingBook={editingBook}
        form={form}
        saving={saving}
        error={error}
        customCategory={customCategory}
        setCustomCategory={setCustomCategory}
        handleChange={handleChange}
        handleSave={handleSave}
        setShowModal={setShowModal}
        CATEGORIES={CATEGORIES}
        onImportComplete={fetchBooks}
      />

      {/* Custom Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md mx-4 shadow-2xl transition-all border border-slate-150 animate-fadeIn" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4 border border-rose-100">
                <span className="material-symbols-outlined font-black" style={{ fontSize: 28 }}>delete_forever</span>
              </div>
              <h3 className="text-lg font-black text-slate-800" style={{ fontFamily: "'Manrope', sans-serif" }}>Delete Catalog Item?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-850">"{bookToDelete.title}"</strong> by <strong>{bookToDelete.author}</strong>? This action cannot be undone and will remove the item from the catalog.
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
