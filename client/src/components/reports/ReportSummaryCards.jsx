import React from 'react';

export default function ReportSummaryCards({ reportType, reportData }) {
  if (!reportData) return null;

  if (reportType === 'circulation') {
    const s = reportData.summary || {};
    return (
      <div className="flex gap-4 mb-4">
        {[
          ['Issued', s.issued || 0],
          ['Returned', s.returned || 0],
          ['Active', s.active || 0],
          ['Overdue', s.overdue || 0]
        ].map(([l, v]) => (
          <div key={l} className="px-4 py-3 rounded-xl flex-1" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>{l}</p>
            <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{v}</p>
          </div>
        ))}
      </div>
    );
  }

  if (reportType === 'members') {
    const members = reportData.members || [];
    return (
      <div className="flex gap-4 mb-4">
        <div className="px-4 py-3 rounded-xl flex-1" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
          <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Total Members</p>
          <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{members.length}</p>
        </div>
      </div>
    );
  }

  if (reportType === 'fines') {
    const fSummary = reportData.summary || {};
    return (
      <div className="flex gap-4 mb-4">
        {[
          ['Collected', fSummary.totalCollected || 0],
          ['Outstanding', fSummary.totalOutstanding || 0],
          ['Waived', fSummary.totalWaived || 0],
          ['Records', fSummary.count || 0]
        ].map(([l, v]) => (
          <div key={l} className="px-4 py-3 rounded-xl flex-1" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>{l}</p>
            <p className="text-xl font-bold" style={{ color: '#1a1245' }}>
              {typeof v === 'number' && v > 100 ? `🇱🇰 Rs. ${v.toFixed(2)}` : v}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
