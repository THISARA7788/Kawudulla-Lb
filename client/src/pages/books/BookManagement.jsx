import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import BookTable from '../../components/books/BookTable';
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
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
  }, []);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await api.delete(`/library/books/${id}`);
      setBooks((prev) => prev.filter((b) => b._id !== id));
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
      } else {
        const res = await api.post('/books', body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBooks((prev) => [res.data.book, ...prev]);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
            Book Catalog
          </h1>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {user?.role === 'librarian'
              ? 'Manage the library catalog — add, edit, and remove books.'
              : 'Browse the library catalog — search for books and check availability.'}
          </p>
        </div>
        {user?.role === 'librarian' && (
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: '#1a1245', color: '#fff', boxShadow: '0 2px 8px rgba(26,18,69,0.15)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
            Add New Book
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, ISBN, or Book ID..."
            className="w-full py-2.5 pl-9 pr-4 text-sm rounded-xl outline-none"
            style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="py-2 px-3 text-sm rounded-xl outline-none"
          style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 120 }}
        >
          {categories.map((c) => (
            <option key={c} value={c} style={{ backgroundColor: '#fff', color: '#2C2C3E' }}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Book Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
        <BookTable
          loading={loading}
          filtered={filtered}
          openEdit={openEdit}
          handleDelete={handleDelete}
          openAdd={openAdd}
          role={user?.role}
        />
      </div>

      {/* Stats Row */}
      {!loading && (
        <div className="flex gap-4 mt-4">
          <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Total Books</p>
            <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{books.length}</p>
          </div>
          <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Showing</p>
            <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{filtered.length}</p>
          </div>
          <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Categories</p>
            <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{new Set(books.map((b) => b.category)).size}</p>
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
      />
    </DashboardLayout>
  );
}
