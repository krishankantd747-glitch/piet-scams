import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Cpu, CheckCircle, Zap } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob pointer-events-none" style={{ animationDelay: '3s' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-blue">
            <Cpu className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <span className="font-extrabold text-base text-slate-900 block tracking-tight">ProjectForge AI</span>
            <span className="text-[9px] text-blue-600 uppercase font-bold tracking-widest block">Engineering SaaS</span>
          </div>
        </div>

        {!sent ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-6 shadow-premium">
            {/* Header */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900">Forgot Password</h1>
              <p className="text-xs text-slate-600 mt-1">Enter your registered email to receive a reset OTP.</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="input-light pl-10"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" /> Send Reset OTP
                  </>
                )}
              </button>
            </form>

            <Link to="/login" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 transition justify-center font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-6 text-center shadow-premium">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">OTP Sent!</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                A 6-digit reset OTP has been sent to <strong className="text-slate-900">{email}</strong>. Check your inbox (or the Mock OTP Box in dev mode).
              </p>
            </div>
            <button
              onClick={() => navigate('/verify-reset-otp', { state: { email } })}
              className="btn-primary w-full"
            >
              Enter OTP Code →
            </button>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-slate-600 hover:text-slate-600 transition font-semibold"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
