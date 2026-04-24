import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

export default function ProfileSettings() {
  const { user, token, login, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [role] = useState(user?.role || '');
  const [grade, setGrade] = useState(user?.grade || '');
  const [memberId] = useState(user?.memberId || '');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await api.put('/auth/me', { name, grade });
      // Update localStorage with new profile data
      const updatedUser = res.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      login(updatedUser, token);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0F1A33' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64" style={{ background: '#0F1A33' }}>
        <TopBar />
        <main className="flex-1 pt-20 pb-4 overflow-y-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold" style={{ color: '#ffffff', fontFamily: "'Manrope', sans-serif" }}>Profile & Settings</h1>
            <p className="text-xs mt-1" style={{ color: '#5a6a8a' }}>Manage your account information and preferences.</p>
          </div>

          {message && (
            <div className="mb-4 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>{message}</div>
          )}
          {error && (
            <div className="mb-4 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#fee2e2', color: '#b31b25' }}>{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">

            {/* Profile Information */}
            <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#1E2A4A' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4062BB' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>person</span>
                </div>
                <h2 className="text-base font-bold" style={{ color: '#ffffff' }}>Personal Information</h2>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Full Name</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                    style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Email</label>
                  <input
                    type="text" value={email} readOnly
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                    style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Role</label>
                    <input
                      type="text" value={role} readOnly
                      className="w-full px-3 py-2 text-xs rounded-lg outline-none capitalize"
                      style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.05)', color: '#f59e0b', cursor: 'not-allowed' }}
                    />
                  </div>
                  {role === 'student' && (
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Grade</label>
                      <input
                        type="text" value={grade} onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                        style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Member ID</label>
                  <input
                    type="text" value={memberId || 'Not assigned'} readOnly
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none font-mono"
                    style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'not-allowed' }}
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#4062BB', color: '#fff', opacity: loading ? 0.5 : 1 }}
                >
                  Save Changes
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#1E2A4A' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4062BB' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>lock_reset</span>
                </div>
                <h2 className="text-base font-bold" style={{ color: '#ffffff' }}>Change Password</h2>
              </div>

              {passwordMsg && (
                <div className="mb-3 px-3 py-2 rounded-xl text-xs"
                  style={{
                    backgroundColor: passwordMsg.type === 'success' ? '#DCFCE7' : '#fee2e2',
                    color: passwordMsg.type === 'success' ? '#166534' : '#b31b25'
                  }}>
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-9 text-xs rounded-lg outline-none"
                      style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: '#5a6a8a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {showCurrentPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>New Password</label>
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                    style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#5a6a8a' }}>Confirm Password</label>
                  <input
                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                    style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                    placeholder="Re-enter new password"
                  />
                </div>

                <button
                  type="submit" disabled={changingPassword}
                  className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#151D33', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', opacity: changingPassword ? 0.5 : 1 }}
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
