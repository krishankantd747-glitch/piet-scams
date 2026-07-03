import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, Building2, GitBranch, Hash,
  Save, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Cpu, ArrowLeft
} from 'lucide-react';

type Toast = { text: string; type: 'success' | 'danger' | 'info' } | null;

export default function Profile() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [showPass, setShowPass] = useState(false);

  // Profile form
  const [form, setForm] = useState({
    name: '', mobile: '', email: '',
    college_name: '', branch: '', reg_number: ''
  });

  // Password form
  const [passForm, setPassForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProfile = async () => {
    const t = localStorage.getItem('forge_token');
    if (!t) { navigate('/login'); return; }
    setToken(t);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) { navigate('/login'); return; }
      const data = await res.json();
      setForm({
        name: data.name || '',
        mobile: data.mobile || '',
        email: data.email || '',
        college_name: data.college_name || '',
        branch: data.branch || '',
        reg_number: data.reg_number || ''
      });
      // Sync localStorage user
      const stored = JSON.parse(localStorage.getItem('forge_user') || '{}');
      localStorage.setItem('forge_user', JSON.stringify({ ...stored, ...data }));
    } catch {
      showToast('Failed to load profile.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      showToast('Name and mobile are required.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          mobile: form.mobile,
          college_name: form.college_name,
          branch: form.branch,
          reg_number: form.reg_number
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        const stored = JSON.parse(localStorage.getItem('forge_user') || '{}');
        localStorage.setItem('forge_user', JSON.stringify({ ...stored, name: form.name, mobile: form.mobile }));
      } else {
        showToast(data.message || 'Profile update failed.', 'danger');
      }
    } catch {
      showToast('Network error. Try again.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'danger');
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast('Passwords do not match.', 'danger');
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password changed successfully!', 'success');
        setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(data.message || 'Password change failed.', 'danger');
      }
    } catch {
      showToast('Network error. Try again.', 'danger');
    } finally {
      setChangingPass(false);
    }
  };

  const SkeletonField = () => (
    <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
  );

  const inputBase = 'w-full pl-10 pr-4 py-3 rounded-xl input-light text-xs text-slate-900 disabled:opacity-50';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white shadow-premium border border-slate-200 border-l-4 transition-all duration-300 ${
          toast.type === 'success' ? 'border-l-emerald-500' :
          toast.type === 'danger' ? 'border-l-red-500' : 'border-l-indigo-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> :
           toast.type === 'danger' ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0" /> :
           <Cpu className="w-4 h-4 text-blue-600 shrink-0" />}
          <span className="text-xs font-semibold text-slate-200">{toast.text}</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Profile &amp; Settings</h1>
            <p className="text-xs text-slate-600 mt-0.5">Manage your account details and security.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white shadow-premium border border-slate-200 border border-slate-200 rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50/60 border border-indigo-900/40 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
                <p className="text-[10px] text-slate-600">Your academic and contact details.</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => <SkeletonField key={i} />)}
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className={inputBase}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value })}
                      className={inputBase}
                      placeholder="+91 9876543210"
                      required
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Email Address <span className="text-slate-600 font-normal">(cannot be changed)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="email"
                      value={form.email}
                      disabled
                      className={inputBase + ' cursor-not-allowed text-slate-600'}
                    />
                  </div>
                </div>

                {/* Grid: College + Branch + Reg No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">College / University</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        value={form.college_name}
                        onChange={e => setForm({ ...form, college_name: e.target.value })}
                        className={inputBase}
                        placeholder="PIET Jaipur"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Branch / Department</label>
                    <div className="relative">
                      <GitBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        value={form.branch}
                        onChange={e => setForm({ ...form, branch: e.target.value })}
                        className={inputBase}
                        placeholder="Electronics & CS"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Registration / Enrollment Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="text"
                      value={form.reg_number}
                      onChange={e => setForm({ ...form, reg_number: e.target.value })}
                      className={inputBase}
                      placeholder="2021ECXXXX"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-slate-900 transition disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Change Password Card */}
          <div className="bg-white shadow-premium border border-slate-200 border border-slate-200 rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-950/60 border border-orange-900/40 flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                <p className="text-[10px] text-slate-600">Update your account password securely.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={passForm.currentPassword}
                    onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 rounded-xl input-light text-xs text-slate-900"
                    placeholder="Your current password"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={passForm.newPassword}
                      onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl input-light text-xs text-slate-900"
                      placeholder="Min. 6 characters"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={passForm.confirmPassword}
                      onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl input-light text-xs text-slate-900"
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Password match indicator */}
              {passForm.confirmPassword && (
                <p className={`text-[10px] flex items-center gap-1.5 ${passForm.newPassword === passForm.confirmPassword ? 'text-emerald-600' : 'text-red-400'}`}>
                  {passForm.newPassword === passForm.confirmPassword
                    ? <><CheckCircle className="w-3 h-3" /> Passwords match</>
                    : <><AlertCircle className="w-3 h-3" /> Passwords do not match</>
                  }
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-slate-900 transition disabled:opacity-60"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {changingPass ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white shadow-premium border border-slate-200 border border-red-900/30 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Account Actions</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">Sign out of all sessions</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Removes your token and redirects to login.</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('forge_token');
                  localStorage.removeItem('forge_user');
                  navigate('/login');
                }}
                className="px-4 py-2 rounded-lg border border-red-900/60 text-xs text-red-400 hover:bg-red-950/30 font-semibold transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
