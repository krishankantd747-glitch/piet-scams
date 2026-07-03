import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Sparkles, FileText, Download, Lock,
  ChevronDown, ChevronUp,
  BookMarked, Scale, TrendingUp
} from 'lucide-react';

export default function PatentGenerator() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Form
  const [form, setForm] = useState({
    projectTitle: '',
    abstract: '',
    components: '',
    innovation: ''
  });

  // Result
  const [patent, setPatent]   = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>('summary');

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

  const isLocked = user && user.subscription_status !== 'patent';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectTitle || !form.abstract || !form.innovation) return;
    if (isLocked) {
      showToast('Patent Generator requires the Patent plan.', 'info');
      return;
    }

    setLoading(true);
    setPatent(null);

    try {
      const res = await fetch('/api/ai/patent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setPatent(data);
        setActiveSection('summary');
        showToast(`Patent draft generated! Innovation score: ${data.innovationScore}/100`, 'success');
      } else {
        showToast(data.message || 'Patent generation failed.', 'danger');
      }
    } catch {
      showToast('Connection error. Is the server running?', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Score colour helper
  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-600' :
    s >= 60 ? 'text-amber-400'   : 'text-red-400';

  const scoreBarColor = (s: number) =>
    s >= 80 ? 'bg-emerald-500' :
    s >= 60 ? 'bg-amber-500'   : 'bg-red-500';

  const sections = [
    { id: 'summary',    label: 'Summary',       icon: <FileText  className="w-3.5 h-3.5" /> },
    { id: 'claims',     label: 'Claims',         icon: <Scale     className="w-3.5 h-3.5" /> },
    { id: 'prior',      label: 'Prior Art',      icon: <BookMarked className="w-3.5 h-3.5" /> },
    { id: 'score',      label: 'Innovation Score',icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white shadow-premium border border-slate-200 border-l-4 animate-slide-up ${
          toast.type === 'success' ? 'border-l-emerald-500' :
          toast.type === 'danger'  ? 'border-l-red-500'     : 'border-l-purple-500'
        }`}>
          <span className="text-xs font-semibold text-slate-200">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-slate-600 text-xs transition">
            ← Dashboard
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-purple-400 font-semibold">Patent Drafter</span>
        </div>

        {/* Page Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/40">
            <Award className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Patent Drafting Assistant
              <Sparkles className="w-5 h-5 text-purple-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Generate a complete patent application — field of invention, claims, prior art, abstract, and innovation score. Exports as DOCX.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT: Input Form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Plan lock notice */}
            {isLocked && (
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/40 flex items-start gap-3 text-xs text-purple-300">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <div>
                  <div className="font-bold text-purple-300 mb-1">Patent Plan Required</div>
                  <p className="text-purple-400 leading-relaxed">
                    Patent Drafting Assistant is exclusively available on the Patent plan (₹199/month). Includes all Premium features plus patent assistance.
                  </p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-[10px] uppercase transition"
                  >
                    Upgrade to Patent Plan →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="block text-[10px] uppercase font-bold text-purple-400 tracking-widest">Invention Details</span>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Project / Invention Title *</label>
                <input
                  type="text"
                  required
                  value={form.projectTitle}
                  onChange={e => setForm({ ...form, projectTitle: e.target.value })}
                  placeholder="Adaptive IoT-Based Smart Energy Management System"
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Abstract / Description *</label>
                <textarea
                  required
                  rows={4}
                  value={form.abstract}
                  onChange={e => setForm({ ...form, abstract: e.target.value })}
                  placeholder="Describe what the invention does, the problem it solves, and how it works technically..."
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Hardware Components</label>
                <input
                  type="text"
                  value={form.components}
                  onChange={e => setForm({ ...form, components: e.target.value })}
                  placeholder="ESP32, Solar panel, MPPT controller, Li-Ion battery..."
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Key Innovation / Novel Claim *</label>
                <textarea
                  required
                  rows={3}
                  value={form.innovation}
                  onChange={e => setForm({ ...form, innovation: e.target.value })}
                  placeholder="What makes this invention unique? E.g. 'Novel adaptive Kalman-filtered MPPT algorithm that dynamically adjusts charge rates based on real-time weather sensor fusion without cloud dependency...'"
                  className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || isLocked}
                className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-slate-200 font-bold text-sm text-slate-900 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Drafting patent application...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" /> Generate Patent Draft
                  </>
                )}
              </button>
            </form>

            {/* Download card (shown after generation) */}
            {patent?.docxUrl && (
              <div className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-purple-800/40 bg-purple-950/10 space-y-3">
                <span className="block text-[10px] uppercase font-bold text-purple-400 tracking-widest">Export Patent</span>
                <a
                  href={patent.docxUrl}
                  download
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-100 border border-slate-200 hover:border-purple-700 transition group"
                >
                  <div className="p-2.5 rounded-lg bg-purple-950/50 border border-purple-800/50 group-hover:bg-purple-900/50 transition">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Patent Draft (.docx)</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Full patent application document</div>
                  </div>
                  <Download className="w-4 h-4 text-purple-400 ml-auto" />
                </a>
              </div>
            )}
          </div>

          {/* ── RIGHT: Result Viewer ── */}
          <div className="lg:col-span-3">

            {/* Empty state */}
            {!patent && !loading && (
              <div className="flex flex-col items-center justify-center min-h-[480px] bg-white shadow-premium border border-slate-200 rounded-2xl border border-slate-200 text-center px-8">
                <Award className="w-14 h-14 text-purple-800/50 mb-4 animate-pulse-subtle" />
                <p className="text-slate-600 text-sm font-semibold">No patent draft yet</p>
                <p className="text-slate-600 text-xs mt-1 max-w-xs">
                  Fill in the invention details on the left and click Generate Patent Draft
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {['Claims', 'Prior Art', 'Abstract', 'Innovation Score'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center min-h-[480px] bg-white shadow-premium border border-slate-200 rounded-2xl border border-slate-200 text-center">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mb-4" />
                <p className="text-slate-600 text-sm">Drafting patent application...</p>
                <p className="text-slate-600 text-xs mt-1">Generating claims, prior art, and scoring innovation</p>
              </div>
            )}

            {/* Patent Results */}
            {patent && !loading && (
              <div className="space-y-4 animate-fade-in">

                {/* Innovation Score banner */}
                <div className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-purple-800/40 bg-purple-950/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">{patent.title}</h2>
                      <p className="text-xs text-slate-600 mt-0.5">Patent Application Draft</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-extrabold ${scoreColor(patent.innovationScore)}`}>
                        {patent.innovationScore}
                        <span className="text-lg text-slate-600">/100</span>
                      </div>
                      <div className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Innovation Score</div>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full score-bar ${scoreBarColor(patent.innovationScore)}`}
                      style={{ width: `${patent.innovationScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>0</span><span>Low</span><span>Medium</span><span>High</span><span>100</span>
                  </div>
                </div>

                {/* Section tabs */}
                <div className="flex gap-2 flex-wrap">
                  {sections.map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSection(sec.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                        activeSection === sec.id
                          ? 'bg-purple-950/50 border-purple-800/60 text-purple-300'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sec.icon} {sec.label}
                    </button>
                  ))}
                </div>

                {/* ── Section: Summary ── */}
                {activeSection === 'summary' && (
                  <div className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-slate-200 space-y-5 animate-fade-in">
                    <Section title="Field of Invention" color="text-purple-400">
                      <p className="text-xs text-slate-600 leading-relaxed">{patent.fieldOfInvention}</p>
                    </Section>
                    <Section title="Background" color="text-amber-400">
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{patent.backgroundOfInvention}</p>
                    </Section>
                    <Section title="Summary of Invention" color="text-emerald-600">
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{patent.summaryOfInvention}</p>
                    </Section>
                    <Section title="Abstract (Filing)" color="text-blue-600">
                      <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white shadow-sm p-3 rounded-xl border border-slate-200">
                        {patent.abstractDraft}
                      </p>
                    </Section>
                  </div>
                )}

                {/* ── Section: Claims ── */}
                {activeSection === 'claims' && (
                  <div className="space-y-3 animate-fade-in">
                    {patent.claims?.map((claim: any) => (
                      <div key={claim.claimNumber} className="bg-white shadow-premium border border-slate-200 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            claim.type === 'independent'
                              ? 'bg-purple-950/50 text-purple-400 border border-purple-800/40'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {claim.type}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">Claim {claim.claimNumber}</span>
                          {claim.dependsOn && (
                            <span className="text-[9px] text-blue-600 font-mono">→ depends on {claim.dependsOn}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{claim.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Section: Prior Art ── */}
                {activeSection === 'prior' && (
                  <div className="space-y-3 animate-fade-in">
                    {patent.priorArtSummary?.map((art: any, i: number) => (
                      <div key={i} className="bg-white shadow-premium border border-slate-200 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 leading-snug">{art.reference}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono shrink-0">{art.year}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">Relevance</span>
                          <p className="text-xs text-slate-600 mt-0.5">{art.relevance}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Our Differentiator</span>
                          <p className="text-xs text-slate-600 mt-0.5">{art.differentiator}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Section: Innovation Score ── */}
                {activeSection === 'score' && (
                  <div className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className={`text-5xl font-extrabold ${scoreColor(patent.innovationScore)}`}>
                        {patent.innovationScore}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">out of 100</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {patent.innovationScore >= 80 ? '🏆 Highly Patentable' :
                           patent.innovationScore >= 60 ? '✅ Patentable Subject Matter' :
                           '⚠️ Needs Stronger Novelty Claims'}
                        </div>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full score-bar ${scoreBarColor(patent.innovationScore)}`}
                        style={{ width: `${patent.innovationScore}%` }}
                      />
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest block mb-2">Rationale</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-white shadow-sm p-4 rounded-xl border border-slate-200 font-mono">
                        {patent.innovationRationale}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest block mb-3">Interpretation Guide</span>
                      <div className="space-y-2">
                        {[
                          { range: '80–100', label: 'Highly Patentable', color: 'text-emerald-600', bar: 'bg-emerald-500' },
                          { range: '60–79',  label: 'Patentable with Minor Amendments', color: 'text-amber-400', bar: 'bg-amber-500' },
                          { range: '< 60',   label: 'Requires Stronger Novelty Differentiation', color: 'text-red-400', bar: 'bg-red-500' },
                        ].map(row => (
                          <div key={row.range} className="flex items-center gap-3 text-xs">
                            <div className={`w-3 h-3 rounded-full ${row.bar} shrink-0`} />
                            <span className="font-mono text-slate-600 w-16 shrink-0">{row.range}</span>
                            <span className={row.color}>{row.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper sub-component
function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-slate-200/60 pt-4 first:border-0 first:pt-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <span className={`text-[10px] uppercase font-bold tracking-widest ${color}`}>{title}</span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-600 transition" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-600 transition" />
        }
      </button>
      {open && children}
    </div>
  );
}
