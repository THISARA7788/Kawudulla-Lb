import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function ProfileSettings() {
  const { user, token, login } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [role] = useState(user?.role || '');
  const [grade, setGrade] = useState(user?.grade || '');
  const [memberId] = useState(user?.memberId || '');

  const [loading, setLoading] = useState(false);

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setGrade(user.grade || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/auth/me', { name: name.trim(), grade: grade.trim() });
      const updatedUser = res.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      login(updatedUser, token);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Please enter your current password.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      showToast('Password must contain uppercase, lowercase, numbers, and special symbols.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // Role badges configuration
  const roleBadges = {
    student: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'school', label: 'Student' },
    teacher: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'badge', label: 'Teacher' },
    librarian: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'local_library', label: 'Librarian' },
  };
  const roleBadge = roleBadges[role] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'person', label: role };

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Profile Overview Header Card with System Theme Touch */}
        <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-[#881337] bg-gradient-to-r from-rose-50/30 via-white to-indigo-50/20 p-6 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
            {/* Avatar Circle with brand gradient */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1a1245] via-[#2b1f6d] to-[#4062BB] text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0 border-2 border-white">
              {getInitials(name || user?.name)}
            </div>

            {/* User Meta Information */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h1 className="text-xl font-bold tracking-tight truncate" style={{ color: '#1a1245' }}>
                  {name || user?.name || 'Library User'}
                </h1>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                  <span className="material-symbols-outlined text-[14px]">{roleBadge.icon}</span>
                  {roleBadge.label}
                </span>
              </div>

              <p className="text-xs font-medium text-slate-500 truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Personal Info & Password Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Personal Information */}
          <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-[#881337] bg-white p-6 shadow-2xs flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 text-[#881337] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#881337' }}>
                  Personal Information
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Update your account name and educational profile</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#4062BB] focus:ring-3 focus:ring-[#4062BB]/10 transition-all duration-150"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={email}
                      readOnly
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200/60 bg-slate-100/80 text-slate-400 cursor-not-allowed"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                      lock
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Permanently linked to your library credentials.</p>
                </div>

                {role === 'student' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Grade / Class
                    </label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#4062BB] focus:ring-3 focus:ring-[#4062BB]/10 transition-all duration-150"
                      placeholder="e.g. Grade 10-A"
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 mt-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1a1245] hover:bg-[#2b1f6d] active:scale-[0.99] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Change Password */}
          <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-[#4062BB] bg-white p-6 shadow-2xs flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 text-[#4062BB] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#881337' }}>
                  Security & Password
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Ensure your account remains safe and protected</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col flex-1 justify-between">
              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#4062BB] focus:ring-3 focus:ring-[#4062BB]/10 transition-all duration-150"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showCurrentPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#4062BB] focus:ring-3 focus:ring-[#4062BB]/10 transition-all duration-150"
                      placeholder="At least 8 chars with uppercase, number & symbol"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNewPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#4062BB] focus:ring-3 focus:ring-[#4062BB]/10 transition-all duration-150"
                      placeholder="Re-enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-auto">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 bg-[#4062BB] hover:bg-[#3453a3] active:scale-[0.99] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">key</span>
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Animated Toast Notifications */}
      {toast && (
        <div className="fixed top-3 left-0 lg:left-64 right-0 z-[9999] flex justify-center pointer-events-none">
          <style>{`
            @keyframes toast-enter {
              from { transform: translateY(-15px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            .toast-popup {
              animation: toast-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div
            className={`toast-popup pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-xl text-white shadow-lg border ${
              toast.type === 'error'
                ? 'bg-amber-600 border-amber-500/50'
                : toast.type === 'delete'
                ? 'bg-rose-600 border-rose-500/50'
                : 'bg-emerald-600 border-emerald-500/50'
            }`}
          >
            <span className="material-symbols-outlined text-white font-bold" style={{ fontSize: 18 }}>
              {toast.type === 'error' ? 'warning' : toast.type === 'delete' ? 'delete_forever' : 'check_circle'}
            </span>
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
