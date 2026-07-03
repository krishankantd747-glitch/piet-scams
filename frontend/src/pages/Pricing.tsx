import { Check, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-600">Choose the perfect plan for your engineering projects.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Student Plan */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Student Plan</h3>
            <p className="text-slate-600 mb-6">For college projects & submissions</p>
            <div className="mb-6"><span className="text-4xl font-extrabold text-slate-900">₹49</span><span className="text-slate-600">/project</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {["PPT Generator", "Report Generator", "Viva Questions", "Image Pack"].map((f,i) => (
                <li key={i} className="flex items-center text-slate-700"><Check className="w-5 h-5 text-blue-500 mr-3 shrink-0"/>{f}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/payment?plan=Student')} className="w-full py-3 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Get Started</button>
          </div>

          {/* Premium Plan */}
          <div className="bg-blue-600 rounded-3xl p-8 border border-blue-500 shadow-2xl shadow-blue-600/20 flex flex-col relative transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Premium Plan</h3>
            <p className="text-blue-100 mb-6">Full engineering design suite</p>
            <div className="mb-6"><span className="text-4xl font-extrabold text-slate-900">₹99</span><span className="text-blue-200">/project</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {["Everything in Student", "Professional Circuit SVG", "KiCad PCB & Gerber", "HD Wiring Diagram", "Priority Support"].map((f,i) => (
                <li key={i} className="flex items-center text-slate-900"><Check className="w-5 h-5 text-blue-200 mr-3 shrink-0"/>{f}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/payment?plan=Premium')} className="w-full py-3 rounded-xl font-semibold bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">Upgrade to Premium</button>
          </div>

          {/* Patent Plan */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Patent Plan</h3>
            <p className="text-slate-600 mb-6">Complete research & IP toolkit</p>
            <div className="mb-6"><span className="text-4xl font-extrabold text-slate-900">₹199</span><span className="text-slate-600">/project</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {["Everything in Premium", "Unlimited Patent Drafts", "Patent Claims Generator", "Prior Art Research", "Innovation Score"].map((f,i) => (
                <li key={i} className="flex items-center text-slate-700"><Check className="w-5 h-5 text-blue-500 mr-3 shrink-0"/>{f}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/payment?plan=Patent')} className="w-full py-3 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">Get Started</button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-slate-900">Compare Features</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-900">Feature</th>
                  <th className="p-4 font-semibold text-slate-900 text-center">Student</th>
                  <th className="p-4 font-semibold text-blue-600 text-center">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="p-4 text-slate-600">PPT Generation</td><td className="p-4 text-center">✔️</td><td className="p-4 text-center">✔️</td></tr>
                <tr><td className="p-4 text-slate-600">Report Generation</td><td className="p-4 text-center">✔️</td><td className="p-4 text-center">✔️</td></tr>
                <tr><td className="p-4 text-slate-600">Fritzing Circuit SVG</td><td className="p-4 text-center text-slate-600">-</td><td className="p-4 text-center">✔️</td></tr>
                <tr><td className="p-4 text-slate-600">KiCad PCB Generation</td><td className="p-4 text-center text-slate-600">-</td><td className="p-4 text-center">✔️</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-20 text-center flex flex-col items-center justify-center">
          <ShieldCheck className="w-12 h-12 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Secure Payments & Quality Guaranteed</h3>
          <p className="text-slate-600 max-w-md">We use bank-level encryption. If the AI generator fails, your credits are refunded instantly.</p>
        </div>
      </div>
    </div>
  );
}
