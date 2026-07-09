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
export default function BookTable({ 
  loading, 
  filtered, 
  openEdit, 
  handleDelete, 
  openAdd, 
  role, 
  onRowClick,
  selectedBookIds = [],
  isSelectionMode = false,
  overdueBookIds = []
}) {
  
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
  const columns = [];
  if (isSelectionMode) {
    columns.push('');
  }
  columns.push('Book ID', 'Cover', 'Title', 'Author', 'ISBN', 'Category', 'Copies', 'Status', 'Added');
  if (role === 'librarian') {
    columns.push(''); // For actions column
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Overdue':
        return { backgroundColor: 'rgba(244, 63, 94, 0.12)', color: '#e11d48', border: '1px solid rgba(244, 63, 94, 0.25)' };
      case 'Borrowed':
        return { backgroundColor: 'rgba(251, 146, 60, 0.12)', color: '#ea580c', border: '1px solid rgba(251, 146, 60, 0.25)' };
      case 'Reserved':
        return { backgroundColor: 'rgba(248, 113, 113, 0.12)', color: '#dc2626', border: '1px solid rgba(248, 113, 113, 0.25)' };
      case 'Available':
      default:
        return { backgroundColor: 'rgba(74, 222, 128, 0.12)', color: '#166534', border: '1px solid rgba(74, 222, 128, 0.25)' };
    }
  };

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'Fiction':
        return { backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)' };
      case 'Science':
        return { backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.2)' };
      case 'History':
        return { backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.2)' };
      case 'Math':
        return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'Reference':
        return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' };
      case 'Technology':
        return { backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.2)' };
      case 'Biography':
        return { backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.2)' };
      default:
        return { backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.2)' };
    }
  };

  const getGradientForCategory = (category) => {
    switch (category) {
      case 'Fiction':
        return 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
      case 'Science':
        return 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
      case 'History':
        return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
      case 'Math':
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      case 'Reference':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'Technology':
        return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      case 'Biography':
        return 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)';
      default:
        return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm align-middle" style={{ fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
            {columns.map((h, idx) => (
              <th
                key={idx}
                className="py-3.5 px-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider bg-slate-50/50"
                style={{ borderBottom: '2px solid #f1f5f9' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {filtered.map((book) => {
            const isSelected = selectedBookIds.includes(book._id);
            const isOverdue = overdueBookIds.includes(book._id);
            const dynamicStatus = isOverdue
              ? 'Overdue'
              : (book.status === 'Reserved' ? 'Reserved' : (book.availableCopies === 0 ? 'Borrowed' : 'Available'));
            return (
              <tr 
                key={book._id} 
                onClick={() => onRowClick && onRowClick(book)}
                className={`transition-colors cursor-pointer ${
                  isSelected ? 'bg-indigo-50/20 hover:bg-indigo-50/30' : 'hover:bg-slate-50/60'
                }`} 
                style={{ borderBottom: '1px solid #f1f5f9' }}
                title={isSelectionMode ? 'Click to select book' : 'Click to view full book details profile'}
              >
                {isSelectionMode && (
                  <td className="py-3 px-4 select-none">
                    <span className="material-symbols-outlined align-middle" style={{ 
                      fontSize: 20, 
                      color: isSelected ? '#16a34a' : '#94a3b8',
                      fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0"
                    }}>
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </td>
                )}
                
                {/* Unique Book Barcode/ID */}
                <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>
                  {book.bookId || '—'}
                </td>
   
                {/* Book Cover Thumbnail */}
                <td className="py-3 px-4">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-9 h-12 object-cover rounded shadow-sm hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = ''; // Clear source to fallback to visual representation
                      }}
                    />
                  ) : (
                    <div
                      className="w-9 h-12 rounded shadow-sm flex flex-col items-center justify-center text-white select-none text-[8px] font-bold overflow-hidden"
                      style={{ background: getGradientForCategory(book.category) }}
                      title={book.title}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>menu_book</span>
                      <span className="text-[6px] tracking-tighter truncate w-full px-0.5 text-center">{book.title.slice(0, 3).toUpperCase()}</span>
                    </div>
                  )}
                </td>
                
                {/* Title */}
                <td className="py-3 px-4 font-bold text-slate-800" style={{ maxWidth: 220 }}>
                  <div className="truncate" title={book.title}>{book.title}</div>
                </td>
   
                {/* Author */}
                <td className="py-3 px-4 text-slate-650 font-medium">
                  <div className="truncate" title={book.author} style={{ maxWidth: 150 }}>{book.author}</div>
                </td>
                
                {/* Optional ISBN string */}
                <td className="py-3 px-4 text-xs font-mono text-slate-400">{book.isbn || '—'}</td>
                
                {/* Categorization pill */}
                <td className="py-3 px-4">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border" style={getCategoryStyle(book.category)}>
                    {book.category}
                  </span>
                </td>
                
                {/* Copy counts (Turns Red when copies are zero/fully checked out, else Green) */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-1 bg-slate-50 text-[11px] font-extrabold border border-slate-100 rounded-lg text-slate-700 select-none whitespace-nowrap">
                    <span style={{ color: (book.availableCopies ?? 0) > 0 ? '#15803d' : '#b91c1c' }}>{book.availableCopies ?? 0}</span>
                    <span className="text-slate-400 font-semibold">&nbsp;/&nbsp;{book.totalCopies ?? 0}</span>
                  </span>
                </td>
   
                {/* Book Circulation Status */}
                <td className="py-3 px-4">
                  <span
                    className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-sm"
                    style={getStatusStyle(dynamicStatus)}
                  >
                    {dynamicStatus}
                  </span>
                </td>
                
                {/* Book Added Date */}
                <td className="py-3 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {book.createdAt ? new Date(book.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                
                {/* Interactive buttons */}
                {role === 'librarian' && (
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {/* Edit Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(book); }}
                      className="mr-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      style={{ color: '#4F5B7D' }}
                      title="Edit"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(book._id); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-red-700 transition-colors"
                      style={{ color: '#b91c1c' }}
                      title="Delete"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
