'use client'

import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './TransactionForm.module.css'

export default function TransactionForm({ settings, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    paid_by: '',
    payment_method: '',
    store_name: '',
    amount: '',
    category: '',
    paid_at: today,
  })
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleReceiptScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanning(true)
    setMessage({ type: 'info', text: 'レシートを読み取り中...' })
    try {
      const base64 = await toBase64(file)
      const base64Data = base64.split(',')[1]
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data }),
      })
      const data = await res.json()
      if (data.storeName) handleChange('store_name', data.storeName)
      if (data.amount) handleChange('amount', data.amount)
      setMessage({ type: 'success', text: '読み取り完了！内容を確認してください。' })
    } catch {
      setMessage({ type: 'error', text: 'レシートの読み取りに失敗しました。手動で入力してください。' })
    } finally {
      setScanning(false)
    }
  }

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })

  const handleSubmit = async () => {
    if (!form.paid_by || !form.payment_method || !form.amount || !form.category || !form.paid_at) {
      setMessage({ type: 'error', text: '必須項目をすべて入力してください。' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('transactions').insert([{
      paid_by: form.paid_by,
      payment_method: form.payment_method,
      store_name: form.store_name || null,
      amount: parseInt(form.amount),
      category: form.category,
      paid_at: new Date(form.paid_at).toISOString(),
    }])
    if (error) {
      setMessage({ type: 'error', text: '保存に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: '保存しました！' })
      setForm({ paid_by: '', payment_method: '', store_name: '', amount: '', category: '', paid_at: today })
      setTimeout(() => onSaved(), 800)
    }
    setSaving(false)
  }

  return (
    <div className={styles.form}>
      <div className={styles.receiptSection}>
        <p className={styles.receiptLabel}>レシートから自動入力</p>
        <button className={styles.cameraButton} onClick={() => fileInputRef.current.click()} disabled={scanning}>
          {scanning ? '読み取り中...' : '📷 レシートを撮影・選択'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptScan} style={{ display: 'none' }} />
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.divider}>または手動で入力</div>

      <div className={styles.field}>
        <label className={styles.label}>支払日 <span className={styles.required}>必須</span></label>
        <input className={styles.input} type="date" value={form.paid_at} onChange={e => handleChange('paid_at', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>誰が支払った？ <span className={styles.required}>必須</span></label>
        <div className={styles.chips}>
          {settings.payers.map(p => (
            <button key={p} className={`${styles.chip} ${form.paid_by === p ? styles.chipActive : ''}`} onClick={() => handleChange('paid_by', p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>支払い媒体 <span className={styles.required}>必須</span></label>
        <div className={styles.chips}>
          {settings.paymentMethods.map(m => (
            <button key={m} className={`${styles.chip} ${form.payment_method === m ? styles.chipActive : ''}`} onClick={() => handleChange('payment_method', m)}>{m}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>店名（任意）</label>
        <input className={styles.input} type="text" placeholder="例：セブンイレブン" value={form.store_name} onChange={e => handleChange('store_name', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>金額（円） <span className={styles.required}>必須</span></label>
        <input className={styles.input} type="number" placeholder="例：1500" value={form.amount} onChange={e => handleChange('amount', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>利用用途 <span className={styles.required}>必須</span></label>
        <div className={styles.chips}>
          {settings.categories.map(c => (
            <button key={c} className={`${styles.chip} ${form.category === c ? styles.chipActive : ''}`} onClick={() => handleChange('category', c)}>{c}</button>
          ))}
        </div>
      </div>

      <button className={styles.submitButton} onClick={handleSubmit} disabled={saving}>
        {saving ? '保存中...' : '💾 保存する'}
      </button>
    </div>
  )
}
