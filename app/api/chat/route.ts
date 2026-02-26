import { NextRequest } from 'next/server';
import { generateChatStream } from '@/lib/gemini';
import { createLogger, preview } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const log = createLogger('chat');
    const timer = log.startTimer();

    try {
        const { messages, summary, edition } = await req.json();
        const selectedEdition = edition === 'bedrock' ? 'bedrock' : 'java';

        // Basic validation
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            log.warn('Invalid request body', { hasMessages: !!messages });
            return new Response('Invalid request body', { status: 400 });
        }

        const lastMessage = messages[messages.length - 1].parts[0].text;
        log.info('Chat request received', {
            edition: selectedEdition,
            messageCount: messages.length,
            query: preview(lastMessage),
            hasSummary: !!summary,
        });

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
                    log.info('Recipe request detected', { query: preview(lastMessage) });
                    return geminiLib.generateCraftingRecipe(lastMessage, selectedEdition);
                }
            } catch (e) {
                log.error('Recipe generation failed', {
                    error: e instanceof Error ? e.message : String(e),
                });
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
                    let chunkCount = 0;
                    let responseText = '';

                    // Stream text chunks from Gemini
                    for await (const chunk of streamResponse) {
                        const candidate = chunk.candidates?.[0];
                        const text = candidate?.content?.parts?.[0]?.text;

                        if (text) {
                            sendEvent({ type: 'text', content: text });
                            responseText += text;
                            chunkCount++;
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
                    let hasRecipe = false;
                    if (recipeResponse) {
                        const functionCalls = recipeResponse.functionCalls;
                        if (functionCalls && functionCalls.length > 0) {
                            const recipeCall = functionCalls.find((fc: any) => fc.name === 'display_crafting_recipe');
                            if (recipeCall) {
                                sendEvent({ type: 'recipe', craftingRecipe: recipeCall.args });
                                hasRecipe = true;
                            }
                        }
                    }

                    sendEvent({ type: 'done' });
                    timer.done('Chat exchange completed', {
                        edition: selectedEdition,
                        userMessage: preview(lastMessage),
                        aiResponse: preview(responseText, 150),
                        responseLength: responseText.length,
                        chunkCount,
                        hasRecipe,
                        hasGrounding: !!groundingMetadata,
                    });
                } catch (error: any) {
                    log.error('Stream error', { error: error.message });
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
        log.error('Chat API error', {
            error: error.message,
            stack: error.stack,
        });
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
