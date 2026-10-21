'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  AlertCircle, 
  Bot, 
  CornerDownRight, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  PanelLeft, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw 
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
}

interface ChatbotProps {
  clientId: string;
  clientName: string;
}

function parseBoldOnly(text: string): (string | React.ReactNode)[] {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: (string | React.ReactNode)[] = [];
  let bLast = 0;
  let bMatch;
  while ((bMatch = boldRegex.exec(text)) !== null) {
    if (bMatch.index > bLast) {
      parts.push(text.substring(bLast, bMatch.index));
    }
    parts.push(<strong key={`b-only-${bMatch.index}`} className="font-bold text-white">{bMatch[1]}</strong>);
    bLast = boldRegex.lastIndex;
  }
  if (bLast < text.length) {
    parts.push(text.substring(bLast));
  }
  return parts.length > 0 ? parts : [text];
}

function parseInlineFormatting(text: string) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: (string | React.ReactNode)[] = [];
  
  const linkMatches: { start: number; end: number; text: string; url: string }[] = [];
  let match;
  linkRegex.lastIndex = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    linkMatches.push({
      start: match.index,
      end: linkRegex.lastIndex,
      text: match[1],
      url: match[2]
    });
  }
  
  if (linkMatches.length === 0) {
    return parseBoldOnly(text);
  }
  
  let scanIdx = 0;
  linkMatches.forEach((lm, lmIdx) => {
    if (lm.start > scanIdx) {
      const slice = text.substring(scanIdx, lm.start);
      parts.push(...parseBoldOnly(slice));
    }
    parts.push(
      <a 
        key={`link-${lmIdx}`}
        href={lm.url}
        target={lm.url.startsWith('http') ? '_blank' : undefined}
        rel={lm.url.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-1 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/40 hover:bg-indigo-900/30 transition-all cursor-pointer"
        download={!lm.url.startsWith('http')}
      >
        {lm.text}
      </a>
    );
    scanIdx = lm.end;
  });
  
  if (scanIdx < text.length) {
    const slice = text.substring(scanIdx);
    parts.push(...parseBoldOnly(slice));
  }
  
  return parts;
}

function renderMessageContent(content: string) {
  const lines = content.split('\n');
  
  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIdx) => {
        let trimmed = line.trim();
        
        // Handle headings: #, ##, ###, ####
        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2];
            const sizeClass = 
              level === 1 ? 'text-sm font-extrabold text-white mt-3 mb-1 block' :
              level === 2 ? 'text-xs font-bold text-white mt-2 mb-1 block' :
              'text-[10px] font-bold text-gray-200 mt-1.5 mb-0.5 block uppercase tracking-wider';
            return (
              <span key={lineIdx} className={sizeClass}>
                {parseInlineFormatting(text)}
              </span>
            );
          }
        }
        
        // Handle lists: * or -
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.substring(2);
          return (
            <div key={lineIdx} className="flex gap-1.5 items-start pl-1 mt-0.5">
              <span className="text-indigo-400 mt-1.5 shrink-0 text-[8px]">▪</span>
              <span className="text-xs text-gray-300 leading-relaxed font-semibold">
                {parseInlineFormatting(text)}
              </span>
            </div>
          );
        }

        // Default: normal line
        if (trimmed === '') {
          return <div key={lineIdx} className="h-1" />;
        }
        
        return (
          <p key={lineIdx} className="text-xs text-gray-300 leading-relaxed font-semibold">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function Chatbot({ clientId, clientName }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Save Dialog states
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested Prompts
  const suggestions = [
    'What is our current cyber insurance coverage?',
    'Which vendors require MFA?',
    'What is our debt-to-equity ratio?',
    'Scan transactions for duplicate invoices',
    'Download Risk Assessment Report PDF'
  ];

  // Load sessions from local storage when switching clients
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`riskpulse_sessions_${clientId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ChatSession[];
          setSessions(parsed);
          if (parsed.length > 0) {
            setActiveSessionId(parsed[0].id);
            setMessages(parsed[0].messages);
          } else {
            initDefaultSession();
          }
        } catch (e) {
          console.error('Failed to parse chat sessions:', e);
          initDefaultSession();
        }
      } else {
        initDefaultSession();
      }
    }
  }, [clientId, clientName]);

  // Auto-maximize/align sidebar on full screen transition
  useEffect(() => {
    if (isFullScreen) {
      setIsSidebarOpen(true);
    }
  }, [isFullScreen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initDefaultSession = () => {
    const defaultId = 'sess-' + Date.now();
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: `Hi there! I am the **RiskPulse AI Advisor**. I have indexed the financial ratios, vendors, cybersecurity status, and uploaded policies for **${clientName}**. 
      
How can I help you analyze their risks today?`,
      timestamp: new Date().toISOString()
    };
    const defaultSession: ChatSession = {
      id: defaultId,
      title: 'Welcome Chat',
      messages: [welcomeMessage],
      timestamp: new Date().toISOString()
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultId);
    setMessages([welcomeMessage]);
    localStorage.setItem(`riskpulse_sessions_${clientId}`, JSON.stringify([defaultSession]));
  };

  const updateSessionMessages = (sessionId: string, newMsgs: ChatMessage[]) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          let title = s.title;
          if (title === 'Welcome Chat' || title === 'New Session') {
            const firstUserMsg = newMsgs.find(m => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            }
          }
          return { ...s, messages: newMsgs, title, timestamp: new Date().toISOString() };
        }
        return s;
      });
      localStorage.setItem(`riskpulse_sessions_${clientId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateSessionMessages(activeSessionId, updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: text })
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const replyMsg: ChatMessage = {
        role: 'assistant',
        content: data.content,
        citations: data.citations,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, replyMsg];
      setMessages(finalMessages);
      updateSessionMessages(activeSessionId, finalMessages);
    } catch (e) {
      console.error(e);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Error: Failed to fetch advisor reply. Please check your network or OpenAI configuration.',
        timestamp: new Date().toISOString()
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);
      updateSessionMessages(activeSessionId, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChatClick = () => {
    const hasUserMsgs = messages.some(m => m.role === 'user');
    if (hasUserMsgs) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const suggestedTitle = firstUserMsg ? firstUserMsg.content.slice(0, 24) : 'Risk Audit Session';
      setSaveTitleInput(suggestedTitle);
      setShowSavePrompt(true);
    } else {
      startNewChatSession();
    }
  };

  const startNewChatSession = () => {
    const newId = 'sess-' + Date.now();
    const welcomeMsg: ChatMessage = {
      role: 'assistant',
      content: `Hi there! This is a **new conversation session** for **${clientName}**. Ask me any financial or cyber risk queries!`,
      timestamp: new Date().toISOString()
    };
    const newSess: ChatSession = {
      id: newId,
      title: 'New Session',
      messages: [welcomeMsg],
      timestamp: new Date().toISOString()
    };

    setSessions(prev => {
      const updated = [newSess, ...prev];
      localStorage.setItem(`riskpulse_sessions_${clientId}`, JSON.stringify(updated));
      return updated;
    });
    setActiveSessionId(newId);
    setMessages([welcomeMsg]);
    setShowSavePrompt(false);
  };

  const confirmSaveCurrentSession = () => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, title: saveTitleInput || 'Saved Chat' };
        }
        return s;
      });
      localStorage.setItem(`riskpulse_sessions_${clientId}`, JSON.stringify(updated));
      return updated;
    });
    startNewChatSession();
  };

  const discardCurrentSession = () => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== activeSessionId);
      localStorage.setItem(`riskpulse_sessions_${clientId}`, JSON.stringify(updated));
      return updated;
    });
    startNewChatSession();
  };

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    if (!isFullScreen) {
      setIsSidebarOpen(false); // Close sidebar popup in drawer mode
    }
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem(`riskpulse_sessions_${clientId}`, JSON.stringify(updated));
      
      // If we deleted the active session, fallback to welcome load
      if (sessionId === activeSessionId) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id);
          setMessages(updated[0].messages);
        } else {
          // Trigger timeout to init default session
          setTimeout(() => initDefaultSession(), 10);
        }
      }
      return updated;
    });
  };

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      isFullScreen 
        ? 'inset-4 md:inset-10 flex flex-col' 
        : 'bottom-6 right-6 flex flex-col items-end'
    }`}>
      {/* Floating Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-all duration-300 relative group"
          style={{ animation: 'riskPulse 2.5s infinite' }}
        >
          <MessageSquare size={24} />
          <span className="absolute right-14 bg-gray-900 border border-gray-800 text-xs text-indigo-400 py-1.5 px-3 rounded-lg shadow-xl font-medium tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center gap-1.5">
            <Sparkles size={12} />
            Ask RiskPulse AI
          </span>
        </button>
      )}

      {/* Main Chatbot Panel (Popover or Fullscreen) */}
      {isOpen && (
        <div className={`bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 ${
          isFullScreen 
            ? 'w-full h-full flex-1' 
            : 'w-[400px] h-[550px]'
        }`}>
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isSidebarOpen ? 'text-white' : 'text-indigo-200'}`}
                title="Chat History sessions"
              >
                <PanelLeft size={16} />
              </button>
              
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold leading-none">RiskPulse Copilot</h4>
                <span className="text-[10px] text-indigo-200 mt-0.5 block font-semibold">{clientName} Index Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
                title={isFullScreen ? 'Minimize Window' : 'Fullscreen Chat'}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setIsFullScreen(false);
                }}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Outer Body Pane */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* LEFT SIDEBAR: ChatGPT-style session drawer */}
            {isSidebarOpen && (
              <div className={`border-r border-gray-800 bg-gray-955 flex flex-col shrink-0 ${
                isFullScreen 
                  ? 'w-64 relative' 
                  : 'absolute inset-y-0 left-0 w-60 z-30 shadow-2xl animate-in slide-in-from-left duration-250'
              }`}>
                {/* New Chat Button */}
                <div className="p-3 border-b border-gray-850">
                  <button
                    onClick={handleNewChatClick}
                    className="w-full bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus size={14} className="text-indigo-400" />
                    <span>New Chat Session</span>
                  </button>
                </div>

                {/* Session list items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {sessions.map(s => {
                    const isActive = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => loadSession(s)}
                        className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-indigo-950/20 text-indigo-300 font-bold border border-indigo-900/30' 
                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{s.title}</span>
                        {sessions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 transition-opacity duration-150 shrink-0"
                            title="Delete Chat"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Close drawer button for popup mode */}
                {!isFullScreen && (
                  <div className="p-3 border-t border-gray-850 text-center">
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="text-[10px] font-bold text-gray-500 hover:text-white"
                    >
                      Close Sidebar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGE FEED PANE */}
            <div className="flex-1 flex flex-col bg-gray-950/40 relative overflow-hidden">
              {/* Messages viewport */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded bg-indigo-900/50 border border-indigo-700/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 mt-1 shrink-0">
                        AI
                      </div>
                    )}
                    <div 
                      className={`max-w-[80%] rounded-xl p-3 text-sm shadow-md leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-gray-800/80 text-gray-200 border border-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line text-xs font-medium">
                        {renderMessageContent(msg.content)}
                      </p>
                      
                      {/* Citations panel */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-gray-700/50 text-[10px] text-gray-400 flex flex-col gap-1">
                          <span className="font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Paperclip size={10} />
                            Sources & Citations:
                          </span>
                          {msg.citations.map((c, i) => {
                            const citationName = typeof c === 'string' ? c : c.name;
                            const pageText = (typeof c === 'object' && c.page) ? ` (Page ${c.page})` : '';
                            const confidence = (typeof c === 'object' && c.confidence) ? c.confidence : 0;
                            
                            return (
                              <div key={i} className="flex items-center gap-1.5 text-gray-300 bg-gray-955/40 p-1.5 rounded border border-gray-800/40 hover:text-indigo-400 hover:border-indigo-800 transition-all cursor-pointer">
                                <CornerDownRight size={10} className="text-indigo-400 shrink-0" />
                                <span className="truncate flex-1 font-semibold text-[10px]">{citationName}{pageText}</span>
                                {confidence > 0 && (
                                  <span className="text-[9px] bg-indigo-950/60 border border-indigo-900/35 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                                    {confidence}% Match
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded bg-indigo-900/50 border border-indigo-700/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 mt-1 shrink-0">
                      AI
                    </div>
                    <div className="bg-gray-800/80 border border-gray-800 text-gray-400 rounded-xl p-3 text-xs flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span>Synthesizing ratios & document contexts...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Panel */}
              {messages.length === 1 && (
                <div className="px-4 py-2 bg-gray-950/70 border-t border-gray-800 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto shrink-0">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-[10px] text-gray-400 bg-gray-900 border border-gray-800 hover:bg-indigo-600 hover:text-white py-1 px-2 rounded-md truncate max-w-full font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Form */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about financial ratios, MFA, policies, or export report..."
                  className="flex-1 bg-gray-950 border border-gray-800 text-xs rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>

              {/* SAVE CONVERSATION PROMPT OVERLAY MODAL */}
              {showSavePrompt && (
                <div className="absolute inset-0 bg-black/75 z-40 flex items-center justify-center p-4">
                  <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl w-full max-w-xs shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-indigo-400 w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-white text-xs">Save Conversation Session?</h5>
                        <p className="text-[10px] text-gray-500 mt-1">Do you want to archive the current active session in the sidebar history?</p>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={saveTitleInput}
                      onChange={(e) => setSaveTitleInput(e.target.value)}
                      placeholder="e.g. Acme Runway Review"
                      className="w-full bg-gray-950 border border-gray-800 text-xs rounded-lg py-1.5 px-3 focus:outline-none focus:border-indigo-500 text-white font-medium"
                    />

                    <div className="flex justify-end gap-2 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={discardCurrentSession}
                        className="text-red-400 hover:text-red-300 py-1.5 px-3 rounded hover:bg-red-950/15"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={confirmSaveCurrentSession}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded shadow shadow-indigo-600/10"
                      >
                        Yes, Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
