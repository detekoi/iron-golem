import { NextRequest } from 'next/server';
import { generateChatResponse } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { messages, summary, edition } = await req.json();
        const selectedEdition = edition === 'bedrock' ? 'bedrock' : 'java';

        // Basic validation
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response('Invalid request body', { status: 400 });
        }

        const lastMessage = messages[messages.length - 1].parts[0].text;
        let history = messages.slice(0, -1).map((m: any) => ({
            role: m.role,
            parts: m.parts
        }));

        if (summary) {
            // Inject summary as context at the start of history
            const contextMessage = `[SYSTEM: Session Context Loaded]\n\n${JSON.stringify(summary, null, 2)}`;
            history = [
                { role: 'user', parts: [{ text: contextMessage }] },
                { role: 'model', parts: [{ text: "I have loaded the session context." }] },
                ...history
            ];
        }

        // Use non-streaming API
        // PASS 1: Main Chat (Thinking + Search Enabled)
        const responsePromise = generateChatResponse(history, lastMessage, selectedEdition);

        // PASS 2: Check if we need a recipe (Parallel execution if router says yes)
        let recipePromise = Promise.resolve<any>(null);

        // Use LLM Router to determine intent
        const geminiLib = await import('@/lib/gemini');
        const shouldFetchRecipe = await geminiLib.isCraftingQuery(lastMessage);

        if (shouldFetchRecipe) {
            console.log("LLM Router detected recipe request for:", lastMessage);
            recipePromise = geminiLib.generateCraftingRecipe(lastMessage, selectedEdition);
        }

        const [response, recipeResponse] = await Promise.all([responsePromise, recipePromise]);

        const candidate = response.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        const groundingMetadata = candidate?.groundingMetadata;

        // Check for function calls (tools) from the RECIPE response
        let craftingRecipe: any = undefined;

        if (recipeResponse) {
            const functionCalls = recipeResponse.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const recipeCall = functionCalls.find((fc: any) => fc.name === 'display_crafting_recipe');
                if (recipeCall) {
                    craftingRecipe = recipeCall.args;
                }
            }
        }

        return new Response(JSON.stringify({
            text,
            groundingMetadata,
            craftingRecipe
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('API Error Details:', {
            message: error.message,
            stack: error.stack,
            response: error.response ? await error.response.text() : undefined
        });
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
