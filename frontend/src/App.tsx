import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public Pages ──────────────────────────────────────────
import Home from './pages/Home';
import Projects from './pages/Projects';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import Payment from './pages/Payment';

// ── Auth Flow Pages ───────────────────────────────────────
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetOTP from './pages/VerifyResetOTP';
import ResetPassword from './pages/ResetPassword';

// ── Protected Pages ───────────────────────────────────────
import Dashboard from './pages/Dashboard';
import AskAI from './pages/AskAI';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import SavedProjects from './pages/SavedProjects';
import ProjectDetails from './pages/ProjectDetails';

// ── Phase 2 Pages (Protected) ─────────────────────────────
import IdeaGenerator from './pages/IdeaGenerator';
import VivaGenerator from './pages/VivaGenerator';
import PatentGenerator from './pages/PatentGenerator';
import TemplateManager from './pages/TemplateManager';
import CircuitGenerator from './pages/CircuitGenerator';
import PcbGenerator from './pages/PcbGenerator';
import CodeGenerator from './pages/CodeGenerator';
import ReportGenerator from './pages/ReportGenerator';
import PresentationGenerator from './pages/PresentationGenerator';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white text-slate-800 font-sans selection:bg-blue-500 selection:text-slate-900">
        <Navbar />
        <div className="flex-1 flex flex-col">
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* ── Password Reset Flow ── */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-reset-otp" element={<VerifyResetOTP />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Protected: Core ── */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/payment" element={
              <ProtectedRoute><Payment /></ProtectedRoute>
            } />
            <Route path="/ask-ai" element={
              <ProtectedRoute><AskAI /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/saved-projects" element={
              <ProtectedRoute><SavedProjects /></ProtectedRoute>
            } />
            <Route path="/project/:id" element={
              <ProtectedRoute><ProjectDetails /></ProtectedRoute>
            } />

            {/* ── Protected: Phase 2 / Generators ── */}
            <Route path="/dashboard/project" element={
              <ProtectedRoute><IdeaGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/circuit" element={
              <ProtectedRoute><CircuitGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/pcb" element={
              <ProtectedRoute><PcbGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/code" element={
              <ProtectedRoute><CodeGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/report" element={
              <ProtectedRoute><ReportGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/presentation" element={
              <ProtectedRoute><PresentationGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/patent" element={
              <ProtectedRoute><PatentGenerator /></ProtectedRoute>
            } />
            <Route path="/dashboard/viva" element={
              <ProtectedRoute><VivaGenerator /></ProtectedRoute>
            } />
            <Route path="/template-manager" element={
              <ProtectedRoute><TemplateManager /></ProtectedRoute>
            } />

            {/* ── Protected: Admin ── */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* ── 404 ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        {/* ── Site-Wide Footer ────────────────────────────────── */}
        <footer className="border-t border-slate-200 bg-slate-50 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              {/* Brand column */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-slate-900 text-xs font-extrabold shadow-blue">
                    PF
                  </div>
                  <span className="font-bold text-slate-900 text-sm">ProjectForge AI</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  AI-powered engineering project suite for students, researchers, and professionals.
                </p>
                <p className="text-xs text-slate-600">© {new Date().getFullYear()} ProjectForge AI. All rights reserved.</p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">Quick Links</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Home', to: '/' },
                    { label: 'Projects', to: '/projects' },
                    { label: 'Pricing', to: '/pricing' },
                    { label: 'About', to: '/about' },
                    { label: 'Contact', to: '/contact' },
                  ].map(link => (
                    <li key={link.to}>
                      <Link to={link.to} className="text-xs text-slate-600 hover:text-blue-600 transition-colors font-medium">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Platform */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">Platform</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Dashboard', to: '/dashboard' },
                    { label: 'Ask AI', to: '/ask-ai' },
                    { label: 'Login', to: '/login' },
                    { label: 'Sign Up', to: '/signup' },
                  ].map(link => (
                    <li key={link.to}>
                      <Link to={link.to} className="text-xs text-slate-600 hover:text-blue-600 transition-colors font-medium">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">Contact Us</h4>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li>
                    <a href="mailto:projectforge.ai@gmail.com" className="hover:text-blue-600 transition-colors break-all font-medium">
                      📧 projectforge.ai@gmail.com
                    </a>
                  </li>
                  <li>
                    <a href="tel:+916377101431" className="hover:text-blue-600 transition-colors font-medium">
                      📞 +91 6377101431
                    </a>
                  </li>
                  <li>📍 Jaipur, Rajasthan, India</li>
                  <li className="pt-2">
                    <Link to="/contact" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-semibold">
                      ✉️ Contact Page →
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[11px] text-slate-600">Built with ❤️ for engineering students — Jaipur, India</p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                All systems operational
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
