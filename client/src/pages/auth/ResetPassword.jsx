import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { token } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccessMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'Poppins', sans-serif" }}>
      
      {/* Keyframe Animations for Floating and Rotating effects */}
      <style>{`
        @keyframes float-badge {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes float-badge-reverse {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(8px) rotate(-1deg); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0) rotate(-2.5deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float-badge {
          animation: float-badge 5s ease-in-out infinite;
        }
        .animate-float-badge-reverse {
          animation: float-badge-reverse 5s ease-in-out infinite;
        }
        .animate-float-y {
          animation: float-y 5s ease-in-out infinite;
        }
        .animate-rotate-slow {
          animation: rotate-slow 40s linear infinite;
        }
      `}</style>

      {/* ===== LEFT SHOWCASE PANEL (Aesthetic replica of reference photo) ===== */}
      <div
        className="hidden lg:flex lg:w-[58%] flex-col items-center justify-center relative overflow-hidden px-8 select-none h-full"
        style={{ backgroundColor: '#EFF3FD' }}
      >
        {/* Soft abstract blur blobs */}
        <div className="absolute rounded-full filter blur-3xl opacity-60" style={{ width: 400, height: 400, background: 'rgba(99, 102, 241, 0.12)', top: '5%', left: '-5%' }} />
        <div className="absolute rounded-full filter blur-3xl opacity-50" style={{ width: 350, height: 350, background: 'rgba(14, 165, 233, 0.1)', bottom: '5%', right: '-5%' }} />

        {/* Outer composition container */}
        <div className="relative w-full max-w-xl h-[560px]">

          {/* 1. Purple semicircle shape on top left */}
          <div className="absolute top-[100px] left-[40px] w-16 h-9 bg-purple-600 rounded-t-full transform -rotate-45 opacity-90 z-0" />

          {/* 2. Light blue circle/arc ring segment on the right (spins slowly) */}
          <div className="absolute right-[20px] top-[140px] w-36 h-36 border-[24px] border-[#0ea5e9] rounded-full opacity-20 z-0 animate-rotate-slow" />
          <div className="absolute right-[0px] top-[240px] w-28 h-28 bg-[#0ea5e9] rounded-full opacity-80 z-0" style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)', transform: 'scale(1.25) rotate(45deg)' }} />

          {/* 3. Background Y-Axis Chart Grid on the bottom-left */}
          <div className="absolute bottom-[40px] left-[10px] flex flex-col justify-between h-[200px] border-l border-slate-200 pl-2.5 text-[10px] text-slate-400 font-mono z-0 select-none">
            <span>600</span>
            <span>500</span>
            <span>400</span>
            <span>300</span>
            <span>200</span>
            <span>100</span>
            {/* Green curve line */}
            <svg className="absolute left-0 bottom-0 w-[230px] h-[150px] overflow-visible" style={{ pointerEvents: 'none' }}>
              <path d="M 0 130 Q 60 30, 120 100 T 230 40" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="3 3" />
            </svg>
          </div>

          {/* 4. Large Main Visual Photo (Real photo of students) */}
          <div className="absolute bottom-[60px] left-[70px] right-[20px] h-[300px] rounded-[32px] overflow-hidden shadow-2xl border-[8px] border-white z-10 bg-white">
            <img
              src="/images/library_illustration.png"
              alt="Students Studying"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 5. Double-Pane Calendar/Booking Widget (Top Left, overlays photo) */}
          <div className="absolute top-[75px] left-[0px] bg-white shadow-2xl rounded-2xl p-4 border border-slate-100/80 flex gap-4 w-[360px] z-20 animate-float-y">
            {/* Left Pane: Month grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[10px] font-extrabold text-slate-700">March 2026</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-400 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                {Array.from({ length: 28 }).map((_, idx) => {
                  const isSelected = idx + 1 === 21;
                  return (
                    <span
                      key={idx}
                      className={`p-0.5 rounded flex items-center justify-center text-[8px] ${isSelected ? 'bg-[#0ea5e9] text-white font-bold' : ''}`}
                    >
                      {idx + 1}
                    </span>
                  );
                })}
              </div>
            </div>
            {/* Divider line */}
            <div className="w-px bg-slate-100 self-stretch" />
            {/* Right Pane: Slot Details */}
            <div className="w-[140px] flex flex-col justify-between text-left">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Active Checkouts</p>
                <div className="space-y-1">
                  <div className="bg-slate-50 rounded p-1 text-[9px] font-bold text-slate-700 flex justify-between">
                    <span>Due Soon</span>
                    <span className="text-amber-500">02</span>
                  </div>
                  <div className="bg-slate-50 rounded p-1 text-[9px] font-bold text-slate-700 flex justify-between">
                    <span>Overdue</span>
                    <span className="text-red-500">00</span>
                  </div>
                </div>
              </div>
              <button type="button" className="w-full py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-[9px] font-extrabold tracking-wider transition-colors uppercase mt-1.5">
                Active Slot
              </button>
            </div>
          </div>

          {/* 6. Floating pill: Automatic Reminders (Top Right) */}
          <div className="absolute top-[80px] right-[0px] bg-[#e0f2fe] text-[#0369a1] shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-sky-100 z-20">
            <span className="material-symbols-outlined text-[#0ea5e9]" style={{ fontSize: 15, fontWeight: 'bold' }}>notifications</span>
            <span className="text-[10px] font-bold tracking-wide">Automatic Reminders</span>
          </div>

          {/* 7. Floating badge: Increases Knowledge (Left Center) */}
          <div className="absolute left-[-30px] top-[260px] bg-[#f0fdf4] text-[#166534] shadow-xl rounded-xl px-4 py-3 border border-emerald-100 flex items-center gap-2.5 z-30 animate-float-badge">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>menu_book</span>
            </div>
            <span className="text-[10px] font-extrabold tracking-wide">Increases Knowledge</span>
          </div>

          {/* 8. Floating badge: Reduces Conflicts (Bottom Center) */}
          <div className="absolute bottom-[20px] left-[55%] -translate-x-1/2 bg-[#faf5ff] text-[#6b21a8] shadow-xl rounded-xl px-5 py-3 border border-purple-100 flex items-center gap-2.5 z-20 animate-float-badge-reverse">
            <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center text-white">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>hourglass_empty</span>
            </div>
            <span className="text-[10px] font-extrabold tracking-wide">Reduces Conflicts</span>
          </div>

        </div>
      </div>

      {/* ===== RIGHT FORM PANEL (Clean forms layout with card frame) ===== */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] px-4 sm:px-6 py-12 h-full overflow-hidden">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100/50 p-8 sm:p-10">

          {/* Logo brand and greetings */}
          <div className="mb-8 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3.5 mb-6">
              <img src="/images/logo.png" alt="KMV Logo" style={{ width: 56, height: 56, objectFit: 'contain' }} />
              <div className="text-left">
                <h1 className="text-base font-black tracking-tight" style={{ color: '#1E2A4A', fontFamily: "'Manrope', sans-serif" }}>KAWUDULLA MAHA VIDYALAYA</h1>
                <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none mt-0.5">LIBRARY PORTAL</p>
              </div>
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-1" style={{ color: '#1E2A4A', fontFamily: "'Manrope', sans-serif" }}>Reset Password</h2>
            <p className="text-sm text-slate-400">Enter your new password below</p>
          </div>

          {/* Error notifications */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs font-semibold text-center bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}
          
          {/* Success notification */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl text-xs font-semibold text-center bg-emerald-50 border border-emerald-200 text-emerald-600">
              ✓ {successMessage}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E2A4A] uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full py-3 px-4 rounded-xl text-sm border border-slate-200 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 transition-all"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E2A4A] uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full py-3 px-4 rounded-xl text-sm border border-slate-200 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 transition-all"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-[0.98] transform transition-all duration-150"
                style={{ cursor: 'pointer' }}
              >
                {loading ? 'Resetting password...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back to Login link */}
          <div className="text-center mt-6">
            <Link
              to="/login"
              className="inline-block w-full py-3.5 text-center border-2 border-slate-200 hover:border-indigo-600 text-slate-500 hover:text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-white"
            >
              Back to Login
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ResetPassword;
