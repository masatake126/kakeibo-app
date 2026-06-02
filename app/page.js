'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import Statistics from './components/Statistics'
import Settings from './components/Settings'
import styles from './page.module.css'

export default function Home() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('form')
  const [settings, setSettings] = useState(null)

  const defaultSettings = {
    payers: ['自分', '奥さん'],
    paymentMethods: ['現金', 'PayPay', 'QUICPay', 'クレジットカード', 'Suica', 'その他'],
    categories: ['食費', '日用品', '娯楽費', '固定費', '外食', '医療費', '交通費', 'その他'],
  }

  useEffect(() => {
    const saved = localStorage.getItem('kakeibo-settings')
    setSettings(saved ? JSON.parse(saved) : defaultSettings)
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('paid_at', { ascending: false })
    if (!error) setTransactions(data)
    setLoading(false)
  }

  const saveSettings = (newSettings) => {
    setSettings(newSettings)
    localStorage.setItem('kakeibo-settings', JSON.stringify(newSettings))
  }

  if (!settings) return null

  const tabs = [
    { id: 'form', label: '＋ 追加' },
    { id: 'list', label: '📋 履歴' },
    { id: 'stats', label: '📊 統計' },
    { id: 'settings', label: '⚙️ 設定' },
  ]

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>💰 家計簿</h1>
        <p className={styles.subtitle}>ふたりの支出管理</p>
      </header>

      <div className={styles.tabs}>
        {tabs.map(t => (
          <button key={t.id} className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'form' && <TransactionForm settings={settings} onSaved={() => { fetchTransactions(); setActiveTab('list') }} />}
        {activeTab === 'list' && <TransactionList transactions={transactions} loading={loading} onRefresh={fetchTransactions} settings={settings} />}
        {activeTab === 'stats' && <Statistics transactions={transactions} settings={settings} />}
        {activeTab === 'settings' && <Settings settings={settings} onSave={saveSettings} defaultSettings={defaultSettings} />}
      </div>
    </main>
  )
}
