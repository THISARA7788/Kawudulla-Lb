import React from 'react';
import { displayGradeAndClass } from './MemberTable';

export default function MemberModals({
  modal,
  selected,
  form,
  setForm,
  saving,
  error,
  handleSave,
  setModal,
  newRole,
  setNewRole,
  actionLoading,
  handleRoleChange,
  historyLoading,
  historyData,
  setHistoryData,
  ROLES,
  GRADES,
  CLASS_SECTIONS,
  AL_STREAMS
}) {
  const isALGrade = form.grade === 'Grade 12' || form.grade === 'Grade 13';

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!modal || !selected) return null;

  return (
    <>
      {/* Edit Modal */}
      {modal === 'edit' && (
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
              {form.grade && form.grade !== 'Grade 12' && form.grade !== 'Grade 13' && form.grade !== 'Teacher' && form.grade !== 'Other' && (
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
      {modal === 'role' && (
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
      {modal === 'history' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-3xl mx-4" style={{ backgroundColor: '#fff' }}>
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
    </>
  );
}
