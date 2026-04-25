import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gérer la pré-vérification CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactions, month, year, monthName } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans les secrets Edge Functions.')
    }

    // Calculs financiers
    const totalIncome = transactions
      .filter((t: any) => t.categories?.type === 'income')
      .reduce((s: number, t: any) => s + parseFloat(t.amount), 0)

    const totalExpenses = transactions
      .filter((t: any) => t.categories?.type === 'expense')
      .reduce((s: number, t: any) => s + parseFloat(t.amount), 0)

    const balance = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0
      ? ((balance / totalIncome) * 100).toFixed(1)
      : '0'

    // Regroupement par catégorie
    const byCategory: Record<string, number> = {}
    transactions
      .filter((t: any) => t.categories?.type === 'expense')
      .forEach((t: any) => {
        const name = t.categories?.name || 'Autre'
        byCategory[name] = (byCategory[name] || 0) + parseFloat(t.amount)
      })

    const categoryLines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => `  - ${name} : ${total.toFixed(2)}€`)
      .join('\n')

    const prompt = `Tu es un conseiller financier personnel bienveillant et pragmatique.

Voici le bilan financier pour ${monthName} ${year} :

📊 Revenus totaux : ${totalIncome.toFixed(2)}€
💸 Dépenses totales : ${totalExpenses.toFixed(2)}€
💰 Solde : ${balance.toFixed(2)}€
🏦 Taux d'épargne : ${savingsRate}%

Répartition des dépenses par catégorie :
${categoryLines || '  (aucune dépense)'}

En 4 à 6 phrases, donne une analyse personnalisée incluant :
1. Une observation directe sur la santé financière du mois
2. Un ou deux points positifs spécifiques aux chiffres
3. Un conseil concret et actionnable pour le mois suivant

Utilise des emojis pour rendre la lecture agréable. Sois direct et encourageant. Réponds uniquement en français.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error.message || 'Erreur Claude API')
    }

    const analysis = result.content?.[0]?.text || 'Analyse non disponible.'

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
