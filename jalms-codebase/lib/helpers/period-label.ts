export const getPeriodLabel = (period: number): string => {
    if (period === 0) return "Morning"
    if (period === 7) return "Night"
    return `Period ${period}`
}

export const getPeriodShortLabel = (period: number): string => {
    if (period === 0) return "Morning"
    if (period === 7) return "Night"
    return `${period}` // For compact views like grids where "Period" is in header
}
