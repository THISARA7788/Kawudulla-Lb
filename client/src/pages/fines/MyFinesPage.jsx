import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../api/axios';

export default function MyFinesPage() {
  const [finesData, setFinesData] = useState({ fines: [], unpaid: [], resolved: [], totalUnpaidAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' | 'resolved'

  const fetchFines = async () => {
    try {
      setLoading(true);
      const res = await api.get('/library/my-fines');
      setFinesData(res.data || { fines: [], unpaid: [], resolved: [], totalUnpaidAmount: 0 });
    } catch (err) {
      console.error('Error fetching personal fines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const { unpaid = [], resolved = [], totalUnpaidAmount = 0 } = finesData;
  const currentList = activeTab === 'unpaid' ? unpaid : resolved;

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Fines & Dues
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Overdue fines ledger and payment history
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>payments</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unpaid Fines</p>
              <p className="text-xl font-extrabold" style={{ color: totalUnpaidAmount > 0 ? '#d97706' : '#1e293b' }}>
                Rs. {totalUnpaidAmount}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>warning</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue Items</p>
              <p className="text-xl font-extrabold text-slate-800">{unpaid.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>check_circle</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved Fines</p>
              <p className="text-xl font-extrabold text-slate-800">{resolved.length}</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70 select-none w-fit">
          <button
            onClick={() => setActiveTab('unpaid')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'unpaid'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pending Dues ({unpaid.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'resolved'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Resolved History ({resolved.length})
          </button>
        </div>

        {/* Fines List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: 32 }}>progress_activity</span>
            <p className="text-xs font-semibold">Loading fine records...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <span className="material-symbols-outlined mb-2 text-emerald-500" style={{ fontSize: 40 }}>
              check_circle
            </span>
            <p className="text-xs font-semibold text-slate-700">
              {activeTab === 'unpaid' ? 'No unpaid fines' : 'No resolved fines in history'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Book Title</th>
                    <th className="py-3 px-4 font-semibold">Overdue Duration</th>
                    <th className="py-3 px-4 font-semibold">Rate / Day</th>
                    <th className="py-3 px-4 font-semibold">Fine Amount</th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentList.map((fine) => (
                    <tr key={fine._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{fine.book?.title || 'Unknown Book'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {fine.book?.author || ''} {fine.fineId && `• Fine ID: ${fine.fineId}`}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {fine.daysOverdue} days
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        Rs. {fine.ratePerDay}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        Rs. {fine.amount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            fine.status === 'unpaid'
                              ? 'bg-amber-100 text-amber-700'
                              : fine.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {fine.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
