import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

const ROLES = ['student', 'teacher', 'librarian'];
const STATUSES = ['all', 'active', 'pending', 'rejected'];

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

// Class sections for each grade (A through H)
const CLASS_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// A/L subject streams
const AL_STREAMS = [
  { label: 'Bio Science', value: 'Bio Science', subjects: 'Biology, Chemistry, Physics | Combined Maths' },
  { label: 'Physical Science', value: 'Physical Science', subjects: 'Combined Maths, Physics, Chemistry | ICT' },
  { label: 'Commerce', value: 'Commerce', subjects: 'Accounting, Business Studies, Economics | ICT' },
  { label: 'Arts', value: 'Arts', subjects: 'Sinhala / English / Tamil | Buddhism / Religions | History | Geography' },
  { label: 'Technology', value: 'Technology', subjects: 'Mechanical Technology | Electrical & Electronic | Building' },
  { label: 'ICT', value: 'ICT', subjects: 'ICT | ICT Practical | Economics | Combined Maths' },
];

function gradeLabel(val) {
  if (!val) return '';
  const match = GRADES.find((g) => g.value === val);
  return match ? match.label : val;
}

function displayGradeAndClass(m) {
  // For grades 1-11: show "Grade 6-A" (grade + class section)
  if (m.grade && m.class && m.grade !== 'Grade 12' && m.grade !== 'Grade 13') {
    return `${gradeLabel(m.grade)}-${m.class}`;
  }
  // For grades 12/13: show grade + A/L stream
  if (m.grade === 'Grade 12' || m.grade === 'Grade 13') {
    const stream = m.class;
    if (stream) return `${gradeLabel(m.grade)} – ${stream}`;
    return gradeLabel(m.grade);
  }
  return gradeLabel(m.grade) || '—';
}

export default function MembersPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [streamFilter, setStreamFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'edit' | 'role' | 'history'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', grade: '', class: '' });
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  // History state
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Derived: what grades are currently in the data
  const availableGrades = Array.from(new Set(members.filter((m) => m.grade).map((m) => m.grade))).sort();

  // Derived: what classes are currently in the data (for non-A/L grades)
  const availableClasses = Array.from(new Set(members.filter((m) => m.class && m.grade !== 'Grade 12' && m.grade !== 'Grade 13').map((m) => m.class))).sort();

  // Derived: what A/L streams are available
  const availableStreams = Array.from(new Set(members.filter((m) => m.grade === 'Grade 12' || m.grade === 'Grade 13').map((m) => m.class).filter(Boolean))).sort();

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', { headers: { Authorization: `Bearer ${token}` } });
      setMembers(res.data.users || []);
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  useEffect(() => {
    if (user && user.role !== 'librarian') navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const filtered = members.filter((m) => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()) || m.memberId?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchGrade = gradeFilter === 'all' || m.grade === gradeFilter;
    // Class filter: for grades 1-11, class is the section (A-H). For A/L grades, class is the stream.
    const matchClass = classFilter === 'all' || m.class === classFilter;
    const matchStream = streamFilter === 'all' || m.class === streamFilter;
    return matchSearch && matchRole && matchStatus && matchGrade && matchClass && matchStream;
  });

  const openEdit = (member) => {
    setSelected(member);
    setForm({ name: member.name, email: member.email, grade: member.grade || '', class: member.class || '' });
    setError('');
    setModal('edit');
  };

  const openRole = (member) => { setSelected(member); setNewRole(member.role); setError(''); setModal('role'); };

  const openHistory = async (member) => {
    setSelected(member);
    setHistoryLoading(true);
    setModal('history');
    try {
      const res = await api.get(`/library/users/${member._id}/history`, { headers: { Authorization: `Bearer ${token}` } });
      setHistoryData(res.data);
    } catch (err) {
      console.error('Fetch history error:', err);
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/users/${selected._id}`, { name: form.name, email: form.email, grade: form.grade, class: form.class }, { headers: { Authorization: `Bearer ${token}` } });
      setMembers((prev) => prev.map((m) => (m._id === selected._id ? { ...m, ...res.data.user } : m)));
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const handleRoleChange = async () => {
    if (selected._id === user._id) { setError('You cannot change your own role.'); return; }
    setActionLoading(true);
    try {
      await api.put(`/users/${selected._id}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
      setMembers((prev) => prev.map((m) => (m._id === selected._id ? { ...m, role: newRole } : m)));
      setModal(null);
    } catch (err) { setError(err.response?.data?.message || 'Failed to change role.'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name} (${member.memberId})?`)) return;
    setActionLoading(true);
    try { await api.delete(`/users/${member._id}`, { headers: { Authorization: `Bearer ${token}` } }); setMembers((prev) => prev.filter((m) => m._id !== member._id)); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete.'); }
    finally { setActionLoading(false); }
  };

  const handleStatusToggle = async (member, newStatus) => {
    setActionLoading(true);
    try { const res = await api.put(`/users/${member._id}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } }); setMembers((prev) => prev.map((m) => (m._id === member._id ? { ...m, ...res.data.user } : m))); }
    catch (err) { alert(err.response?.data?.message || 'Failed to update status.'); }
    finally { setActionLoading(false); }
  };

  const roleBadge = (role) => {
    const map = { student: { bg: '#dcfce7', color: '#166534' }, teacher: { bg: '#dbeafe', color: '#1e40af' }, librarian: { bg: '#e8d5f5', color: '#7c3aed' } };
    const s = map[role] || { bg: '#f0f0f0', color: '#666' };
    return <span className="text-xs font-bold uppercase px-2 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{role}</span>;
  };

  const statusBadge = (status) => {
    const map = { active: { c: '#166534', bg: '#dcfce7', t: 'Active' }, pending: { c: '#854d0e', bg: '#fef9c3', t: 'Pending' }, rejected: { c: '#b31b25', bg: '#fee2e2', t: 'Rejected' } };
    const s = map[status] || { c: '#666', bg: '#f0f0f0', t: status };
    return <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.c }}>{s.t}</span>;
  };

  // Grade cell display: show "Grade 6-A" for regular grades, "Grade 12 - Bio Science" for A/L
  const gradeCell = (m) => {
    const display = displayGradeAndClass(m);
    return (
      <span className="text-xs font-semibold" style={{ color: '#2C2C3E' }}>{display}</span>
    );
  };

  const isALGrade = form.grade === 'Grade 12' || form.grade === 'Grade 13';

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F3FC' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72" style={{ background: '#F5F3FC' }}>
        <TopBar />
        <main className="flex-1 pt-20 pb-4 overflow-y-auto px-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-extrabold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Members</h1>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Manage library members — edit details, change roles, and update status.</p>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex gap-3 mb-4 items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8', fontSize: 18 }}>search</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or Member ID..." className="w-full py-2.5 pl-9 pr-4 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="py-2 px-3 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 110 }}>
              <option value="all">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 px-3 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 110 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setClassFilter('all'); }} className="py-2 px-3 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 130 }}>
              <option value="all">All Grades</option>
              {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            {/* Class section filter: shows for grades 1-11 (A-H sections) */}
            {gradeFilter !== 'all' && gradeFilter !== 'Grade 12' && gradeFilter !== 'Grade 13' && gradeFilter !== 'Teacher' && gradeFilter !== 'Other' && (
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="py-2 px-3 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 110 }}>
                <option value="all">All Classes</option>
                {CLASS_SECTIONS.map((c) => <option key={c} value={c}>{gradeFilter} {c}</option>)}
              </select>
            )}
            {(gradeFilter === 'Grade 12' || gradeFilter === 'Grade 13') && (
              <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} className="py-2 px-3 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E', minWidth: 140 }}>
                <option value="all">All Streams</option>
                {AL_STREAMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>Loading members...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>group_off</span>
                <p className="text-sm font-medium">No members found</p>
              </div>
            ) : (
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
                        <td className="py-3 px-4">{gradeCell(m)}</td>
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
            )}
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex gap-4 mt-4 flex-wrap">
              {[['Total', members.length], ['Students', members.filter((m) => m.role === 'student').length], ['Teachers', members.filter((m) => m.role === 'teacher').length], ['Active', members.filter((m) => m.status === 'active').length], ['Showing', filtered.length]].map(([label, val]) => (
                <div key={label} className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}>
                  <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: '#1a1245' }}>{val}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {modal === 'edit' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Edit Member</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Member ID</label>
                <input value={selected.memberId} readOnly disabled className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f0f0f0', border: '1px solid #e0e0e0', color: '#1a1245', fontWeight: 'bold' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Name *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Grade</label>
                <select value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value, class: '' }))} className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0', color: '#2C2C3E' }}>
                  <option value="">Select Grade</option>
                  {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              {/* Class section A-H for grades 1-11 */}
              {form.grade && form.grade !== 'Grade 12' && form.grade !== 'Grade 13' && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Class</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLASS_SECTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, class: c }))}
                        className="py-2 rounded-xl text-xs font-semibold transition-all border-2"
                        style={{
                          backgroundColor: form.class === c ? '#1a1245' : '#f5f7fa',
                          color: form.class === c ? '#fff' : '#2C2C3E',
                          borderColor: form.class === c ? '#1a1245' : '#e0e0e0',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* A/L stream for grades 12-13 */}
              {isALGrade && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>A/L Stream</label>
                  <select value={form.class} onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0', color: '#2C2C3E' }}>
                    <option value="">Select Stream</option>
                    {AL_STREAMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Update Member'}</button>
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {modal === 'role' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Change Role</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>}
            <p className="text-sm mb-3" style={{ color: '#595c5e' }}>Changing role for <strong style={{ color: '#1a1245' }}>{selected.name}</strong> ({selected.memberId})</p>
            <div className="space-y-2 mb-4">
              {ROLES.map((r) => (
                <button key={r} onClick={() => setNewRole(r)} className="w-full px-3 py-2 text-sm rounded-xl text-left font-medium" style={{ backgroundColor: newRole === r ? '#4062BB' : '#f5f7fa', color: newRole === r ? '#fff' : '#2C2C3E', border: newRole === r ? '2px solid #4062BB' : '1px solid #e0e0e0' }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleRoleChange} disabled={actionLoading || newRole === selected.role} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: actionLoading || newRole === selected.role ? 0.5 : 1 }}>{actionLoading ? 'Updating...' : 'Update Role'}</button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {modal === 'history' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-3xl mx-4" style={{ backgroundColor: '#fff' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Member History</h2>
              <button onClick={() => { setModal(null); setHistoryData(null); }} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>Loading history...
              </div>
            ) : (
              <>
                {/* Member Info Card */}
                {historyData && (
                  <>
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ backgroundColor: '#F5F3FC' }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #1a1245 0%, #4062BB 100%)' }}>
                        {historyData.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: '#1a1245' }}>{historyData.user.name}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{historyData.user.memberId || 'No ID'} &middot; {historyData.user.role} &middot; {displayGradeAndClass(historyData.user)}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 mb-4">
                      {[
                        ['Total Borrowed', historyData.stats.totalBorrows],
                        ['Currently Has', historyData.stats.currentBorrows],
                        ['Returned', historyData.stats.returnedCount],
                        ['Overdue', historyData.stats.overdueCount],
                      ].map(([label, val]) => (
                        <div key={label} className="flex-1 text-center px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}>
                          <p className="text-lg font-bold" style={{ color: label === 'Overdue' && val > 0 ? '#b31b25' : '#1a1245' }}>{val}</p>
                          <p className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Transactions List */}
                    {historyData.transactions.length === 0 ? (
                      <div className="text-center py-10" style={{ color: '#94a3b8' }}>
                        <span className="material-symbols-outlined mb-2" style={{ fontSize: 48, opacity: 0.3 }}>history_toggle_off</span>
                        <p className="text-sm font-medium">No borrowing history found</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto rounded-xl" style={{ maxHeight: 340 }}>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                              <th className="py-2 px-3 font-semibold text-slate-400 uppercase tracking-wider">Book</th>
                              <th className="py-2 px-3 font-semibold text-slate-400 uppercase tracking-wider">Issue Date</th>
                              <th className="py-2 px-3 font-semibold text-slate-400 uppercase tracking-wider">Due Date</th>
                              <th className="py-2 px-3 font-semibold text-slate-400 uppercase tracking-wider">Return Date</th>
                              <th className="py-2 px-3 font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.transactions.map((t) => {
                              const statusColor = t.status === 'returned' ? { bg: '#dcfce7', c: '#166534', label: 'Returned' }
                                : new Date(t.dueDate) < new Date() ? { bg: '#fee2e2', c: '#b31b25', label: 'Overdue' }
                                : { bg: '#fef9c3', c: '#854d0e', label: 'Active' };
                              return (
                                <tr key={t._id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                                  <td className="py-2 px-3">
                                    <div>
                                      <span className="font-semibold" style={{ color: '#2C2C3E' }}>{t.book?.title || 'Unknown'}</span>
                                      <span className="block text-[10px]" style={{ color: '#94a3b8' }}>{t.book?.author || ''}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3" style={{ color: '#595c5e' }}>{formatDateTime(t.issueDate)}</td>
                                  <td className="py-2 px-3" style={{ color: '#595c5e' }}>{formatDateTime(t.dueDate)}</td>
                                  <td className="py-2 px-3" style={{ color: '#595c5e' }}>{t.returnDate ? formatDateTime(t.returnDate) : '—'}</td>
                                  <td className="py-2 px-3">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor.bg, color: statusColor.c }}>{statusColor.label}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
