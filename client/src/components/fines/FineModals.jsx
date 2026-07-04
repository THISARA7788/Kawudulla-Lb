import React from 'react';

export default function FineModals({
  modal,
  selected,
  saving,
  error,
  handlePay,
  handleWaive,
  saveConfig,
  setModal,
  waiveReason,
  setWaiveReason,
  newRate,
  setNewRate,
  newGrace,
  setNewGrace
}) {
  if (!modal) return null;

  return (
    <>
      {/* Pay Modal */}
      {modal === 'pay' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Mark Fine as Paid</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Member: <strong>{selected.user?.name}</strong> <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>({selected.user?.memberId})</span></p>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Book: <strong>{selected.book?.title}</strong></p>
              <p className="text-lg font-bold" style={{ color: '#1a1245' }}>Amount: 🇱🇰 Rs. {selected.amount.toFixed(2)}</p>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>}
            <div className="flex gap-3">
              <button onClick={handlePay} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#166534', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Processing...' : 'Confirm Payment'}</button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Waive Modal */}
      {modal === 'waive' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Waive Fine</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }}>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Member: <strong>{selected.user?.name}</strong></p>
              <p className="text-sm" style={{ color: '#2C2C3E' }}>Amount to waive: <strong style={{ color: '#b31b25' }}>🇱🇰 Rs. {selected.amount.toFixed(2)}</strong></p>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Reason (optional)</label>
              <textarea value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} placeholder="e.g. Book returned damaged, exceptional circumstances..." rows="3" className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleWaive} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Processing...' : 'Waive Fine'}</button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {modal === 'config' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>Fine Settings</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Fine Rate per Day (LKR)</label>
                <input type="number" min="0" step="0.5" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>Grace Period (Days)</label>
                <input type="number" min="0" value={newGrace} onChange={(e) => setNewGrace(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#f5f7fa', border: '1px solid #e0e0e0' }} />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Number of days after due date before fines start applying.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveConfig} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Settings'}</button>
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#1a1245', color: '#1a1245' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
