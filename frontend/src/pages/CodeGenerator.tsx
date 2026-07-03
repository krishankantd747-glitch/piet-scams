import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code, Sparkles, Copy, Download, Check, TerminalSquare, Cpu, Library, FolderOpen } from 'lucide-react';

// ─── Lightweight keyword-only syntax highlighter (no dependencies) ──────────
function highlightCode(code: string, lang: 'cpp' | 'python'): string {
  if (!code) return '';

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let escaped = escape(code);

  if (lang === 'cpp') {
    // 1. Single-line comments
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="tok-comment">$1</span>');
    // 2. Multi-line block comments
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>');
    // 3. Preprocessor directives
    escaped = escaped.replace(/^(#\s*(?:include|define|pragma|ifndef|ifdef|endif|undef)[^\n]*)/gm, '<span class="tok-preproc">$1</span>');
    // 4. String literals
    escaped = escaped.replace(/(&quot;(?:[^&]|&amp;|&lt;|&gt;)*?&quot;|&lt;[^&gt;\n]+&gt;)/g, '<span class="tok-string">$1</span>');
    // 5. Keywords
    const kw = ['void', 'int', 'float', 'double', 'char', 'bool', 'long', 'short',
                 'unsigned', 'const', 'static', 'return', 'if', 'else', 'for', 'while',
                 'do', 'switch', 'case', 'break', 'continue', 'true', 'false', 'NULL',
                 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite',
                 'delay', 'millis', 'Serial', 'setup', 'loop', 'HIGH', 'LOW', 'INPUT',
                 'OUTPUT', 'INPUT_PULLUP'];
    kw.forEach(k => {
      escaped = escaped.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="tok-kw">$1</span>');
    });
    // 6. Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
  } else {
    // Python
    // 1. Comments
    escaped = escaped.replace(/(#[^\n]*)/g, '<span class="tok-comment">$1</span>');
    // 2. Triple-quoted strings
    escaped = escaped.replace(/("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')/g, '<span class="tok-string">$1</span>');
    // 3. String literals
    escaped = escaped.replace(/(&quot;[^&\n]*?&quot;|&#039;[^&\n]*?&#039;)/g, '<span class="tok-string">$1</span>');
    // 4. Keywords
    const kw = ['import', 'from', 'as', 'def', 'class', 'return', 'if', 'elif', 'else',
                 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'True', 'False', 'None',
                 'pass', 'break', 'continue', 'try', 'except', 'finally', 'with', 'print',
                 'range', 'len', 'time', 'sleep', 'machine', 'Pin', 'value'];
    kw.forEach(k => {
      escaped = escaped.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="tok-kw">$1</span>');
    });
    // 5. Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
    // 6. Decorators
    escaped = escaped.replace(/(@\w+)/g, '<span class="tok-preproc">$1</span>');
  }

  return escaped;
}

const CODE_STYLE = `
.code-block { background: #0d1117; border-radius: 0 0 12px 12px; overflow: auto; max-height: 560px; }
.code-block pre { margin: 0; padding: 20px 24px; font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace; font-size: 13px; line-height: 1.7; color: #c9d1d9; }
.code-block code { display: block; white-space: pre; }
.tok-comment { color: #8b949e; font-style: italic; }
.tok-kw      { color: #ff7b72; font-weight: 600; }
.tok-string  { color: #a5d6ff; }
.tok-preproc { color: #d2a8ff; }
.tok-num     { color: #79c0ff; }
`;

export default function CodeGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  
  const [prompt, setPrompt] = useState('');
  const [board, setBoard] = useState('Arduino Uno');
  const [copied, setCopied] = useState(false);

  // Pre-fill from ProjectDetails navigation
  useEffect(() => {
    const state = location.state as { projectName?: string; components?: string; description?: string } | null;
    if (state?.projectName || state?.components) {
      const parts: string[] = [];
      if (state.projectName) parts.push(`Project: ${state.projectName}`);
      if (state.description) parts.push(state.description);
      if (state.components) parts.push(`Components: ${state.components}`);
      setPrompt(parts.join('\n'));
      setPrefilled(true);
    }
  }, [location.state]);
  
  const [result, setResult] = useState<{
    completeCode: string;
    libraryList: string[];
    pinMapping: string;
    uploadInstructions: string;
    downloadUrl: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'danger') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      showToast('Please describe the logic you want to generate.', 'danger');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem('forge_token');
      const res = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt, board })
      });
      const data = await res.json();
      if (res.ok) { setResult(data); showToast('Code generated!', 'success'); }
      else showToast(data.message || 'Generation failed.', 'danger');
    } catch { showToast('Server connection error.', 'danger'); }
    finally { setLoading(false); }
  };

  const handleCopy = useCallback(() => {
    if (result?.completeCode) {
      navigator.clipboard.writeText(result.completeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Copied to clipboard!', 'success');
    }
  }, [result]);

  // Detect language from code content
  const lang = result?.completeCode?.startsWith('#!') || result?.completeCode?.includes('import machine') || result?.completeCode?.startsWith('# ')
    ? 'python' : 'cpp';

  const fileExt = lang === 'python' ? 'py' : 'ino';
  const highlighted = result ? highlightCode(result.completeCode, lang) : '';

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      {/* Inject syntax highlight styles */}
      <style dangerouslySetInnerHTML={{ __html: CODE_STYLE }} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white border border-l-4 ${
          toast.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'
        }`}>
          <span className="text-xs font-semibold text-slate-700">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-indigo-600 text-xs font-medium transition">← Dashboard</button>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Code Generator</span>
        </div>

        {prefilled && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-medium">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
            Project context pre-filled from your saved project. Describe specific logic below!
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-slate-900 shrink-0 shadow-lg">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Embedded Code Generator <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 font-medium">
              Generate production-ready C++ / Python firmware with syntax highlighting for any microcontroller board.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── LEFT: Form ── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <form onSubmit={handleGenerate} className="space-y-5">
                {/* Board selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2 flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" /> Target Board
                  </label>
                  <select value={board} onChange={e => setBoard(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition">
                    <option>Arduino Uno</option>
                    <option>Arduino Mega</option>
                    <option>Arduino Nano</option>
                    <option>ESP32</option>
                    <option>ESP8266</option>
                    <option>Raspberry Pi Pico</option>
                  </select>
                </div>

                {/* Logic description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                    Logic Description
                  </label>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)} required
                    placeholder="e.g. Read DHT11 on Pin 4 every 2s. If temp > 30°C, activate relay on Pin 8 and show reading on OLED via I2C."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 min-h-[150px] resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-bold text-sm transition shadow-lg disabled:opacity-50 disabled:pointer-events-none">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Compiling...</>
                    : <><Code className="w-4 h-4" /> Generate Code</>}
                </button>
              </form>
            </div>

            {/* Upload instructions (shown after result) */}
            {result && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <TerminalSquare className="w-4 h-4 text-indigo-500" /> Upload Steps
                </h3>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{result.uploadInstructions}</pre>

                {result.libraryList?.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-[10px] uppercase font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <Library className="w-3 h-3" /> Required Libraries
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.libraryList.map((lib, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">{lib}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Code Editor ── */}
          <div className="lg:col-span-8 space-y-6">
            {!result && !loading && (
              <div className="bg-white border border-slate-200 h-[500px] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <TerminalSquare className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Ready to Generate</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-sm">Describe your hardware logic. The AI will write clean, commented, production-ready firmware.</p>
              </div>
            )}

            {loading && (
              <div className="bg-slate-100 border border-slate-200 h-[500px] rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Writing Firmware...</h3>
                <p className="text-sm text-slate-600 mt-2 font-mono text-xs">Resolving dependencies → generating logic → formatting output...</p>
              </div>
            )}

            {result && !loading && (
              <>
                {/* Code card */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xl">
                  {/* Tab bar */}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-xs font-mono text-slate-600 ml-2">main.{fileExt}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 font-bold uppercase tracking-wider">
                        {lang === 'python' ? 'Python / MicroPython' : 'C++ / Arduino'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCopy}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-700 hover:text-slate-900 transition flex items-center gap-1.5">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <a href={result.downloadUrl} download
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-slate-900 rounded-lg hover:bg-indigo-500 transition flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Download .{fileExt}
                      </a>
                    </div>
                  </div>

                  {/* Syntax-highlighted code block */}
                  <div className="code-block">
                    <pre><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
                  </div>
                </div>

                {/* Pinout info */}
                {result.pinMapping && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Hardware Pinout
                    </h4>
                    <pre className="text-sm text-slate-600 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{result.pinMapping}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
