import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Sparkles, Download, CheckCircle2, FileSignature, Upload, X, FolderOpen, Info, Library } from 'lucide-react';

export default function ReportGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<number | null>(null);
  const [savedTemplateName, setSavedTemplateName] = useState<string | null>(null);

  const [result, setResult] = useState<{
    docxUrl: string;
    pdfUrl: string;
    wordCount?: number;
  } | null>(null);

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
      setDescription(parts.join('\n'));
    }
    if (state?.templateId) {
      setSavedTemplateId(state.templateId);
      setSavedTemplateName(state.templateName || 'Saved Template');
    }
  }, [location.state]);

  const showToast = (text: string, type: 'success' | 'danger') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx' || ext === 'pdf') {
        setTemplateFile(file);
        showToast(`Template "${file.name}" loaded — AI will match your college format.`, 'success');
      } else {
        showToast('Please upload a .docx or .pdf template file.', 'danger');
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please enter report title and description.', 'danger');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('forge_token');
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (templateFile) {
        formData.append('templateFile', templateFile);
      }
      if (savedTemplateId) {
        formData.append('savedTemplateId', String(savedTemplateId));
      }

      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
        showToast('Report generated successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to generate report.', 'danger');
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
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-rose-600 text-xs font-medium transition">
            ← Dashboard
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-rose-600 font-bold tracking-wide uppercase">Report Writer</span>
        </div>

        {prefilled && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
            <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
            Project context pre-filled from your saved project. Review and generate your report!
          </div>
        )}

        {savedTemplateName && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
            <Library className="w-3.5 h-3.5 text-blue-500" />
            Using saved template: <span className="font-bold">{savedTemplateName}</span>
            <button onClick={() => { setSavedTemplateId(null); setSavedTemplateName(null); }} className="ml-auto p-0.5 hover:bg-blue-100 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-start gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-rose-600 shadow-rose text-slate-900 shrink-0">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Academic Report Writer <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Generate 30+ page IEEE format documentation. Upload your college template for exact formatting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card-premium p-6 rounded-2xl border-t-4 border-t-rose-500">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Smart Irrigation System using IoT"
                    className="input-light w-full focus:ring-rose-500 focus:border-rose-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                    System Details & Components
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Include components (NodeMCU, Soil Moisture Sensor, Relay), working principle, objectives..."
                    className="input-light w-full min-h-[140px] resize-y focus:ring-rose-500 focus:border-rose-500"
                    required
                  />
                </div>

                {/* Template Upload */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2 flex items-center gap-2">
                    <Upload className="w-3 h-3" /> College Template (Optional)
                  </label>
                  
                  {templateFile ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-rose-700 truncate">{templateFile.name}</p>
                        <p className="text-[10px] text-rose-500">AI will match: cover, fonts, margins, numbering</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTemplateFile(null)}
                        className="p-1 rounded-lg hover:bg-rose-100 text-rose-400 hover:text-rose-600 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 px-4 py-5 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50/30 transition-all group">
                      <Upload className="w-6 h-6 text-slate-600 group-hover:text-rose-500 transition" />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-600">Upload your college .docx or .pdf template</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">AI detects cover, certificate, headings, margins & numbering</p>
                      </div>
                      <input type="file" accept=".docx,.pdf" onChange={handleTemplateChange} className="hidden" />
                    </label>
                  )}

                  <div className="flex items-start gap-1.5 mt-2">
                    <Info className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Without template: Standard IEEE format is used. With template: AI extracts your institution's exact formatting.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-slate-900 transition-all shadow-rose disabled:opacity-50 disabled:bg-slate-300 bg-rose-600 hover:bg-rose-700"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Drafting Report...</>
                  ) : (
                    <><FileSignature className="w-4 h-4" /> Generate Full Report</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-7 space-y-6">
            {!result && !loading && (
              <div className="card-premium h-[500px] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <FileText className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No Report Generated</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-sm">
                  Enter your project details on the left. Optionally upload your college template for exact formatting.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs">
                  {['Abstract', 'Hardware Design', 'Software Module', 'Circuit Diagrams', 'Results', 'IEEE References'].map(ch => (
                    <div key={ch} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-600 text-left">
                      📄 {ch}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="card-premium h-[500px] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Writing Report...</h3>
                <p className="text-sm text-slate-600 mt-2">
                  {templateFile ? `Matching your template format · ` : ''}Drafting chapters, circuit SVGs, IEEE standards...
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-xs">
                  {['Abstract', 'Introduction', 'Hardware', 'Software', 'Results', 'References'].map((ch, i) => (
                    <span key={ch} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="card-premium min-h-[500px] rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-white to-rose-50/30 border-rose-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-200">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Report Ready for Download!</h3>
                <p className="text-sm text-slate-600 max-w-sm mb-2">
                  Your major project dissertation has been fully generated{templateFile ? ` matching your "${templateFile.name}" template` : ' in IEEE format'}.
                </p>
                {result.wordCount && (
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg mb-8 border border-slate-200">
                    ~{result.wordCount} words generated
                  </span>
                )}
                
                <div className="flex gap-4">
                  <a
                    href={result.docxUrl}
                    download
                    className="px-6 py-3.5 bg-rose-600 text-slate-900 rounded-xl font-bold shadow-rose hover:bg-rose-700 transition flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download DOCX
                  </a>
                  {result.pdfUrl && (
                    <a
                      href={result.pdfUrl}
                      download
                      className="px-6 py-3.5 bg-slate-200 text-slate-900 rounded-xl font-bold shadow-sm hover:bg-slate-700 transition flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
