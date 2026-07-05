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
        {role === 'librarian' && (
          <button onClick={openAdd} className="text-xs mt-2 font-semibold hover:underline" style={{ color: '#1a1245' }}>
            + Add your first book
          </button>
        )}
      </div>
    );
  }

  // Setup table columns (incorporating Cover and Status)
  const columns = ['Book ID', 'Cover', 'Title', 'Author', 'ISBN', 'Category', 'Copies', 'Status'];
  if (role === 'librarian') {
    columns.push(''); // For actions column
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Borrowed':
        return { backgroundColor: '#ffedd5', color: '#ea580c' }; // Orange
      case 'Reserved':
        return { backgroundColor: '#fee2e2', color: '#dc2626' }; // Red
      case 'Available':
      default:
        return { backgroundColor: '#dcfce7', color: '#166534' }; // Green
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm align-middle">
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
        
        <tbody>
          {filtered.map((book) => (
            <tr key={book._id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
              
              {/* Unique Book Barcode/ID */}
              <td className="py-3.5 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>
                {book.bookId || '—'}
              </td>

              {/* Book Cover Thumbnail */}
              <td className="py-3.5 px-4">
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="w-8 h-11 object-cover rounded shadow-sm hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = ''; // Clear source to fallback to visual representation
                    }}
                  />
                ) : (
                  <div className="w-8 h-11 bg-slate-100 border border-dashed rounded flex flex-col items-center justify-center text-slate-400" title="No Cover Available">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>image</span>
                  </div>
                )}
              </td>
              
              {/* Title */}
              <td className="py-3.5 px-4 font-semibold text-slate-800" style={{ maxWidth: 220 }}>
                <div className="truncate" title={book.title}>{book.title}</div>
              </td>

              {/* Author */}
              <td className="py-3.5 px-4 text-slate-600">
                <div className="truncate" title={book.author} style={{ maxWidth: 150 }}>{book.author}</div>
              </td>
              
              {/* Optional ISBN string */}
              <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{book.isbn || '—'}</td>
              
              {/* Categorization pill */}
              <td className="py-3.5 px-4">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full" style={{
                  backgroundColor: '#e0e7ff',
                  color: '#4338ca',
                }}>
                  {book.category}
                </span>
              </td>
              
              {/* Copy counts (Turns Red when copies are zero/fully checked out, else Green) */}
              <td className="py-3.5 px-4">
                <span className="text-xs font-bold" style={{ color: book.availableCopies > 0 ? '#15803d' : '#b91c1c' }}>
                  {book.availableCopies} / {book.totalCopies}
                </span>
              </td>

              {/* Book Circulation Status */}
              <td className="py-3.5 px-4">
                <span
                  className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                  style={getStatusStyle(book.status || 'Available')}
                >
                  {book.status || 'Available'}
                </span>
              </td>
              
              {/* Interactive buttons */}
              {role === 'librarian' && (
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                    style={{ color: '#b91c1c' }}
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
