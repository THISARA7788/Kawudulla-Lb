import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

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
        const res = await api.post('/library/books', body, {
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
    <div className="flex min-h-screen" style={{ background: '#F5F3FC' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72" style={{ background: '#F5F3FC' }}>
        <TopBar />
        <main className="flex-1 pt-20 pb-4 overflow-y-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
                Book Management
              </h1>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Manage the library catalog — add, edit, and remove books.</p>
            </div>
            <button
              onClick={openAdd}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ backgroundColor: '#1a1245', color: '#fff', boxShadow: '0 2px 8px rgba(26,18,69,0.15)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              Add New Book
            </button>
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
            {loading ? (
              <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>
                Loading books...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>search_off</span>
                <p className="text-sm font-medium">No books found</p>
                <button onClick={openAdd} className="text-xs mt-2 font-semibold" style={{ color: '#1a1245' }}>
                  + Add your first book
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      {['Book ID', 'Title', 'Author', 'ISBN', 'Category', 'Copies', ''].map((h) => (
                        <th
                          key={h}
                          className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider"
                          style={{ borderBottom: '2px solid #f0f0f0' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((book) => (
                      <tr key={book._id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
                        <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>
                          {book.bookId || '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold" style={{ color: '#2C2C3E' }}>
                          {book.title}
                        </td>
                        <td className="py-3 px-4" style={{ color: '#595c5e' }}>{book.author}</td>
                        <td className="py-3 px-4 text-xs font-mono" style={{ color: '#94a3b8' }}>{book.isbn || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold uppercase px-2 py-1 rounded-full" style={{
                            backgroundColor: '#CAD6FF',
                            color: '#3E4A6C',
                          }}>
                            {book.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold" style={{ color: book.availableCopies > 0 ? '#166534' : '#b31b25' }}>
                            {book.availableCopies} / {book.totalCopies}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEdit(book)}
                            className="mr-2 p-1 rounded hover:bg-slate-100 transition-colors"
                            style={{ color: '#4F5B7D' }}
                            title="Edit"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(book._id)}
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                            style={{ color: '#b31b25' }}
                            title="Delete"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
        </main>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-2xl p-6 w-full max-w-lg mx-4"
            style={{ backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
                {editingBook ? 'Edit Book' : 'Add New Book'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {editingBook && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Book ID</label>
                  <input value={form.bookId || editingBook.bookId || ''} readOnly disabled
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: '#f0f0f0', border: '1px solid #e0e0e0', color: '#1a1245', fontWeight: 'bold' }}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Title *</label>
                <input name="title" value={form.title} onChange={handleChange} required
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Author *</label>
                <input name="author" value={form.author} onChange={handleChange} required
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>ISBN</label>
                  <input name="isbn" value={form.isbn} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Copies</label>
                  <input name="totalCopies" type="number" min="1" value={form.totalCopies} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Category *</label>
                  <select name="category" value={CATEGORIES.includes(form.category) ? form.category : 'Other'} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0', color: '#2C2C3E' }}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    {!CATEGORIES.includes(form.category) && <option value="Other">{form.category}</option>}
                  </select>
                  {(form.category === 'Other') && (
                    <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter category name" required
                      className="w-full mt-2 px-3 py-2 text-sm rounded-xl outline-none"
                      style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0', color: '#2C2C3E' }}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Published Year</label>
                  <input name="publishedYear" type="number" value={form.publishedYear} onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                    style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Publisher</label>
                <input name="publisher" value={form.publisher} onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows="3"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none"
                  style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: '#1a1245', color: '#fff', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : editingBook ? 'Update Book' : 'Add Book'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2"
                  style={{ borderColor: '#1a1245', color: '#1a1245' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
