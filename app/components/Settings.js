'use client'

import { useState } from 'react'
import styles from './Settings.module.css'

export default function Settings({ settings, onSave, defaultSettings }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(settings)))
  const [saved, setSaved] = useState(false)
  const [newItems, setNewItems] = useState({ payers: '', paymentMethods: '', categories: '' })

  const addItem = (key) => {
    const val = newItems[key].trim()
    if (!val) return
    if (local[key].includes(val)) return
    setLocal(prev => ({ ...prev, [key]: [...prev[key], val] }))
    setNewItems(prev => ({ ...prev, [key]: '' }))
  }

  const removeItem = (key, item) => {
    setLocal(prev => ({ ...prev, [key]: prev[key].filter(i => i !== item) }))
  }

  const handleSave = () => {
    onSave(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (!confirm('デフォルトに戻しますか？')) return
    setLocal(JSON.parse(JSON.stringify(defaultSettings)))
  }

  const sections = [
    { key: 'payers', label: '支払い者' },
    { key: 'paymentMethods', label: '支払い媒体' },
    { key: 'categories', label: '利用用途' },
  ]

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>選択肢の設定</h2>
      <p className={styles.desc}>追加・削除した内容はこの端末に保存されます。</p>

      {sections.map(({ key, label }) => (
        <div key={key} className={styles.section}>
          <h3 className={styles.sectionTitle}>{label}</h3>
          <div className={styles.chips}>
            {local[key].map(item => (
              <div key={item} className={styles.chipWrapper}>
                <span className={styles.chip}>{item}</span>
                <button className={styles.removeBtn} onClick={() => removeItem(key, item)}>×</button>
              </div>
            ))}
          </div>
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              type="text"
              placeholder={`新しい${label}を追加`}
              value={newItems[key]}
              onChange={e => setNewItems(prev => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem(key)}
            />
            <button className={styles.addBtn} onClick={() => addItem(key)}>追加</button>
          </div>
        </div>
      ))}

      <div className={styles.buttons}>
        <button className={styles.saveBtn} onClick={handleSave}>
          {saved ? '✓ 保存しました' : '設定を保存'}
        </button>
        <button className={styles.resetBtn} onClick={handleReset}>リセット</button>
      </div>
    </div>
  )
}
