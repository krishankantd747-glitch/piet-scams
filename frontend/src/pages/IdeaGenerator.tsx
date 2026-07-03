import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb, Sparkles, ChevronRight,
  Plus, X, TrendingUp, IndianRupee, CheckCircle2
} from 'lucide-react';

const COMPONENT_PRESETS = [
  'ESP32', 'Arduino Uno', 'Arduino Nano', 'Raspberry Pi Pico',
  'STM32', 'ESP8266', 'DHT11', 'DHT22', 'HC-SR04', 'MPU6050',
  'OLED Display', 'LCD 16x2', 'L298N Motor Driver', 'Servo Motor',
  'BO Motor', 'Relay Module', 'LDR Sensor', 'IR Sensor',
  'Ultrasonic Sensor', 'GPS Module', 'GSM Module', 'Bluetooth HC-05',
  'Soil Moisture Sensor', 'Rain Sensor', 'MQ2 Gas Sensor',
  'PIR Sensor', 'RFID RC522', 'SD Card Module', 'RTC DS3231'
];

const BRANCH_OPTIONS = [
  'Electronics & Communication (ECE)',
  'Computer Science (CSE)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Information Technology (IT)',
  'Instrumentation Engineering'
];

const PROJECT_TYPES = [
  'IoT (Internet of Things)',
  'Embedded Systems',
  'Robotics & Automation',
  'Machine Learning / Edge AI',
  'Wireless Communication',
  'Agriculture / Smart Farming',
  'Healthcare / Medical Devices',
  'Industrial Automation'
];

const difficultyColor = (score: number) => {
  if (score <= 4) return 'pill-basic';
  if (score <= 7) return 'pill-intermediate';
  return 'pill-advanced';
};

export default function IdeaGenerator() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Form state
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [customComponent, setCustomComponent] = useState('');
  const [branch, setBranch] = useState(BRANCH_OPTIONS[0]);
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);

  // Results
  const [ideas, setIdeas] = useState<any[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const t = localStorage.getItem('forge_token');
    if (!t) navigate('/login');
    else setToken(t);
  }, []);

  const toggleComponent = (comp: string) => {
    setSelectedComponents(prev =>
      prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
    );
  };

  const addCustomComponent = () => {
    const trimmed = customComponent.trim();
    if (trimmed && !selectedComponents.includes(trimmed)) {
      setSelectedComponents(prev => [...prev, trimmed]);
    }
    setCustomComponent('');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedComponents.length === 0) {
      showToast('Select at least one component to generate ideas.', 'danger');
      return;
    }

    setLoading(true);
    setIdeas([]);
    setExpandedIdx(null);

    try {
      const res = await fetch('/api/ai/idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          components: selectedComponents,
          branch,
          project_type: projectType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIdeas(data.ideas || []);
        setExpandedIdx(0);
        showToast(`${data.ideas?.length || 3} project ideas generated!`, 'success');
      } else {
        showToast(data.message || 'Idea generation failed.', 'danger');
      }
    } catch {
      showToast('Connection error. Is the server running?', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white shadow-premium border border-slate-200 border-l-4 animate-slide-up ${
          toast.type === 'success' ? 'border-l-emerald-500' :
          toast.type === 'danger'  ? 'border-l-red-500'     : 'border-l-amber-500'
        }`}>
          <span className="text-xs font-semibold text-slate-200">{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-slate-600 text-xs transition">
            ← Dashboard
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-blue-600 font-semibold">Idea Generator</span>
        </div>

        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40">
            <Lightbulb className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              AI Project Idea Generator
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Select your available hardware components — get 3 creative, feasible engineering project ideas with cost estimates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT: Input Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleGenerate} className="space-y-6">

              {/* Branch & Project Type */}
              <div className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-slate-200 space-y-4">
                <span className="block text-[10px] uppercase font-bold text-amber-400 tracking-widest">1. Study Context</span>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Branch / Discipline</label>
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900"
                  >
                    {BRANCH_OPTIONS.map(b => (
                      <option key={b} value={b} className="bg-slate-50">{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Project Domain</label>
                  <select
                    value={projectType}
                    onChange={e => setProjectType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl input-light text-xs text-slate-900"
                  >
                    {PROJECT_TYPES.map(p => (
                      <option key={p} value={p} className="bg-slate-50">{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Component Selection */}
              <div className="bg-white shadow-premium border border-slate-200 p-5 rounded-2xl border border-slate-200 space-y-4">
                <span className="block text-[10px] uppercase font-bold text-amber-400 tracking-widest">2. Available Components</span>

                {/* Selected chips */}
                {selectedComponents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedComponents.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] font-semibold">
                        {c}
                        <button type="button" onClick={() => toggleComponent(c)} className="text-amber-500 hover:text-red-400 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Component presets grid */}
                <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {COMPONENT_PRESETS.map(comp => (
                    <button
                      type="button"
                      key={comp}
                      onClick={() => toggleComponent(comp)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                        selectedComponents.includes(comp)
                          ? 'bg-amber-600 border-amber-500 text-slate-900'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-amber-700 hover:text-amber-300'
                      }`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>

                {/* Custom component input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customComponent}
                    onChange={e => setCustomComponent(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomComponent())}
                    placeholder="Custom component..."
                    className="flex-1 px-3 py-2 rounded-xl input-light text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addCustomComponent}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-600">
                  {selectedComponents.length} component{selectedComponents.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={loading || selectedComponents.length === 0}
                className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:bg-slate-200 font-bold text-sm text-slate-900 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating project ideas...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" /> Generate 3 Project Ideas
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Results */}
          <div className="lg:col-span-3 space-y-4">
            {ideas.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-white shadow-premium border border-slate-200 rounded-2xl border border-slate-200 text-center px-8">
                <Lightbulb className="w-12 h-12 text-amber-800/60 mb-4 animate-pulse-subtle" />
                <p className="text-slate-600 text-sm font-semibold">Select components and click Generate</p>
                <p className="text-slate-600 text-xs mt-1">3 tailored project ideas will appear here</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-white shadow-premium border border-slate-200 rounded-2xl border border-slate-200 text-center">
                <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mb-4" />
                <p className="text-slate-600 text-sm">AI is thinking of creative ideas...</p>
              </div>
            )}

            {ideas.map((idea, idx) => (
              <div key={idx} className={`bg-white shadow-premium border border-slate-200 rounded-2xl border transition-all duration-200 overflow-hidden ${
                expandedIdx === idx ? 'border-amber-800/50' : 'border-slate-200 hover:border-slate-700'
              }`}>
                {/* Idea Header */}
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 font-extrabold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{idea.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${difficultyColor(idea.difficultyScore)}`}>
                          {idea.difficultyLabel}
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono">Score: {idea.difficultyScore}/10</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform duration-200 shrink-0 ${expandedIdx === idx ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded Details */}
                {expandedIdx === idx && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-200/60 pt-4 animate-fade-in">
                    <p className="text-xs text-slate-600 leading-relaxed">{idea.summary}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Cost */}
                      <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 tracking-widest mb-2">
                          <IndianRupee className="w-3 h-3" /> Cost Estimation
                        </div>
                        <p className="text-xs text-slate-600 font-mono leading-relaxed">{idea.costEstimation}</p>
                      </div>

                      {/* Why Feasible */}
                      <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-amber-400 tracking-widest mb-2">
                          <CheckCircle2 className="w-3 h-3" /> Why Feasible
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{idea.whyFeasible}</p>
                      </div>
                    </div>

                    {/* Future Scope */}
                    <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-blue-600 tracking-widest mb-2">
                        <TrendingUp className="w-3 h-3" /> Future Scope
                      </div>
                      <ul className="space-y-1">
                        {idea.futureScope?.map((fs: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-indigo-500 mt-0.5 shrink-0">→</span> {fs}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full py-2.5 rounded-xl bg-amber-600/20 border border-amber-800/40 hover:bg-amber-600/30 text-amber-400 text-xs font-bold transition"
                    >
                      Use this idea → Open Project Generator
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
