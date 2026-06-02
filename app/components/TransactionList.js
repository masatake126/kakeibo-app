'use client'

import { useState, useMemo } from 'react'
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
  const [search, setSearch] = useState('')
  const [filterPayer, setFilterPayer] = useState('全員')
  const [filterCategory, setFilterCategory] = useState('全て')
  const [showRecurringOnly, setShowRecurringOnly] = useState(false)

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        (t.store_name || '').toLowerCase().includes(q) ||
        (t.memo || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.paid_by.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      const matchPayer = filterPayer === '全員' || t.paid_by === filterPayer
      const matchCategory = filterCategory === '全て' || t.category === filterCategory
      const matchRecurring = !showRecurringOnly || t.is_recurring
      return matchSearch && matchPayer && matchCategory && matchRecurring
    })
  }, [transactions, search, filterPayer, filterCategory, showRecurringOnly])

  const total = filtered.reduce((sum, t) => sum + t.amount, 0)
  const myTotal = filtered.filter(t => t.paid_by === (settings.payers[0] || '自分')).reduce((sum, t) => sum + t.amount, 0)
  const partnerTotal = filtered.filter(t => t.paid_by === (settings.payers[1] || '奥さん')).reduce((sum, t) => sum + t.amount, 0)

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
      memo: t.memo || '',
      is_recurring: t.is_recurring || false,
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
      memo: editForm.memo || null,
      is_recurring: editForm.is_recurring,
    }).eq('id', id)
    if (error) { setMessage('更新に失敗しました') }
    else { setEditingId(null); onRefresh() }
  }

  const deleteTransaction = async (id) => {
    if (!confirm('この支出を削除しますか？')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { setMessage('削除に失敗しました') }
    else { onRefresh() }
  }

  if (loading) return <div className={styles.loading}>読み込み中...</div>

  return (
    <div className={styles.container}>
      {/* 検索バー */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="店名・メモ・用途・金額で検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* フィルター */}
      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <select className={styles.filterSelect} value={filterPayer} onChange={e => setFilterPayer(e.target.value)}>
            <option value="全員">全員</option>
            {settings.payers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={styles.filterSelect} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="全て">全用途</option>
            {settings.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className={`${styles.recurringFilter} ${showRecurringOnly ? styles.recurringFilterActive : ''}`}
            onClick={() => setShowRecurringOnly(v => !v)}
          >🔁 繰り返し</button>
        </div>
      </div>

      {/* サマリー */}
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
        <span>{filtered.length}件{search || filterPayer !== '全員' || filterCategory !== '全て' || showRecurringOnly ? '（絞り込み中）' : ''}</span>
        <button className={styles.refreshButton} onClick={onRefresh}>更新</button>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>{search ? '検索結果がありません' : 'まだ支出がありません'}</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map(t => (
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
                  <div className={styles.editRow}>
                    <label className={styles.editLabel}>メモ</label>
                    <textarea className={styles.editTextarea} value={editForm.memo} onChange={e => setEditForm(p => ({ ...p, memo: e.target.value }))} rows={2} />
                  </div>
                  <div className={styles.editRow}>
                    <button
                      className={`${styles.editRecurring} ${editForm.is_recurring ? styles.editRecurringActive : ''}`}
                      onClick={() => setEditForm(p => ({ ...p, is_recurring: !p.is_recurring }))}
                    >🔁 繰り返し支出　{editForm.is_recurring ? 'ON' : 'OFF'}</button>
                  </div>
                  <div className={styles.editButtons}>
                    <button className={styles.saveBtn} onClick={() => saveEdit(t.id)}>保存</button>
                    <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <div className={styles.itemInner}>
                  <div className={styles.itemLeft}>
                    <span className={styles.categoryBadge} style={{ backgroundColor: CATEGORY_COLORS[t.category] || '#9E9E9E' }}>{t.category}</span>
                    <div className={styles.itemContent}>
                      <div className={styles.itemTitleRow}>
                        <p className={styles.storeName}>{t.store_name || '店名なし'}</p>
                        {t.is_recurring && <span className={styles.recurringBadge}>🔁</span>}
                      </div>
                      <p className={styles.itemMeta}>{t.paid_by} · {t.payment_method}</p>
                      {t.memo && <p className={styles.memo}>📝 {t.memo}</p>}
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
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
