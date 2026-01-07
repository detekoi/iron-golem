import { GoogleGenAI, type Content, type Tool, type GenerateContentConfig, Type, FunctionCallingConfigMode } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('GEMINI_API_KEY is not set');
    }
}

// Initialize Gemini Client
export const client = new GoogleGenAI({
    apiKey: apiKey || 'dummy'
});

export const MODEL_ID = "gemini-3-flash-preview";

export const CRAFTING_TOOL: Tool = {
    functionDeclarations: [{
        name: "display_crafting_recipe",
        description: "Displays a Minecraft crafting recipe in a visual 3x3 grid. Use this WHENEVER a user asks how to craft something or asks for a recipe.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                slots: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of 9 strings representing the 3x3 crafting grid. Use item names (e.g. 'Iron Ingot', 'Stick', 'Air'). Use 'Air' for empty slots. Row by row, top-left to bottom-right.",
                },
                outputItem: {
                    type: Type.STRING,
                    description: "The name of the item created (e.g. 'Iron Pickaxe').",
                },
                outputAmount: {
                    type: Type.INTEGER,
                    description: "The number of items created (usually 1).",
                },
            },
            required: ["slots", "outputItem", "outputAmount"],
        },
    }]
};

export const SEARCH_TOOL: Tool = { googleSearch: {} };

export const SYSTEM_INSTRUCTION = `You are a helpful and knowledgeable Minecraft expert. 
Your goal is to assist players with crafting recipes, game mechanics, updates, building strategies, and redstone tutorials.
Always ensure your answers are accurate and relevant to Minecraft.

### CRITICAL INSTRUCTION: SEARCH GROUNDING
You must **ALWAYS** use the Google Search tool when answering questions about:
1.  **New Features & Updates**: Any content from 2024, 2025 or later.
2.  **Rumors & Leaks**: If a user asks about something that sounds fake or new, SEARCH FIRST before claiming it doesn't exist. It might be a recent snapshot feature.
3.  **Specific Versions**: When asked about specific snapshot versions (e.g., "25w15a"), search for the changelog.

If a user asks about a topic unrelated to Minecraft (such as general history or other games), politely steer the conversation back to Minecraft or explain that you specialize only in Minecraft.
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
            tools: [SEARCH_TOOL], // REMOVED CRAFTING_TOOL to avoid conflict
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
            tools: [SEARCH_TOOL], // REMOVED CRAFTING_TOOL
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        history,
    });

    return chat.sendMessageStream({ message: lastUserMessage });
}

// New dedicated function for recipe generation
export async function generateCraftingRecipe(
    itemQuery: string,
    modelId: string = MODEL_ID
) {
    const chat = client.chats.create({
        model: modelId,
        config: {
            // No thinking, No search - just tools
            tools: [CRAFTING_TOOL],
            toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
            systemInstruction: "You are a Minecraft recipe database. Your ONLY job is to output the crafting recipe for the requested item using the display_crafting_recipe tool.",
        }
    });

    return chat.sendMessage({ message: `Recipe for: ${itemQuery}` });
}

export const ROUTER_MODEL_ID = "gemini-2.5-flash-lite";

export async function isCraftingQuery(text: string): Promise<boolean> {
    try {
        const result = await client.models.generateContent({
            model: ROUTER_MODEL_ID,
            config: {
                responseMimeType: "application/json",
                // @ts-ignore - Schema typing in beta SDK can be strict
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isRecipeRequest: { type: Type.BOOLEAN }
                    }
                }
            },
            contents: `Analyze if the user is asking for a Minecraft crafting recipe, how to make/build an item, or details about an item's components.
            
            Examples:
            "How do I make a bed?" -> true
            "Recipe for iron sword" -> true
            "What about a purple bed?" -> true
            "Show me the grid for a piston" -> true
            "Where do I find diamonds?" -> false (asking for location)
            "What implies a redstone signal?" -> false
            
            User Query: "${text}"`
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) return false;

        const data = JSON.parse(responseText);
        return data.isRecipeRequest === true;
    } catch (e) {
        console.error("Router check failed, falling back to false:", e);
        return false;
    }
}
