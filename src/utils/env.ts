import { config } from 'dotenv';
import { logger } from './Logger.js';
config();

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
}

export const ENV = {
  PRIVATE_KEY: req('PRIVATE_KEY'),
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  APP_KEY: process.env.APP_KEY,
  DEFAULT_LEVERAGE: Number(process.env.DEFAULT_LEVERAGE || 3),
  MAX_RISK_PER_TRADE: Number(process.env.MAX_RISK_PER_TRADE || 2),
  LIQUIDATION_BUFFER: Number(process.env.LIQUIDATION_BUFFER || 10),
  GRID_COUNT: Number(process.env.GRID_COUNT || 10),
  DRY_RUN: process.env.DRY_RUN === 'true',
};

logger.info({ ENV: { ...ENV, PRIVATE_KEY: '[hidden]' } }, 'Env loaded');