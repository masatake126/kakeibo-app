'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './TransactionList.module.css'

const CATEGORY_COLORS = {
  '食費': '#4CAF50', '日用品': '#2196F3', '娯楽費': '#9C27B0',
  '固定費': '#FF5722', '外食': '#FF9800', '医療費': '#F44336',
  '交通費': '#00BCD4', 'その他': '#9E9E9E',
}

export default function TransactionList({ transactions, loading, onRefresh, settings }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [message, setMessage] = useState(null)

  const total = transactions.reduce((sum, t) => sum + t.amount, 0)
  const myTotal = transactions.filter(t => t.paid_by === (settings.payers[0] || '自分')).reduce((sum, t) => sum + t.amount, 0)
  const partnerTotal = transactions.filter(t => t.paid_by === (settings.payers[1] || '奥さん')).reduce((sum, t) => sum + t.amount, 0)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      paid_by: t.paid_by,
      payment_method: t.payment_method,
      store_name: t.store_name || '',
      amount: t.amount,
      category: t.category,
      paid_at: new Date(t.paid_at).toISOString().split('T')[0],
    })
  }

  const saveEdit = async (id) => {
    const { error } = await supabase.from('transactions').update({
      paid_by: editForm.paid_by,
      payment_method: editForm.payment_method,
      store_name: editForm.store_name || null,
      amount: parseInt(editForm.amount),
      category: editForm.category,
      paid_at: new Date(editForm.paid_at).toISOString(),
    }).eq('id', id)
    if (error) {
      setMessage('更新に失敗しました')
    } else {
      setEditingId(null)
      onRefresh()
    }
  }

  const deleteTransaction = async (id) => {
    if (!confirm('この支出を削除しますか？')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      setMessage('削除に失敗しました')
    } else {
      onRefresh()
    }
  }

  if (loading) return <div className={styles.loading}>読み込み中...</div>

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>合計</p>
          <p className={styles.summaryAmount}>¥{total.toLocaleString()}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{settings.payers[0] || '自分'}</p>
          <p className={styles.summaryAmount}>¥{myTotal.toLocaleString()}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{settings.payers[1] || '奥さん'}</p>
          <p className={styles.summaryAmount}>¥{partnerTotal.toLocaleString()}</p>
        </div>
      </div>

      {message && <div className={styles.errorMsg}>{message}</div>}

      <div className={styles.listHeader}>
        <span>履歴（{transactions.length}件）</span>
        <button className={styles.refreshButton} onClick={onRefresh}>更新</button>
      </div>

      {transactions.length === 0 ? (
        <p className={styles.empty}>まだ支出がありません</p>
      ) : (
        <ul className={styles.list}>
          {transactions.map(t => (
            <li key={t.id} className={styles.item}>
              {editingId === t.id ? (
                <div className={styles.editForm}>
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>支払日</label>
                    <input className={styles.editInput} type="date" value={editForm.paid_at} onChange={e => setEditForm(p => ({ ...p, paid_at: e.target.value }))} />
                  </div>
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>誰が</label>
                    <div className={styles.editChips}>
                      {settings.payers.map(p => (
                        <button key={p} className={`${styles.editChip} ${editForm.paid_by === p ? styles.editChipActive : ''}`} onClick={() => setEditForm(prev => ({ ...prev, paid_by: p }))}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>媒体</label>
                    <div className={styles.editChips}>
                      {settings.paymentMethods.map(m => (
                        <button key={m} className={`${styles.editChip} ${editForm.payment_method === m ? styles.editChipActive : ''}`} onClick={() => setEditForm(prev => ({ ...prev, payment_method: m }))}>{m}</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>店名</label>
                    <input className={styles.editInput} type="text" value={editForm.store_name} onChange={e => setEditForm(p => ({ ...p, store_name: e.target.value }))} />
                  </div>
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>金額</label>
                    <input className={styles.editInput} type="number" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>用途</label>
                    <div className={styles.editChips}>
                      {settings.categories.map(c => (
                        <button key={c} className={`${styles.editChip} ${editForm.category === c ? styles.editChipActive : ''}`} onClick={() => setEditForm(prev => ({ ...prev, category: c }))}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.editButtons}>
                    <button className={styles.saveBtn} onClick={() => saveEdit(t.id)}>保存</button>
                    <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.itemLeft}>
                    <span className={styles.categoryBadge} style={{ backgroundColor: CATEGORY_COLORS[t.category] || '#9E9E9E' }}>{t.category}</span>
                    <div>
                      <p className={styles.storeName}>{t.store_name || '店名なし'}</p>
                      <p className={styles.itemMeta}>{t.paid_by} · {t.payment_method}</p>
                      <p className={styles.itemDates}>
                        <span>支払日: {formatDate(t.paid_at)}</span>
                        <span className={styles.registeredDate}>登録: {formatDateTime(t.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <p className={styles.amount}>¥{t.amount.toLocaleString()}</p>
                    <div className={styles.actionButtons}>
                      <button className={styles.editBtn} onClick={() => startEdit(t)}>編集</button>
                      <button className={styles.deleteBtn} onClick={() => deleteTransaction(t.id)}>削除</button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
