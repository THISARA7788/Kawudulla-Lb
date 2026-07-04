// =========================================================================
// WHAT DOES THIS FILE DO?
// This page handles new member registration (sign up). It splits the viewport into
// a responsive visual presentation deck (left) and a multi-step user registration
// form (right). It matches role specifications (student/teacher) to show matching
// school grade, class sections, and streams fields.
// =========================================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];
const CLASS_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const AL_STREAMS = [
  { value: 'Bio Science', label: 'Bio Science', subjects: 'Biology, Chemistry, Physics' },
  { value: 'Physical Science', label: 'Physical Science', subjects: 'Combined Maths, Physics, Chemistry' },
  { value: 'Commerce', label: 'Commerce', subjects: 'Accounting, Business Studies, Economics' },
  { value: 'Arts', label: 'Arts', subjects: 'Sinhala, English, Buddhism, History, Geography' },
  { value: 'Technology', label: 'Technology', subjects: 'Mechanical, Electrical & Electronic, Building' },
  { value: 'ICT', label: 'ICT', subjects: 'ICT, ICT Practical, Economics, Combined Maths' },
];

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [classSection, setClassSection] = useState('');
  const [activeRole, setActiveRole] = useState('student');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const showGradeField = activeRole === 'student';
  const isALGrade = grade === 'Grade 12' || grade === 'Grade 13';
  const showClassSection = activeRole === 'student' && grade && !isALGrade;
  const showALStream = activeRole === 'student' && isALGrade;

  // Submits signup request to /auth/register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!activeRole) {
      setError('Please select a role');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (showGradeField && !grade) {
      setError('Please select your grade');
      return;
    }
    if (showClassSection && !classSection) {
      setError('Please select your class');
      return;
    }
    if (showALStream && !classSection) {
      setError('Please select your A/L stream');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        role: activeRole,
        grade,
        class: isALGrade ? classSection : classSection,
        stream: isALGrade ? classSection : undefined,
      });
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex h-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Keyframe Animations for Floating and Rotating effects */}
      <style>{`
        @keyframes float-badge {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        @keyframes float-badge-reverse {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(6px) rotate(-0.5deg); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float-badge {
          animation: float-badge 6s ease-in-out infinite;
        }
        .animate-float-badge-reverse {
          animation: float-badge-reverse 6s ease-in-out infinite;
        }
        .animate-float-y {
          animation: float-y 5s ease-in-out infinite;
        }
        .animate-rotate-slow {
          animation: rotate-slow 25s linear infinite;
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
          <div className="absolute bottom-[60px] left-[70px] right-[20px] h-[300px] rounded-[32px] overflow-hidden shadow-2xl border-[8px] border-white z-10 bg-white transition-all duration-500 hover:scale-[1.04] hover:shadow-indigo-500/10 cursor-pointer group/photo">
            <img
              src="/images/library_illustration.png"
              alt="Students Studying"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/photo:scale-110"
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
                {['S','M','T','W','T','F','S'].map((d, i) => <span key={i}>{d}</span>)}
                {Array.from({ length: 28 }).map((_, idx) => {
                  const isSelected = idx + 1 === 21;
                  return (
                    <span
                      key={idx}
                      className={`p-0.5 rounded flex items-center justify-center text-[8px] ${isSelected ? 'bg-indigo-600 text-white font-bold' : ''}`}
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
      <div className="flex-1 flex items-start justify-center bg-[#F8FAFC] px-4 sm:px-6 py-8 h-full overflow-y-auto">
        
        {/* Balanced Form Card: strictly max-w-[440px] & reduced vertical padding */}
        <div className="w-full max-w-[440px] bg-white rounded-[28px] shadow-xl border border-slate-100 p-8 sm:p-9 my-4 transition-all duration-300">

          {/* Institutional Branding */}
          <div className="mb-6 text-center">
            <div className="flex flex-col items-center justify-center mb-4">
              <img src="/images/logo.png" alt="KMV Logo" className="h-20 w-20 object-contain mb-3 transition-transform duration-300 hover:scale-105" />
              <h1 className="text-base font-black tracking-tight text-[#1E2A4A] uppercase leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                KAWUDULLA MAHA VIDYALAYA
              </h1>
              <p className="text-[11px] font-bold text-indigo-600/80 tracking-widest uppercase leading-none mt-1 font-manrope" style={{ fontFamily: "'Manrope', sans-serif" }}>
                LIBRARY PORTAL
              </p>
            </div>
            <h2 className="text-2xl font-black text-[#1E2A4A] tracking-tight leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>Create Account</h2>
          </div>

          {/* Success messages */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl text-xs font-semibold text-center bg-emerald-50 border border-emerald-200 text-emerald-600">
              {successMessage}
            </div>
          )}

          {/* Error notifications */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl text-xs font-semibold text-center bg-red-50 border border-red-200 text-red-600 animate-shake">
              {error}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} class="space-y-4">

              {/* Segmented slider role tabs (slides smoothly) */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  I am a <span className="text-red-500">*</span>
                </label>
                <div className="relative flex p-1 bg-slate-100 rounded-xl select-none border border-slate-200/50">
                  {['student', 'teacher'].map((role) => {
                    const isActive = activeRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => { setActiveRole(role); setGrade(''); setClassSection(''); }}
                        className={`flex-1 py-2 text-xs font-bold transition-all duration-300 uppercase tracking-wider relative z-10 ${isActive ? 'text-[#1E2A4A]' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        style={{ cursor: 'pointer' }}
                      >
                        {role}
                      </button>
                    );
                  })}

                  {/* Sliding indicator */}
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-white shadow-md transition-all duration-300 ease-out"
                    style={{
                      width: 'calc(50% - 4px)',
                      left: activeRole === 'student' ? '4px' : 'calc(50%)',
                    }}
                  />
                </div>
              </div>

              {/* Name field */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
                    <span className="material-symbols-outlined text-[19px]">person</span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold placeholder-slate-500 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Grade Selector (students only) */}
              {showGradeField && (
                <div>
                  <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Grade <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
                      <span className="material-symbols-outlined text-[19px]">school</span>
                    </div>
                    <select
                      value={grade}
                      onChange={(e) => { setGrade(e.target.value); setClassSection(''); }}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200"
                      style={{ color: '#1E2A4A' }}
                    >
                      <option value="">Select Grade</option>
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Class section A-H for grade 1-11 */}
              {showClassSection && (
                <div>
                  <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Class Section <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLASS_SECTIONS.map((c) => {
                      const isSel = classSection === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setClassSection(c)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border-2 uppercase ${isSel ? 'bg-[#1E2A4A] border-[#1E2A4A] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400'
                            }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* A/L Stream for grades 12-13 */}
              {showALStream && (
                <div>
                  <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    A/L Stream <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AL_STREAMS.map((s) => {
                      const isSel = classSection === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setClassSection(s.value)}
                          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all border-2 text-left flex flex-col justify-center ${isSel ? 'bg-[#1E2A4A] border-[#1E2A4A] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400'
                            }`}
                        >
                          <span>{s.label}</span>
                          <span className={`text-[9px] font-normal leading-none mt-1 opacity-70 ${isSel ? 'text-white' : 'text-slate-400'}`}>{s.subjects}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Email field */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
                    <span className="material-symbols-outlined text-[19px]">mail</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold placeholder-slate-500 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
                    <span className="material-symbols-outlined text-[19px]">lock</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 6 chars)"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold placeholder-slate-500 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Confirm Password field */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#1E2A4A] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
                    <span className="material-symbols-outlined text-[19px]">lock</span>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold placeholder-slate-500 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Submission button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all duration-150 flex items-center justify-center"
                  style={{ cursor: 'pointer' }}
                >
                  {loading ? 'Creating account...' : 'Register'}
                </button>
              </div>
            </form>
          )}

          {/* Login redirection prompt */}
          <div className="mt-5 text-center">
            <p className="text-xs font-semibold text-slate-400">
              Already have an account? 
              <Link
                to="/login"
                className="ml-1 text-xs font-bold text-[#1E2A4A] hover:text-indigo-600 border-b border-slate-300 hover:border-indigo-600 transition-all pb-0.5"
              >
                Login
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
