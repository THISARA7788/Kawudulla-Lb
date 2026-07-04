import React from 'react';

export default function BookFormModal({
  showModal,
  editingBook,
  form,
  saving,
  error,
  customCategory,
  setCustomCategory,
  handleChange,
  handleSave,
  setShowModal,
  CATEGORIES
}) {
  if (!showModal) return null;

  return (
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
  );
}
