import { z } from 'zod';

export const PlayerContextSchema = z.object({
  gameMode: z.enum(['survival', 'creative', 'hardcore', 'adventure']),
  minecraftVersion: z.string(),
  playStyle: z.array(z.string()),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

export const ProjectSchema = z.object({
  name: z.string(),
  type: z.string(),
  status: z.enum(['planning', 'in-progress', 'completed']),
  description: z.string(),
  progress: z.number().min(0).max(100),
  nextSteps: z.array(z.string()),
  blockers: z.array(z.string()).optional(),
});

export const KnowledgeBaseSchema = z.object({
  mechanicsLearned: z.array(z.string()),
  recipesKnown: z.array(z.string()),
  strategiesDiscovered: z.array(z.string()),
});

export const ResourcesSchema = z.object({
  currentInventory: z.record(z.string(), z.number()),
  needed: z.record(z.string(), z.number()),
  farmingLocations: z.array(z.string()),
});

export const GoalsSchema = z.object({
  shortTerm: z.array(z.string()),
  longTerm: z.array(z.string()),
});

export const ConversationSummarySchema = z.object({
  totalQueries: z.number(),
  topicCounts: z.record(z.string(), z.number()),
  keyInsights: z.array(z.string()),
  recentDiscussions: z.array(z.string()),
});

export const MetadataSchema = z.object({
  sessionCount: z.number(),
  totalPlaytime: z.string().optional(),
  lastMinecraftUpdate: z.string().optional(),
});

export const SessionSummarySchema = z.object({
  summaryVersion: z.literal('1.0'),
  lastUpdated: z.string(), // ISO8601
  playerContext: PlayerContextSchema,
  currentProjects: z.array(ProjectSchema),
  knowledgeBase: KnowledgeBaseSchema,
  resources: ResourcesSchema,
  goals: GoalsSchema,
  conversationSummary: ConversationSummarySchema,
  metadata: MetadataSchema,
});
