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
