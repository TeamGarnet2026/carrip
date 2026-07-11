export function stopCategoryLabel(category?: string | null): string | null {
  switch (category) {
    case 'service_area':
      return 'SA'
    case 'parking_area':
      return 'PA'
    case 'rest_area':
      return '道の駅'
    case 'convenience_store':
      return 'コンビニ'
    default:
      return null
  }
}

export function driverChangeBadgeLabel(
  category?: string | null,
  isRestStop?: boolean
): string | null {
  const placeType = stopCategoryLabel(category)
  if (placeType) return `運転交代・${placeType}`
  if (isRestStop) return '運転交代'
  return null
}

export function isDriverChangeStopCategory(category?: string | null): boolean {
  return stopCategoryLabel(category) != null
}
