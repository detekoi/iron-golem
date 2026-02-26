import { describe, it, expect } from 'vitest';
import {
    SessionSummarySchema,
    ProjectSchema,
    PlayerContextSchema,
    KnowledgeBaseSchema,
    GoalsSchema,
} from './schemas';

// ── Helpers ────────────────────────────────────────────────

const validProject = {
    name: 'Iron Farm',
    type: 'farm',
    status: 'in-progress' as const,
    description: 'Building an iron golem farm',
    progress: 50,
    nextSteps: ['Gather villagers'],
};

const validSummary = {
    summaryVersion: '1.0' as const,
    lastUpdated: new Date().toISOString(),
    currentProjects: [validProject],
    knowledgeBase: {
        mechanicsLearned: ['villager mechanics'],
        recipesKnown: ['iron sword'],
        strategiesDiscovered: [],
    },
    goals: { shortTerm: ['Build farm'], longTerm: ['Beat ender dragon'] },
};

// ── SessionSummarySchema ───────────────────────────────────

describe('SessionSummarySchema', () => {
    it('accepts a valid summary', () => {
        const result = SessionSummarySchema.safeParse(validSummary);
        expect(result.success).toBe(true);
    });

    it('rejects missing summaryVersion', () => {
        const { summaryVersion, ...rest } = validSummary;
        const result = SessionSummarySchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('rejects wrong summaryVersion value', () => {
        const result = SessionSummarySchema.safeParse({
            ...validSummary,
            summaryVersion: '2.0',
        });
        expect(result.success).toBe(false);
    });

    it('accepts optional nullable fields', () => {
        const result = SessionSummarySchema.safeParse({
            ...validSummary,
            playerContext: null,
            resources: null,
            conversationSummary: null,
            metadata: null,
        });
        expect(result.success).toBe(true);
    });
});

// ── ProjectSchema ──────────────────────────────────────────

describe('ProjectSchema', () => {
    it('accepts a valid project', () => {
        const result = ProjectSchema.safeParse(validProject);
        expect(result.success).toBe(true);
    });

    it('rejects invalid status enum', () => {
        const result = ProjectSchema.safeParse({
            ...validProject,
            status: 'abandoned',
        });
        expect(result.success).toBe(false);
    });

    it('rejects progress out of range', () => {
        const over = ProjectSchema.safeParse({ ...validProject, progress: 150 });
        const under = ProjectSchema.safeParse({ ...validProject, progress: -1 });
        expect(over.success).toBe(false);
        expect(under.success).toBe(false);
    });

    it('allows optional blockers', () => {
        const result = ProjectSchema.safeParse({
            ...validProject,
            blockers: ['Need more iron'],
        });
        expect(result.success).toBe(true);
    });
});

// ── PlayerContextSchema ────────────────────────────────────

describe('PlayerContextSchema', () => {
    it('accepts valid player context', () => {
        const result = PlayerContextSchema.safeParse({
            gameMode: 'survival',
            minecraftVersion: '1.21',
            playStyle: ['builder', 'redstoner'],
            skillLevel: 'intermediate',
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid gameMode', () => {
        const result = PlayerContextSchema.safeParse({
            gameMode: 'spectator',
            minecraftVersion: '1.21',
            playStyle: [],
            skillLevel: 'beginner',
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid skillLevel', () => {
        const result = PlayerContextSchema.safeParse({
            gameMode: 'survival',
            minecraftVersion: '1.21',
            playStyle: [],
            skillLevel: 'expert',
        });
        expect(result.success).toBe(false);
    });
});

// ── KnowledgeBaseSchema ────────────────────────────────────

describe('KnowledgeBaseSchema', () => {
    it('accepts valid knowledge base', () => {
        const result = KnowledgeBaseSchema.safeParse({
            mechanicsLearned: ['redstone basics'],
            recipesKnown: ['piston'],
            strategiesDiscovered: ['strip mining at Y=-59'],
        });
        expect(result.success).toBe(true);
    });

    it('accepts empty arrays', () => {
        const result = KnowledgeBaseSchema.safeParse({
            mechanicsLearned: [],
            recipesKnown: [],
            strategiesDiscovered: [],
        });
        expect(result.success).toBe(true);
    });
});

// ── GoalsSchema ────────────────────────────────────────────

describe('GoalsSchema', () => {
    it('accepts valid goals', () => {
        const result = GoalsSchema.safeParse({
            shortTerm: ['Find diamonds'],
            longTerm: ['Beat the game'],
        });
        expect(result.success).toBe(true);
    });
});
