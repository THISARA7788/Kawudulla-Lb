import React from 'react';

export default function RecentTransactionsList({
  transactions = [],
  type = 'issues', // 'issues' | 'returns'
  maxHeight = '240px'
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-xs text-center py-3" style={{ color: '#9CA3AF' }}>
        No recent {type}
      </p>
    );
  }

  return (
    <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight }}>
      {transactions.map((tx, idx) => {
        const isOverdue = new Date(tx.dueDate) < new Date();
        const dueSoon = !isOverdue && new Date(tx.dueDate) - Date.now() < 3 * 86400000;
        const book = tx.book || {};
        const user = tx.user || {};

        if (type === 'issues') {
          return (
            <div
              key={tx._id || idx}
              className="p-2 rounded-lg"
              style={{
                backgroundColor: isOverdue ? '#FEF2F2' : dueSoon ? '#FFFBEB' : '#F9FAFB',
                border: '1px solid #F3F4F6'
              }}
            >
              <div className="text-xs font-semibold truncate" style={{ color: '#1a1245' }}>
                {book.title || 'Unknown Book'}
              </div>
              <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                {user.name || 'Unknown User'}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  Due: {new Date(tx.dueDate).toLocaleDateString()}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  isOverdue ? 'text-red-600 bg-red-100' :
                  dueSoon ? 'text-amber-700 bg-amber-100' :
                  'text-green-700 bg-green-100'
                }`}>
                  {isOverdue ? 'Overdue' : dueSoon ? 'Due Soon' : 'Active'}
                </span>
              </div>
              {tx.notes && (
                <div className="mt-1.5 pt-1 border-t border-dashed border-slate-200 text-[9px] text-slate-500 flex items-start gap-1">
                  <span className="material-symbols-outlined text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>notes</span>
                  <span className="italic truncate">{tx.notes}</span>
                </div>
              )}
            </div>
          );
        }

        // Returns type
        return (
          <div
            key={tx._id || idx}
            className="p-2 rounded-lg"
            style={{ backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}
          >
            <div className="text-xs font-semibold truncate" style={{ color: '#1a1245' }}>
              {book.title || 'Unknown Book'}
            </div>
            <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
              {user.name || 'Unknown User'}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                Returned: {tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : '—'}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-green-700 bg-green-100">
                  Returned
                </span>
                {tx.overdueDays > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-red-600 bg-red-100">
                    Overdue {tx.overdueDays}d
                  </span>
                )}
              </div>
            </div>
            {tx.notes && (
              <div className="mt-1.5 pt-1 border-t border-dashed border-slate-200 text-[9px] text-slate-500 flex items-start gap-1">
                <span className="material-symbols-outlined text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>notes</span>
                <span className="italic truncate">{tx.notes}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
