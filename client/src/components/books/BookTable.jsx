import React from 'react';

/**
 * Presentational component to render the table listing of books
 * 
 * @param {boolean} loading - Displays the rotating progress spinner when fetching books
 * @param {Array} filtered - The list of filtered books matching category or query inputs
 * @param {Function} openEdit - Triggers when clicking edit button; pre-populates forms
 * @param {Function} handleDelete - Triggers when clicking delete button; requests API deletion
 * @param {Function} openAdd - Triggered when clicking 'Add first book' empty state link
 */
export default function BookTable({ loading, filtered, openEdit, handleDelete, openAdd, role }) {
  
  // 1. Rendering the circular spinner when loading is true
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>
        Loading books...
      </div>
    );
  }

  // 2. Empty state layout displayed when book search query returns zero records
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>search_off</span>
        <p className="text-sm font-medium">No books found</p>
        {role === 'librarian' && (
          <button onClick={openAdd} className="text-xs mt-2 font-semibold" style={{ color: '#1a1245' }}>
            + Add your first book
          </button>
        )}
      </div>
    );
  }

  const columns = ['Book ID', 'Title', 'Author', 'ISBN', 'Category', 'Copies'];
  if (role === 'librarian') {
    columns.push(''); // For actions
  }

  // 3. Grid representation with horizontal scroll enabled for tablet/mobile screen viewports
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        
        {/* Table header headers */}
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
            {columns.map((h, idx) => (
              <th
                key={idx}
                className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider"
                style={{ borderBottom: '2px solid #f0f0f0' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Table rows matching filtered records */}
        <tbody>
          {filtered.map((book) => (
            <tr key={book._id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
              
              {/* Unique Book Barcode/ID */}
              <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>
                {book.bookId || '—'}
              </td>
              
              {/* Title & Author */}
              <td className="py-3 px-4 font-semibold" style={{ color: '#2C2C3E' }}>
                {book.title}
              </td>
              <td className="py-3 px-4" style={{ color: '#595c5e' }}>{book.author}</td>
              
              {/* Optional ISBN string */}
              <td className="py-3 px-4 text-xs font-mono" style={{ color: '#94a3b8' }}>{book.isbn || '—'}</td>
              
              {/* Categorization pill */}
              <td className="py-3 px-4">
                <span className="text-xs font-bold uppercase px-2 py-1 rounded-full" style={{
                  backgroundColor: '#CAD6FF',
                  color: '#3E4A6C',
                }}>
                  {book.category}
                </span>
              </td>
              
              {/* Copy counts (Turns Red when copies are zero/fully checked out, else Green) */}
              <td className="py-3 px-4">
                <span className="text-xs font-bold" style={{ color: book.availableCopies > 0 ? '#166534' : '#b31b25' }}>
                  {book.availableCopies} / {book.totalCopies}
                </span>
              </td>
              
              {/* Interactive buttons */}
              {role === 'librarian' && (
                <td className="py-3 px-4 text-right">
                  
                  {/* Edit Button */}
                  <button
                    onClick={() => openEdit(book)}
                    className="mr-2 p-1 rounded hover:bg-slate-100 transition-colors"
                    style={{ color: '#4F5B7D' }}
                    title="Edit"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(book._id)}
                    className="p-1 rounded hover:bg-slate-100 transition-colors"
                    style={{ color: '#b31b25' }}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
