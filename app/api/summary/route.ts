import { NextRequest } from 'next/server';
import { client, MODEL_ID } from '@/lib/gemini';
import { SessionSummarySchema } from '@/lib/schemas';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || messages.length === 0) {
            return new Response('No messages to summarize', { status: 400 });
        }

        // Create a simplified JSON schema for Gemini to follow
        const jsonSchema = {
            type: "object",
            properties: {
                summaryVersion: { type: "string", const: "1.0" },
                lastUpdated: { type: "string", description: "ISO8601 timestamp" },
                currentProjects: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            type: { type: "string" },
                            status: { type: "string", enum: ["planning", "in-progress", "completed"] },
                            description: { type: "string" },
                            progress: { type: "number", minimum: 0, maximum: 100 },
                            nextSteps: { type: "array", items: { type: "string" } },
                            blockers: { type: "array", items: { type: "string" } }
                        },
                        required: ["name", "type", "status", "description", "progress", "nextSteps"]
                    }
                },
                knowledgeBase: {
                    type: "object",
                    properties: {
                        mechanicsLearned: { type: "array", items: { type: "string" } },
                        recipesKnown: { type: "array", items: { type: "string" } },
                        strategiesDiscovered: { type: "array", items: { type: "string" } }
                    },
                    required: ["mechanicsLearned", "recipesKnown", "strategiesDiscovered"]
                },
                goals: {
                    type: "object",
                    properties: {
                        shortTerm: { type: "array", items: { type: "string" } },
                        longTerm: { type: "array", items: { type: "string" } }
                    },
                    required: ["shortTerm", "longTerm"]
                },
                resources: {
                    type: "object",
                    properties: {
                        currentInventory: { type: "object", additionalProperties: { type: "number" } },
                        needed: { type: "object", additionalProperties: { type: "number" } },
                        farmingLocations: { type: "array", items: { type: "string" } }
                    },
                    required: ["currentInventory", "needed", "farmingLocations"]
                }
            },
            required: ["summaryVersion", "lastUpdated", "currentProjects", "knowledgeBase", "goals"]
        };

        // Build conversation text
        const conversationText = messages
            .map((m: any) => `${m.role}: ${m.parts[0]?.text || ''}`)
            .join('\n\n');

        const prompt = `You are analyzing a Minecraft help session. Extract structured information from the conversation below.

CONVERSATION:
${conversationText}

INSTRUCTIONS:
For currentProjects: Extract any building/farming/crafting projects mentioned. For each project provide:
  - name: The project name
  - type: Category (e.g., "farm", "build", "redstone", "exploration")
  - status: "planning", "in-progress", or "completed"
  - description: What the project is about
  - progress: Estimate 0-100
  - nextSteps: What needs to be done next
  - blockers: Any mentioned obstacles (optional)

For knowledgeBase:
  - mechanicsLearned: Game mechanics discussed (e.g., "villager panic mechanics", "mob spawning")
  - recipesKnown: Items/recipes mentioned
  - strategiesDiscovered: Tips or strategies shared

For goals:
  - shortTerm: Immediate next steps or tasks (things to do soon)
  - longTerm: Bigger objectives or end goals

For resources:
  - currentInventory: Items the user has (as key-value pairs, e.g., {"iron": 10})
  - needed: Items needed for projects (as key-value pairs)
  - farmingLocations: Where to find resources

Provide detailed information. Extract as much as you can from the conversation.`;

        console.log('[Summary API] Calling Gemini with prompt length:', prompt.length);
        console.log('[Summary API] JSON Schema:', JSON.stringify(jsonSchema, null, 2));

        const result = await client.models.generateContent({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseJsonSchema: jsonSchema as any,
                // Use low thinking for simple extraction tasks
                thinkingConfig: { thinkingLevel: 'low' as any }
            }
        });

        const outputText = result.text || "{}";
        console.log('[Summary API] Raw Gemini response:', outputText);

        // Parse and validate the response
        const parsedData = JSON.parse(outputText);
        console.log('[Summary API] Parsed data:', JSON.stringify(parsedData, null, 2));

        // Provide defaults for missing fields
        const dataWithDefaults = {
            summaryVersion: '1.0' as const,
            currentProjects: [],
            knowledgeBase: {
                mechanicsLearned: [],
                recipesKnown: [],
                strategiesDiscovered: [],
            },
            goals: {
                shortTerm: [],
                longTerm: [],
            },
            ...parsedData,
            // Always use server time, not whatever Gemini hallucinated
            lastUpdated: new Date().toISOString(),
        };

        const validationResult = SessionSummarySchema.safeParse(dataWithDefaults);

        if (!validationResult.success) {
            console.error('[Summary API] Validation failed:', validationResult.error);
            console.error('[Summary API] Failed data:', JSON.stringify(dataWithDefaults, null, 2));
            // Return a minimal valid summary if validation fails
            const fallbackSummary = {
                summaryVersion: '1.0' as const,
                lastUpdated: new Date().toISOString(),
                currentProjects: [],
                knowledgeBase: {
                    mechanicsLearned: [],
                    recipesKnown: [],
                    strategiesDiscovered: [],
                },
                goals: {
                    shortTerm: [],
                    longTerm: [],
                },
            };
            return new Response(JSON.stringify(fallbackSummary), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[Summary API] Validation successful');
        return new Response(JSON.stringify(validationResult.data), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[Summary API] Error:', error);
        if (error instanceof Error) {
            console.error('[Summary API] Error stack:', error.stack);
        }
        return new Response('Internal Server Error', { status: 500 });
    }
}
