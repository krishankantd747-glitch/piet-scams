import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Trash2, FileText, Presentation, Sparkles,
  FolderOpen, CheckCircle2, RefreshCw, Lock, Pencil,
  X, ExternalLink, Star, ChevronRight, Info, Download
} from 'lucide-react';

interface Template {
  id: number;
  template_name: string;
  template_type: 'ppt' | 'report';
  file_path: string;
  styles: {
    bgColor?: string;
    titleFont?: string;
    bodyFont?: string;
    accentColor?: string;
    fileType?: string;
    originalName?: string;
    uploadedAt?: string;
  };
  created_at: string;
}

export default function TemplateManager() {
  const navigate = useNavigate();
  const [token, setToken]   = useState<string | null>(null);
  const [user, setUser]     = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]   = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeType, setActiveType] = useState<'ppt' | 'report'>('ppt');

  // Upload form
  const [uploadType, setUploadType] = useState<'ppt' | 'report'>('ppt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renamingId, setRenamingId]   = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const t = localStorage.getItem('forge_token');
    const u = localStorage.getItem('forge_user');
    if (!t) { navigate('/login'); return; }
    setToken(t);
    if (u) setUser(JSON.parse(u));
    fetchTemplates(t);
  }, []);

  useEffect(() => {
    if (renamingId !== null) {
      setTimeout(() => renameRef.current?.focus(), 50);
    }
  }, [renamingId]);

  const fetchTemplates = async (t?: string) => {
    const tok = t || token;
    if (!tok) return;
    setLoading(true);
    try {
      const res = await fetch('/api/templates/my-templates', {
        headers: { 'Authorization': `Bearer ${tok}` }
      });
      if (res.ok) setTemplates(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pptx', 'ppt', 'docx', 'doc'].includes(ext || '')) {
        setSelectedFile(file);
        // Auto detect type
        if (['pptx', 'ppt'].includes(ext || '')) setUploadType('ppt');
        else setUploadType('report');
      } else {
        showToast('Only .pptx, .ppt, .docx, .doc files are supported.', 'danger');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !token) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('templateFile', selectedFile);
    formData.append('template_type', uploadType);

    try {
      const res = await fetch('/api/templates/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Template "${selectedFile.name}" uploaded successfully!`, 'success');
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = '';
        fetchTemplates();
      } else {
        showToast(data.message || 'Upload failed.', 'danger');
      }
    } catch {
      showToast('Upload failed. Check server connection.', 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Template deleted.', 'success');
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        showToast('Delete failed.', 'danger');
      }
    } catch {
      showToast('Error deleting template.', 'danger');
    }
  };

  const startRename = (tpl: Template) => {
    setRenamingId(tpl.id);
    setRenameValue(tpl.template_name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const saveRename = async (id: number) => {
    if (!renameValue.trim()) { cancelRename(); return; }
    try {
      const res = await fetch(`/api/templates/${id}/rename`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: renameValue.trim() })
      });
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, template_name: renameValue.trim() } : t));
        showToast('Template renamed successfully.', 'success');
      } else {
        showToast('Rename failed.', 'danger');
      }
    } catch {
      showToast('Error renaming template.', 'danger');
    }
    cancelRename();
  };

  const useTemplate = (tpl: Template) => {
    if (tpl.template_type === 'ppt') {
      navigate('/dashboard/presentation', { state: { templateId: tpl.id, templateName: tpl.template_name } });
    } else {
      navigate('/dashboard/report', { state: { templateId: tpl.id, templateName: tpl.template_name } });
    }
  };

  const isLocked = user && user.subscription_status === 'free';
  const filtered  = templates.filter(t => t.template_type === activeType);
  const pptCount  = templates.filter(t => t.template_type === 'ppt').length;
  const repCount  = templates.filter(t => t.template_type === 'report').length;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-800 min-h-screen">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-slide-up transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toast.type === 'danger'  ? 'bg-red-50 border-red-200 text-red-800' :
                                     'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-xs text-slate-600">
          <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 transition font-medium">Dashboard</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blue-600 font-semibold">Template Manager</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
            <Upload className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Smart Template Engine
              <Sparkles className="w-5 h-5 text-blue-500" />
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Upload your college PPTX or DOCX format templates. ProjectForge AI will read your layout, fonts, and colours — and mirror them when generating outputs.
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { label: 'Total Templates', value: templates.length, icon: <FolderOpen className="w-4 h-4" />, color: 'blue' },
            { label: 'PPT Templates',   value: pptCount, icon: <Presentation className="w-4 h-4" />, color: 'amber' },
            { label: 'Report Templates',value: repCount, icon: <FileText className="w-4 h-4" />,     color: 'emerald' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm`}>
              <div className={`p-1.5 rounded-lg ${
                s.color === 'blue'   ? 'bg-blue-100 text-blue-600' :
                s.color === 'amber'  ? 'bg-amber-100 text-amber-600' :
                                       'bg-emerald-100 text-emerald-600'
              }`}>
                {s.icon}
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 leading-none">{s.value}</div>
                <div className="text-[10px] text-slate-600 font-medium mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan lock notice */}
        {isLocked && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800 text-sm mb-1">Upgrade Required</div>
              <p className="text-amber-700 text-xs">Template uploads are available on Student, Premium, and Patent plans.</p>
              <button
                onClick={() => navigate('/pricing')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-[11px] uppercase transition"
              >
                View Plans →
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT: Upload Form ── */}
          <div className="lg:col-span-2 space-y-4">
            <form
              onSubmit={handleUpload}
              className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl space-y-5"
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Upload New Template</span>
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Template Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ppt','report'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setUploadType(type)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all ${
                        uploadType === type
                          ? type === 'ppt'
                            ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                            : 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {type === 'ppt'
                        ? <><Presentation className="w-4 h-4" /> PPT Template</>
                        : <><FileText className="w-4 h-4" /> Report Template</>
                      }
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-600 mt-2">
                  {uploadType === 'ppt'
                    ? '📊 Upload a .pptx file — AI reads slide layout, colours, and fonts.'
                    : '📄 Upload a .docx file — AI reads heading styles, margins, and fonts.'}
                </p>
              </div>

              {/* File drop zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Select File</label>
                <div
                  className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-6 flex flex-col items-center justify-center gap-2 text-center ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50/60'
                      : selectedFile
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pptx,.ppt,.docx,.doc"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <p className="text-sm font-bold text-emerald-700">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-600">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600">Drop file here or click to browse</p>
                      <p className="text-[11px] text-slate-600">.pptx, .ppt, .docx, .doc — Max 20MB</p>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploading || !!isLocked}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-slate-900 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading & Analyzing Template...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload Template
                  </>
                )}
              </button>
            </form>

            {/* How it works */}
            <div className="bg-white shadow-sm border border-slate-200 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">How It Works</span>
              </div>
              {[
                { n: '1', icon: '📤', text: 'Upload your college-format DOCX or PPTX template.' },
                { n: '2', icon: '🔍', text: 'AI reads fonts, colors, margins, and slide layouts.' },
                { n: '3', icon: '✨', text: 'When you generate a report or PPT, it mirrors your template exactly.' },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {step.n}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.icon} {step.text}</p>
                </div>
              ))}
            </div>

            {/* Supported formats */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl text-slate-900 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-bold uppercase tracking-wider">Supported Templates</span>
              </div>
              {[
                '🎓 College / University PPT Format',
                '📋 AICTE IDEA Lab PPT Format',
                '🏆 Project Expo PPT Format',
                '📝 IEEE / Standard Report DOCX',
                '🏛️ University Synopsis / Thesis DOCX',
                '💼 Company Report / Proposal DOCX',
              ].map(item => (
                <div key={item} className="text-xs text-blue-100 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-300 inline-block" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Template Library ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['ppt','report'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      activeType === type
                        ? type === 'ppt'
                          ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                          : 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {type === 'ppt'
                      ? <><Presentation className="w-3.5 h-3.5" /> PPT ({pptCount})</>
                      : <><FileText className="w-3.5 h-3.5" /> Report ({repCount})</>
                    }
                  </button>
                ))}
              </div>
              <button
                onClick={() => fetchTemplates()}
                className="p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center min-h-[200px] bg-white rounded-2xl border border-slate-200">
                <div className="flex flex-col items-center gap-3">
                  <span className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 font-medium">Loading templates...</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center min-h-[380px] bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-700 text-sm font-semibold">No {activeType === 'ppt' ? 'PPT' : 'Report'} templates yet</p>
                <p className="text-slate-600 text-xs mt-1 max-w-xs">
                  Upload a {activeType === 'ppt' ? '.pptx' : '.docx'} template using the form on the left. AI will analyze and save it to your library.
                </p>
                <button
                  onClick={() => { setUploadType(activeType); fileRef.current?.click(); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-slate-900 text-xs font-bold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload First Template
                </button>
              </div>
            )}

            {/* Template cards grid */}
            {filtered.length > 0 && !loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map(tpl => (
                  <div
                    key={tpl.id}
                    className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3 group"
                  >
                    {/* Icon + Name */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        tpl.template_type === 'ppt'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        {tpl.template_type === 'ppt'
                          ? <Presentation className="w-4 h-4 text-amber-600" />
                          : <FileText className="w-4 h-4 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        {renamingId === tpl.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              ref={renameRef}
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveRename(tpl.id);
                                if (e.key === 'Escape') cancelRename();
                              }}
                              className="flex-1 text-xs font-bold border border-blue-400 rounded-lg px-2 py-1 text-slate-800 bg-blue-50 outline-none"
                            />
                            <button
                              onClick={() => saveRename(tpl.id)}
                              className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelRename}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-900 truncate" title={tpl.template_name}>
                            {tpl.template_name}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-600 mt-0.5 font-mono uppercase">
                          {tpl.styles?.fileType?.toUpperCase() || 'FILE'} • {tpl.template_type === 'ppt' ? 'Presentation' : 'Report'} Layout
                        </p>
                      </div>
                    </div>

                    {/* Style preview chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.styles?.titleFont && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] text-slate-600 font-medium">
                          🔤 {tpl.styles.titleFont}
                        </span>
                      )}
                      {tpl.styles?.bgColor && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] text-slate-600 font-medium flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block border border-white shadow-sm"
                            style={{ backgroundColor: `#${tpl.styles.bgColor}` }}
                          />
                          #{tpl.styles.bgColor}
                        </span>
                      )}
                      {tpl.styles?.accentColor && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] text-slate-600 font-medium flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block border border-white shadow-sm"
                            style={{ backgroundColor: `#${tpl.styles.accentColor}` }}
                          />
                          Accent
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                      <span className="text-[10px] text-slate-600 font-mono">
                        {new Date(tpl.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Use Template */}
                        <button
                          onClick={() => useTemplate(tpl)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            tpl.template_type === 'ppt'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                          title="Use in Generator"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Use
                        </button>

                        {/* Rename */}
                        <button
                          onClick={() => startRename(tpl)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
                          title="Rename template"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Download */}
                        <a
                          href={tpl.file_path}
                          download
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
                          title="Download template file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(tpl.id, tpl.template_name)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick use shortcuts */}
            {templates.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-slate-800">Quick Generate with Templates</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/dashboard/presentation')}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition group"
                  >
                    <Presentation className="w-5 h-5 text-amber-600" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-amber-800">Generate PPT</p>
                      <p className="text-[10px] text-amber-600">{pptCount} template{pptCount !== 1 ? 's' : ''} ready</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/report')}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition group"
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-blue-800">Generate Report</p>
                      <p className="text-[10px] text-blue-600">{repCount} template{repCount !== 1 ? 's' : ''} ready</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
