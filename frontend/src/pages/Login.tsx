import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Key, Cpu, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needsVerification) {
          setError('Email not verified. Redirecting to OTP verification panel...');
          setTimeout(() => {
            navigate('/signup', { state: { email, showOtpOnly: true } });
          }, 2000);
        } else {
          setError(data.message || 'Login failed.');
        }
      } else {
        localStorage.setItem('forge_token', data.token);
        localStorage.setItem('forge_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-change'));
        
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('Connection failure. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center py-16 px-4 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 shadow-blue mb-4">
            <Cpu className="w-7 h-7 text-slate-900" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-slate-600 mt-1.5">Log in to your ProjectForge AI account</p>
        </div>

        {/* Card */}
        <div className="card-premium rounded-2xl p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 mb-6 text-left leading-relaxed flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-600">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="developer@projectforge.ai"
                  className="input-light pl-10"
                  required 
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-600">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">Forgot Password?</Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-600">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-light pl-10 pr-10"
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              id="login-submit-btn"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-xs text-slate-600">
            New to ProjectForge AI?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">Create Account</Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-[11px] text-slate-600 text-left space-y-1.5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Key className="w-3 h-3 text-blue-500" /> Evaluation Accounts
          </div>
          <div>🔑 Admin: <strong className="text-slate-700">admin@projectforge.ai</strong> / <span className="text-slate-600">admin123</span></div>
          <div>🎓 Student: <strong className="text-slate-700">student@projectforge.ai</strong> / <span className="text-slate-600">student123</span></div>
        </div>
      </div>
    </div>
  );
}
