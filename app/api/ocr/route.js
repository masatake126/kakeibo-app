import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const WARN_LIMIT = 800
const BLOCK_LIMIT = 1000

function getYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function getUsage() {
  const ym = getYearMonth()
  const { data, error } = await supabase
    .from('ocr_usage')
    .select('count')
    .eq('year_month', ym)
    .single()

  if (error || !data) return 0
  return data.count
}

async function incrementUsage() {
  const ym = getYearMonth()
  const current = await getUsage()

  if (current === 0) {
    await supabase.from('ocr_usage').insert([{ year_month: ym, count: 1 }])
  } else {
    await supabase.from('ocr_usage')
      .update({ count: current + 1, updated_at: new Date().toISOString() })
      .eq('year_month', ym)
  }
  return current + 1
}

export async function GET() {
  const count = await getUsage()
  return Response.json({ count, warn: count >= WARN_LIMIT, block: count >= BLOCK_LIMIT })
}

export async function POST(request) {
  try {
    const currentCount = await getUsage()

    if (currentCount >= BLOCK_LIMIT) {
      return Response.json({
        error: 'LIMIT_EXCEEDED',
        message: `今月のレシート読み取り上限（${BLOCK_LIMIT}枚）に達しました。来月になるとリセットされます。`,
        count: currentCount,
      }, { status: 429 })
    }

    const { imageBase64 } = await request.json()
    const apiKey = process.env.GOOGLE_VISION_API_KEY

    if (!apiKey) {
      return Response.json({ error: 'API_KEY_MISSING', storeName: '', amount: '' })
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    )

    const visionData = await visionRes.json()
    const text = visionData.responses?.[0]?.fullTextAnnotation?.text || ''

    const storeName = extractStoreName(text)
    const amount = extractAmount(text)

    const newCount = await incrementUsage()

    return Response.json({
      storeName,
      amount,
      count: newCount,
      warn: newCount >= WARN_LIMIT,
      remaining: BLOCK_LIMIT - newCount,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

function extractStoreName(text) {
  const lines = text.split('\n').filter(l => l.trim())
  return lines[0] || ''
}

function extractAmount(text) {
  const patterns = [
    /合計[^\d]*(\d[\d,]+)/,
    /お買上[^\d]*(\d[\d,]+)/,
    /TOTAL[^\d]*(\d[\d,]+)/i,
    /小計[^\d]*(\d[\d,]+)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1].replace(/,/g, '')
  }
  const numbers = [...text.matchAll(/(\d[\d,]+)円/g)]
  if (numbers.length > 0) {
    const amounts = numbers.map(m => parseInt(m[1].replace(/,/g, '')))
    return String(Math.max(...amounts))
  }
  return ''
}
