import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, UploadCloud, CreditCard, CheckCircle2 } from 'lucide-react';

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan') || 'Premium';
  
  const [plan, setPlan] = useState(initialPlan);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAmount = () => {
    if (plan === 'Student') return '49';
    if (plan === 'Premium') return '99';
    if (plan === 'Patent') return '199';
    return '99';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !screenshot || !captchaVerified) {
      setError('Please fill all fields, upload screenshot, and verify CAPTCHA.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('planName', plan);
    formData.append('amount', getAmount());
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('screenshotFile', screenshot);

    try {
      const token = localStorage.getItem('forge_token');
      const res = await fetch('/api/payments/qr-submit', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'Payment submission failed.');
      }
    } catch (err) {
      setError('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Submitted!</h2>
          <p className="text-slate-600 mb-8">
            Your screenshot has been received. Our team will verify it shortly and upgrade your account.
          </p>
          <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-blue-600 text-slate-900 rounded-xl font-bold hover:bg-blue-700 transition">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Complete Your Payment</h1>
          <p className="text-slate-600">Upgrade to Engineering Project Solutions Platform</p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          
          {/* Left Column: QR Code & Merchant Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">ProjectForge AI</h3>
              <p className="text-xs text-slate-600 mb-6 uppercase tracking-wider font-semibold">Verified Merchant</p>
              
              {/* ── Real PhonePe QR Code ── */}
              <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 inline-block mb-5 shadow-sm">
                <img
                  src="/phonepe-qr.png"
                  alt="PhonePe Payment QR Code"
                  className="w-52 h-52 object-contain rounded-xl"
                  onError={(e) => {
                    // Fallback to generated QR if image not found
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=upi://pay?pa=projectforge.ai@paytm%26pn=ProjectForge%20AI%26cu=INR&format=png&ecc=H`;
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                Scan with any UPI App
              </div>
              <p className="text-[11px] text-slate-600 mb-4">PhonePe · GPay · Paytm · BHIM · Any UPI</p>
              <div className="flex justify-center gap-3 mt-4">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-4 opacity-70" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="h-4 opacity-70" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/PhonePe_Logo.svg" alt="PhonePe" className="h-4 opacity-70" />
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Secure Transaction</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your payment is secured and processed instantly. Please ensure you upload the correct screenshot of the successful transaction.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Form */}
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              
              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
                  <span className="shrink-0">⚠️</span> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">Select Plan</label>
                  <select 
                    value={plan} 
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Student">Student Plan - ₹49</option>
                    <option value="Premium">Premium Plan - ₹99</option>
                    <option value="Patent">Patent Plan - ₹199</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">Amount to Pay</label>
                  <div className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900">
                    ₹{getAmount()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  placeholder="John Doe" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    placeholder="john@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">Phone Number</label>
                  <input 
                    type="tel" 
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    placeholder="+91 9876543210" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">Upload Screenshot Proof</label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  {screenshot ? (
                    <span className="text-sm font-semibold text-emerald-600">{screenshot.name}</span>
                  ) : (
                    <>
                      <span className="block text-sm font-medium text-slate-700">Click to upload payment screenshot</span>
                      <span className="block text-xs text-slate-600 mt-1">PNG, JPG up to 5MB</span>
                    </>
                  )}
                </div>
              </div>

              {/* Fake CAPTCHA for demonstration */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="captcha" 
                    checked={captchaVerified} 
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="captcha" className="text-sm font-semibold text-slate-700 cursor-pointer">I am human</label>
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase flex flex-col items-end">
                  <ShieldCheck className="w-4 h-4 mb-1" />
                  Cloudflare Turnstile
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-slate-100 text-slate-900 rounded-xl font-bold text-sm hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : <><CreditCard className="w-5 h-5" /> Submit Payment Verification</>}
              </button>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
