import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post(`/auth/login/${activeRole}`, { email, password });
      login(response.data, response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
          <h1 className="text-3xl font-bold mb-2 leading-tight">
            Kawudulla Maha<br />Vidyalaya
          </h1>
          <p className="text-sm mt-3 opacity-60">School Library Management System</p>
        </div>
      </div>

      {/* ===== Right Panel ===== */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <img src="/images/logo.png" alt="Logo" style={{ width: 48, height: 48 }} />
              <h2 className="text-sm font-bold text-[#1E2A4A]">Kawudulla Library</h2>
            </div>
            <h2 className="text-3xl font-bold text-[#1E2A4A] mb-1">Welcome Back</h2>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>

          {/* Role Tabs */}
          <div className="flex gap-3 mb-6">
            {['student', 'teacher', 'librarian'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 uppercase tracking-wide"
                style={{
                  background: activeRole === role ? '#1E2A4A' : '#fff',
                  color: activeRole === role ? '#fff' : '#64748b',
                  borderColor: activeRole === role ? '#1E2A4A' : '#e2e8f0',
                  boxShadow: activeRole === role ? '0 2px 8px rgba(30,42,74,0.3)' : 'none',
                }}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Username / Email</label>
              <input
                type="text" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username or email"
                required
                className="w-full py-3 px-4 rounded-xl text-sm outline-none"
                style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }}
              />
            </div>

            <div className="mb-2">
              <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full py-3 px-4 pr-12 rounded-xl text-sm outline-none"
                  style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1E2A4A] transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.737 10.737 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.737 10.737 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="text-right mb-6">
              <Link to="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-[#1E2A4A]">Forgot Password?</Link>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 text-white rounded-xl font-semibold text-sm tracking-wide transition-all"
              style={{ background: '#1E2A4A', boxShadow: '0 2px 8px rgba(30,42,74,0.3)' }}
            >
              {loading ? 'Logging in...' : 'LOGIN'}
            </button>

            <div className="flex items-center gap-4 my-5">
              <span className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
              <p className="text-xs text-slate-400 font-medium">OR</p>
              <span className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
            </div>

            <p className="text-sm text-center text-slate-500 mb-3">Don't have an account ?</p>
            <Link
              to="/register"
              className="block w-full py-3 text-center rounded-xl font-semibold text-sm tracking-wide transition-all"
              style={{ border: '2px solid #1E2A4A', color: '#1E2A4A' }}
              onMouseEnter={(e) => { e.target.style.background = '#1E2A4A'; e.target.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#1E2A4A'; }}
            >
              REGISTER
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
