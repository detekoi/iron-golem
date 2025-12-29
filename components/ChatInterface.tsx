"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, SessionSummary } from '@/lib/types';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    summary: SessionSummary | null;
}

export default function ChatInterface({ messages, setMessages, summary }: ChatInterfaceProps) {
    // const [messages, setMessages] = useState<ChatMessage[]>([]); // Lifted up
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [{ text: input.trim() }],
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    summary // Pass current summary context
                })
            });

            if (!response.ok) throw new Error('Failed to send message');
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Temporary message for the assistant response
            const assistantMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: '' }],
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];

                    lines.forEach(line => {
                        if (!line.trim()) return;
                        try {
                            const data = JSON.parse(line);
                            if (data.type === 'text') {
                                // Append text to the last part or create new if needed
                                lastMsg.parts[0].text = (lastMsg.parts[0].text || '') + data.content;
                            } else if (data.type === 'grounding') {
                                lastMsg.groundingMetadata = data.content;
                            }
                        } catch (e) {
                            console.error('Error parsing chunk', e);
                        }
                    });
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Error:', error);
            // Show error state?
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-semibold">Minecraft AI Helper</h2>
                        <p className="mt-2">Ask anything about crafting, updates, or strategies!</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={clsx(
                        "flex gap-3 max-w-[80%]",
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
                            <div className="whitespace-pre-wrap [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:font-bold [&>h3]:mb-1 [&>p]:mb-3 [&>strong]:font-bold [&>a]:text-blue-400 [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-zinc-500 [&>blockquote]:pl-4 [&>blockquote]:italic">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.parts[0].text}
                                </ReactMarkdown>
                            </div>
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

                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="How do I build an iron farm?"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl py-4 pl-4 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-zinc-500"
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
