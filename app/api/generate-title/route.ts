import { NextRequest } from 'next/server';
import { client, MODEL_ID } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response('Invalid request body', { status: 400 });
        }

        // Limit context to first few messages for title generation to save tokens
        const titleContext = messages.slice(0, 4).map((m: any) => ({
            role: m.role,
            parts: m.parts.map((p: any) => ({ text: p.text }))
        }));

        const chat = client.chats.create({
            model: MODEL_ID,
            config: {
                systemInstruction: "You are a specialized assistant that generates short, concise (2-5 words) titles for chat sessions based on their content. Return ONLY the title text, no quotes or prefixes.",
                responseMimeType: "text/plain"
            },
            history: []
        });

        const prompt = `Generate a title for this conversation:\n\n${JSON.stringify(titleContext)}`;
        const result = await chat.sendMessage({ message: prompt });

        // Safely extract text (handling SDK variations where result might be the response or contain it)
        const response = (result as any).response || result;
        const candidate = response.candidates?.[0];
        const titleContent = candidate?.content?.parts?.[0]?.text;

        const title = titleContent ? titleContent.trim().replace(/^["']|["']$/g, '') : "New Chat";

        return new Response(JSON.stringify({ title }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Title Generation Error:', error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
