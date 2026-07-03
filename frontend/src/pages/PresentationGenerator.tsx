import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Presentation, Sparkles, Download, FileText, CheckCircle2, FolderOpen, Upload, X, Info, Library } from 'lucide-react';

export default function PresentationGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<number | null>(null);
  const [savedTemplateName, setSavedTemplateName] = useState<string | null>(null);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pptx') {
        setTemplateFile(file);
        showToast(`Template "${file.name}" loaded — AI will match your college layout.`, 'success');
      } else {
        showToast('Please upload a .pptx template file.', 'danger');
      }
    }
  };

  // Pre-fill from ProjectDetails / TemplateManager navigation
  useEffect(() => {
    const state = location.state as { projectName?: string; components?: string; description?: string; templateId?: number; templateName?: string } | null;
    if (state?.projectName) {
      setTitle(state.projectName);
      setPrefilled(true);
    }
    if (state?.description || state?.components) {
      const parts: string[] = [];
      if (state.description) parts.push(state.description);
      if (state.components) parts.push(`Components used: ${state.components}`);
      setDetails(parts.join('\n'));
    }
    if (state?.templateId) {
      setSavedTemplateId(state.templateId);
      setSavedTemplateName(state.templateName || 'Saved Template');
    }
  }, [location.state]);
  
  const [result, setResult] = useState<{
    downloadUrl: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'danger') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !details.trim()) {
      showToast('Please enter project title and details.', 'danger');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('forge_token');
      
      // Backend uses multer multipart middleware, so we must send FormData
      const formData = new FormData();
      formData.append('title', title);
      formData.append('details', details);
      if (templateFile) {
        formData.append('templateFile', templateFile);
      }
      if (savedTemplateId) {
        formData.append('savedTemplateId', String(savedTemplateId));
      }

      const res = await fetch('/api/ai/ppt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Do NOT set Content-Type — browser sets it automatically with boundary for FormData
        },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setResult({ downloadUrl: data.downloadUrl });
        showToast('Presentation generated successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to generate presentation.', 'danger');
      }
    } catch (e) {
      showToast('Server connection error.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white border border-l-4 animate-slide-up ${
          toast.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'
        }`}>
          <span className="text-xs font-semibold text-slate-700">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-purple-600 text-xs font-medium transition">
            ← Dashboard
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-purple-600 font-bold tracking-wide uppercase">PPT Generator</span>
        </div>

        {prefilled && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700 font-medium">
            <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
            Project context pre-filled. Review the details and generate your presentation!
          </div>
        )}

        {savedTemplateName && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
            <Library className="w-3.5 h-3.5 text-amber-500" />
            Using saved template: <span className="font-bold">{savedTemplateName}</span>
            <button onClick={() => { setSavedTemplateId(null); setSavedTemplateName(null); }} className="ml-auto p-0.5 hover:bg-amber-100 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-start gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-purple-600 shadow-purple text-slate-900 shrink-0">
            <Presentation className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Presentation Generator <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Instantly create a professional 15-slide academic presentation (.pptx).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card-premium p-6 rounded-2xl">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Autonomous Drone for Delivery"
                    className="input-light w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                    Project Details / Abstract
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe the objective, components used, working mechanism, and expected outcomes..."
                    className="input-light w-full min-h-[160px] resize-y focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                
                {/* Template Upload */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2 flex items-center gap-2">
                    <Upload className="w-3 h-3" /> college Template (Optional)
                  </label>
                  
                  {templateFile ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-purple-700 truncate">{templateFile.name}</p>
                        <p className="text-[10px] text-purple-500">AI will match: colors, fonts, layout</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTemplateFile(null)}
                        className="p-1 rounded-lg hover:bg-purple-100 text-purple-400 hover:text-purple-600 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 px-4 py-5 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all group">
                      <Upload className="w-6 h-6 text-slate-600 group-hover:text-purple-500 transition" />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-600">Upload your college .pptx template</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">AI extracts branding colors, typography & logo</p>
                      </div>
                      <input type="file" accept=".pptx" onChange={handleTemplateChange} className="hidden" />
                    </label>
                  )}

                  <div className="flex items-start gap-1.5 mt-2">
                    <Info className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Without template: Premium theme is used. With template: AI extracts colors & layouts.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-slate-900 transition-all shadow-purple disabled:opacity-50 disabled:bg-slate-300 bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Designing Slides...</>
                  ) : (
                    <><Presentation className="w-4 h-4" /> Generate Presentation</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-7 space-y-6">
            {!result && !loading && (
              <div className="card-premium h-[450px] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <FileText className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Waiting for Project Details</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-sm">
                  The AI will generate 15 structured slides including Abstract, Circuit Diagrams, Flowcharts, and Results.
                </p>
              </div>
            )}

            {loading && (
              <div className="card-premium h-[450px] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Creating Slides...</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Structuring content, creating vector diagrams, and formatting slides. This may take 10-15 seconds.
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="card-premium h-[450px] rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-white to-purple-50/50 border-purple-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-200">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Presentation Ready!</h3>
                <p className="text-sm text-slate-600 max-w-sm mb-8">
                  Your 15-slide master presentation has been generated successfully. It includes text, vector diagrams, and professional styling.
                </p>
                <a
                  href={result.downloadUrl}
                  download
                  className="px-8 py-4 bg-purple-600 text-slate-900 rounded-xl font-bold shadow-purple hover:bg-purple-700 transition flex items-center gap-3 text-lg"
                >
                  <Download className="w-6 h-6" />
                  Download .PPTX
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
