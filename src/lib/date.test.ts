import { describe, it, expect } from 'vitest'
import { isValidBackfillDate, getActiveDate, todayTaipei } from './date'

describe('isValidBackfillDate', () => {
  it('rejects invalid format', () => {
    expect(isValidBackfillDate('2026/05/25')).toEqual({ valid: false, error: '格式錯誤，請用 YYYY-MM-DD' })
    expect(isValidBackfillDate('abc')).toEqual({ valid: false, error: '格式錯誤，請用 YYYY-MM-DD' })
    expect(isValidBackfillDate('2026-13-01')).toEqual({ valid: false, error: '格式錯誤，請用 YYYY-MM-DD' })
  })

  it('rejects future dates', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    expect(isValidBackfillDate(future)).toEqual({ valid: false, error: '不可設定未來日期' })
  })

  it('accepts exactly 30 days ago', () => {
    const today = todayTaipei()
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - 30)
    const thirtyDaysAgo = d.toISOString().slice(0, 10)
    expect(isValidBackfillDate(thirtyDaysAgo)).toEqual({ valid: true })
  })

  it('rejects dates older than 30 days', () => {
    const today = todayTaipei()
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - 31)
    const thirtyOneDaysAgo = d.toISOString().slice(0, 10)
    expect(isValidBackfillDate(thirtyOneDaysAgo)).toEqual({ valid: false, error: '最多補記 30 天前的資料' })
  })

  it('accepts valid past dates within 30 days', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    expect(isValidBackfillDate(yesterday)).toEqual({ valid: true })
  })

  it('accepts today', () => {
    expect(isValidBackfillDate(todayTaipei())).toEqual({ valid: true })
  })
})

describe('getActiveDate', () => {
  it('returns date_override when context row exists', async () => {
    const supabase = {
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { date_override: '2026-05-24' } }) }) }) }),
    } as any
    expect(await getActiveDate(123, supabase)).toBe('2026-05-24')
  })

  it('returns today when no context row', async () => {
    const supabase = {
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
    } as any
    expect(await getActiveDate(123, supabase)).toBe(todayTaipei())
  })
})
