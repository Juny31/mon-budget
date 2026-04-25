import { supabase } from './supabase'

/**
 * Calcule toutes les dates où une récurrence aurait dû générer une transaction,
 * depuis sa date de début jusqu'à aujourd'hui.
 */
function getScheduledDates(recurring, today) {
  const dates = []
  const start = new Date(recurring.start_date + 'T00:00:00')
  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)

  if (recurring.frequency === 'monthly') {
    const day = recurring.day_of_month
    // Première occurrence : jour demandé dans le mois de start_date
    let d = new Date(start.getFullYear(), start.getMonth(), day)
    // Si cette date est avant start_date, décaler d'un mois
    if (d < start) {
      d = new Date(start.getFullYear(), start.getMonth() + 1, day)
    }
    while (d <= todayMidnight) {
      dates.push(d.toISOString().split('T')[0])
      d = new Date(d.getFullYear(), d.getMonth() + 1, day)
    }

  } else if (recurring.frequency === 'weekly') {
    // day_of_week : 0=Dim, 1=Lun, ..., 6=Sam
    let d = new Date(start)
    // Avancer jusqu'au bon jour de la semaine
    while (d.getDay() !== recurring.day_of_week) {
      d.setDate(d.getDate() + 1)
    }
    while (d <= todayMidnight) {
      dates.push(d.toISOString().split('T')[0])
      d = new Date(d)
      d.setDate(d.getDate() + 7)
    }

  } else if (recurring.frequency === 'yearly') {
    let d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    while (d <= todayMidnight) {
      if (d >= start) {
        dates.push(d.toISOString().split('T')[0])
      }
      d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())
    }
  }

  return dates
}

/**
 * Vérifie toutes les récurrences actives de l'utilisateur et crée
 * automatiquement les transactions manquantes.
 */
export async function generateDueTransactions(userId) {
  try {
    const { data: recurrings, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error || !recurrings?.length) return

    const today = new Date()

    for (const r of recurrings) {
      const scheduledDates = getScheduledDates(r, today)
      if (!scheduledDates.length) continue

      // Récupérer les dates déjà générées pour cette récurrence
      const { data: existing } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('recurring_id', r.id)

      const existingDates = new Set((existing || []).map((t) => t.transaction_date))

      // Insérer uniquement les dates manquantes
      const toInsert = scheduledDates
        .filter((d) => !existingDates.has(d))
        .map((d) => ({
          user_id: userId,
          amount: r.amount,
          description: r.description,
          category_id: r.category_id,
          transaction_date: d,
          recurring_id: r.id,
        }))

      if (toInsert.length > 0) {
        await supabase.from('transactions').insert(toInsert)
      }
    }
  } catch (err) {
    console.error('Erreur génération récurrences:', err)
  }
}
