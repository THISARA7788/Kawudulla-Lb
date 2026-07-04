import React from 'react';

export default function FineRow({ fine, onPay, onWaive, onDelete }) {
  const statusStyle = {
    unpaid: { bg: '#fef9c3', color: '#854d0e' },
    paid: { bg: '#dcfce7', color: '#166534' },
    waived: { bg: '#ece9f8', color: '#5b51d0' },
  }[fine.status] || { bg: '#f0f0f0', color: '#666' };

  return (
    <tr className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
      <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{fine.transaction?.transactionId || '—'}</td>
      <td className="py-3 px-4">
        <span className="text-xs font-semibold" style={{ color: '#1a1245' }}>{fine.user?.name || '—'}</span>
      </td>
      <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{fine.user?.memberId || '—'}</td>
      <td className="py-3 px-4 text-xs" style={{ color: '#595c5e' }}>{fine.book?.title || '—'} <span className="font-mono" style={{ color: '#94a3b8' }}>({fine.book?.bookId})</span></td>
      <td className="py-3 px-4 text-center font-semibold" style={{ color: '#b31b25' }}>{fine.daysOverdue}d</td>
      <td className="py-3 px-4 text-right font-bold" style={{ color: '#1a1245' }}>&#8360; {fine.amount.toFixed(2)}</td>
      <td className="py-3 px-4 text-center">
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>{fine.status}</span>
      </td>
      <td className="py-3 px-4 text-right">
        {fine.status === 'unpaid' && (
          <button onClick={() => onPay(fine)} className="mr-1 p-1 rounded hover:bg-slate-100" style={{ color: '#166534' }} title="Mark Paid">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
          </button>
        )}
        {fine.status === 'unpaid' && (
          <button onClick={() => onWaive(fine)} className="mr-1 p-1 rounded hover:bg-slate-100" style={{ color: '#2563eb' }} title="Waive Fine">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
          </button>
        )}
        <button onClick={() => onDelete(fine._id)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#b31b25' }} title="Delete">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
        </button>
      </td>
    </tr>
  );
}
