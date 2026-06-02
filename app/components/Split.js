'use client'

import { useState, useMemo } from 'react'
import styles from './Split.module.css'

export default function Split({ transactions, settings }) {
  const today = new Date().toISOString().split('T')[0]
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)
  const [excludeCategories, setExcludeCategories] = useState([])

  const toggleCategory = (cat) => {
    setExcludeCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const result = useMemo(() => {
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)

    const filtered = transactions.filter(t => {
      const d = new Date(t.paid_at)
      return d >= fromDate && d <= toDate && !excludeCategories.includes(t.category)
    })

    const totalByPayer = {}
    settings.payers.forEach(p => { totalByPayer[p] = 0 })

    filtered.forEach(t => {
      if (totalByPayer[t.paid_by] !== undefined) {
        totalByPayer[t.paid_by] += t.amount
      }
    })

    const total = Object.values(totalByPayer).reduce((s, v) => s + v, 0)
    const perPerson = Math.round(total / settings.payers.length)

    const settlements = settings.payers.map(p => ({
      payer: p,
      paid: totalByPayer[p] || 0,
      shouldPay: perPerson,
      diff: (totalByPayer[p] || 0) - perPerson,
    }))

    // 誰が誰にいくら払うかを計算
    const transfers = []
    const debtors = settlements.filter(s => s.diff < 0).map(s => ({ ...s, remaining: -s.diff }))
    const creditors = settlements.filter(s => s.diff > 0).map(s => ({ ...s, remaining: s.diff }))

    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].remaining, creditors[j].remaining)
      if (amount > 0) {
        transfers.push({ from: debtors[i].payer, to: creditors[j].payer, amount })
      }
      debtors[i].remaining -= amount
      creditors[j].remaining -= amount
      if (debtors[i].remaining === 0) i++
      if (creditors[j].remaining === 0) j++
    }

    return { filtered, total, perPerson, settlements, transfers }
  }, [transactions, from, to, excludeCategories, settings])

  const formatDate = (d) => {
    const date = new Date(d)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>割り勘計算</h2>

      {/* 期間設定 */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>期間を設定</h3>
        <div className={styles.dateRow}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>開始日</label>
            <input className={styles.dateInput} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <span className={styles.dateSep}>〜</span>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>終了日</label>
            <input className={styles.dateInput} type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        {/* クイック設定 */}
        <div className={styles.quickBtns}>
          {[
            { label: '今月', action: () => {
              const now = new Date()
              setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
              setTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])
            }},
            { label: '先月', action: () => {
              const now = new Date()
              setFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0])
              setTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0])
            }},
            { label: '今年', action: () => {
              const now = new Date()
              setFrom(`${now.getFullYear()}-01-01`)
              setTo(`${now.getFullYear()}-12-31`)
            }},
          ].map(b => (
            <button key={b.label} className={styles.quickBtn} onClick={b.action}>{b.label}</button>
          ))}
        </div>
      </div>

      {/* 除外カテゴリ */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>割り勘から除外する用途</h3>
        <p className={styles.cardDesc}>固定費など個人負担のものを除外できます</p>
        <div className={styles.chips}>
          {settings.categories.map(cat => (
            <button
              key={cat}
              className={`${styles.chip} ${excludeCategories.includes(cat) ? styles.chipExcluded : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {excludeCategories.includes(cat) ? '✕ ' : ''}{cat}
            </button>
          ))}
        </div>
      </div>

      {/* 集計結果 */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          集計結果
          <span className={styles.period}>{formatDate(from)} 〜 {formatDate(to)}</span>
        </h3>

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>対象支出合計</span>
          <span className={styles.totalAmount}>¥{result.total.toLocaleString()}</span>
        </div>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>1人あたり（{settings.payers.length}人）</span>
          <span className={styles.totalAmount}>¥{result.perPerson.toLocaleString()}</span>
        </div>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>対象件数</span>
          <span className={styles.totalAmount}>{result.filtered.length}件</span>
        </div>
      </div>

      {/* 各人の支払い状況 */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>支払い状況</h3>
        {result.settlements.map(s => (
          <div key={s.payer} className={styles.settlementRow}>
            <div className={styles.settlementLeft}>
              <span className={styles.settlementName}>{s.payer}</span>
              <span className={styles.settlementPaid}>支払い済み: ¥{s.paid.toLocaleString()}</span>
            </div>
            <div className={`${styles.settlementDiff} ${s.diff >= 0 ? styles.diffPlus : styles.diffMinus}`}>
              {s.diff >= 0 ? `+¥${s.diff.toLocaleString()}` : `-¥${Math.abs(s.diff).toLocaleString()}`}
            </div>
          </div>
        ))}
      </div>

      {/* 精算方法 */}
      {result.transfers.length > 0 ? (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>精算方法</h3>
          {result.transfers.map((t, i) => (
            <div key={i} className={styles.transferRow}>
              <span className={styles.transferFrom}>{t.from}</span>
              <span className={styles.transferArrow}>→</span>
              <span className={styles.transferTo}>{t.to}</span>
              <span className={styles.transferAmount}>¥{t.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : result.total > 0 ? (
        <div className={styles.evenCard}>
          <span>🎉 精算不要！ちょうど均等です</span>
        </div>
      ) : null}
    </div>
  )
}
