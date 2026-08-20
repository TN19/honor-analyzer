import { z } from 'zod'

const teamDraftSchema=z.object({bans:z.array(z.string()).length(4),picks:z.array(z.string()).length(5)})
const inferenceSchema=z.object({confidence:z.number().min(0).max(1),analysisZhHant:z.string(),consequenceZhHant:z.string()})
export const professionalMatchesSchema=z.object({
  tournament:z.string(),stage:z.string(),patch:z.string(),source:z.literal('user-supplied-professional-records'),
  evidenceWeight:z.number().positive().max(1).default(1),
  matches:z.array(z.object({id:z.string(),seriesId:z.string().optional(),seriesScore:z.enum(['2-0','2-1']).optional(),gameInSeries:z.number().int().positive().optional(),winner:z.enum(['blue','red']),blue:teamDraftSchema,red:teamDraftSchema,inferences:z.array(inferenceSchema)})),
})
export type ProfessionalMatches=z.infer<typeof professionalMatchesSchema>
