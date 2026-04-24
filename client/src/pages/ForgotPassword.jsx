import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccessMessage('Reset link sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1E2A4A 0%, #0F1A33 100%)' }}>
        <div className="absolute rounded-full" style={{ width: 450, height: 450, background: 'rgba(255,255,255,0.03)', top: '10%', left: '-10%' }} />
        <div className="absolute rounded-full" style={{ width: 350, height: 350, background: 'rgba(255,255,255,0.04)', bottom: '-5%', right: '-8%' }} />
        <div className="relative z-10 text-center text-white px-8">
          <div className="mb-6">
            <img src="/images/logo.png" alt="School Logo" className="mx-auto" style={{ width: 140, height: 140, objectFit: 'contain' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2 leading-tight">Reset<br />Password</h1>
          <p className="text-sm mt-3 opacity-60">We'll send you a link to reset your password</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#1E2A4A] mb-1">Forgot Password?</h2>
            <p className="text-sm text-slate-500">Enter your email to receive a reset link</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-semibold text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl text-sm font-semibold text-center" style={{ background: '#f0fdf4', border: '2px solid #86efac', color: '#166534' }}>
              ✓ {successMessage}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required className="w-full py-3 px-4 rounded-xl text-sm outline-none" style={{ background: '#e8eeff', border: 'none', fontSize: '14px' }} />
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 text-white rounded-xl font-semibold text-sm tracking-wide transition-all" style={{ background: '#1E2A4A', boxShadow: '0 2px 8px rgba(26,18,69,0.15)' }}>
                {loading ? 'Sending...' : 'SEND RESET LINK'}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-slate-500 mt-6">
            Remember your password? <Link to="/login" className="font-semibold text-[#1E2A4A]">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
