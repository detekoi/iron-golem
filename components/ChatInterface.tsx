"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, SessionSummary } from '@/lib/types';
import type { MinecraftEdition } from '@/lib/storage';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CraftingRecipe from './CraftingRecipe';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    summary: SessionSummary | null;
    edition: MinecraftEdition;
}

export default function ChatInterface({ messages, setMessages, summary, edition }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pendingScrollIdx = useRef<number | null>(null);

    // Scroll the user's message to the top whenever messages change and we have a pending target
    useEffect(() => {
        if (pendingScrollIdx.current !== null) {
            const el = document.getElementById(`message-${pendingScrollIdx.current}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            // Clear once the AI response has started streaming (model message exists after user)
            const nextMsg = messages[pendingScrollIdx.current + 1];
            if (nextMsg && nextMsg.role === 'model' && nextMsg.parts[0]?.text) {
                pendingScrollIdx.current = null;
            }
        }
    }, [messages]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [{ text: input.trim() }],
            timestamp: new Date().toISOString()
        };

        const allMessages = [...messages, userMessage];
        setMessages(allMessages);
        setInput('');
        setIsLoading(true);
        // Mark this user message for scroll-to-top
        pendingScrollIdx.current = allMessages.length - 1;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: allMessages,
                    summary,
                    edition
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Failed to send message: ${response.status} ${errorText}`);
            }

            // Add placeholder streaming message
            const assistantMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: '' }],
                timestamp: new Date().toISOString(),
                isStreaming: true
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Read the SSE stream
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const jsonStr = line.slice(6);
                    let event: any;
                    try { event = JSON.parse(jsonStr); } catch { continue; }

                    if (event.type === 'text') {
                        accumulatedText += event.content;
                        const currentText = accumulatedText;
                        setMessages(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            updated[updated.length - 1] = { ...last, parts: [{ text: currentText }] };
                            return updated;
                        });
                    } else if (event.type === 'metadata') {
                        setMessages(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            updated[updated.length - 1] = { ...last, groundingMetadata: event.groundingMetadata };
                            return updated;
                        });
                    } else if (event.type === 'recipe') {
                        setMessages(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            updated[updated.length - 1] = { ...last, craftingRecipe: event.craftingRecipe };
                            return updated;
                        });
                    } else if (event.type === 'done') {
                        setMessages(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            updated[updated.length - 1] = { ...last, isStreaming: false };
                            return updated;
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            // Clear streaming state on error
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.isStreaming) {
                    updated[updated.length - 1] = {
                        ...last,
                        isStreaming: false,
                        parts: [{ text: last.parts[0]?.text || 'Sorry, an error occurred.' }]
                    };
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Collapsible wrapper for long user messages
    const CollapsibleMessage = ({ children }: { children: React.ReactNode }) => {
        const contentRef = useRef<HTMLDivElement>(null);
        const [isExpanded, setIsExpanded] = useState(false);
        const [needsCollapse, setNeedsCollapse] = useState(false);
        const COLLAPSED_HEIGHT = 120; // ~5 lines at 14px text + leading-relaxed

        useEffect(() => {
            if (contentRef.current) {
                const height = contentRef.current.scrollHeight;
                setNeedsCollapse(height > COLLAPSED_HEIGHT + 40);
            }
        }, [children]);

        const isCollapsed = needsCollapse && !isExpanded;

        return (
            <div className="relative">
                <div
                    ref={contentRef}
                    style={isCollapsed ? { maxHeight: `${COLLAPSED_HEIGHT}px`, overflow: 'hidden' } : undefined}
                >
                    {children}
                </div>
                {isCollapsed && (
                    <div
                        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent, rgb(37 99 235))' }}
                    />
                )}
                {needsCollapse && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-1 text-xs text-blue-200 hover:text-white transition-colors cursor-pointer"
                    >
                        {isExpanded ? 'Show less ▲' : 'Show more ▼'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-2 md:p-4">
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto mb-2 md:mb-4 space-y-3 md:space-y-4 p-2 md:p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-semibold">Iron Golem</h2>
                        <p className="mt-2">Ask anything about crafting, updates, or strategies!</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} id={`message-${idx}`} className={clsx(
                        "flex gap-2 md:gap-3 max-w-[95%] md:max-w-[80%] scroll-mt-8",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}>
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            msg.role === 'user' ? "bg-blue-600" : "bg-green-600"
                        )}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>

                        <div className={clsx(
                            "p-3 rounded-2xl text-sm leading-relaxed",
                            msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-zinc-800 text-gray-100 rounded-tl-none"
                        )}>
                            {msg.role === 'user' ? (
                                <CollapsibleMessage>
                                    <div>{msg.parts[0].text}</div>
                                </CollapsibleMessage>
                            ) : (
                                <div className="[&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:font-bold [&>h3]:mb-1 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>strong]:font-bold [&>a]:text-blue-400 [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-zinc-500 [&>blockquote]:pl-4 [&>blockquote]:italic">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            table: ({ children }) => (
                                                <div className="my-3 w-fit rounded-lg border border-zinc-600/50">
                                                    <table className="text-sm border-collapse">{children}</table>
                                                </div>
                                            ),
                                            thead: ({ children }) => (
                                                <thead className="bg-emerald-900/40 text-emerald-300 text-xs uppercase tracking-wider">{children}</thead>
                                            ),
                                            tbody: ({ children }) => (
                                                <tbody className="divide-y divide-zinc-700/50">{children}</tbody>
                                            ),
                                            tr: ({ children }) => (
                                                <tr className="hover:bg-white/5 transition-colors even:bg-white/[0.02]">{children}</tr>
                                            ),
                                            th: ({ children }) => (
                                                <th className="px-3 py-2 text-left font-semibold">{children}</th>
                                            ),
                                            td: ({ children }) => (
                                                <td className="px-3 py-2">{children}</td>
                                            ),
                                        }}
                                    >
                                        {msg.parts[0].text}
                                    </ReactMarkdown>
                                    {msg.isStreaming && (
                                        <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 rounded-sm animate-pulse align-middle" />
                                    )}
                                </div>
                            )}

                            {/* Render Crafting Recipe if present */}
                            {msg.craftingRecipe && (
                                <CraftingRecipe recipe={msg.craftingRecipe} />
                            )}

                            {msg.groundingMetadata?.groundingChunks && (
                                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
                                    <div className="font-semibold mb-1 opacity-70">Sources</div>
                                    <ul className="grid gap-1">
                                        {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => (
                                            <li key={i} className="truncate">
                                                <a
                                                    href={chunk.web?.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:text-blue-300 hover:underline decoration-dotted flex items-center gap-1"
                                                >
                                                    <span className="w-1 h-1 rounded-full bg-blue-400 inline-block"></span>
                                                    {chunk.web?.title || chunk.web?.uri}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex gap-3 mr-auto">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                    </div>
                )}

                {/* Spacer: gives enough room to scroll the user's message to the top */}
                {messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                    <div style={{ minHeight: '80vh' }} />
                )}

            </div>

            <form onSubmit={handleSubmit} className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="How do I craft an Iron Sword?"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl py-3 md:py-4 pl-3 md:pl-4 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-zinc-500 text-sm md:text-base"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={18} className="text-white" />
                </button>
            </form>
        </div>
    );
}
