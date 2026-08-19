import { z } from 'zod'

const laneSchema = z.enum(['clash','jungle','mid','farm','roamer'])
const slotConditionSchema = z.object({ lane: laneSchema, heroId: z.string() })

export const recommendationRulesSchema = z.array(z.object({
  id: z.string(),
  confidence: z.number().min(0).max(1),
  candidateLane: laneSchema.optional(),
  when: z.object({
    allyAll: z.array(z.string()).optional(),
    enemyAll: z.array(z.string()).optional(),
    enemyAny: z.array(z.string()).optional(),
    allySlot: slotConditionSchema.optional(),
    enemySlot: slotConditionSchema.optional(),
    allyRoleAtLeast: z.object({ role: z.string(), count: z.number().int().positive() }).optional(),
  }),
  recommendHeroIds: z.array(z.string()).optional(),
  recommendRoles: z.array(z.string()).optional(),
  scoreBoost: z.number().min(0).max(5),
  explanationZhHant: z.string(),
}))

export type RecommendationRule = z.infer<typeof recommendationRulesSchema>[number]
