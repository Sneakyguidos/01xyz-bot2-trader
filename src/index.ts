import { Connection, Keypair } from '@solana/web3.js';
import { Nord, NordUser } from '@n1xyz/nord-ts';
import { AutoTradingEngine } from './trading/AutoTradingEngine.js';
import { OrderManager } from './trading/OrderManager.js';
import { RiskManager, RiskLimits } from './trading/RiskManager.js';

async function main() {
  console.log('🚀 Avvio 01xyz Bot Trader...');

  // Carica le configurazioni
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
  const WEB_SERVER_URL = process.env.WEB_SERVER_URL || 'https://zo-devnet.n1.xyz';
  const APP_KEY = process.env.APP_KEY || 'zoau54n5U24GHNKqyoziVaVxgsiQYnPMx33fKmLLCT5';

  // Connessione Solana
  const connection = new Connection(RPC_ENDPOINT);
  console.log('✅ Connesso a Solana RPC');

  // Carica il wallet (dovresti implementare il caricamento dal file)
  const wallet = Keypair.generate(); // TODO: Carica da privateKey.ts
  console.log('✅ Wallet caricato:', wallet.publicKey.toString());

  // Inizializza il trading engine
  const engine = new AutoTradingEngine({
    app: APP_KEY,
    webServerUrl: WEB_SERVER_URL,
    wallet,
  });

  await engine.initialize(connection);
  console.log('✅ Trading Engine inizializzato');

  // Avvia il bot
  await engine.start();
  console.log('✅ Bot avviato!');

  // Mantieni il processo in esecuzione
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