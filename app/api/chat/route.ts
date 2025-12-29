import { NextRequest } from 'next/server';
import { generateChatStream } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { messages, summary } = await req.json();

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
            // We format it as a user instruction that has already been acknowledged
            const contextMessage = `[SYSTEM: Session Context Loaded]\n\n${JSON.stringify(summary, null, 2)}`;
            history = [
                { role: 'user', parts: [{ text: contextMessage }] },
                { role: 'model', parts: [{ text: "I have loaded the session context." }] },
                ...history
            ];
        }

        const streamResult = await generateChatStream(history, lastMessage);

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of streamResult) {
                        const text = chunk.text;

                        // Check for grounding metadata
                        // chunk.candidates?.[0]?.groundingMetadata or similar.
                        // verifying structure of chunk. 
                        // The chunk object has helper methods but also raw data.
                        // access via candidates[0].groundingMetadata (if available in @google/genai types)

                        // We'll send JSON chunks
                        if (text) {
                            controller.enqueue(JSON.stringify({ type: 'text', content: text }) + '\n');
                        }

                        // Note: Grounding metadata might come in specific chunks or at the end.
                        // We should inspect the chunk for it.
                        // For now, let's just stream text to get MVP working. Grounding can be added.
                        // If we see grounding metadata, stream it.
                        const candidate = chunk.candidates?.[0];
                        if (candidate?.groundingMetadata) {
                            controller.enqueue(JSON.stringify({ type: 'grounding', content: candidate.groundingMetadata }) + '\n');
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' }
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
