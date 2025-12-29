import { GoogleGenAI, type Content, type Tool, type GenerateContentConfig } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('GEMINI_API_KEY is not set');
    }
}

// Initialize Gemini 3 Client
export const client = new GoogleGenAI({
    apiKey: apiKey || 'dummy',
    httpOptions: { apiVersion: 'v1alpha' }
});

export const MODEL_ID = "gemini-3-flash-preview";
export const SEARCH_TOOL: Tool = { googleSearch: {} };

export const defaultGenerationConfig: GenerateContentConfig = {
    thinkingConfig: { thinkingLevel: "medium" as any },
    responseMimeType: "text/plain",
};

export async function generateChatResponse(
    history: Content[],
    lastUserMessage: string,
    modelId: string = MODEL_ID,
    thinkingLevel: "low" | "medium" | "high" | "minimal" = "medium"
) {
    const contents: Content[] = [
        ...history,
        { role: 'user', parts: [{ text: lastUserMessage }] }
    ];

    const config: GenerateContentConfig = {
        thinkingConfig: { thinkingLevel: thinkingLevel as any },
        tools: [SEARCH_TOOL],
    };

    return client.models.generateContent({
        model: modelId,
        contents,
        config
    });
}

export async function generateChatStream(
    history: Content[],
    lastUserMessage: string,
    modelId: string = MODEL_ID,
    thinkingLevel: "low" | "medium" | "high" | "minimal" = "medium"
) {
    const contents: Content[] = [
        ...history,
        { role: 'user', parts: [{ text: lastUserMessage }] }
    ];

    const config: GenerateContentConfig = {
        thinkingConfig: { thinkingLevel: thinkingLevel as any },
        tools: [SEARCH_TOOL],
    };

    return client.models.generateContentStream({
        model: modelId,
        contents,
        config
    });
}
