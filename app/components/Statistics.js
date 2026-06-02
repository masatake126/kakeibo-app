'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import styles from './Statistics.module.css'

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FF5722', '#9E9E9E', '#795548', '#607D8B']

const formatYen = (v) => `¥${v.toLocaleString()}`

export default function Statistics({ transactions, settings }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [payer, setPayer] = useState('全員')

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.paid_at)
      const matchMonth = d.getFullYear() === year && d.getMonth() + 1 === month
      const matchPayer = payer === '全員' || t.paid_by === payer
      return matchMonth && matchPayer
    })
  }, [transactions, year, month, payer])

  const total = filtered.reduce((sum, t) => sum + t.amount, 0)
  const avg = filtered.length > 0 ? Math.round(total / new Date(year, month, 0).getDate()) : 0

  // 用途別集計
  const categoryData = useMemo(() => {
    const map = {}
    filtered.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  // 日別集計
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const map = {}
    filtered.forEach(t => {
      const day = new Date(t.paid_at).getDate()
      map[day] = (map[day] || 0) + t.amount
    })
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map[i + 1] || 0,
    }))
  }, [filtered, year, month])

  const payerOptions = ['全員', ...settings.payers]

  return (
    <div className={styles.container}>
      {/* 月選択 */}
      <div className={styles.monthSelector}>
        <button className={styles.monthBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{year}年{month}月</span>
        <button className={styles.monthBtn} onClick={nextMonth}>›</button>
      </div>

      {/* 支払い者フィルター */}
      <div className={styles.payerFilter}>
        {payerOptions.map(p => (
          <button key={p} className={`${styles.payerBtn} ${payer === p ? styles.payerBtnActive : ''}`} onClick={() => setPayer(p)}>{p}</button>
        ))}
      </div>

      {/* サマリー */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>合計</p>
          <p className={styles.summaryAmount}>¥{total.toLocaleString()}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>1日平均</p>
          <p className={styles.summaryAmount}>¥{avg.toLocaleString()}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>件数</p>
          <p className={styles.summaryAmount}>{filtered.length}件</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>この月のデータがありません</div>
      ) : (
        <>
          {/* 用途別棒グラフ */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>用途別支出</h3>
            <ResponsiveContainer width="100%" height={categoryData.length * 48 + 20}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatYen(v)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className={styles.categoryList}>
              {categoryData.map((d, i) => (
                <div key={d.name} className={styles.categoryRow}>
                  <span className={styles.categoryDot} style={{ background: COLORS[i % COLORS.length] }} />
                  <span className={styles.categoryName}>{d.name}</span>
                  <span className={styles.categoryAmount}>¥{d.value.toLocaleString()}</span>
                  <span className={styles.categoryPct}>{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 日別折れ線グラフ */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>日別支出</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => `${d}日`} interval={4} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip formatter={v => formatYen(v)} labelFormatter={d => `${d}日`} />
                <Line type="monotone" dataKey="amount" stroke="#2E7D32" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 円グラフ */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>用途別割合</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatYen(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
