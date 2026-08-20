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
    ownSide: z.enum(['blue','red']).optional(),
    allyPickCountAtMost: z.number().int().nonnegative().optional(),
    enemySlotRole: z.object({ lane: laneSchema, role: z.string() }).optional(),
    allyRoleAtLeast: z.object({ role: z.string(), count: z.number().int().positive() }).optional(),
    enemyRoleAtLeast: z.object({ role: z.string(), count: z.number().int().nonnegative() }).optional(),
    enemyRoleAtMost: z.object({ role: z.string(), count: z.number().int().nonnegative() }).optional(),
  }),
  recommendHeroIds: z.array(z.string()).optional(),
  recommendRoles: z.array(z.string()).optional(),
  scoreBoost: z.number().min(0).max(5),
  tone: z.enum(['good','reasonable']).default('good'),
  explanationZhHant: z.string(),
}))

export type RecommendationRule = z.infer<typeof recommendationRulesSchema>[number]
