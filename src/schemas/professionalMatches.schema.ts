import { z } from 'zod'

const teamDraftSchema=z.object({bans:z.array(z.string()).length(4),picks:z.array(z.string()).length(5)})
const inferenceSchema=z.object({confidence:z.number().min(0).max(1),analysisZhHant:z.string(),consequenceZhHant:z.string()})
export const professionalMatchesSchema=z.object({
  tournament:z.string(),stage:z.string(),patch:z.string(),source:z.literal('user-supplied-professional-records'),
  matches:z.array(z.object({id:z.string(),winner:z.enum(['blue','red']),blue:teamDraftSchema,red:teamDraftSchema,inferences:z.array(inferenceSchema)})),
})
export type ProfessionalMatches=z.infer<typeof professionalMatchesSchema>
