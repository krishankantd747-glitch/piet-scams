import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Phone, Mail, Lock, Eye, EyeOff, GraduationCap,
  MapPin, Building2, BookOpen, CalendarDays, ArrowRight,
  ArrowLeft, ShieldCheck, Camera, CheckCircle2, XCircle,
  Cpu, RefreshCw, Upload
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface FormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirm_password: string;
  college_name: string;
  department: string;
  branch: string;
  course: string;
  year_semester: string;
  city: string;
  state: string;
  country: string;
}

// ── Password Strength ─────────────────────────────────────────────────────────
function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: '20%' };
  if (score === 2) return { label: 'Fair', color: 'bg-orange-400', width: '40%' };
  if (score === 3) return { label: 'Good', color: 'bg-yellow-400', width: '60%' };
  if (score === 4) return { label: 'Strong', color: 'bg-emerald-400', width: '80%' };
  return { label: 'Excellent', color: 'bg-emerald-500', width: '100%' };
}

// ── Math CAPTCHA ──────────────────────────────────────────────────────────────
function generateCaptcha() {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  const ops = ['+', '−', '×'] as const;
  const op = ops[Math.floor(Math.random() * 3)];
  let answer: number;
  if (op === '+') answer = a + b;
  else if (op === '−') answer = a - b;
  else answer = a * b;
  return { question: `${a} ${op} ${b}`, answer };
}

// ── Indian States ─────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry',
  'Jammu & Kashmir','Ladakh'
];

const COURSES = [
  'B.Tech','B.E.','B.Sc','MCA','M.Tech','M.E.','M.Sc','MBA',
  'Diploma','BCA','B.Arch','PhD','Other'
];

const YEAR_SEMS = [
  '1st Year / Sem 1','1st Year / Sem 2',
  '2nd Year / Sem 3','2nd Year / Sem 4',
  '3rd Year / Sem 5','3rd Year / Sem 6',
  '4th Year / Sem 7','4th Year / Sem 8',
  'Final Year','Post Graduate'
];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
        done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
        active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' :
        'bg-slate-100 text-slate-400'
      }`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : step}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:block ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    name: '', email: '', mobile: '', password: '', confirm_password: '',
    college_name: '', department: '', branch: '', course: '',
    year_semester: '', city: '', state: '', country: 'India'
  });

  // Photo
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // OTP / CAPTCHA
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle OTP-only mode (from login redirect)
  useEffect(() => {
    if (location.state && (location.state as any).showOtpOnly) {
      setRegisteredEmail((location.state as any).email || '');
      setShowOtp(true);
      setStep(3);
    }
  }, [location.state]);

  const setField = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Avatar handling ───────────────────────────────────────────────────────
  const handleAvatarFile = useCallback((file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG, JPEG, PNG, and WEBP images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB.');
      return;
    }
    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAvatarFile(file);
  };

  // ── CAPTCHA ───────────────────────────────────────────────────────────────
  const checkCaptcha = () => {
    if (parseInt(captchaInput, 10) === captcha.answer) {
      setCaptchaVerified(true);
      setError(null);
    } else {
      setError('Incorrect answer. Please try again.');
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
    }
  };

  // ── Step 1 Validate ───────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.name.trim()) { setError('Full name is required.'); return false; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.'); return false;
    }
    if (!form.mobile.trim() || form.mobile.replace(/[^0-9]/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.'); return false;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.'); return false;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.'); return false;
    }
    return true;
  };

  // ── Step 2 Validate ───────────────────────────────────────────────────────
  const validateStep2 = () => {
    if (!form.college_name.trim()) { setError('College / University name is required.'); return false; }
    if (!form.department.trim()) { setError('Department is required.'); return false; }
    if (!form.course) { setError('Please select your course.'); return false; }
    if (!form.year_semester) { setError('Please select your year / semester.'); return false; }
    if (!form.city.trim()) { setError('City is required.'); return false; }
    if (!form.state) { setError('Please select your state.'); return false; }
    return true;
  };

  const nextStep = () => {
    setError(null);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => (s + 1) as Step);
  };

  const prevStep = () => {
    setError(null);
    setStep(s => (s - 1) as Step);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!captchaVerified) {
      setError('Please complete the CAPTCHA verification first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Registration failed.');
      } else {
        setRegisteredEmail(form.email);
        setSuccess(`Account created! Your Student ID: ${data.student_id}. Check your email for the OTP.`);
        setShowOtp(true);
      }
    } catch {
      setError('Connection error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'OTP verification failed.');
      } else if (data.autoLogin && data.token) {
        // Auto-login
        localStorage.setItem('forge_token', data.token);
        localStorage.setItem('forge_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-change'));

        // Upload avatar if selected
        if (avatarFile) {
          try {
            const fd = new FormData();
            fd.append('avatar', avatarFile);
            await fetch('/api/auth/upload-avatar', {
              method: 'POST',
              headers: { Authorization: `Bearer ${data.token}` },
              body: fd
            });
            // Update stored user with avatar
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${data.token}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              localStorage.setItem('forge_user', JSON.stringify(meData));
            }
          } catch { /* avatar upload failure is non-fatal */ }
        }

        setSuccess(`🎉 Welcome to ProjectForge AI, ${data.user.name}!`);
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        setSuccess('Email verified! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail })
      });
      const data = await res.json();
      if (res.ok) setSuccess('A new OTP has been sent to your email.');
      else setError(data.message || 'Failed to resend OTP.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const pwStrength = form.password ? getPasswordStrength(form.password) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-stretch">

      {/* ── Left branding panel (desktop) ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[40%] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-extrabold text-xl tracking-tight">ProjectForge AI</span>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Build. Create.<br />Innovate.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-10">
            India's premier AI platform for engineering students, researchers, and innovators.
          </p>

          <div className="space-y-4">
            {[
              { icon: '⚡', title: 'AI Circuit Designer', desc: 'Fritzing-style wiring diagrams in seconds' },
              { icon: '🔬', title: 'PCB Layout Generator', desc: 'KiCad-compatible Gerber files instantly' },
              { icon: '📄', title: 'IEEE Report Writer', desc: 'Professional documentation with one click' },
              { icon: '🎓', title: 'Smart Viva Prep', desc: 'AI-powered examiner question simulation' },
              { icon: '📜', title: 'Patent Draft AI', desc: 'Generate complete IP claims automatically' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur rounded-2xl p-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <div className="text-white font-semibold text-sm">{f.title}</div>
                  <div className="text-blue-200 text-xs mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-200 text-xs">
          Trusted by 10,000+ engineering students across India
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto py-8 px-4 sm:px-8">
        <div className="w-full max-w-xl">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">ProjectForge AI</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {showOtp ? 'Verify Your Email' : 'Create Your Account'}
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              {showOtp
                ? `Enter the 6-digit OTP sent to ${registeredEmail}`
                : 'Join thousands of engineering students on ProjectForge AI'}
            </p>
          </div>

          {/* Step indicator */}
          {!showOtp && (
            <div className="flex items-center gap-3 mb-8">
              <StepDot step={1} current={step} label="Personal" />
              <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step > 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <StepDot step={2} current={step} label="Academic" />
              <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step > 2 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <StepDot step={3} current={step} label="Verify" />
            </div>
          )}

          {/* Alert messages */}
          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
              <XCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm mb-5">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* ── OTP Screen ─────────────────────────────────────────────────── */}
          {showOtp ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-slate-600 text-sm">We sent a 6-digit code to<br />
                  <strong className="text-slate-900">{registeredEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text" maxLength={6} value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full py-4 text-center rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-2xl tracking-[0.5em] font-bold text-slate-900 bg-slate-50 max-w-[260px] mx-auto block transition-all outline-none"
                    required
                  />
                  <p className="text-center text-xs text-slate-400 mt-2">
                    💡 Check the Mock OTP panel at the top of the screen
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                >
                  <ShieldCheck className="w-5 h-5" />
                  {loading ? 'Verifying...' : 'Verify & Activate Account'}
                </button>

                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-4">
                  <button type="button" onClick={handleResendOtp} className="text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                  </button>
                  <button type="button" onClick={() => { setShowOtp(false); setStep(1); }} className="text-blue-600 hover:text-blue-700 font-semibold">
                    ← Back to registration
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">

              {/* ── STEP 1: Personal Info ──────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <SectionLabel icon={<User className="w-4 h-4" />} text="Personal Information" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Full Name *" icon={<User className="w-4 h-4" />}>
                      <input type="text" value={form.name}
                        onChange={e => setField('name', e.target.value)}
                        placeholder="Krishankant Dixit"
                        className="input-signup" />
                    </FieldGroup>

                    <FieldGroup label="Mobile Number *" icon={<Phone className="w-4 h-4" />}>
                      <input type="tel" value={form.mobile}
                        onChange={e => setField('mobile', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="input-signup" />
                    </FieldGroup>
                  </div>

                  <FieldGroup label="Email Address *" icon={<Mail className="w-4 h-4" />}>
                    <input type="email" value={form.email}
                      onChange={e => setField('email', e.target.value)}
                      placeholder="you@college.edu.in"
                      className="input-signup" />
                  </FieldGroup>

                  <FieldGroup label="Password *" icon={<Lock className="w-4 h-4" />}
                    rightEl={
                      <button type="button" onClick={() => setShowPassword(p => !p)} className="text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }>
                    <input type={showPassword ? 'text' : 'password'} value={form.password}
                      onChange={e => setField('password', e.target.value)}
                      placeholder="Min. 8 characters"
                      className="input-signup pr-10" />
                  </FieldGroup>

                  {/* Password strength */}
                  {pwStrength && (
                    <div className="space-y-1.5 -mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${pwStrength.color} rounded-full transition-all duration-500`} style={{ width: pwStrength.width }} />
                      </div>
                      <p className="text-xs text-slate-500">Password strength: <span className={`font-semibold ${pwStrength.color.replace('bg-', 'text-')}`}>{pwStrength.label}</span></p>
                    </div>
                  )}

                  <FieldGroup label="Confirm Password *" icon={<Lock className="w-4 h-4" />}
                    rightEl={
                      <button type="button" onClick={() => setShowConfirm(p => !p)} className="text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }>
                    <input type={showConfirm ? 'text' : 'password'} value={form.confirm_password}
                      onChange={e => setField('confirm_password', e.target.value)}
                      placeholder="Re-enter password"
                      className={`input-signup pr-10 ${form.confirm_password && form.password !== form.confirm_password ? 'border-red-300 focus:border-red-500' : form.confirm_password && form.password === form.confirm_password ? 'border-emerald-400 focus:border-emerald-500' : ''}`} />
                  </FieldGroup>

                  {form.confirm_password && (
                    <p className={`text-xs -mt-2 flex items-center gap-1 ${form.password === form.confirm_password ? 'text-emerald-600' : 'text-red-500'}`}>
                      {form.password === form.confirm_password
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                        : <><XCircle className="w-3.5 h-3.5" /> Passwords do not match</>}
                    </p>
                  )}
                </div>
              )}

              {/* ── STEP 2: Academic + Photo ───────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <SectionLabel icon={<GraduationCap className="w-4 h-4" />} text="Academic Profile" />

                  {/* Profile Photo Upload */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                      Profile Photo <span className="text-slate-400 normal-case tracking-normal font-normal">(optional, max 5 MB)</span>
                    </label>
                    <div className="flex items-center gap-6">
                      {/* Preview */}
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden shrink-0">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-8 h-8 text-blue-300" />
                        )}
                      </div>

                      {/* Drop zone */}
                      <div
                        className={`flex-1 border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-medium">Drag & drop or <span className="text-blue-600 font-semibold">browse</span></p>
                        <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 5 MB</p>
                        <p className="text-xs text-slate-400">Auto-resized to 512 × 512 px</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden" onChange={e => e.target.files?.[0] && handleAvatarFile(e.target.files[0])} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="College / University *" icon={<Building2 className="w-4 h-4" />} className="sm:col-span-2">
                      <input type="text" value={form.college_name}
                        onChange={e => setField('college_name', e.target.value)}
                        placeholder="PIET, VIT, IIT, NIT..."
                        className="input-signup" />
                    </FieldGroup>

                    <FieldGroup label="Department / Branch *" icon={<BookOpen className="w-4 h-4" />}>
                      <input type="text" value={form.department}
                        onChange={e => setField('department', e.target.value)}
                        placeholder="Electronics & Comm."
                        className="input-signup" />
                    </FieldGroup>

                    <FieldGroup label="Specialization (Branch)" icon={<BookOpen className="w-4 h-4" />}>
                      <input type="text" value={form.branch}
                        onChange={e => setField('branch', e.target.value)}
                        placeholder="VLSI, IoT, Robotics..."
                        className="input-signup" />
                    </FieldGroup>

                    <FieldGroup label="Course *" icon={<GraduationCap className="w-4 h-4" />}>
                      <select value={form.course} onChange={e => setField('course', e.target.value)} className="input-signup">
                        <option value="">Select course</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FieldGroup>

                    <FieldGroup label="Year / Semester *" icon={<CalendarDays className="w-4 h-4" />}>
                      <select value={form.year_semester} onChange={e => setField('year_semester', e.target.value)} className="input-signup">
                        <option value="">Select year / sem</option>
                        {YEAR_SEMS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </FieldGroup>

                    <FieldGroup label="City *" icon={<MapPin className="w-4 h-4" />}>
                      <input type="text" value={form.city}
                        onChange={e => setField('city', e.target.value)}
                        placeholder="Jodhpur, Mumbai..."
                        className="input-signup" />
                    </FieldGroup>

                    <FieldGroup label="State *" icon={<MapPin className="w-4 h-4" />}>
                      <select value={form.state} onChange={e => setField('state', e.target.value)} className="input-signup">
                        <option value="">Select state</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FieldGroup>
                  </div>
                </div>
              )}

              {/* ── STEP 3: CAPTCHA + Submit ───────────────────────────────── */}
              {step === 3 && !showOtp && (
                <div className="space-y-6 animate-fade-in">
                  <SectionLabel icon={<ShieldCheck className="w-4 h-4" />} text="Security Verification" />

                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <p className="text-sm font-semibold text-slate-700 mb-4 text-center">
                      Please solve this to prove you are human
                    </p>

                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="px-8 py-4 bg-white rounded-2xl border-2 border-blue-200 shadow-sm">
                        <span className="text-3xl font-black text-blue-600 tracking-widest select-none">
                          {captcha.question} = ?
                        </span>
                      </div>
                      <button type="button" onClick={() => { setCaptcha(generateCaptcha()); setCaptchaInput(''); setCaptchaVerified(false); }}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" title="Refresh">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>

                    {captchaVerified ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-5 h-5" /> CAPTCHA verified!
                      </div>
                    ) : (
                      <div className="flex gap-3 max-w-xs mx-auto">
                        <input
                          type="number"
                          value={captchaInput}
                          onChange={e => setCaptchaInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && checkCaptcha()}
                          placeholder="Your answer"
                          className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-center text-lg font-bold text-slate-900 outline-none transition-all"
                        />
                        <button type="button" onClick={checkCaptcha}
                          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                          ✓
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 text-sm space-y-2">
                    <p className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> Account Summary
                    </p>
                    {[
                      { label: 'Name', val: form.name },
                      { label: 'Email', val: form.email },
                      { label: 'Mobile', val: form.mobile },
                      { label: 'College', val: form.college_name },
                      { label: 'Course', val: `${form.course} — ${form.department}` },
                      { label: 'Location', val: `${form.city}, ${form.state}` },
                    ].map(r => (
                      <div key={r.label} className="flex gap-3">
                        <span className="text-blue-400 w-16 shrink-0 font-medium">{r.label}</span>
                        <span className="text-slate-700 truncate">{r.val || '—'}</span>
                      </div>
                    ))}
                    {avatarPreview && (
                      <div className="flex items-center gap-3 pt-2 border-t border-blue-100 mt-2">
                        <img src={avatarPreview} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-blue-200" />
                        <span className="text-slate-600 text-xs">Profile photo ready to upload</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || !captchaVerified}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 text-base"
                  >
                    {loading ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
                    ) : (
                      <><Cpu className="w-5 h-5" /> Create My Account</>
                    )}
                  </button>
                </div>
              )}

              {/* ── Navigation Buttons ─────────────────────────────────────── */}
              {!showOtp && (
                <div className={`flex mt-6 gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                  {step > 1 && (
                    <button type="button" onClick={prevStep}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  {step < 3 && (
                    <button type="button" onClick={nextStep}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-200">
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-bold">Sign In →</a>
          </p>
        </div>
      </div>

      {/* Inline styles for this page */}
      <style>{`
        .input-signup {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border-radius: 0.875rem;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          appearance: none;
        }
        .input-signup:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
          background: #fff;
        }
        select.input-signup { padding-left: 2.5rem; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <span className="text-blue-500">{icon}</span>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{text}</span>
    </div>
  );
}

function FieldGroup({
  label, icon, children, className = '', rightEl
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rightEl?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
          {icon}
        </span>
        {children}
        {rightEl && (
          <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {rightEl}
          </span>
        )}
      </div>
    </div>
  );
}
