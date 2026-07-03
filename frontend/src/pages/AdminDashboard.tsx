import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CreditCard, Check, X, ShieldAlert, BarChart } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'payments' | 'analytics'>('payments');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // States
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    const t = localStorage.getItem('forge_token');
    if (!t) {
      navigate('/login');
      return;
    }
    setToken(t);

    try {
      // 1. Fetch Users
      const resUsers = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${t}` } });
      if (resUsers.ok) setUsers(await resUsers.ok ? await resUsers.json() : []);

      // 2. Fetch QR Payments
      const resPayments = await fetch('/api/admin/payments', { headers: { 'Authorization': `Bearer ${t}` } });
      if (resPayments.ok) setPayments(await resPayments.json());

      // 3. Fetch Analytics
      const resAnalytic = await fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${t}` } });
      if (resAnalytic.ok) setAnalytics(await resAnalytic.json());

    } catch (e) {
      showToast('Admin data fetch connection error.');
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  // Actions
  // Approve or reject manual QR payment screenshot
  const handleVerifyPayment = async (paymentId: number, action: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Transaction verified successfully: Plan upgraded!`);
        loadData();
      } else {
        showToast(data.message || 'Verification update failed.');
      }
    } catch (e) {
      showToast('Verification update failed.');
    } finally {
      setLoading(false);
    }
  };

  // Manually upgrade user plan via Admin users table controls
  const handleManualPlanChange = async (userId: number, plan: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/update-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });
      if (res.ok) {
        showToast('User plan tier manually updated!');
        loadData();
      }
    } catch (e) {}
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Toast Alert overlay */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-premium bg-white border border-slate-200 border-l-4 border-l-blue-600 transform transition-all duration-300 animate-slide-up">
          <span className="text-xs font-semibold text-slate-800">{toast}</span>
        </div>
      )}

      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 border-r border-slate-200 bg-white p-6 space-y-6 text-left shrink-0">
        <span className="block text-[10px] uppercase font-bold text-rose-500 tracking-wider flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Administrative Control
        </span>
        
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveSubTab('payments')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeSubTab === 'payments' ? 'bg-blue-600 text-slate-900 shadow-blue' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <CreditCard className="w-4 h-4" /> QR Review Board ({payments.filter(p => p.status === 'pending').length})
          </button>

          <button 
            onClick={() => setActiveSubTab('users')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeSubTab === 'users' ? 'bg-blue-600 text-slate-900 shadow-blue' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Users className="w-4 h-4" /> Manage Platform Users
          </button>

          <button 
            onClick={() => setActiveSubTab('analytics')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeSubTab === 'analytics' ? 'bg-blue-600 text-slate-900 shadow-blue' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <BarChart className="w-4 h-4" /> Diagnostics & Stats
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto text-left">
        
        {/* Tab 1: QR Payments approvals */}
        {activeSubTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Manual QR Payment verification board
              </h2>
              <p className="text-xs text-slate-600 mt-1">Review uploaded UPI transactions and screenshot proof receipts to upgrade client plans.</p>
            </div>

            {payments.filter(p => p.status === 'pending').length === 0 ? (
              <div className="text-center text-slate-600 py-12 text-xs">No pending QR payment screenshots waiting review.</div>
            ) : (
              <div className="space-y-6 max-w-4xl">
                {payments.filter(p => p.status === 'pending').map((p, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-white shadow-premium border border-slate-200 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center transition hover:shadow-lg">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-bold text-sm text-slate-900">{p.user_name}</span>
                        <span className="text-[10px] text-slate-600 font-mono">({p.user_email})</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono text-[9px] uppercase font-bold tracking-wider border border-blue-200">
                          {p.plan_name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-slate-600">Transaction ID</span>
                          <span className="font-mono text-slate-700">{p.transaction_id}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-slate-600">Total Amount</span>
                          <span className="text-emerald-600 font-semibold">₹{p.amount}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="block text-[9px] uppercase font-bold text-slate-600 mb-2">Screenshot Proof Receipt</span>
                        {/* Embed receipt screenshot */}
                        <a href={p.reference_screenshot_path} target="_blank" rel="noreferrer" title="Click to view full image">
                          <img 
                            src={p.reference_screenshot_path} 
                            alt="Receipt Screen" 
                            className="max-h-40 rounded-lg border border-slate-200 hover:border-blue-400 shadow-sm transition cursor-pointer"
                          />
                        </a>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-3 w-full md:w-auto shrink-0 pt-4 md:pt-0">
                      <button 
                        onClick={() => handleVerifyPayment(p.id, 'approved')}
                        disabled={loading}
                        className="flex-1 md:w-36 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button 
                        onClick={() => handleVerifyPayment(p.id, 'rejected')}
                        disabled={loading}
                        className="flex-1 md:w-36 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-rose-200 shadow-sm"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users list management */}
        {activeSubTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Platform accounts directory
              </h2>
              <p className="text-xs text-slate-600 mt-1">Review user roles and upgrade/downgrade subscription status manually.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-premium overflow-hidden">
              <table className="w-full text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 text-[9px] uppercase font-bold text-slate-600 border-b border-slate-200">
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email Address</th>
                    <th className="p-3 text-left">Mobile</th>
                    <th className="p-3 text-left">Active Tier Plan</th>
                    <th className="p-3 text-center">Update Subscription plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-600">{u.email}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-600">{u.mobile}</td>
                      <td className="p-3 uppercase text-blue-600 font-bold">{u.subscription_status}</td>
                      <td className="p-3 text-center">
                        <select 
                          value={u.subscription_status}
                          onChange={e => handleManualPlanChange(u.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          <option value="free">Free</option>
                          <option value="student">Student</option>
                          <option value="premium">Premium</option>
                          <option value="patent">Patent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-blue-600" /> Platform diagnostics analytics
              </h2>
              <p className="text-xs text-slate-600 mt-1">Review active SaaS accounts ratios, compiled metrics, and revenue totals.</p>
            </div>

            {analytics ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Revenue Card */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <span className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">Total Revenue (Verified)</span>
                    <h3 className="text-2xl font-extrabold text-emerald-600">₹{analytics.revenue}</h3>
                  </div>

                  {/* Users Card */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <span className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">Total Registered Accounts</span>
                    <h3 className="text-2xl font-extrabold text-slate-900">{analytics.totalUsers}</h3>
                  </div>

                  {/* Projects Card */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <span className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">Generated Projects</span>
                    <h3 className="text-2xl font-extrabold text-blue-600">{analytics.totalProjects}</h3>
                  </div>

                  {/* PCB Card */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <span className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">PCB Board Layouts Compiled</span>
                    <h3 className="text-2xl font-extrabold text-purple-600">{analytics.totalPcbs}</h3>
                  </div>
                </div>

                {/* Plans distribution */}
                <div className="p-6 rounded-2xl bg-white shadow-premium border border-slate-200 space-y-4 max-w-lg text-left">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Subscription Plan Distribution</h3>
                  <div className="space-y-3">
                    {/* Free ratio */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Free Tier:</span>
                        <strong>{analytics.tiers?.free} users</strong>
                      </div>
                      <div className="w-full h-2 rounded bg-slate-100 overflow-hidden">
                        <div className="h-full bg-slate-400" style={{ width: `${(analytics.tiers?.free / (analytics.totalUsers || 1)) * 100}%` }} />
                      </div>
                    </div>

                    {/* Student ratio */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Student Plan (₹49):</span>
                        <strong>{analytics.tiers?.student} users</strong>
                      </div>
                      <div className="w-full h-2 rounded bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(analytics.tiers?.student / (analytics.totalUsers || 1)) * 100}%` }} />
                      </div>
                    </div>

                    {/* Premium ratio */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Premium Plan (₹99):</span>
                        <strong>{analytics.tiers?.premium} users</strong>
                      </div>
                      <div className="w-full h-2 rounded bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(analytics.tiers?.premium / (analytics.totalUsers || 1)) * 100}%` }} />
                      </div>
                    </div>

                    {/* Patent ratio */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Patent Plan (₹199):</span>
                        <strong>{analytics.tiers?.patent} users</strong>
                      </div>
                      <div className="w-full h-2 rounded bg-slate-100 overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${(analytics.tiers?.patent / (analytics.totalUsers || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-600 text-xs py-8">Fetching platform stats data...</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
