const TAIPEI_TZ = 'Asia/Taipei'

export function todayTaipei(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TAIPEI_TZ })
}

export function dateRangeTaipei(daysBack: number): { dateFrom: string; dateTo: string } {
  const dateTo = todayTaipei()
  const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv-SE', { timeZone: TAIPEI_TZ })
  return { dateFrom, dateTo }
}

export function isValidBackfillDate(dateStr: string): { valid: boolean; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: '格式錯誤，請用 YYYY-MM-DD' }
  }
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: '格式錯誤，請用 YYYY-MM-DD' }
  }
  const today = todayTaipei()
  if (dateStr > today) {
    return { valid: false, error: '不可設定未來日期' }
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv-SE', { timeZone: TAIPEI_TZ })
  if (dateStr < thirtyDaysAgo) {
    return { valid: false, error: '最多補記 30 天前的資料' }
  }
  return { valid: true }
}

export async function getActiveDate(userId: number, supabase: import('./supabase').SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('user_date_context')
    .select('date_override')
    .eq('user_id', userId)
    .single()
  return data?.date_override ?? todayTaipei()
}
