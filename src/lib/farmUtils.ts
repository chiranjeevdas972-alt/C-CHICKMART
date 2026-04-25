export const farmUtils = {
  calculateFCR(totalFeedConsumed: number, totalWeightGain: number) {
    if (totalWeightGain === 0) return 0;
    return (totalFeedConsumed / totalWeightGain).toFixed(2);
  },

  calculateMortalityRate(totalMortality: number, initialCount: number) {
    if (initialCount === 0) return 0;
    return ((totalMortality / initialCount) * 100).toFixed(1);
  },

  getHealthAlert(mortalityRate: number) {
    const rate = Number(mortalityRate);
    if (rate > 10) return { type: 'error', message: 'CRITICAL: High mortality rate detected!' };
    if (rate > 5) return { type: 'warning', message: 'WARNING: Mortality rate is rising.' };
    return { type: 'success', message: 'Batch health is stable.' };
  }
};
