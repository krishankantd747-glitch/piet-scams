import React, { useState } from 'react';
import { 
  Mail, MapPin, Phone, MessageSquare, Instagram, Linkedin, 
  CheckCircle2, Send, ShieldCheck, Globe, HelpCircle, 
  ChevronDown, ExternalLink 
} from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('general');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How fast does the support team respond?",
      a: "Our typical response time is under 2 hours for standard queries. Premium and Patent plan users receive priority support with response times under 30 minutes."
    },
    {
      q: "Can I request custom features or templates?",
      a: "Yes! If your college or team requires custom report templates or specialized circuit generators, please write to us with the 'Enterprise Request' option."
    },
    {
      q: "Do you offer offline installation or self-hosted solutions?",
      a: "We currently offer enterprise packages that support local hosting and private deployments. Contact our sales team using the form for a demo."
    },
    {
      q: "Is there support for bulk student licenses?",
      a: "Absolutely. We offer academic plans tailored for institutions and colleges. Reach out using your official educational email address."
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    // Simulate sending
    setTimeout(() => {
      setToast(`Thank you, ${name}! Your message regarding "${subject}" has been received. We will get back to you shortly.`);
      setName('');
      setEmail('');
      setMessage('');
      setSubject('general');
      setLoading(false);

      setTimeout(() => {
        setToast(null);
      }, 5000);
    }, 1000);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden flex flex-col justify-start">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/50 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3.5 px-6 py-4 rounded-2xl shadow-2xl bg-white border border-l-4 border-l-emerald-500 border-slate-100 animate-slide-up max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 leading-normal">{toast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10 w-full">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Globe className="w-3.5 h-3.5" /> Get in Touch
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 font-display">
            Let's Start a <span className="gradient-text">Conversation</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Have questions about ProjectForge AI? Need technical support, billing assistance, or custom enterprise solutions? We are here to help you succeed.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
          
          {/* Left Column: Premium Contact Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-premium glow-blue animate-slide-up relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-3xl border-b border-l border-slate-100 pointer-events-none flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-blue-600/30" />
            </div>
            
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-display">Send us a message</h2>
            <p className="text-sm text-slate-500 mb-8">Fill out the form below and our team will get back to you within 2 hours.</p>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-light" 
                    placeholder="John Doe" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-light" 
                    placeholder="john@example.com" 
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Subject of Inquiry</label>
                <div className="relative">
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-light appearance-none pr-10 bg-slate-50 cursor-pointer text-slate-700"
                  >
                    <option value="general">General Inquiry / Feedback</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing & Premium Upgrades</option>
                    <option value="academic">Academic & Bulk Institutional Licensing</option>
                    <option value="enterprise">Custom Enterprise Solutions</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Message</label>
                <textarea 
                  rows={5} 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-light" 
                  placeholder="Tell us details about how we can help you..."
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2.5 transition-all text-white font-bold rounded-xl"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Contact Cards & FAQs */}
          <div className="lg:col-span-7 lg:max-w-none lg:w-full max-w-lg mx-auto w-full space-y-8 animate-slide-up">
            
            {/* Quick Contact Info Cards Grid */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-premium space-y-6">
              <h3 className="text-lg font-extrabold text-slate-900 font-display border-b border-slate-100 pb-4">
                Contact Channels
              </h3>

              <div className="grid gap-5">
                {/* Email Channel */}
                <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email</span>
                    <a 
                      href="mailto:projectforge.ai@gmail.com" 
                      className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1 mt-0.5 break-all"
                    >
                      projectforge.ai@gmail.com
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </div>

                {/* Phone Channel */}
                <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Support</span>
                    <a 
                      href="tel:+916377101431" 
                      className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors flex items-center gap-1 mt-0.5"
                    >
                      +91 6377101431
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Mon - Sat, 9 AM to 6 PM IST</span>
                  </div>
                </div>

                {/* Office Location */}
                <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Our Headquarters</span>
                    <span className="block text-sm font-semibold text-slate-800 mt-0.5">
                      Jaipur, Rajasthan, India
                    </span>
                  </div>
                </div>

                {/* Social Connect */}
                <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Social Connect</span>
                    <div className="flex flex-wrap gap-3">
                      <a 
                        href="https://linkedin.com" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-700 border border-transparent hover:border-indigo-100"
                      >
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                      </a>
                      <a 
                        href="https://instagram.com" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-pink-50 hover:text-pink-600 transition-colors text-xs font-bold text-slate-700 border border-transparent hover:border-pink-100"
                      >
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Guarantee & Stats */}
            <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full filter blur-xl group-hover:bg-blue-600/20 transition-colors"></div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm tracking-wider uppercase text-blue-400">Response Guarantee</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                All inquiries are processed securely and routed to expert engineers. Premium members receive 24/7/365 priority assistance.
              </p>
              
              <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-850 text-center">
                <div>
                  <span className="block text-lg font-black text-white">&lt; 2h</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Response</span>
                </div>
                <div>
                  <span className="block text-lg font-black text-white">99.4%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solved</span>
                </div>
                <div>
                  <span className="block text-lg font-black text-white">24/7</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hotline</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FAQs Accordion Section */}
        <div className="max-w-4xl mx-auto mt-20 animate-slide-up">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" /> Quick Answers
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-bold text-slate-800 pr-4">{faq.q}</span>
                    <span className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  
                  <div 
                    className={`transition-all duration-250 ease-in-out ${isOpen ? 'max-h-40 border-t border-slate-100' : 'max-h-0 pointer-events-none'}`}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="px-6 py-5 text-sm text-slate-600 leading-relaxed bg-slate-50/50">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
