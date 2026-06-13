import { supabase } from '../../lib/supabase'
import { DEFAULT_SOPS } from './defaultSOPs'

export async function seedSOPsIfEmpty() {
  const { count } = await supabase
    .from('agency_sops')
    .select('*', { count: 'exact', head: true })

  if (count === 0) {
    const { error } = await supabase.from('agency_sops').insert(DEFAULT_SOPS)
    if (error) {
      console.error('Failed to seed agency SOPs:', error)
    } else {
      console.log('Agency SOPs seeded successfully.')
    }
  }
}
