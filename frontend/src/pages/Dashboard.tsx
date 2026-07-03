import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, User, Zap, CircuitBoard, FileText, Presentation,
  LayoutTemplate, Code, Bookmark, Upload, BadgeCheck, Star
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [welcomeToast, setWelcomeToast] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('forge_token');
    const u = localStorage.getItem('forge_user');
    if (!t || !u) { navigate('/login'); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);

    // Show welcome toast on first login (flag in sessionStorage)
    if (!sessionStorage.getItem('welcomed')) {
      sessionStorage.setItem('welcomed', '1');
      setWelcomeToast(true);
      setTimeout(() => setWelcomeToast(false), 4000);
    }

    // Refresh user data from server
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setUser(data);
          localStorage.setItem('forge_user', JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('forge_token');
    localStorage.removeItem('forge_user');
    sessionStorage.removeItem('welcomed');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const tools = [
    { name: 'Idea Generator',   icon: <LightbulbIcon className="w-6 h-6 text-amber-500" />,  path: '/dashboard/project',       desc: 'Brainstorm AI engineering projects' },
    { name: 'Circuit Design',   icon: <Zap className="w-6 h-6 text-blue-500" />,              path: '/dashboard/circuit',       desc: 'Fritzing-style wiring & schematics' },
    { name: 'PCB Layout',       icon: <CircuitBoard className="w-6 h-6 text-emerald-500" />,  path: '/dashboard/pcb',           desc: 'KiCad-style Gerber viewer & routes' },
    { name: 'Code Generator',   icon: <Code className="w-6 h-6 text-indigo-500" />,           path: '/dashboard/code',          desc: 'Embedded C++/Python generation' },
    { name: 'Presentation',     icon: <Presentation className="w-6 h-6 text-purple-500" />,   path: '/dashboard/presentation',  desc: 'Professional slides & graphics' },
    { name: 'Report Writer',    icon: <FileText className="w-6 h-6 text-rose-500" />,         path: '/dashboard/report',        desc: 'IEEE format documentation' },
    { name: 'Patent Draft',     icon: <LayoutTemplate className="w-6 h-6 text-cyan-500" />,   path: '/dashboard/patent',        desc: 'Draft IP claims and abstract' },
    { name: 'Viva Prep',        icon: <User className="w-6 h-6 text-teal-500" />,             path: '/dashboard/viva',          desc: 'Simulate external examiner questions' },
    { name: 'My Templates',     icon: <Upload className="w-6 h-6 text-orange-500" />,         path: '/template-manager',        desc: 'Upload college PPT/Report templates' },
  ];

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const subBadge = {
    free:    { label: 'Free',    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    student: { label: 'Student', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    premium: { label: 'Premium', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    patent:  { label: 'Patent',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  }[user.subscription_status as string] ?? { label: 'Free', cls: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* ── Welcome Toast ─────────────────────────────────────────────────── */}
      {welcomeToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-white border border-slate-200 shadow-2xl rounded-2xl px-5 py-4 animate-slide-up max-w-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Welcome to ProjectForge AI! 🎉</p>
            <p className="text-slate-500 text-xs mt-0.5">Hello {user.name?.split(' ')[0]}! Your workspace is ready.</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Profile Card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm mb-10 overflow-hidden">
          {/* Top gradient strip */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-7 gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-600 text-2xl font-black">{initials}</span>
                  )}
                </div>
                {user.is_student_verified ? (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center" title="Verified Student">
                    <BadgeCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : null}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-slate-900">Welcome, {user.name?.split(' ')[0]}!</h1>
                  {user.is_student_verified ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified Student
                    </span>
                  ) : null}
                </div>

                <p className="text-slate-500 text-sm mt-1">{user.email}</p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs font-bold border px-2.5 py-1 rounded-full capitalize ${subBadge.cls}`}>
                    {subBadge.label} Member
                  </span>

                  {user.student_id && (
                    <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                      🎓 {user.student_id}
                    </span>
                  )}

                  {user.college_name && (
                    <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      🏫 {user.college_name}
                    </span>
                  )}

                  {user.year_semester && (
                    <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                      📅 {user.year_semester}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => navigate('/template-manager')}
                className="px-4 py-2.5 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm">
                <Upload className="w-4 h-4" /> My Templates
              </button>
              <button onClick={() => navigate('/saved-projects')}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm">
                <Bookmark className="w-4 h-4" /> Saved Projects
              </button>
              <button onClick={handleLogout}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>

        {/* ── Tool Grid ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Engineering Workspace</h2>
          <p className="text-slate-500 text-sm mt-1">Select a specialized AI agent to begin generating your project assets.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tools.map((tool, i) => (
            <div key={i} onClick={() => navigate(tool.path)}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group flex flex-col items-start h-full hover:-translate-y-0.5">
              <div className="p-3 bg-slate-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-200">
                {tool.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">{tool.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed flex-1">{tool.desc}</p>
              <div className="mt-5 w-full flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all gap-1">
                Launch App <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LightbulbIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/><path d="M10 22h4"/>
    </svg>
  );
}
