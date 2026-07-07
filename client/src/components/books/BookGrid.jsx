import React from 'react';

/**
 * Presentational component to render the grid view of books
 */
export default function BookGrid({ loading, filtered, openEdit, handleDelete, openAdd, role }) {
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <span className="material-symbols-outlined animate-spin mr-3 text-3xl" style={{ fontSize: 32 }}>progress_activity</span>
        <span className="text-base font-medium">Loading catalog cards...</span>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <span className="material-symbols-outlined mb-3" style={{ fontSize: 56, opacity: 0.25 }}>search_off</span>
        <p className="text-base font-semibold">No books match your selection</p>
        <p className="text-xs text-slate-400 mt-1">Try refining search query or category filters</p>
        {role === 'librarian' && (
          <button onClick={openAdd} className="text-xs mt-4 px-4 py-2 font-bold rounded-xl text-white transition-all" style={{ backgroundColor: '#1a1245', boxShadow: '0 2px 8px rgba(26,18,69,0.15)' }}>
            + Add New Book
          </button>
        )}
      </div>
    );
  }

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

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Borrowed':
        return { backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#ea580c', border: '1px solid rgba(251, 146, 60, 0.3)' };
      case 'Reserved':
        return { backgroundColor: 'rgba(248, 113, 113, 0.15)', color: '#dc2626', border: '1px solid rgba(248, 113, 113, 0.3)' };
      case 'Available':
      default:
        return { backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#166534', border: '1px solid rgba(74, 222, 128, 0.3)' };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
      {filtered.map((book) => {
        return (
          <div
            key={book._id}
            className="group relative flex flex-col rounded-2xl bg-white border border-slate-100 p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-100 hover:border-slate-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Cover Image Container */}
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-sm bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center transform translate-z-0">
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  className="w-full h-full object-contain p-1.5 rounded-xl transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = ''; // Fall back to visual representation
                  }}
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col justify-between p-4 text-white relative rounded-xl"
                  style={{ background: getGradientForCategory(book.category) }}
                >
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-white/50" style={{ fontSize: 22 }}>book</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-sm tracking-wider">
                      {book.category}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 select-none">
                    <h4 className="text-sm font-bold line-clamp-3 leading-snug">{book.title}</h4>
                    <p className="text-[10px] text-white/70 truncate">by {book.author}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <span className="material-symbols-outlined" style={{ fontSize: 96 }}>menu_book</span>
                  </div>
                </div>
              )}

              {/* Action Overlay for Librarians */}
              {role === 'librarian' && (
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5 backdrop-blur-[2px] rounded-xl z-20">
                  <button
                    onClick={() => openEdit(book)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 transition-all transform scale-90 group-hover:scale-100 hover:scale-105 shadow-md flex items-center justify-center"
                    title="Edit Details"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(book._id)}
                    className="p-2 rounded-xl bg-white hover:bg-red-55 text-red-650 transition-all transform scale-90 group-hover:scale-100 hover:scale-105 shadow-md flex items-center justify-center"
                    style={{ color: '#b91c1c' }}
                    title="Delete Book"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Book Metadata details */}
            <div className="flex flex-col flex-1 mt-3.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-[9px] font-bold text-indigo-650/80 uppercase tracking-widest" style={{ color: '#4062BB' }}>
                  {book.category}
                </span>
                <span
                  className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border shadow-sm"
                  style={getStatusBadgeStyle(book.status || 'Available')}
                >
                  {book.status || 'Available'}
                </span>
              </div>
              
              <h3 className="text-sm font-bold text-slate-800 mt-1 line-clamp-1 leading-snug group-hover:text-[#1a1245] transition-colors" title={book.title}>
                {book.title}
              </h3>
              
              <p className="text-xs text-slate-500 mt-0.5 truncate" title={book.author}>
                by {book.author}
              </p>

              {/* Catalog Serial ID & Copies count */}
              <div className="flex items-center justify-between mt-3.5 text-[10px] font-bold text-slate-400 font-mono select-none border-t border-slate-50 pt-2.5">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontSize: 13 }}>tag</span>
                  <span>{book.bookId || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontSize: 13 }}>import_contacts</span>
                  <span style={{ color: (book.availableCopies ?? 0) > 0 ? '#166534' : '#b91c1c' }}>
                    {book.availableCopies ?? 0} / {book.totalCopies ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
