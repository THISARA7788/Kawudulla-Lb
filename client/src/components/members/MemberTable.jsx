import React from 'react';

// Sri Lankan school grades
const GRADES = [
  { label: 'Grade 1', value: 'Grade 1' },
  { label: 'Grade 2', value: 'Grade 2' },
  { label: 'Grade 3', value: 'Grade 3' },
  { label: 'Grade 4', value: 'Grade 4' },
  { label: 'Grade 5', value: 'Grade 5' },
  { label: 'Grade 6', value: 'Grade 6' },
  { label: 'Grade 7', value: 'Grade 7' },
  { label: 'Grade 8', value: 'Grade 8' },
  { label: 'Grade 9', value: 'Grade 9' },
  { label: 'Grade 10', value: 'Grade 10' },
  { label: 'Grade 11', value: 'Grade 11' },
  { label: 'Grade 12 (A/L)', value: 'Grade 12' },
  { label: 'Grade 13 (A/L)', value: 'Grade 13' },
  { label: 'Teacher', value: 'Teacher' },
  { label: 'Other', value: 'Other' },
];

function gradeLabel(val) {
  if (!val) return '';
  const match = GRADES.find((g) => g.value === val);
  return match ? match.label : val;
}

function displayGradeAndClass(m) {
  if (m.grade && m.class && m.grade !== 'Grade 12' && m.grade !== 'Grade 13') {
    return `${gradeLabel(m.grade)}-${m.class}`;
  }
  if (m.grade === 'Grade 12' || m.grade === 'Grade 13') {
    const stream = m.class;
    if (stream) return `${gradeLabel(m.grade)} – ${stream}`;
    return gradeLabel(m.grade);
  }
  return gradeLabel(m.grade) || '—';
}

export default function MemberTable({
  loading,
  filtered,
  openHistory,
  openEdit,
  openRole,
  handleStatusToggle,
  handleDelete
}) {
  const roleBadge = (role) => {
    const map = {
      student: { bg: '#dcfce7', color: '#166534' },
      teacher: { bg: '#dbeafe', color: '#1e40af' },
      librarian: { bg: '#e8d5f5', color: '#7c3aed' }
    };
    const s = map[role] || { bg: '#f0f0f0', color: '#666' };
    return (
      <span className="text-xs font-bold uppercase px-2 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
        {role}
      </span>
    );
  };

  const statusBadge = (status) => {
    const map = {
      active: { c: '#166534', bg: '#dcfce7', t: 'Active' },
      pending: { c: '#854d0e', bg: '#fef9c3', t: 'Pending' },
      rejected: { c: '#b31b25', bg: '#fee2e2', t: 'Rejected' }
    };
    const s = map[status] || { c: '#666', bg: '#f0f0f0', t: status };
    return (
      <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.c }}>
        {s.t}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>
        Loading members...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
        <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>group_off</span>
        <p className="text-sm font-medium">No members found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
            {['Member ID', 'Name', 'Email', 'Role', 'Grade / Class', 'Status', ''].map((h) => (
              <th key={h} className="py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m._id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8f8f8' }}>
              <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: '#1a1245' }}>{m.memberId || '—'}</td>
              <td className="py-3 px-4 font-semibold" style={{ color: '#2C2C3E' }}>{m.name}</td>
              <td className="py-3 px-4 text-xs" style={{ color: '#595c5e' }}>{m.email}</td>
              <td className="py-3 px-4">{roleBadge(m.role)}</td>
              <td className="py-3 px-4">
                <span className="text-xs font-semibold" style={{ color: '#2C2C3E' }}>
                  {displayGradeAndClass(m)}
                </span>
              </td>
              <td className="py-3 px-4">{statusBadge(m.status)}</td>
              <td className="py-3 px-4 text-right">
                <button onClick={() => openHistory(m)} className="mr-1 p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: '#7c3aed' }} title="View History">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>
                </button>
                <button onClick={() => openEdit(m)} className="mr-1 p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: '#4F5B7D' }} title="Edit">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                </button>
                <button onClick={() => openRole(m)} className="mr-1 p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: '#2563eb' }} title="Change Role">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>badge</span>
                </button>
                {m.status === 'active' && (
                  <button onClick={() => handleStatusToggle(m, 'rejected')} className="mr-1 p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: '#b31b25' }} title="Deactivate">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>block</span>
                  </button>
                )}
                {m.status === 'rejected' && (
                  <button onClick={() => handleStatusToggle(m, 'active')} className="mr-1 p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: '#166534' }} title="Activate">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  </button>
                )}
                <button onClick={() => handleDelete(m)} className="p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: '#b31b25' }} title="Delete">
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
export { displayGradeAndClass, gradeLabel };
