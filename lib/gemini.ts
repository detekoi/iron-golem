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

export const SYSTEM_INSTRUCTION = `You are a helpful and knowledgeable Minecraft expert. 
Your goal is to assist players with crafting recipes, game mechanics, updates, building strategies, and redstone tutorials.
Always ensure your answers are accurate and relevant to Minecraft. 
If a user asks about a topic unrelated to Minecraft (like furniture styles, general history, or other games), politely steer the conversation back to Minecraft or explain that you specialize only in Minecraft.
Use Markdown to format your responses effectively, using bold text for key terms and lists for steps or items.`;

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
    const chat = client.chats.create({
        model: modelId,
        config: {
            thinkingConfig: { thinkingLevel: thinkingLevel as any },
            tools: [SEARCH_TOOL],
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        history,
    });

    return chat.sendMessage({ message: lastUserMessage });
}

export async function generateChatStream(
    history: Content[],
    lastUserMessage: string,
    modelId: string = MODEL_ID,
    thinkingLevel: "low" | "medium" | "high" | "minimal" = "medium"
) {
    const chat = client.chats.create({
        model: modelId,
        config: {
            thinkingConfig: { thinkingLevel: thinkingLevel as any },
            tools: [SEARCH_TOOL],
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        history,
    });

    return chat.sendMessageStream({ message: lastUserMessage });
}
