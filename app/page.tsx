"use client";

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import SummarySidebar from '@/components/SummarySidebar';
import { ChatMessage, SessionSummary } from '@/lib/types';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden font-sans selection:bg-green-500/30">
      <header className="h-16 px-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur shrink-0 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-800 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/20 border border-green-500/20">
            <span className="text-lg">⛏️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-100 to-gray-300 text-transparent bg-clip-text">
              Minecraft Helper
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Online • Gemini 3 Flash</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="flex-1 min-w-0 z-10">
          <ChatInterface messages={messages} setMessages={setMessages} summary={summary} />
        </div>

        <div className="z-20 h-full border-l border-white/5 bg-zinc-900/80 backdrop-blur-xl shadow-2xl">
          <SummarySidebar messages={messages} onImport={setSummary} summary={summary} setSummary={setSummary} />
        </div>
      </div>
    </main>
  );
}
