'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import styles from './page.module.css'

export default function Home() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('form')

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('paid_at', { ascending: false })

    if (error) {
      console.error('取得エラー:', error)
    } else {
      setTransactions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>💰 家計簿</h1>
        <p className={styles.subtitle}>ふたりの支出管理</p>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'form' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('form')}
        >
          ＋ 支出を追加
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 履歴を見る
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'form' ? (
          <TransactionForm onSaved={() => { fetchTransactions(); setActiveTab('list') }} />
        ) : (
          <TransactionList transactions={transactions} loading={loading} onRefresh={fetchTransactions} />
        )}
      </div>
    </main>
  )
}
