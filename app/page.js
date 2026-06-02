'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
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
    if (saved) {
      setSettings(JSON.parse(saved))
    } else {
      setSettings(defaultSettings)
    }
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

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>💰 家計簿</h1>
        <p className={styles.subtitle}>ふたりの支出管理</p>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'form' ? styles.tabActive : ''}`} onClick={() => setActiveTab('form')}>＋ 支出追加</button>
        <button className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`} onClick={() => setActiveTab('list')}>📋 履歴</button>
        <button className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`} onClick={() => setActiveTab('settings')}>⚙️ 設定</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'form' && (
          <TransactionForm settings={settings} onSaved={() => { fetchTransactions(); setActiveTab('list') }} />
        )}
        {activeTab === 'list' && (
          <TransactionList transactions={transactions} loading={loading} onRefresh={fetchTransactions} settings={settings} />
        )}
        {activeTab === 'settings' && (
          <Settings settings={settings} onSave={saveSettings} defaultSettings={defaultSettings} />
        )}
      </div>
    </main>
  )
}
