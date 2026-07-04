import React from 'react';

export default function ActiveBorrowsList({
  borrows = [],
  selectedMember,
  selectedBorrow,
  onSelect, // If provided, behaves as an interactive button list. If not, behaves as read-only.
  maxHeight = '340px'
}) {
  if (!selectedMember) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined mx-auto block mb-2" style={{ color: '#D1D5DB', fontSize: 40 }}>person_outline</span>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>Select a member to view borrowings</p>
      </div>
    );
  }

  if (borrows.length === 0) {
    return (
      <div className="text-center py-6">
        <span className="material-symbols-outlined mx-auto block mb-1" style={{ color: '#D1D5DB', fontSize: 36 }}>check_circle</span>
        <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>No active borrowings</p>
      </div>
    );
  }

  const isInteractive = typeof onSelect === 'function';

  return (
    <div className="space-y-2 overflow-y-auto" style={{ maxHeight }}>
      {borrows.map((b, i) => {
        const isOverdue = new Date(b.dueDate) < new Date();
        const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(b.dueDate)) / 86400000) : 0;
        const book = b.book || {};
        const isSelected = selectedBorrow && selectedBorrow.book?._id === book._id;

        if (isInteractive) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(isSelected ? null : b)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all border-2 ${
                isSelected ? 'border-amber-400' : 'border-gray-100 hover:border-amber-200'
              }`}
              style={{ backgroundColor: isSelected ? '#FFFBEB' : '#FAFBFC' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isOverdue ? '#FEE2E2' : '#FEF3C7' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: isOverdue ? '#DC2626' : '#F59E0B' }}>menu_book</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: '#1a1245' }}>{book.title || 'Book'}</div>
                <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                  {book.author} • {book.bookId || '—'} • {book.category || ''}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOverdue ? 'text-red-600 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                    {isOverdue ? `Overdue (${daysOverdue}d)` : 'Active'}
                  </span>
                </div>
                <div className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>
                  Due: {new Date(b.dueDate).toLocaleDateString()}
                </div>
              </div>
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                isSelected ? 'border-amber-400 bg-amber-400' : 'border-gray-300'
              }`}>
                {isSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>}
              </span>
            </button>
          );
        }

        // Read-only compact mode
        return (
          <div key={i} className="p-2 rounded-lg text-xs" style={{ backgroundColor: isOverdue ? '#FEF2F2' : '#F9FAFB' }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold truncate" style={{ color: '#1a1245' }}>{book.title || 'Book'}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${isOverdue ? 'text-red-600 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                {isOverdue ? 'Overdue' : 'Active'}
              </span>
            </div>
            <div className="mt-0.5" style={{ color: '#9CA3AF' }}>Due: {new Date(b.dueDate).toLocaleDateString()}</div>
          </div>
        );
      })}
    </div>
  );
}
