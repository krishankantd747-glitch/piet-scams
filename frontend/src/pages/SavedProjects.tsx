import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark, Trash2, ExternalLink, Folder, ChevronDown, ChevronUp,
  ArrowLeft, Sparkles
} from 'lucide-react';

export default function SavedProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  const showToast = (text: string, type: 'success' | 'danger') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSaved = async () => {
    const t = localStorage.getItem('forge_token');
    if (!t) { navigate('/login'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/projects/saved', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) setProjects(await res.json());
    } catch {
      showToast('Failed to load saved projects.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSaved(); }, []);

  const handleUnsave = async (projectId: number) => {
    const t = localStorage.getItem('forge_token');
    if (!t) return;
    setRemovingId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/unsave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (expandedId === projectId) setExpandedId(null);
        showToast('Project removed from saved.', 'success');
      } else {
        showToast('Failed to remove project.', 'danger');
      }
    } catch {
      showToast('Network error.', 'danger');
    } finally {
      setRemovingId(null);
    }
  };

  // Skeleton card
  const SkeletonCard = () => (
    <div className="p-5 rounded-xl border border-slate-200/60 bg-slate-50 animate-pulse space-y-3">
      <div className="h-4 w-3/4 bg-slate-200 rounded" />
      <div className="h-3 w-full bg-slate-200/60 rounded" />
      <div className="h-3 w-2/3 bg-slate-200/60 rounded" />
      <div className="flex gap-2 pt-2">
        <div className="h-7 w-20 bg-slate-200 rounded-lg" />
        <div className="h-7 w-20 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white shadow-premium border border-slate-200 border-l-4 transition-all duration-300 ${
          toast.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'
        }`}>
          <span className="text-xs font-semibold text-slate-200">{toast.text}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600" />
              Saved Projects
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {loading ? 'Loading...' : `${projects.length} saved project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-slate-900 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-5">
              <Folder className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-base font-bold text-slate-600 mb-2">No Saved Projects</h3>
            <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
              Generate projects from the AI Generators workspace and save them here for quick access.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-slate-900 transition"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p) => {
              const content = typeof p.content === 'string' ? JSON.parse(p.content) : p.content;
              const isExpanded = expandedId === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200/80 bg-white shadow-premium border border-slate-200 hover:border-slate-700 transition flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">{p.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-blue-600 uppercase font-mono font-bold">
                            {p.project_type}
                          </span>
                          {content?.difficultyLevel && (
                            <span className="text-[8px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-emerald-600 uppercase font-mono">
                              {content.difficultyLevel}
                            </span>
                          )}
                        </div>
                      </div>
                      <Bookmark className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-mono line-clamp-3">
                      {content?.abstract || p.description}
                    </p>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                        {content?.objectives?.length > 0 && (
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-600 mb-1.5">Objectives</span>
                            <ul className="space-y-1 text-[11px] text-slate-600 font-mono">
                              {content.objectives.map((o: string, i: number) => (
                                <li key={i}>• {o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {content?.components?.length > 0 && (
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-600 mb-1.5">Components</span>
                            <div className="flex flex-wrap gap-1">
                              {content.components.map((c: string, i: number) => (
                                <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {content?.costEstimation && (
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-600 mb-1">Budget</span>
                            <p className="text-[11px] text-emerald-600 font-mono">{content.costEstimation}</p>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-600">
                          Saved: {new Date(p.saved_at || p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="px-5 pb-4 flex items-center gap-2 border-t border-slate-200 pt-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Collapse' : 'View Details'}
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50/40 text-[10px] font-semibold text-blue-600 hover:text-indigo-300 transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </button>
                    <button
                      onClick={() => handleUnsave(p.id)}
                      disabled={removingId === p.id}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/40 hover:bg-red-950/30 text-[10px] font-semibold text-red-400 hover:text-red-300 transition disabled:opacity-50"
                    >
                      <Trash2 className={`w-3 h-3 ${removingId === p.id ? 'animate-spin' : ''}`} />
                      {removingId === p.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
