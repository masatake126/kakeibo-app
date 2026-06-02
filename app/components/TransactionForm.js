'use client'

import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './TransactionForm.module.css'

const PAYERS = ['自分', '奥さん']
const PAYMENT_METHODS = ['現金', 'PayPay', 'QUICPay', 'クレジットカード', 'Suica', 'その他']
const CATEGORIES = ['食費', '日用品', '娯楽費', '固定費', '外食', '医療費', '交通費', 'その他']

export default function TransactionForm({ onSaved }) {
  const [form, setForm] = useState({
    paid_by: '',
    payment_method: '',
    store_name: '',
    amount: '',
    category: '',
  })
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

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
    } catch (err) {
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
    if (!form.paid_by || !form.payment_method || !form.amount || !form.category) {
      setMessage({ type: 'error', text: '必須項目（誰が・媒体・金額・用途）を入力してください。' })
      return
    }

    setSaving(true)
    const { error } = await supabase.from('transactions').insert([{
      paid_by: form.paid_by,
      payment_method: form.payment_method,
      store_name: form.store_name || null,
      amount: parseInt(form.amount),
      category: form.category,
      paid_at: new Date().toISOString(),
    }])

    if (error) {
      setMessage({ type: 'error', text: '保存に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: '保存しました！' })
      setForm({ paid_by: '', payment_method: '', store_name: '', amount: '', category: '' })
      setTimeout(() => onSaved(), 800)
    }
    setSaving(false)
  }

  return (
    <div className={styles.form}>

      {/* レシート撮影 */}
      <div className={styles.receiptSection}>
        <p className={styles.receiptLabel}>レシートから自動入力</p>
        <button
          className={styles.cameraButton}
          onClick={() => fileInputRef.current.click()}
          disabled={scanning}
        >
          {scanning ? '読み取り中...' : '📷 レシートを撮影・選択'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleReceiptScan}
          style={{ display: 'none' }}
        />
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.divider}>または手動で入力</div>

      {/* 誰が支払ったか */}
      <div className={styles.field}>
        <label className={styles.label}>誰が支払った？ <span className={styles.required}>必須</span></label>
        <div className={styles.chips}>
          {PAYERS.map(p => (
            <button
              key={p}
              className={`${styles.chip} ${form.paid_by === p ? styles.chipActive : ''}`}
              onClick={() => handleChange('paid_by', p)}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* 支払い媒体 */}
      <div className={styles.field}>
        <label className={styles.label}>支払い媒体 <span className={styles.required}>必須</span></label>
        <div className={styles.chips}>
          {PAYMENT_METHODS.map(m => (
            <button
              key={m}
              className={`${styles.chip} ${form.payment_method === m ? styles.chipActive : ''}`}
              onClick={() => handleChange('payment_method', m)}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* 店名 */}
      <div className={styles.field}>
        <label className={styles.label}>店名（任意）</label>
        <input
          className={styles.input}
          type="text"
          placeholder="例：セブンイレブン"
          value={form.store_name}
          onChange={e => handleChange('store_name', e.target.value)}
        />
      </div>

      {/* 金額 */}
      <div className={styles.field}>
        <label className={styles.label}>金額（円） <span className={styles.required}>必須</span></label>
        <input
          className={styles.input}
          type="number"
          placeholder="例：1500"
          value={form.amount}
          onChange={e => handleChange('amount', e.target.value)}
        />
      </div>

      {/* 用途 */}
      <div className={styles.field}>
        <label className={styles.label}>利用用途 <span className={styles.required}>必須</span></label>
        <div className={styles.chips}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`${styles.chip} ${form.category === c ? styles.chipActive : ''}`}
              onClick={() => handleChange('category', c)}
            >{c}</button>
          ))}
        </div>
      </div>

      <button
        className={styles.submitButton}
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? '保存中...' : '💾 保存する'}
      </button>
    </div>
  )
}
