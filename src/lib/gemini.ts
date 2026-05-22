import { GoogleGenAI } from '@google/genai'
import type { GeminiAnalysis } from '../types'

export async function analyzeFood(imageBuffer: ArrayBuffer, apiKey: string): Promise<GeminiAnalysis> {
  try {
    const genAI = new GoogleGenAI({ apiKey })
    const bytes = new Uint8Array(imageBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    const base64 = btoa(binary)

    const response = await genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: { mimeType: 'image/jpeg', data: base64 },
            },
            {
              text: '請分析這張圖片中的食物。以JSON格式回覆，格式為：{"foods":["食物1","食物2"],"estimated_calories":數字}。只回覆JSON，不要其他文字。',
            },
          ],
        },
      ],
    })

    const text = response.text ?? '{}'
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      estimated_calories: typeof parsed.estimated_calories === 'number' ? parsed.estimated_calories : undefined,
    }
  } catch (err) {
    console.error('[gemini] analyzeFood error:', err)
    return { foods: [] }
  }
}
