import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { generateDueTransactions } from './lib/recurringService'
import Auth from './components/Auth'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import BudgetGoals from './components/BudgetGoals'
import RecurringTransactions from './components/RecurringTransactions'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      // Générer les transactions récurrentes manquantes au démarrage
      if (session?.user?.id) {
        generateDueTransactions(session.user.id)
      }
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      // Générer aussi lors d'une nouvelle connexion
      if (session?.user?.id) {
        generateDueTransactions(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Chargement...</span>
        </div>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} session={session}>
      {currentPage === 'dashboard'   && <Dashboard session={session} setCurrentPage={setCurrentPage} />}
      {currentPage === 'transactions' && <Transactions session={session} />}
      {currentPage === 'budget'      && <BudgetGoals session={session} />}
      {currentPage === 'recurring'   && <RecurringTransactions session={session} />}
    </Layout>
  )
}
