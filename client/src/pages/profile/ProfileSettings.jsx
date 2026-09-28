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

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    
    // Length check
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(pass)) score += 1; // Has uppercase
    if (/[a-z]/.test(pass)) score += 1; // Has lowercase
    if (/[0-9]/.test(pass)) score += 1; // Has number
    if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Has special char
    
    if (score <= 2) return { score, text: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 4) return { score, text: 'Medium', color: 'bg-amber-500', width: '66%' };
    return { score, text: 'Strong', color: 'bg-emerald-500', width: '100%' };
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

  // Role badges configuration using system harmonious palette
  const roleBadges = {
    student: { bg: 'bg-[#9E0D0D]/10', text: 'text-[#9E0D0D]', border: 'border-[#9E0D0D]/20', icon: 'school', label: 'Student' },
    teacher: { bg: 'bg-[#9E0D0D]/10', text: 'text-[#9E0D0D]', border: 'border-[#9E0D0D]/20', icon: 'badge', label: 'Teacher' },
    librarian: { bg: 'bg-[#9E0D0D]', text: 'text-white', border: 'border-[#7F0A0A]', icon: 'local_library', label: 'Librarian' },
  };
  const roleBadge = roleBadges[role] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: 'person', label: role };

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Profile Overview Header Card with System Theme */}
        <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-[#9E0D0D] bg-white p-6 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
            {/* Avatar Circle with system brand gradient */}
            <div
              className="w-20 h-20 rounded-2xl text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0 border-2 border-white select-none"
              style={{ background: 'linear-gradient(135deg, #4C0000 0%, #7F0A0A 50%, #9E0D0D 100%)' }}
            >
              {getInitials(name || user?.name)}
            </div>

            {/* User Meta Information */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {name || user?.name || 'Library User'}
                </h1>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                  <span className="material-symbols-outlined text-[14px]">{roleBadge.icon}</span>
                  {roleBadge.label}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-500 truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Personal Info & Password Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Personal Information */}
          <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-[#9E0D0D] bg-white p-6 shadow-2xs flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#9E0D0D]/10 border border-[#9E0D0D]/20 text-[#9E0D0D] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#9E0D0D]" style={{ fontFamily: "'Manrope', sans-serif" }}>
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
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#9E0D0D] focus:ring-3 focus:ring-[#9E0D0D]/10 transition-all duration-150"
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
                      className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#9E0D0D] focus:ring-3 focus:ring-[#9E0D0D]/10 transition-all duration-150"
                      placeholder="e.g. Grade 10-A"
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 mt-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md shadow-black/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-white/10 hover:border-white/25 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #4C0000 0%, #150000 100%)',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px] text-white">progress_activity</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-white">save</span>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Change Password */}
          <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-[#9E0D0D] bg-white p-6 shadow-2xs flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#9E0D0D]/10 border border-[#9E0D0D]/20 text-[#9E0D0D] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#9E0D0D]" style={{ fontFamily: "'Manrope', sans-serif" }}>
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
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#9E0D0D] focus:ring-3 focus:ring-[#9E0D0D]/10 transition-all duration-150"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#9E0D0D] focus:outline-none transition-colors cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#9E0D0D] focus:ring-3 focus:ring-[#9E0D0D]/10 transition-all duration-150"
                      placeholder="Create a strong password (min 8 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#9E0D0D] focus:outline-none transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNewPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Indicator Bar (Signup Replica) */}
                  {newPassword && (
                    <div className="mt-2.5 px-0.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-extrabold select-none">
                        <span className="text-slate-400 uppercase tracking-wider">Password Security</span>
                        <span 
                          className="text-[8.5px] uppercase font-black px-2 py-0.5 rounded-full border shadow-xs transition-all duration-300"
                          style={
                            getPasswordStrength(newPassword).text === 'Weak' 
                              ? { backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.2)' }
                              : getPasswordStrength(newPassword).text === 'Medium'
                              ? { backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.2)' }
                              : { backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' }
                          }
                        >
                          {getPasswordStrength(newPassword).text}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getPasswordStrength(newPassword).color}`}
                          style={{ width: getPasswordStrength(newPassword).width }}
                        />
                      </div>
                      {/* Dynamic Password Suggestions Checklist */}
                      {newPassword && !(newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) && (
                        <div className="mt-2.5 text-[10px] space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 select-none">
                          <p className="font-extrabold text-[8.5px] uppercase tracking-wider text-slate-500 mb-1">Password Requirements:</p>
                          
                          <div className="space-y-1.5 font-semibold text-slate-500">
                            {!(newPassword.length >= 8) && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px] font-bold text-slate-400">circle</span>
                                <span>At least 8 characters</span>
                              </div>
                            )}
                            
                            {!/[A-Z]/.test(newPassword) && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px] font-bold text-slate-400">circle</span>
                                <span>At least one uppercase letter (A-Z)</span>
                              </div>
                            )}

                            {!/[a-z]/.test(newPassword) && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px] font-bold text-slate-400">circle</span>
                                <span>At least one lowercase letter (a-z)</span>
                              </div>
                            )}

                            {!/[0-9]/.test(newPassword) && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px] font-bold text-slate-400">circle</span>
                                <span>At least one number (0-9)</span>
                              </div>
                            )}

                            {!/[^A-Za-z0-9]/.test(newPassword) && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px] font-bold text-slate-400">circle</span>
                                <span>At least one special symbol (e.g. @, #, $, %)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                      className="w-full px-3.5 py-2.5 pr-10 text-xs font-semibold rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#9E0D0D] focus:ring-3 focus:ring-[#9E0D0D]/10 transition-all duration-150"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#9E0D0D] focus:outline-none transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPw ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Confirm Password Verification Box (Signup Replica) */}
                  {confirmPassword && (
                    <div className="mt-2 px-0.5">
                      <div className="flex justify-between items-center text-[10px] font-extrabold select-none">
                        <span className="text-slate-400 uppercase tracking-wider">Password Match</span>
                        <span 
                          className="text-[8.5px] uppercase font-black px-2 py-0.5 rounded-full border shadow-xs"
                          style={
                            newPassword !== confirmPassword 
                              ? { backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.2)' }
                              : { backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' }
                          }
                        >
                          {newPassword !== confirmPassword ? 'Does Not Match' : 'Matches'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-auto">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md shadow-black/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-white/10 hover:border-white/25 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #4C0000 0%, #150000 100%)',
                  }}
                >
                  {changingPassword ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px] text-white">progress_activity</span>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-white">key</span>
                      <span>Update Password</span>
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
                ? 'bg-rose-600 border-rose-500/50'
                : toast.type === 'delete'
                ? 'bg-rose-700 border-rose-600/50'
                : 'bg-[#9E0D0D] border-[#7F0A0A]'
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
