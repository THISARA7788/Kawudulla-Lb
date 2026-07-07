import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import MemberTable from '../../components/members/MemberTable';
import MemberModals from '../../components/members/MemberModals';

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

  return (
    <DashboardLayout>


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
            <MemberTable
              loading={loading}
              filtered={filtered}
              openHistory={openHistory}
              openEdit={openEdit}
              openRole={openRole}
              handleStatusToggle={handleStatusToggle}
              handleDelete={handleDelete}
            />
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

          {/* Modals Container */}
          <MemberModals
            modal={modal}
            selected={selected}
            form={form}
            setForm={setForm}
            saving={saving}
            error={error}
            handleSave={handleSave}
            setModal={setModal}
            newRole={newRole}
            setNewRole={setNewRole}
            actionLoading={actionLoading}
            handleRoleChange={handleRoleChange}
            historyLoading={historyLoading}
            historyData={historyData}
            setHistoryData={setHistoryData}
            ROLES={ROLES}
            GRADES={GRADES}
            CLASS_SECTIONS={CLASS_SECTIONS}
            AL_STREAMS={AL_STREAMS}
          />
    </DashboardLayout>
  );
}
