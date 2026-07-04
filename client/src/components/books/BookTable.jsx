import React from 'react';

export default function BookTable({ loading, filtered, openEdit, handleDelete, openAdd }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>
        Loading books...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>search_off</span>
        <p className="text-sm font-medium">No books found</p>
        <button onClick={openAdd} className="text-xs mt-2 font-semibold" style={{ color: '#1a1245' }}>
          + Add your first book
        </button>
      </div>
    );
  }

  return (
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
  );
}
