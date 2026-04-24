import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import BudgetGoals from './components/BudgetGoals'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
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
      {currentPage === 'dashboard' && <Dashboard session={session} setCurrentPage={setCurrentPage} />}
      {currentPage === 'transactions' && <Transactions session={session} />}
      {currentPage === 'budget' && <BudgetGoals session={session} />}
    </Layout>
  )
}
