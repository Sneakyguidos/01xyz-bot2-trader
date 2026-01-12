import { Connection, Keypair } from '@solana/web3.js';
import { AutoTradingEngine } from './trading/AutoTradingEngine.js';

async function main() {
  console.log('🚀 Avvio 01xyz Bot Trader...');

  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
  const WEB_SERVER_URL = process.env.WEB_SERVER_URL || 'https://zo-devnet.n1.xyz';
  const APP_KEY = process.env.APP_KEY || 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5';

  const connection = new Connection(RPC_ENDPOINT);
  console.log('✅ Connesso a Solana RPC');

  const wallet = Keypair.generate();
  console.log('✅ Wallet caricato:', wallet.publicKey.toString());

  const engine = new AutoTradingEngine({
    app: APP_KEY,
    webServerUrl: WEB_SERVER_URL,
    wallet,
  });

  await engine.initialize(connection);
  console.log('✅ Trading Engine inizializzato');

  await engine.start();
  console.log('✅ Bot avviato!');

  process.on('SIGINT', async () => {
    console.log('\n🛑 Arresto del bot...');
    await engine.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});