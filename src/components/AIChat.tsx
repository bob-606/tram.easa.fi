import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Copy, Check, Settings } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type AIProvider = 'beta' | 'own-key' | 'webllm';

const SYSTEM_PROMPT = `You are an expert EASA PPL/SPL aviation theory tutor helping students prepare for their pilot exams. You know all 9 subjects: Air Law, Aircraft General Knowledge, Flight Performance & Planning, Human Performance, Meteorology, Navigation, Operational Procedures, Principles of Flight, and Communications.

Rules:
- Be clear and educational
- Reference relevant regulations and concepts
- Use simple analogies when helpful
- Keep responses concise and focused on EASA exam preparation
- Do NOT use emojis
- Format with markdown when helpful (bold for key terms, short lists)`;

const LS_PROVIDER = 'air_provider';
const LS_API_KEY = 'air_api_key';

function loadProvider(): AIProvider {
  const saved = localStorage.getItem(LS_PROVIDER);
  if (saved === 'own-key' || saved === 'webllm') return saved;
  return 'beta';
}

function renderMarkdown(text: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = escape(text);
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-background/80 rounded-lg p-3 my-2 text-xs overflow-x-auto"><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-background/80 px-1 rounded text-xs">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<div class="font-semibold text-sm mt-3 mb-1">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div class="font-semibold mt-3 mb-1">$1</div>');
  html = html.replace(/^# (.+)$/gm, '<div class="font-semibold text-base mt-3 mb-1">$1</div>');
  html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-3">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-1 space-y-0.5">$&</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-3">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, (match) => {
    if (match.includes('list-disc')) return match;
    return `<ol class="list-decimal list-inside my-1 space-y-0.5">${match}</ol>`;
  });
  html = html.replace(/\n/g, '<br>');
  return html;
}

function MessageContent({ html }: { html: string }) {
  return <div className="[&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:break-all" dangerouslySetInnerHTML={{ __html: html }} />;
}

function streamFromReader(reader: ReadableStreamDefaultReader<Uint8Array>, onChunk: (text: string) => void) {
  const decoder = new TextDecoder();
  let accumulated = '';

  const read = async (): Promise<void> => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data:')) continue;
        const payload = line.replace(/^data:\s*/, '').trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            accumulated += delta;
            onChunk(accumulated);
          }
        } catch {}
      }
    }
  };
  return read();
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [provider, setProvider] = useState<AIProvider>(loadProvider);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem(LS_API_KEY) || '');
  const [webllmEngine, setWebllmEngine] = useState<any>(null);
  const [webllmStatus, setWebllmStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    localStorage.setItem(LS_PROVIDER, p);
    setMessages([]);
  };

  const handleApiKeyChange = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem(LS_API_KEY, key);
  };

  const initWebllm = async () => {
    if (webllmEngine) return;
      setWebllmStatus('Downloading model (first load may take a few minutes)...');
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateMLCEngine('gemma3-1b-it-q4f16_1-MLC', {
        initProgressCallback: (progress: any) => {
          if (progress.text) setWebllmStatus(progress.text);
        },
      });
      setWebllmEngine(engine);
      setWebllmStatus('Ready');
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('quota') || msg.includes('Quota') || msg.includes('rate limit')) {
        setWebllmStatus('Download throttled (rate limited). Try again later, or use a different provider.');
      } else if (msg.includes('WebGPU') || msg.includes('webgpu')) {
        setWebllmStatus('WebGPU not supported in this browser. Use Chrome or Edge.');
      } else {
        setWebllmStatus(`Failed: ${msg}`);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const assistantIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsLoading(true);

    const onChunk = (text: string) => {
      setMessages(prev => {
        const next = [...prev];
        if (next[assistantIndex]?.role === 'assistant') {
          next[assistantIndex] = { ...next[assistantIndex], content: text };
        }
        return next;
      });
    };

    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-8),
      userMessage,
    ];

    try {
      if (provider === 'beta') {
        const res = await fetch('/api/llm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatMessages }),
        });

        if (!res.ok || !res.body) {
          let detail = '';
          try { detail = await res.text(); } catch {}
          onChunk(detail || `aiR error (${res.status})`);
          return;
        }

        await streamFromReader(res.body.getReader(), onChunk);
      } else if (provider === 'own-key') {
        const key = userApiKey.trim();
        if (!key) {
          onChunk('Enter your OpenRouter API key in settings (sk-or-...).');
          return;
        }
        if (!key.startsWith('sk-or-')) {
          onChunk('Invalid OpenRouter key format. It should start with "sk-or-".');
          return;
        }

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://tram.kimi',
            'X-Title': 'EASA Pilot Essentials',
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 1024,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          let detail = '';
          try { detail = await res.text(); } catch {}
          if (res.status === 401) {
            onChunk('Your OpenRouter API key is invalid or missing. Check the key in settings.');
          } else if (res.status === 402) {
            onChunk('Insufficient credits. Add credits at https://openrouter.ai/settings/credits');
          } else if (res.status === 429) {
            onChunk('Rate limited. Try again shortly.');
          } else {
            onChunk(detail || `Error (${res.status})`);
          }
          return;
        }

        await streamFromReader(res.body.getReader(), onChunk);
      } else if (provider === 'webllm') {
        if (!webllmEngine) {
          onChunk('WebLLM model not loaded. Open settings and click "Load Model" first.');
          return;
        }

        const chunks = await webllmEngine.chat.completions.create({
          messages: chatMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 1024,
        });

        let accumulated = '';
        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            accumulated += delta;
            onChunk(accumulated);
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => {
        const next = [...prev];
        if (next[assistantIndex]?.role === 'assistant' && !next[assistantIndex].content) {
          next[assistantIndex] = { role: 'assistant', content: `Error: ${e.message || 'Could not reach aiR'}` };
        }
        return next;
      });
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[650px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="font-semibold text-sm">aiR</span>
            {provider !== 'beta' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-medium">
                {provider === 'own-key' ? 'Own Key' : 'WebLLM'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-accent' : 'hover:bg-accent'}`}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b border-border bg-background/50 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Provider</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="air-provider"
                  checked={provider === 'beta'}
                  onChange={() => handleProviderChange('beta')}
                  className="accent-primary"
                />
                <div>
                  <span className="text-sm font-medium">Beta (unstable)</span>
                  <p className="text-xs text-muted-foreground">Uses server-side free model, may be slow/unreliable</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="air-provider"
                  checked={provider === 'own-key'}
                  onChange={() => handleProviderChange('own-key')}
                  className="accent-primary"
                />
                <div>
                  <span className="text-sm font-medium">Your own API key</span>
                  <p className="text-xs text-muted-foreground">Bring your own OpenRouter key for reliable access</p>
                </div>
              </label>
              {provider === 'own-key' && (
                <input
                  type="password"
                  value={userApiKey}
                  onChange={e => handleApiKeyChange(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="air-provider"
                  checked={provider === 'webllm'}
                  onChange={() => handleProviderChange('webllm')}
                  className="accent-primary"
                />
                <div>
                  <span className="text-sm font-medium">WebLLM (local)</span>
                  <p className="text-xs text-muted-foreground">Runs entirely in browser (~700 MB download once, cached locally)</p>
                </div>
              </label>
              {provider === 'webllm' && !webllmEngine && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={initWebllm}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Load Model
                  </button>
                  {webllmStatus && (
                    <p className="text-xs text-muted-foreground">{webllmStatus}</p>
                  )}
                </div>
              )}
              {provider === 'webllm' && webllmEngine && (
                <p className="text-xs text-emerald-500">Model ready</p>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[60px]">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Ask me anything about EASA aviation theory</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (msg.content || (isLoading && i === messages.length - 1)) && (
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-purple-500" />
                </div>
              )}
              <div className="group relative max-w-[85%] sm:max-w-[80%]">
                <div
                  className={`rounded-xl px-3 py-2 text-sm break-words ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } ${msg.role === 'assistant' && msg.content ? 'pb-8' : ''}`}
                >
                  {msg.role === 'assistant' ? (
                    msg.content ? (
                      <MessageContent html={renderMarkdown(msg.content)} />
                    ) : isLoading && i === messages.length - 1 ? (
                      <div className="flex gap-1.5 py-1">
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : null
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'assistant' && msg.content && (
                  <button
                    onClick={() => copyMessage(msg.content, i)}
                    className="absolute bottom-1 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                    aria-label="Copy response"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about aviation..."
              rows={1}
              className="flex-1 px-3 py-2 text-base sm:text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
