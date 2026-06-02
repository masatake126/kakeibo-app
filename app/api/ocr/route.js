export async function POST(request) {
  try {
    const { imageBase64 } = await request.json()

    const apiKey = process.env.GOOGLE_VISION_API_KEY

    if (!apiKey) {
      return Response.json({ storeName: '', amount: '' })
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

    return Response.json({ storeName, amount })
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
