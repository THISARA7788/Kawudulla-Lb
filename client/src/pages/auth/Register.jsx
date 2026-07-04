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
  const [activeRole, setActiveRole] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const showGradeField = activeRole === 'student';
  const isALGrade = grade === 'Grade 12' || grade === 'Grade 13';
  const showClassSection = activeRole === 'student' && grade && !isALGrade;
  const showALStream = activeRole === 'student' && isALGrade;

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
    <div className="flex min-h-screen" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ===== Left Panel ===== */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1E2A4A 0%, #0F1A33 100%)' }}
      >
        <div className="absolute rounded-full" style={{ width: 450, height: 450, background: 'rgba(255,255,255,0.03)', top: '10%', left: '-10%' }} />
        <div className="absolute rounded-full" style={{ width: 350, height: 350, background: 'rgba(255,255,255,0.04)', bottom: '-5%', right: '-8%' }} />

        <div className="relative z-10 text-center text-white px-8">
          <div className="mb-6">
            <img src="/images/logo.png" alt="School Logo" className="mx-auto" style={{ width: 140, height: 140, objectFit: 'contain' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2 leading-tight">Kawudulla Maha<br />Vidyalaya</h1>
          <p className="text-sm mt-3 opacity-60">School Library Management System</p>
        </div>
      </div>

      {/* ===== Right Panel ===== */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <img src="/images/logo.png" alt="Logo" style={{ width: 48, height: 48 }} />
              <div>
                <h2 className="text-sm font-bold text-[#1E2A4A]">Kawudulla Library</h2>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-[#1E2A4A] mb-1">Create Account</h2>
            <p className="text-sm text-slate-500">Register to get started</p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl text-sm font-semibold text-center" style={{ background: '#f0fdf4', border: '2px solid #86efac', color: '#166534' }}>
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">I am a <span style={{ color: '#dc2626' }}>*</span></label>
                <div className="flex gap-3">
                  {['student', 'teacher'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setActiveRole(role)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 uppercase"
                      style={{
                        background: activeRole === role ? '#1E2A4A' : '#fff',
                        color: activeRole === role ? '#fff' : '#64748b',
                        borderColor: activeRole === role ? '#1E2A4A' : '#e2e8f0',
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required className="w-full py-3 px-4 rounded-xl text-sm outline-none" style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }} />
              </div>

              {/* Grade (students only) */}
              {showGradeField && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Grade <span style={{ color: '#dc2626' }}>*</span></label>
                  <select value={grade} onChange={(e) => { setGrade(e.target.value); setClassSection(''); }} required className="w-full py-3 px-4 rounded-xl text-sm outline-none" style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }}>
                    <option value="">Select Grade</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}

              {/* Class section A-H for grades 1-11 */}
              {showClassSection && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Class <span style={{ color: '#dc2626' }}>*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {CLASS_SECTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setClassSection(c)}
                        className="py-2.5 rounded-xl text-sm font-semibold transition-all border-2"
                        style={{
                          background: classSection === c ? '#1E2A4A' : '#fff',
                          color: classSection === c ? '#fff' : '#64748b',
                          borderColor: classSection === c ? '#1E2A4A' : '#e2e8f0',
                        }}
                      >
                        {grade} - {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* A/L Stream for grades 12-13 */}
              {showALStream && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">A/L Stream <span style={{ color: '#dc2626' }}>*</span></label>
                  <div className="space-y-2">
                    {AL_STREAMS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setClassSection(s.value)}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all border-2 text-left"
                        style={{
                          background: classSection === s.value ? '#1E2A4A' : '#fff',
                          color: classSection === s.value ? '#fff' : '#64748b',
                          borderColor: classSection === s.value ? '#1E2A4A' : '#e2e8f0',
                        }}
                      >
                        <div>{s.label}</div>
                        <div className="text-xs font-normal opacity-70" style={{ fontSize: '11px' }}>{s.subjects}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required className="w-full py-3 px-4 rounded-xl text-sm outline-none" style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }} />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required className="w-full py-3 px-4 rounded-xl text-sm outline-none" style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }} />
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required className="w-full py-3 px-4 rounded-xl text-sm outline-none" style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }} />
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 text-white rounded-xl font-semibold text-sm tracking-wide transition-all" style={{ background: '#1E2A4A', boxShadow: '0 2px 8px rgba(26,18,69,0.15)' }}>
                {loading ? 'Creating account...' : 'REGISTER'}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-slate-500 mt-6">
            Already have an account? <Link to="/login" className="font-semibold text-[#1E2A4A]">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
