import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Cpu, RefreshCw } from 'lucide-react';

export default function VerifyResetOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const email: string = (location.state as any)?.email || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) navigate('/forgot-password');
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/reset-password', { state: { email, otp: otp.trim() } });
      } else {
        setError(data.message || 'OTP verification failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setCountdown(60);
        setOtp('');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to resend OTP.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Blobs */}
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

        <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-6 shadow-premium">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Shield className="w-7 h-7 text-blue-600" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-extrabold text-slate-900">Verify OTP</h1>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Enter the 6-digit code sent to{' '}
              <strong className="text-slate-900">{email}</strong>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">OTP Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xl font-mono text-center tracking-[0.6em] text-slate-900 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Verifying...
                </>
              ) : 'Verify OTP'}
            </button>
          </form>

          {/* Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-xs text-slate-600">
                Resend available in <span className="font-bold text-slate-600">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition mx-auto font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Resending...' : 'Resend OTP'}
              </button>
            )}
          </div>

          <Link to="/forgot-password" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 transition justify-center font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Use different email
          </Link>
        </div>
      </div>
    </div>
  );
}
