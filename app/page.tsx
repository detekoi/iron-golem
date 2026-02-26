"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pickaxe, Coffee, Box, Menu, X } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import SummarySidebar from '@/components/SummarySidebar';
import { ChatMessage, SessionSummary, ChatSession } from '@/lib/types';
import { StorageService } from '@/lib/storage';
import type { MinecraftEdition } from '@/lib/storage';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('New Chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [edition, setEditionState] = useState<MinecraftEdition>('java');
  // Skip auto-save when we're just hydrating from storage (no actual changes)
  const isLoadingSession = useRef(false);

  const handleSetEdition = (ed: MinecraftEdition) => {
    setEditionState(ed);
    StorageService.setEdition(ed);
  };

  // Load session on mount
  useEffect(() => {
    // Check for active session ID
    const activeId = StorageService.getActiveSessionId();
    if (activeId) {
      const session = StorageService.getSession(activeId);
      if (session) {
        isLoadingSession.current = true;
        setCurrentSessionId(session.id);
        setMessages(session.messages);
        setSummary(session.summary);
        setSessionName(session.name);
        return;
      }
    }

    // Fallback to creating a new one if none exists
    createNewSession();
  }, []);

  // Load edition preference on mount
  useEffect(() => {
    setEditionState(StorageService.getEdition());
  }, []);

  // Track viewport width for responsive sidebar behavior
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleChange(mql);
    mql.addEventListener('change', handleChange as any);
    return () => mql.removeEventListener('change', handleChange as any);
  }, []);

  const createNewSession = () => {
    const newSession = StorageService.createSession();
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setSummary(null);
    setSessionName(newSession.name);
  };

  const loadSession = (session: ChatSession) => {
    isLoadingSession.current = true;
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setSummary(session.summary);
    setSessionName(session.name);
    StorageService.setActiveSessionId(session.id);
  };

  // Automatic Summary Generation
  useEffect(() => {
    if (isLoadingSession.current) return; // Skip on session load/switch
    if (messages.length < 2) return;

    const lastMessage = messages[messages.length - 1];
    // Only generate if the last message is from the model AND done streaming
    if (lastMessage.role === 'model' && !lastMessage.isStreaming) {
      generateSummary();
    }
  }, [messages]);

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!currentSessionId) return;
    // Don't auto-save while streaming
    const isStreaming = messages.some(m => m.isStreaming);
    if (isStreaming) return;

    // Skip save when we just loaded/hydrated a session from storage
    if (isLoadingSession.current) {

      // Defer reset so all effects in this render cycle see the flag
      queueMicrotask(() => { isLoadingSession.current = false; });
      return;
    }

    const handleAutoSave = async () => {
      let nameToSave = sessionName;

      // Generate ID via API if it's "New Chat" and we have context
      if (sessionName === "New Chat" && messages.length > 0) {
        // Check if we have at least one user message
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
          try {
            const res = await fetch('/api/generate-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.title) {
                nameToSave = data.title;
                setSessionName(nameToSave);
              }
            } else {
              const err = await res.text();
              console.error("Title generation API failed:", err);
            }
          } catch (e) {
            console.error("Failed to generate title", e);
          }
        }
      }

      const updatedSession: ChatSession = {
        id: currentSessionId,
        name: nameToSave,
        messages,
        summary,
        lastUpdated: Date.now()
      };
      StorageService.saveSession(updatedSession);
    };

    handleAutoSave();
  }, [messages, summary, currentSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="h-screen-safe bg-zinc-950 text-white flex flex-col overflow-hidden font-sans selection:bg-green-500/30">
      <header className="min-h-14 md:h-16 px-3 md:px-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur shrink-0 flex items-center justify-between select-none gap-2 py-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-green-600 to-emerald-800 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/20 border border-green-500/20 overflow-hidden shrink-0">
            <img src="/icon.png" alt="Iron Golem Logo" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-bold bg-gradient-to-r from-gray-100 to-gray-300 text-transparent bg-clip-text truncate">
              Iron Golem<span className="hidden sm:inline">: Minecraft Helper</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase truncate">
                {currentSessionId ? `Session: ${sessionName}` : 'Online • Gemini 3 Flash'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* Edition Toggle */}
          <div className="flex items-center gap-0.5 md:gap-1 bg-zinc-800/80 rounded-lg p-0.5 md:p-1 border border-white/5">
            <button
              onClick={() => handleSetEdition('java')}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-medium transition-all duration-200 ${edition === 'java'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
            >
              <Coffee className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span className="hidden xs:inline">Java</span>
            </button>
            <button
              onClick={() => handleSetEdition('bedrock')}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-medium transition-all duration-200 ${edition === 'bedrock'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
            >
              <Box className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span className="hidden xs:inline">Bedrock</span>
            </button>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 md:p-2 text-zinc-500 hover:text-white transition-colors"
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 md:hidden" />
            ) : null}
            <span className="hidden md:block">
              {isSidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-right-close"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m8 9 3 3-3 3" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-right-open"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m8 15 3-3-3-3" /></svg>
              )}
            </span>
            {!isSidebarOpen ? (
              <Menu className="w-5 h-5 md:hidden" />
            ) : null}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="flex-1 min-w-0 z-10">
          <ChatInterface messages={messages} setMessages={setMessages} summary={summary} edition={edition} />
        </div>

        {/* Sidebar Overlay backdrop for mobile */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          ${isMobile
            ? `fixed inset-y-0 right-0 z-40 w-[85vw] max-w-sm transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`
            : `z-20 h-full transition-all duration-300 ease-in-out overflow-hidden ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-none'}`
          }
          border-l border-white/5 bg-zinc-900/95 md:bg-zinc-900/80 backdrop-blur-xl shadow-2xl
        `}>
          <div className={`${isMobile ? 'w-full' : 'w-80'} h-full`}>
            <SummarySidebar
              messages={messages}
              onImport={setSummary}
              summary={summary}
              setSummary={setSummary}
              currentSessionId={currentSessionId}
              onLoadSession={(session) => {
                loadSession(session);
                if (isMobile) setIsSidebarOpen(false);
              }}
              onCreateSession={() => {
                createNewSession();
                if (isMobile) setIsSidebarOpen(false);
              }}
              isGenerating={isGeneratingSummary}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
