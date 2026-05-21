import { GoogleGenAI } from '@google/genai'
import type { GeminiAnalysis } from '../types'

export async function analyzeFood(imageBuffer: ArrayBuffer, apiKey: string): Promise<GeminiAnalysis> {
  try {
    const genAI = new GoogleGenAI({ apiKey })
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
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
  } catch {
    return { foods: [] }
  }
}
