import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Cpu, Sparkles, Terminal, Info, Copy, Check, Bot, User } from 'lucide-react';

// ─── Markdown Renderer ───────────────────────────────────────────────────────
interface CodeBlockProps { code: string; lang: string; }

function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
      <div className="flex items-center justify-between bg-slate-200 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition px-2 py-1 rounded-lg hover:bg-slate-700"
        >
          {copied ? <><Check className="w-3 h-3 text-emerald-600" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="bg-slate-100 px-5 py-4 text-[12px] font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split by code blocks first
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      nodes.push(...renderInlineMarkdown(text.slice(lastIndex, match.index), `pre-${match.index}`));
    }
    nodes.push(<CodeBlock key={`cb-${match.index}`} lang={match[1]} code={match[2].trimEnd()} />);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(...renderInlineMarkdown(text.slice(lastIndex), `post-${lastIndex}`));
  }

  return nodes;
}

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      nodes.push(<div key={`${keyPrefix}-blank-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      nodes.push(
        <ol key={`${keyPrefix}-ol-${i}`} className="list-decimal list-inside space-y-1 my-2 pl-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">{renderInlineSpans(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*•]\s/, ''));
        i++;
      }
      nodes.push(
        <ul key={`${keyPrefix}-ul-${i}`} className="list-disc list-inside space-y-1 my-2 pl-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">{renderInlineSpans(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Heading
    if (/^#{1,3}\s/.test(line)) {
      const level = (line.match(/^(#+)/) || ['', ''])[1].length;
      const content = line.replace(/^#{1,3}\s/, '');
      const cls = level === 1 ? 'text-base font-extrabold mt-3 mb-1 text-slate-800' :
                  level === 2 ? 'text-sm font-bold mt-2 mb-1 text-slate-800' :
                               'text-sm font-semibold mt-2 text-slate-700';
      nodes.push(<div key={`${keyPrefix}-h${level}-${i}`} className={cls}>{renderInlineSpans(content)}</div>);
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={`${keyPrefix}-p-${i}`} className="text-sm leading-relaxed">
        {renderInlineSpans(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

function renderInlineSpans(text: string): React.ReactNode {
  // Split by bold (**text**) and inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px] font-mono border border-slate-300">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'ai';
  text: string;
  streaming?: boolean;
}

export default function AskAI() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello! I am your **ProjectForge AI** Engineering helper.\n\nAsk me about:\n- Microcontrollers, ESP32, Arduino, STM32\n- PCB tracks, Gerber files, component placement\n- C++/MicroPython firmware debugging\n- Component specs, sensor interfacing\n- Patent procedures and documentation' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggestions = [
    "Write blink loop code for ESP32.",
    "How to route decoupling capacitors on PCB?",
    "STM32 pin mappings for SPI communication",
    "How to clear floating input noise on interrupts?",
  ];

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Add empty AI message that will be streamed into
    setMessages(prev => [...prev, { role: 'ai', text: '', streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('forge_token');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: textToSend }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ message: 'Unknown error.' }));
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: 'ai', text: `**Error:** ${data.message || 'Failed to get response.'}`, streaming: false };
          return msgs;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { role: 'ai', text: fullText, streaming: false };
                return msgs;
              });
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                fullText += parsed.chunk;
                setMessages(prev => {
                  const msgs = [...prev];
                  msgs[msgs.length - 1] = { role: 'ai', text: fullText, streaming: true };
                  return msgs;
                });
              }
            } catch (_) { /* partial chunk, skip */ }
          }
        }
      }

      // Final: mark as done
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs[msgs.length - 1]?.streaming) {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false };
        }
        return msgs;
      });

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'ai', text: '**Connection error.** Is the backend server running?', streaming: false };
        return msgs;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 flex flex-col max-w-5xl mx-auto w-full px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg shadow-blue-500/30">
            <Cpu className="w-5 h-5 text-slate-900" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
              Ask AI Engineering Helper
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-600">Real-time streaming · Markdown rendering · Code copying</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <Terminal className="w-3.5 h-3.5 text-blue-600" /> Gemini 1.5 Pro · Streaming
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 min-h-[420px] max-h-[600px] overflow-y-auto bg-white shadow-sm rounded-2xl p-4 md:p-6 mb-4 space-y-5 border border-slate-200">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>

            {m.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-slate-900" />
              </div>
            )}

            <div className={`max-w-2xl text-left ${
              m.role === 'user'
                ? 'bg-blue-600 text-slate-900 px-4 py-3 rounded-2xl rounded-br-none shadow-md shadow-blue-600/20 text-sm leading-relaxed'
                : 'flex-1 text-slate-700'
            }`}>
              {m.role === 'user'
                ? <p className="text-sm">{m.text}</p>
                : (
                  <div className="prose prose-sm max-w-none">
                    {renderMarkdown(m.text)}
                    {m.streaming && (
                      <span className="inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                    )}
                  </div>
                )
              }
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.text === '' && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length === 1 && (
        <div className="mb-4 text-left">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Quick suggestions:</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all hover:shadow-md"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2 items-center focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
          placeholder="Ask about boards, sensors, firmware loops, PCB traces..."
          className="flex-1 px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-slate-800 placeholder-slate-400"
          disabled={loading}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || loading}
          className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold disabled:opacity-40 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2 text-[10px] text-slate-600 flex items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" /> Responses streamed in real-time · Code blocks are copyable · Markdown formatted
      </div>
    </div>
  );
}
