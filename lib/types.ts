import { z } from 'zod';
import { SessionSummarySchema, ProjectSchema, PlayerContextSchema } from './schemas';

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type PlayerContext = z.infer<typeof PlayerContextSchema>;

export interface CraftingRecipe {
    slots: string[];
    outputItem: string;
    outputAmount: number;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text?: string; thoughtSignature?: string; }[];
    timestamp?: string;
    groundingMetadata?: any;
    isStreaming?: boolean;
    craftingRecipe?: CraftingRecipe;
}

export interface ChatSession {
    id: string;
    name: string;
    messages: ChatMessage[];
    summary: SessionSummary | null;
    lastUpdated: number;
}
