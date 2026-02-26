import { describe, it, expect } from 'vitest';
import {
    getSystemInstruction,
    MODEL_ID,
    ROUTER_MODEL_ID,
    CRAFTING_TOOL,
    SEARCH_TOOL,
} from './gemini';

// ── getSystemInstruction() ─────────────────────────────────

describe('getSystemInstruction', () => {
    it('returns Java-specific instruction by default', () => {
        const result = getSystemInstruction();
        expect(result).toContain('Java Edition');
        expect(result).toContain('Minecraft');
    });

    it('returns Java-specific instruction when explicitly passed', () => {
        const result = getSystemInstruction('java');
        expect(result).toContain('Java Edition');
    });

    it('returns Bedrock-specific instruction', () => {
        const result = getSystemInstruction('bedrock');
        expect(result).toContain('Bedrock Edition');
    });

    it('includes search grounding instructions', () => {
        const result = getSystemInstruction();
        expect(result).toContain('SEARCH GROUNDING');
    });
});

// ── Model IDs ──────────────────────────────────────────────

describe('Model IDs', () => {
    it('MODEL_ID is a non-empty string', () => {
        expect(MODEL_ID).toBeTruthy();
        expect(typeof MODEL_ID).toBe('string');
    });

    it('ROUTER_MODEL_ID is a non-empty string', () => {
        expect(ROUTER_MODEL_ID).toBeTruthy();
        expect(typeof ROUTER_MODEL_ID).toBe('string');
    });

    it('MODEL_ID and ROUTER_MODEL_ID are different', () => {
        expect(MODEL_ID).not.toBe(ROUTER_MODEL_ID);
    });
});

// ── Tool shapes ────────────────────────────────────────────

describe('CRAFTING_TOOL', () => {
    it('has functionDeclarations', () => {
        expect(CRAFTING_TOOL.functionDeclarations).toBeDefined();
        expect(CRAFTING_TOOL.functionDeclarations!.length).toBeGreaterThan(0);
    });

    it('declares display_crafting_recipe', () => {
        const decl = CRAFTING_TOOL.functionDeclarations![0];
        expect(decl.name).toBe('display_crafting_recipe');
    });

    it('requires slots, outputItem, outputAmount', () => {
        const params = CRAFTING_TOOL.functionDeclarations![0].parameters as any;
        expect(params.required).toContain('slots');
        expect(params.required).toContain('outputItem');
        expect(params.required).toContain('outputAmount');
    });
});

describe('SEARCH_TOOL', () => {
    it('has googleSearch property', () => {
        expect(SEARCH_TOOL).toHaveProperty('googleSearch');
    });
});
