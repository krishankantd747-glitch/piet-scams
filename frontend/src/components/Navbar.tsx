import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Cpu, LogOut, ShieldAlert, RefreshCw, Menu, X, Bell } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mockMailCount, setMockMailCount] = useState(0);
  const [showMailbox, setShowMailbox] = useState(false);
  const [mockMails, setMockMails] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const loadAuth = () => {
    const t = localStorage.getItem('forge_token');
    const u = localStorage.getItem('forge_user');
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u));
    } else {
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    loadAuth();
    window.addEventListener('auth-change', loadAuth);
    return () => window.removeEventListener('auth-change', loadAuth);
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchMockMails = async () => {
    try {
      const res = await fetch('/api/test/mock-emails');
      if (res.ok) {
        const data = await res.json();
        setMockMails(data);
        setMockMailCount(data.length);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchMockMails();
    const interval = setInterval(fetchMockMails, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('forge_token');
    localStorage.removeItem('forge_user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const clearMockMails = async () => {
    try {
      await fetch('/api/test/clear-mock-emails', { method: 'POST' });
      fetchMockMails();
    } catch (e) {}
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `text-sm font-semibold transition-colors px-1 py-0.5 ${
      isActive(path)
        ? 'text-blue-600'
        : 'text-slate-600 hover:text-blue-600'
    }`;

  return (
    <>
      <nav className={`sticky top-0 z-40 bg-white border-b transition-shadow ${
        scrolled ? 'shadow-md border-slate-200' : 'shadow-sm border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-blue group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5 text-slate-900" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold tracking-tight text-slate-900 block text-base leading-none">ProjectForge AI</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-blue-600 block mt-0.5">Engineering SaaS</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass('/')}>Home</Link>
            <Link to="/projects" className={navLinkClass('/projects')}>Projects</Link>
            <Link to="/pricing" className={navLinkClass('/pricing')}>Pricing</Link>
            <Link to="/about" className={navLinkClass('/about')}>About</Link>
            <Link to="/contact" className={navLinkClass('/contact')}>Contact</Link>

            {token && (
              <>
                <Link to="/ask-ai" className={navLinkClass('/ask-ai')}>Ask AI</Link>
                <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors px-1"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Mock OTP Badge */}
            <button
              onClick={() => setShowMailbox(!showMailbox)}
              className="hidden md:inline-flex relative items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition"
            >
              <Bell className="w-3.5 h-3.5" />
              OTP Box
              {mockMailCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-blue-600 text-slate-900 text-[9px] font-bold flex items-center justify-center">
                  {mockMailCount}
                </span>
              )}
            </button>

            {token && user ? (
              <div className="flex items-center gap-2">
                {/* User badge */}
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  {/* Avatar or Initials */}
                  <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 text-[10px] font-black">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div className="text-left leading-none">
                    <span className="text-xs font-semibold text-slate-900 block">{user.name?.split(' ')[0]}</span>
                    <span className="text-[9px] text-blue-600 uppercase font-bold block mt-0.5">{user.subscription_status} Plan</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-600 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-slate-900 transition-colors shadow-blue"
                >
                  Sign Up Free
                </Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-200"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1 shadow-lg">
            {/* User badge mobile */}
            {token && user && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 text-sm font-black">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">{user.name}</span>
                    <span className="text-[9px] text-blue-600 uppercase font-bold block">{user.subscription_status} Plan</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            )}

            {[
              { to: '/', label: '🏠 Home' },
              { to: '/projects', label: '📁 Projects' },
              { to: '/pricing', label: '💳 Pricing' },
              { to: '/about', label: 'ℹ️ About' },
              { to: '/contact', label: '✉️ Contact' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive(to)
                    ? 'text-blue-600 bg-blue-50 border border-blue-100'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {label}
              </Link>
            ))}

            {token && (
              <>
                <Link to="/ask-ai" className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/ask-ai') ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}>🤖 Ask AI</Link>
                <Link to="/dashboard" className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/dashboard') ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}>⚡ Dashboard</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="block px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all">🛡 Admin Panel</Link>
                )}
              </>
            )}

            {!token && (
              <div className="pt-2 flex flex-col gap-2 border-t border-slate-100 mt-2">
                <Link to="/login" className="block text-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all">Login</Link>
                <Link to="/signup" className="block text-center px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-slate-900 transition-all shadow-blue">Sign Up Free</Link>
              </div>
            )}

            {/* Mobile OTP Box button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => { setShowMailbox(!showMailbox); setMobileOpen(false); }}
                className="w-full text-left px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <Bell className="w-3.5 h-3.5" /> Mock OTP Box ({mockMailCount})
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Mock Mailbox Panel ── */}
      {showMailbox && (
        <div className="bg-white border-b border-blue-100 p-4 sticky top-16 z-30 max-h-80 overflow-y-auto shadow-premium">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-blue-600 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Mock OTP Mailbox (Dev Interceptor)
              </h3>
              <div className="flex gap-4">
                <button onClick={clearMockMails} className="text-red-500 hover:text-red-600 text-xs flex items-center gap-1 font-semibold">
                  <RefreshCw className="w-3 h-3" /> Clear Box
                </button>
                <button onClick={() => setShowMailbox(false)} className="text-slate-600 hover:text-slate-700 text-xs font-bold">
                  Close ✕
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {mockMails.length === 0 ? (
                <div className="text-xs text-slate-600 col-span-full text-center py-4">No OTP codes intercepted yet. Trigger a signup or password reset to see emails here.</div>
              ) : (
                mockMails.map((mail: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between text-[10px] text-blue-600 font-mono mb-1">
                      <span>To: {mail.to}</span>
                      <span>{new Date(mail.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-bold text-slate-900 mb-1">{mail.subject}</div>
                    <div className="text-slate-600 whitespace-pre-line bg-white border border-slate-100 p-2 rounded-lg">{mail.body}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
