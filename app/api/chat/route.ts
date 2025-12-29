import { NextRequest } from 'next/server';
import { generateChatResponse } from '@/lib/gemini';

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
            const contextMessage = `[SYSTEM: Session Context Loaded]\n\n${JSON.stringify(summary, null, 2)}`;
            history = [
                { role: 'user', parts: [{ text: contextMessage }] },
                { role: 'model', parts: [{ text: "I have loaded the session context." }] },
                ...history
            ];
        }

        // Use non-streaming API
        const response = await generateChatResponse(history, lastMessage);

        const candidate = response.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        const groundingMetadata = candidate?.groundingMetadata;

        return new Response(JSON.stringify({
            text,
            groundingMetadata
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
