import { NextRequest } from 'next/server';
import { client, MODEL_ID } from '@/lib/gemini';
import { SessionSummarySchema } from '@/lib/schemas';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || messages.length === 0) {
            return new Response('No messages to summarize', { status: 400 });
        }

        // Convert Zod schema to JSON schema
        const jsonSchema = zodToJsonSchema(SessionSummarySchema as any, { target: 'openApi3' });

        const prompt = `Based on this conversation history, generate a structured progress summary.
    
    Conversation:
    ${JSON.stringify(messages.map((m: any) => ({ role: m.role, text: m.parts[0].text })))}
    
    Extract projects, knowledge, goals, resources, etc. matching the schema.`;

        const result = await client.models.generateContent({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseJsonSchema: jsonSchema as any
            }
        });

        const outputText = result.text || "{}";

        return new Response(outputText, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Summary API Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
