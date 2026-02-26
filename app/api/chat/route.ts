import { NextRequest } from 'next/server';
import { generateChatStream } from '@/lib/gemini';

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

        // Start recipe check in parallel (non-blocking)
        const geminiLib = await import('@/lib/gemini');
        const recipePromise = (async () => {
            try {
                const shouldFetchRecipe = await geminiLib.isCraftingQuery(lastMessage);
                if (shouldFetchRecipe) {
                    console.log("LLM Router detected recipe request for:", lastMessage);
                    return geminiLib.generateCraftingRecipe(lastMessage, selectedEdition);
                }
            } catch (e) {
                console.error("Recipe generation failed:", e);
            }
            return null;
        })();

        // Start streaming response
        const streamResponse = await generateChatStream(history, lastMessage, selectedEdition);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (data: Record<string, any>) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    let groundingMetadata: any = undefined;

                    // Stream text chunks from Gemini
                    for await (const chunk of streamResponse) {
                        const candidate = chunk.candidates?.[0];
                        const text = candidate?.content?.parts?.[0]?.text;

                        if (text) {
                            sendEvent({ type: 'text', content: text });
                        }

                        // Capture grounding metadata from the last chunk that has it
                        if (candidate?.groundingMetadata) {
                            groundingMetadata = candidate.groundingMetadata;
                        }
                    }

                    // Send grounding metadata if available
                    if (groundingMetadata) {
                        sendEvent({ type: 'metadata', groundingMetadata });
                    }

                    // Wait for recipe and send if available
                    const recipeResponse = await recipePromise;
                    if (recipeResponse) {
                        const functionCalls = recipeResponse.functionCalls;
                        if (functionCalls && functionCalls.length > 0) {
                            const recipeCall = functionCalls.find((fc: any) => fc.name === 'display_crafting_recipe');
                            if (recipeCall) {
                                sendEvent({ type: 'recipe', craftingRecipe: recipeCall.args });
                            }
                        }
                    }

                    sendEvent({ type: 'done' });
                } catch (error: any) {
                    console.error('Stream error:', error);
                    sendEvent({ type: 'error', message: error.message });
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
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
