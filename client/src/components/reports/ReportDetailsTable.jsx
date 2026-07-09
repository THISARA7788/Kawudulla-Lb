import React from 'react';

export default function ReportDetailsTable({ reportType, reportData }) {
  if (!reportData) return null;

  if (reportType === 'circulation') {
    const txns = reportData.transactions || [];
    return (
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
        {txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>sync_alt</span>
            <p className="text-sm font-medium">No circulation records for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0', position: 'sticky', top: 0, backgroundColor: '#fff' }}>
                  {['TRX ID', 'Member ID', 'Member', 'Book ID', 'Book', 'Issue Date', 'Due Date', 'Status'].map((h) => (
                    <th key={h} className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => {
                  const isOverdue = t.status === 'overdue' || (!t.returnDate && new Date(t.dueDate) < new Date());
                  const wasReturnedOverdue = t.returnDate && t.overdueDays > 0;
                  const daysOverdue = isOverdue
                    ? Math.floor((Date.now() - new Date(t.dueDate)) / 86400000)
                    : (wasReturnedOverdue ? t.overdueDays : 0);

                  let badge;
                  if (isOverdue) {
                    badge = { bg: '#fee2e2', c: '#b31b25', text: `Overdue (${daysOverdue}d)` };
                  } else if (wasReturnedOverdue) {
                    badge = { bg: '#fee2e2', c: '#b31b25', text: `Returned (Overdue ${daysOverdue}d)` };
                  } else if (t.status === 'returned') {
                    badge = { bg: '#dcfce7', c: '#166534', text: 'Returned' };
                  } else {
                    badge = { bg: '#dbeafe', c: '#1e40af', text: 'Active' };
                  }

                  return (
                    <tr key={t._id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                      <td className="py-2 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{t.transactionId || '—'}</td>
                      <td className="py-2 px-4 text-xs font-mono font-bold" style={{ color: '#4062BB' }}>{t.user?.memberId || '—'}</td>
                      <td className="py-2 px-4 text-xs font-semibold" style={{ color: '#2C2C3E' }}>{t.user?.name || '—'}</td>
                      <td className="py-2 px-4 text-xs font-mono font-bold" style={{ color: '#166534' }}>{t.book?.bookId || '—'}</td>
                      <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{t.book?.title || '—'}</td>
                      <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{new Date(t.issueDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="py-2 px-4 text-xs font-semibold" style={{ color: (isOverdue || wasReturnedOverdue) ? '#b31b25' : '#595c5e' }}>
                        {new Date(t.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: badge.bg, color: badge.c }}>
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'members') {
    const members = reportData.members || [];
    return (
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>group_off</span>
            <p className="text-sm font-medium">No members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  {['Member ID', 'Name', 'Email', 'Role', 'Grade', 'Active Borrows', 'Total Borrows'].map((h) => (
                    <th key={h} className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m._id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                    <td className="py-2 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{m.memberId}</td>
                    <td className="py-2 px-4 text-xs font-semibold" style={{ color: '#2C2C3E' }}>{m.name}</td>
                    <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{m.email}</td>
                    <td className="py-2 px-4 text-xs uppercase">{m.role}</td>
                    <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{m.grade || '—'}</td>
                    <td className="py-2 px-4 text-xs font-bold" style={{ color: m.activeBorrows > 0 ? '#b31b25' : '#166534' }}>{m.activeBorrows}</td>
                    <td className="py-2 px-4 text-xs font-bold" style={{ color: '#1a1245' }}>{m.totalBorrows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'popular-books') {
    const popular = reportData.popular || [];
    const categories = reportData.categories || [];
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1245' }}>Most Borrowed Books</h3>
          {popular.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center" style={{ color: '#94a3b8' }}>No borrowing records</p>
          ) : popular.map((p, i) => (
            <div key={p.book?.bookId || i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: i < 3 ? '#1a1245' : '#e0e0e0', color: i < 3 ? '#fff' : '#666' }}>{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold truncate max-w-xs" style={{ color: '#2C2C3E' }}>{p.book?.title}</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>{p.book?.author}</p>
                </div>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: '#1a1245' }}>{p.count} borrows</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1245' }}>Category Distribution</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center" style={{ color: '#94a3b8' }}>No categories found</p>
          ) : categories.map((c) => (
            <div key={c._id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <span className="text-sm" style={{ color: '#2C2C3E' }}>{c._id}</span>
              <span className="text-sm font-bold" style={{ color: '#1a1245' }}>{c.count} books</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reportType === 'fines') {
    const fineList = reportData.fines || [];
    return (
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
        {fineList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>payments</span>
            <p className="text-sm font-medium">No fine records for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  {['TRX ID', 'Member ID', 'Member', 'Book ID', 'Book', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fineList.map((f) => {
                  const sBadge = { unpaid: { bg: '#fef9c3', c: '#854d0e' }, paid: { bg: '#dcfce7', c: '#166534' }, waived: { bg: '#ece9f8', c: '#5b51d0' } }[f.status] || { bg: '#f0f0f0', c: '#666' };
                  return (
                    <tr key={f._id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                      <td className="py-2 px-4 text-xs font-mono" style={{ color: '#94a3b8' }}>{f.transaction?.transactionId || '—'}</td>
                      <td className="py-2 px-4 text-xs font-mono font-bold" style={{ color: '#4062BB' }}>{f.user?.memberId || '—'}</td>
                      <td className="py-2 px-4 text-xs font-semibold" style={{ color: '#2C2C3E' }}>{f.user?.name || ''}</td>
                      <td className="py-2 px-4 text-xs font-mono font-bold" style={{ color: '#166534' }}>{f.book?.bookId || '—'}</td>
                      <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{f.book?.title || ''}</td>
                      <td className="py-2 px-4 text-xs font-bold" style={{ color: '#1a1245' }}>{f.amount.toFixed(2)}</td>
                      <td className="py-2 px-4"><span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: sBadge.bg, color: sBadge.c }}>{f.status}</span></td>
                      <td className="py-2 px-4 text-xs" style={{ color: '#595c5e' }}>{new Date(f.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return null;
}
