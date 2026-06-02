'use client'

import styles from './TransactionList.module.css'

const CATEGORY_COLORS = {
  '食費': '#4CAF50',
  '日用品': '#2196F3',
  '娯楽費': '#9C27B0',
  '固定費': '#FF5722',
  '外食': '#FF9800',
  '医療費': '#F44336',
  '交通費': '#00BCD4',
  'その他': '#9E9E9E',
}

export default function TransactionList({ transactions, loading, onRefresh }) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0)
  const myTotal = transactions.filter(t => t.paid_by === '自分').reduce((sum, t) => sum + t.amount, 0)
  const partnerTotal = transactions.filter(t => t.paid_by === '奥さん').reduce((sum, t) => sum + t.amount, 0)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (loading) return <div className={styles.loading}>読み込み中...</div>

  return (
    <div className={styles.container}>
      {/* サマリー */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>合計</p>
          <p className={styles.summaryAmount}>¥{total.toLocaleString()}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>自分</p>
          <p className={styles.summaryAmount}>¥{myTotal.toLocaleString()}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>奥さん</p>
          <p className={styles.summaryAmount}>¥{partnerTotal.toLocaleString()}</p>
        </div>
      </div>

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
              <div className={styles.itemLeft}>
                <span
                  className={styles.categoryBadge}
                  style={{ backgroundColor: CATEGORY_COLORS[t.category] || '#9E9E9E' }}
                >
                  {t.category}
                </span>
                <div>
                  <p className={styles.storeName}>{t.store_name || '店名なし'}</p>
                  <p className={styles.itemMeta}>
                    {t.paid_by} · {t.payment_method} · {formatDate(t.paid_at)}
                  </p>
                </div>
              </div>
              <p className={styles.amount}>¥{t.amount.toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
