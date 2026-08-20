import type { Team } from '../types'

export type BanPickStep={team:Team;kind:'pick'|'ban'}

export const banPickSteps:BanPickStep[]=[
  {team:'blue',kind:'ban'},{team:'red',kind:'ban'},{team:'blue',kind:'ban'},{team:'red',kind:'ban'},
  {team:'blue',kind:'pick'},{team:'red',kind:'pick'},{team:'red',kind:'pick'},{team:'blue',kind:'pick'},{team:'blue',kind:'pick'},{team:'red',kind:'pick'},
  {team:'red',kind:'ban'},{team:'blue',kind:'ban'},{team:'red',kind:'ban'},{team:'blue',kind:'ban'},
  {team:'red',kind:'pick'},{team:'blue',kind:'pick'},{team:'blue',kind:'pick'},{team:'red',kind:'pick'},
]
