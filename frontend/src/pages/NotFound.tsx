import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Glowing 404 */}
        <div className="relative mb-8">
          <span className="text-[120px] font-black text-slate-900 leading-none select-none block">404</span>
          <span className="absolute inset-0 text-[120px] font-black leading-none bg-gradient-to-b from-indigo-400 to-purple-600 bg-clip-text text-transparent blur-[2px] opacity-60 select-none block">
            404
          </span>
          <AlertTriangle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-blue-600 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page Not Found</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-8">
          The route you navigated to does not exist in ProjectForge AI.
          It may have been removed, moved, or never existed.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-700 text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 text-sm font-semibold transition"
          >
            <Home className="w-4 h-4" />
            Return Home
          </button>
        </div>

        <div className="mt-12 text-[10px] text-slate-700 font-mono">
          ProjectForge AI — Engineering Intelligence Platform
        </div>
      </div>
    </div>
  );
}
