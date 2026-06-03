'use client'

import { useState, useRef, useEffect } from 'react'
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
    memo: '',
    is_recurring: false,
  })
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState(null)
  const [ocrUsage, setOcrUsage] = useState({ count: 0, warn: false, block: false })
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchOcrUsage()
  }, [])

  const fetchOcrUsage = async () => {
    try {
      const res = await fetch('/api/ocr')
      const data = await res.json()
      setOcrUsage(data)
    } catch {}
  }

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleReceiptScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (ocrUsage.block) {
      setMessage({ type: 'error', text: '今月のレシート読み取り上限（1,000枚）に達しました。来月になるとリセットされます。' })
      return
    }

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

      if (data.error === 'LIMIT_EXCEEDED') {
        setMessage({ type: 'error', text: data.message })
        return
      }

      if (data.storeName) handleChange('store_name', data.storeName)
      if (data.amount) handleChange('amount', data.amount)

      setOcrUsage({ count: data.count, warn: data.warn, block: false, remaining: data.remaining })

      if (data.warn) {
        setMessage({ type: 'warn', text: `読み取り完了！⚠️ 今月の使用枚数が${data.count}枚になりました。残り${data.remaining}枚で上限です。` })
      } else {
        setMessage({ type: 'success', text: `読み取り完了！内容を確認してください。（今月${data.count}枚使用）` })
      }
    } catch {
      setMessage({ type: 'error', text: 'レシートの読み取りに失敗しました。手動で入力してください。' })
    } finally {
      setScanning(false)
      e.target.value = ''
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
      memo: form.memo || null,
      is_recurring: form.is_recurring,
    }])
    if (error) {
      setMessage({ type: 'error', text: '保存に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: '保存しました！' })
      setForm({ paid_by: '', payment_method: '', store_name: '', amount: '', category: '', paid_at: today, memo: '', is_recurring: false })
      setTimeout(() => onSaved(), 800)
    }
    setSaving(false)
  }

  const usagePct = Math.min((ocrUsage.count / 1000) * 100, 100)

  return (
    <div className={styles.form}>

      {/* レシート撮影 */}
      <div className={`${styles.receiptSection} ${ocrUsage.block ? styles.receiptBlocked : ocrUsage.warn ? styles.receiptWarn : ''}`}>
        <div className={styles.receiptHeader}>
          <p className={styles.receiptLabel}>レシートから自動入力</p>
          <span className={styles.usageCount}>{ocrUsage.count} / 1,000枚</span>
        </div>

        {/* 使用量バー */}
        <div className={styles.usageBar}>
          <div
            className={`${styles.usageFill} ${ocrUsage.block ? styles.usageFillBlock : ocrUsage.warn ? styles.usageFillWarn : ''}`}
            style={{ width: `${usagePct}%` }}
          />
        </div>

        {ocrUsage.warn && !ocrUsage.block && (
          <p className={styles.warnText}>⚠️ 今月の使用枚数が800枚を超えました。残り{1000 - ocrUsage.count}枚で上限です。</p>
        )}
        {ocrUsage.block && (
          <p className={styles.blockText}>🚫 今月の上限（1,000枚）に達しました。来月リセットされます。</p>
        )}

        <button
          className={`${styles.cameraButton} ${ocrUsage.block ? styles.cameraButtonDisabled : ''}`}
          onClick={() => !ocrUsage.block && fileInputRef.current.click()}
          disabled={scanning || ocrUsage.block}
        >
          {scanning ? '読み取り中...' : ocrUsage.block ? '🚫 今月の上限に達しました' : '📷 レシートを撮影・選択'}
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

      <div className={styles.field}>
        <label className={styles.label}>メモ（任意）</label>
        <textarea className={styles.textarea} placeholder="例：誕生日プレゼント、セール品など" value={form.memo} onChange={e => handleChange('memo', e.target.value)} rows={2} />
      </div>

      <div className={styles.field}>
        <button className={`${styles.recurringToggle} ${form.is_recurring ? styles.recurringActive : ''}`} onClick={() => handleChange('is_recurring', !form.is_recurring)}>
          <span className={styles.recurringIcon}>🔁</span>
          <div className={styles.recurringText}>
            <span className={styles.recurringLabel}>毎月の繰り返し支出</span>
            <span className={styles.recurringDesc}>家賃・保険料・サブスクなど</span>
          </div>
          <span className={styles.recurringCheck}>{form.is_recurring ? '✓ ON' : 'OFF'}</span>
        </button>
      </div>

      <button className={styles.submitButton} onClick={handleSubmit} disabled={saving}>
        {saving ? '保存中...' : '💾 保存する'}
      </button>
    </div>
  )
}
