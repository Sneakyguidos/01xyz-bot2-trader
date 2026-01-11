#!/usr/bin/env node
import { NordClient } from '@n1xyz/nord-ts';
import { Keypair } from '@solana/web3.js';
import { AutoTradingBot } from './trading/AutoTradingBot.js';
import { interactiveSetup } from './cli/TradingSetup.js';
import { ENV } from './utils/env.js';
import { logger } from './utils/Logger.js';

async function main() {
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(ENV.PRIVATE_KEY)));
  const client = new NordClient({ keypair: wallet, rpcUrl: ENV.RPC_URL, appKey: ENV.APP_KEY });
  const specs = await interactiveSetup(client);
  const bot = new AutoTradingBot(client, specs);
  await bot.start();
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});