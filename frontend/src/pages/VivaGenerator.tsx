import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Sparkles, ChevronDown, ChevronUp,
  BookOpen, Shield, Download, Lock
} from 'lucide-react';

const difficultyStyles: Record<string, string> = {
  basic:        'pill-basic',
  intermediate: 'pill-intermediate',
  advanced:     'pill-advanced',
  examiner:     'pill-examiner',
};

const categoryColors: Record<string, string> = {
  concept:        'text-blue-600',
  design:         'text-amber-400',
  implementation: 'text-emerald-600',
  theory:         'text-purple-400',
};

export default function VivaGenerator() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Form
  const [form, setForm] = useState({
    projectTitle: '',
    projectDescription: '',
    components: '',
    examinerMode: false
  });

  // Results
  const [questions, setQuestions] = useState<any[]>([]);
  const [_vivaId, setVivaId] = useState<number | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [filterDiff, setFilterDiff] = useState<string>('all');
  const [showAnswers, setShowAnswers] = useState(true);

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const t = localStorage.getItem('forge_token');
    const u = localStorage.getItem('forge_user');
    if (!t) { navigate('/login'); return; }
    setToken(t);
    if (u) setUser(JSON.parse(u));
  }, []);

  const isPlanLocked = user && user.subscription_status === 'free';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectTitle || !form.projectDescription) return;
    if (isPlanLocked) {
      showToast('Viva Generator requires Student, Premium, or Patent plan.', 'info');
      return;
    }

    setLoading(true);
    setQuestions([]);
    setVivaId(null);
    setExpandedQ(null);

    try {
      const res = await fetch('/api/ai/viva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectTitle: form.projectTitle,
          projectDescription: form.projectDescription,
          components: form.components,
          examinerMode: form.examinerMode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        setVivaId(data.vivaId);
        showToast(`${data.questions?.length} viva questions generated!`, 'success');
      } else {
        showToast(data.message || 'Viva generation failed.', 'danger');
      }
    } catch {
      showToast('Connection error. Is the server running?', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterDiff === 'all'
    ? questions
    : questions.filter(q => q.difficulty === filterDiff);

  const printViva = () => {
    window.print();
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white shadow-premium border border-slate-200 border-l-4 animate-slide-up ${
          toast.type === 'success' ? 'border-l-emerald-500' :
          toast.type === 'danger'  ? 'border-l-red-500'     : 'border-l-indigo-500'
        }`}>
          <span className="text-xs font-semibold text-slate-200">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-slate-600 text-xs transition">← Dashboard</button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-emerald-600 font-semibold">Viva Generator</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40">
            <GraduationCap className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Viva Voce Q&A Generator
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Generate 15–20 model viva questions with detailed answers. Enable Examiner Mode for hard external questions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan lock notice */}
            {isPlanLocked && (
              <div className="p-4 rounded-xl bg-blue-50/20 border border-indigo-900/40 flex items-start gap-3 text-xs text-indigo-300">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">Plan Required</div>
                  <p>Viva Generator requires Student, Premium, or Patent plan.</p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-[10px] uppercase transition"
                  >
                    Upgrade Plan →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="block text-[10px] uppercase font-bold text-emerald-600 tracking-widest">Project Details</span>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Project Title *</label>
                <input
                  type="text"
                  required
                  value={form.projectTitle}
                  onChange={e => setForm({ ...form, projectTitle: e.target.value })}
                  placeholder="Smart Solar Tracking System using STM32"
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Project Description *</label>
                <textarea
                  required
                  rows={4}
                  value={form.projectDescription}
                  onChange={e => setForm({ ...form, projectDescription: e.target.value })}
                  placeholder="Describe what the project does, how it works, and its objectives..."
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Components Used (Optional)</label>
                <input
                  type="text"
                  value={form.components}
                  onChange={e => setForm({ ...form, components: e.target.value })}
                  placeholder="STM32, LDR Sensor, Servo Motor, L298N..."
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900"
                />
              </div>

              {/* Examiner Mode Toggle */}
              <div className={`p-4 rounded-xl border transition ${
                form.examinerMode
                  ? 'bg-purple-950/20 border-purple-800/50'
                  : 'bg-white shadow-sm border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-400" /> Examiner Mode
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">Adds 5 hard external examiner questions (20 total)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, examinerMode: !form.examinerMode })}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                      form.examinerMode ? 'bg-purple-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      form.examinerMode ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isPlanLocked}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-200 font-bold text-sm text-slate-900 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Compiling viva questions...
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4" />
                    Generate {form.examinerMode ? '20' : '15'} Viva Questions
                  </>
                )}
              </button>
            </form>

            {/* Stats card when questions are loaded */}
            {questions.length > 0 && (
              <div className="bg-white shadow-premium border border-slate-200 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="block text-[10px] uppercase font-bold text-slate-600 tracking-widest">Session Stats</span>
                {(['basic','intermediate','advanced','examiner'] as const).map(diff => {
                  const count = questions.filter(q => q.difficulty === diff).length;
                  if (!count) return null;
                  return (
                    <div key={diff} className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${difficultyStyles[diff]}`}>{diff}</span>
                      <span className="text-slate-600 font-mono">{count} Q</span>
                    </div>
                  );
                })}
                <button
                  onClick={printViva}
                  className="w-full mt-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-600 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Q&A Results */}
          <div className="lg:col-span-3 space-y-4">
            {questions.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-white shadow-premium border border-slate-200 rounded-2xl border border-slate-200 text-center px-8">
                <GraduationCap className="w-12 h-12 text-emerald-800/50 mb-4 animate-pulse-subtle" />
                <p className="text-slate-600 text-sm font-semibold">No questions generated yet</p>
                <p className="text-slate-600 text-xs mt-1">Fill in the form and click Generate</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-white shadow-premium border border-slate-200 rounded-2xl border border-slate-200 text-center">
                <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
                <p className="text-slate-600 text-sm">Compiling viva questions & model answers...</p>
              </div>
            )}

            {questions.length > 0 && (
              <>
                {/* Filter + Toggle Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white shadow-premium border border-slate-200 px-4 py-3 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    {(['all','basic','intermediate','advanced','examiner'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setFilterDiff(d)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                          filterDiff === d
                            ? 'bg-emerald-600 text-slate-900'
                            : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition border border-slate-200"
                  >
                    {showAnswers ? 'Hide' : 'Show'} Answers
                  </button>
                </div>

                {/* Question cards */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filtered.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`bg-white shadow-premium border border-slate-200 rounded-xl border transition-all duration-200 overflow-hidden ${
                        expandedQ === idx ? 'border-emerald-800/50' : 'border-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <button
                        className="w-full flex items-start gap-3 p-4 text-left"
                        onClick={() => setExpandedQ(expandedQ === idx ? null : idx)}
                      >
                        <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {q.id}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-900 leading-relaxed">{q.question}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${difficultyStyles[q.difficulty] || 'text-slate-600'}`}>
                              {q.difficulty}
                            </span>
                            <span className={`text-[9px] font-mono uppercase ${categoryColors[q.category] || 'text-slate-600'}`}>
                              {q.category}
                            </span>
                          </div>
                        </div>
                        {expandedQ === idx
                          ? <ChevronUp className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                          : <ChevronDown className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        }
                      </button>

                      {expandedQ === idx && showAnswers && (
                        <div className="px-4 pb-4 border-t border-slate-200/60 pt-3 animate-fade-in">
                          <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-emerald-600 tracking-widest mb-2">
                            <BookOpen className="w-3 h-3" /> Model Answer
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white shadow-sm p-3 rounded-lg border border-slate-200/60">
                            {q.answer}
                          </p>
                        </div>
                      )}

                      {expandedQ === idx && !showAnswers && (
                        <div className="px-4 pb-4 border-t border-slate-200/60 pt-3">
                          <p className="text-[10px] text-slate-600 italic text-center py-2">Answer hidden — practice mode on</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
