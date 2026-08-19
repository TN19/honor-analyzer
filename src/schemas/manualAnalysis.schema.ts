import { z } from 'zod'

const sourceSchema = z.object({
  type: z.literal('manual-analysis'),
  title: z.string(),
  dateAccessed: z.string(),
})

export const manualAnalysisSchema = z.object({
  id: z.string(),
  scope: z.literal('general-knowledge'),
  patch: z.literal('unknown'),
  updatedAt: z.string(),
  confidence: z.number().min(0).max(1),
  scoreMapping: z.object({ good: z.number(), best: z.number(), possible: z.number() }),
  heroes: z.record(z.string(), z.object({ name: z.string(), displayNameZhHant: z.string(), displayNameStatus: z.enum(['confirmed', 'transliteration']), lanes: z.array(z.string()), roles: z.array(z.string()) })),
  matchups: z.array(z.object({ heroId: z.string(), targetId: z.string(), score: z.number().min(0).max(10), confidence: z.number().min(0).max(1), lane: z.string().optional(), conditions: z.array(z.string()), reasons: z.array(z.string()), sources: z.array(sourceSchema) })),
  synergies: z.array(z.object({ heroIds: z.array(z.string()).min(2), score: z.number().min(0).max(10), confidence: z.number().min(0).max(1), conditions: z.array(z.string()), reasons: z.array(z.string()), sources: z.array(sourceSchema) })),
  draftRules: z.array(z.object({ id: z.string(), confidence: z.number().min(0).max(1), conditions: z.array(z.string()), recommendations: z.array(z.string()), rationale: z.array(z.string()), sources: z.array(sourceSchema) })),
}).superRefine((data, ctx) => {
  const ids = new Set(Object.keys(data.heroes))
  data.matchups.forEach((entry, index) => {
    if (!ids.has(entry.heroId)) ctx.addIssue({ code: 'custom', path: ['matchups', index, 'heroId'], message: 'Herói não cadastrado' })
    if (!ids.has(entry.targetId)) ctx.addIssue({ code: 'custom', path: ['matchups', index, 'targetId'], message: 'Alvo não cadastrado' })
  })
  data.synergies.forEach((entry, index) => entry.heroIds.forEach((id, heroIndex) => {
    if (!ids.has(id)) ctx.addIssue({ code: 'custom', path: ['synergies', index, 'heroIds', heroIndex], message: 'Herói não cadastrado' })
  }))
})
