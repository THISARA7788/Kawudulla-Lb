import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';

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
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordMsg({ type: 'error', text: 'New password must contain uppercase, lowercase, numbers, and special symbols.' });
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
    <DashboardLayout>
      <div className="p-1">
        {message && (
          <div className="mb-4 px-4 py-2 rounded-xl text-sm border border-emerald-200 bg-emerald-50 text-emerald-700 animate-fadeIn flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-2 rounded-xl text-sm border border-red-200 bg-red-50 text-red-700 animate-shake flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Profile Information */}
          <div className="rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4062BB' }}>
                <span className="material-symbols-outlined text-[16px] text-white">person</span>
              </div>
              <h2 className="text-base font-bold text-[#1E2A4A]" style={{ fontFamily: "'Manrope', sans-serif" }}>Personal Information</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                <input
                  type="text"
                  value={email}
                  readOnly
                  className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200/60 bg-slate-100/80 text-slate-400 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Account Role</label>
                  <input
                    type="text"
                    value={role}
                    readOnly
                    className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200/60 bg-slate-100/80 text-amber-600 font-semibold cursor-not-allowed capitalize"
                  />
                </div>
                {role === 'student' && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Grade</label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all duration-200"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Library Member ID</label>
                <input
                  type="text"
                  value={memberId || 'Not assigned'}
                  readOnly
                  className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200/60 bg-slate-100/80 text-slate-400 cursor-not-allowed font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                Save Changes
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4062BB' }}>
                <span className="material-symbols-outlined text-[16px] text-white">lock_reset</span>
              </div>
              <h2 className="text-base font-bold text-[#1E2A4A]" style={{ fontFamily: "'Manrope', sans-serif" }}>Change Password</h2>
            </div>

            {passwordMsg && (
              <div className={`mb-4 px-4 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                passwordMsg.type === 'success' 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                <span className="material-symbols-outlined text-[16px]">
                  {passwordMsg.type === 'success' ? 'check_circle' : 'error'}
                </span>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-9 text-xs rounded-lg outline-none border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all duration-200"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 focus:outline-none transition-colors duration-150"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showCurrentPw ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all duration-200"
                  placeholder="At least 8 characters (with uppercase, number, symbol)"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-lg outline-none border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all duration-200"
                  placeholder="Re-enter new password"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
