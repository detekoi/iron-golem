import { useState } from 'react';
import { Download, Upload, FileJson, Loader2, Save, Check } from 'lucide-react';
import { SessionSummary, ChatMessage } from '@/lib/types';

interface SummarySidebarProps {
    messages: ChatMessage[];
    onImport: (summary: SessionSummary) => void;
    summary: SessionSummary | null;
    setSummary: (s: SessionSummary) => void;
}

export default function SummarySidebar({ messages, onImport, summary, setSummary }: SummarySidebarProps) {
    const [loading, setLoading] = useState(false);

    const generateSummary = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!summary) return;
        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minecraft-session-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                // Validate logic here if needed, or Zod parse
                onImport(json);
                setSummary(json);
            } catch (err) {
                console.error("Invalid JSON", err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="w-80 border-l border-white/10 bg-zinc-900/50 p-4 flex flex-col gap-4 text-sm h-full overflow-y-auto shrink-0">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-white">
                <FileJson className="w-5 h-5 text-yellow-500" />
                Session Progress
            </h2>

            <div className="flex gap-2">
                <button
                    onClick={generateSummary}
                    disabled={loading || messages.length < 2}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Progress
                </button>
            </div>

            <div className="flex gap-2 text-white">
                <button onClick={handleExport} disabled={!summary} className="flex-1 border border-white/20 hover:bg-white/5 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <Download className="w-4 h-4" /> Export
                </button>
                <label className="flex-1 border border-white/20 hover:bg-white/5 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" /> Import
                    <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                </label>
            </div>

            {summary ? (
                <div className="space-y-6 mt-2 text-gray-300">
                    {summary.currentProjects?.length > 0 && (
                        <div>
                            <h3 className="text-zinc-500 font-bold mb-2 uppercase text-[10px] tracking-wider">Current Projects</h3>
                            <ul className="space-y-2">
                                {summary.currentProjects.map((p, i) => (
                                    <li key={i} className="bg-zinc-800/50 p-3 rounded-lg border border-white/5">
                                        <div className="font-medium text-blue-300">{p.name}</div>
                                        <div className="text-xs text-zinc-400 mt-1 flex justify-between">
                                            <span>{p.status}</span>
                                            <span>{p.progress}%</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {summary.goals?.shortTerm?.length > 0 && (
                        <div>
                            <h3 className="text-zinc-500 font-bold mb-2 uppercase text-[10px] tracking-wider">Goals</h3>
                            <ul className="list-disc pl-4 space-y-1 text-xs">
                                {summary.goals.shortTerm.map((g, i) => (
                                    <li key={i}>{g}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {summary.knowledgeBase?.mechanicsLearned?.length > 0 && (
                        <div>
                            <h3 className="text-zinc-500 font-bold mb-2 uppercase text-[10px] tracking-wider">Learned</h3>
                            <div className="flex flex-wrap gap-1">
                                {summary.knowledgeBase.mechanicsLearned.map((m, i) => (
                                    <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs text-emerald-400">{m}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-[10px] text-zinc-600 pt-4 border-t border-white/5">
                        Last Updated: {new Date(summary.lastUpdated || Date.now()).toLocaleString()}
                    </div>
                </div>
            ) : (
                <div className="text-zinc-500 text-center py-10 px-4 italic text-xs">
                    No session summary yet.<br />Chat with the helper then click "Save Progress" to generate a summary!
                </div>
            )}
        </div>
    );
}
