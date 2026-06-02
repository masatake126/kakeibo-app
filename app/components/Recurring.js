'use client'

import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './Recurring.module.css'

export default function Recurring({ transactions, settings, onRefresh }) {
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState(null)

  const recurringList = useMemo(() => {
    return transactions.filter(t => t.is_recurring)
  }, [transactions])

  const thisMonth = new Date()
  const thisMonthStr = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`

  // 今月すでに登録済みの繰り返し支出（store_name + category + amountで判定）
  const registeredThisMonth = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.paid_at)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return monthStr === thisMonthStr
    })
  }, [transactions, thisMonthStr])

  const isRegisteredThisMonth = (t) => {
    return registeredThisMonth.some(r =>
      r.store_name === t.store_name &&
      r.category === t.category &&
      r.amount === t.amount &&
      r.paid_by === t.paid_by
    )
  }

  // 直近の繰り返し支出テンプレートを抽出（同じstore_name+category+amountで最新1件）
  const templates = useMemo(() => {
    const seen = new Set()
    return recurringList.filter(t => {
      const key = `${t.store_name}|${t.category}|${t.amount}|${t.paid_by}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [recurringList])

  const registerAll = async () => {
    const unregistered = templates.filter(t => !isRegisteredThisMonth(t))
    if (unregistered.length === 0) {
      setMessage({ type: 'info', text: '今月分はすべて登録済みです' })
      return
    }
    setRegistering(true)
    const today = new Date().toISOString()
    const inserts = unregistered.map(t => ({
      paid_by: t.paid_by,
      payment_method: t.payment_method,
      store_name: t.store_name,
      amount: t.amount,
      category: t.category,
      memo: t.memo,
      is_recurring: true,
      paid_at: today,
    }))
    const { error } = await supabase.from('transactions').insert(inserts)
    if (error) {
      setMessage({ type: 'error', text: '登録に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: `${inserts.length}件を今月分として登録しました！` })
      onRefresh()
    }
    setRegistering(false)
  }

  const registerOne = async (t) => {
    const { error } = await supabase.from('transactions').insert([{
      paid_by: t.paid_by,
      payment_method: t.payment_method,
      store_name: t.store_name,
      amount: t.amount,
      category: t.category,
      memo: t.memo,
      is_recurring: true,
      paid_at: new Date().toISOString(),
    }])
    if (error) {
      setMessage({ type: 'error', text: '登録に失敗しました' })
    } else {
      setMessage({ type: 'success', text: '登録しました！' })
      onRefresh()
    }
  }

  const now = new Date()
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>🔁 繰り返し支出</h2>
      <p className={styles.desc}>毎月の固定支出をまとめて登録できます</p>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
      )}

      {templates.length === 0 ? (
        <div className={styles.empty}>
          <p>繰り返し支出がまだありません</p>
          <p className={styles.emptyDesc}>支出追加時に「繰り返し支出」をONにすると<br />ここに表示されます</p>
        </div>
      ) : (
        <>
          <button className={styles.registerAllBtn} onClick={registerAll} disabled={registering}>
            {registering ? '登録中...' : `📅 ${monthLabel}分をまとめて登録`}
          </button>

          <ul className={styles.list}>
            {templates.map(t => {
              const done = isRegisteredThisMonth(t)
              return (
                <li key={t.id} className={`${styles.item} ${done ? styles.itemDone : ''}`}>
                  <div className={styles.itemLeft}>
                    <div>
                      <div className={styles.itemTitleRow}>
                        <p className={styles.storeName}>{t.store_name || '店名なし'}</p>
                        {done && <span className={styles.doneBadge}>✓ 登録済み</span>}
                      </div>
                      <p className={styles.itemMeta}>{t.paid_by} · {t.category} · {t.payment_method}</p>
                      {t.memo && <p className={styles.memo}>📝 {t.memo}</p>}
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <p className={styles.amount}>¥{t.amount.toLocaleString()}</p>
                    {!done && (
                      <button className={styles.registerBtn} onClick={() => registerOne(t)}>登録</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
