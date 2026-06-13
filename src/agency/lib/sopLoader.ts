import { supabase } from '../../lib/supabase'
import type { AgentName, SOP } from '../types/agency.types'

export async function getAgentSOP(agentName: AgentName): Promise<SOP> {
  const { data, error } = await supabase
    .from('agency_sops')
    .select('*')
    .eq('agent_name', agentName)
    .single()

  if (error || !data) {
    throw new Error(`Failed to load SOP for agent ${agentName}: ${error?.message}`)
  }

  return data as SOP
}
