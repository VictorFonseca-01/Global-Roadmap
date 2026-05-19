export const RISK_COST_MATRIX = {
  server: {
    critical: 250000,
    high: 120000,
    medium: 50000,
    low: 15000
  },
  client: {
    critical: 25000,
    high: 10000,
    medium: 5000,
    low: 1500
  }
} as const;

export type RiskAssetType = keyof typeof RISK_COST_MATRIX;
export type RiskCriticality = keyof typeof RISK_COST_MATRIX['server'];
