import inquirer from 'inquirer';
import { Nord, Market } from '@n1xyz/nord-ts';
import { Connection } from '@solana/web3.js';

export interface TradingConfig {
  marketId: number;
  marketSymbol: string;
  gridLevels: number;
  gridSpacing: number;
  orderSize: number;
  maxPositionSize: number;
  maxLeverage: number;
}

export async function setupTradingConfig(
  connection: Connection,
  nordConfig: { app: string; webServerUrl: string }
): Promise<TradingConfig> {
  console.log('\n🔧 Configurazione Trading Bot\n');

  // Inizializza Nord per ottenere i mercati
  const nord = await Nord.new({
    app: nordConfig.app,
    solanaConnection: connection,
    webServerUrl: nordConfig.webServerUrl,
  });

  const markets = await nord.getMarkets();
  const choices = markets.map((m: Market) => ({
    name: `${m.symbol} (ID: ${m.id})`,
    value: m.id,
  }));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'marketId',
      message: 'Seleziona il mercato da tradare:',
      choices,
    },
    {
      type: 'number',
      name: 'gridLevels',
      message: 'Numero di livelli di grid:',
      default: 5,
      validate: (input: number) => input > 0 && input <= 20,
    },
    {
      type: 'number',
      name: 'gridSpacing',
      message: 'Spaziatura tra i livelli (in %):',
      default: 0.5,
      validate: (input: number) => input > 0 && input <= 10,
    },
    {
      type: 'number',
      name: 'orderSize',
      message: 'Dimensione ordine (unità):',
      default: 1,
      validate: (input: number) => input > 0,
    },
    {
      type: 'number',
      name: 'maxPositionSize',
      message: 'Dimensione massima posizione:',
      default: 10,
      validate: (input: number) => input > 0,
    },
    {
      type: 'number',
      name: 'maxLeverage',
      message: 'Leverage massimo:',
      default: 3,
      validate: (input: number) => input > 0 && input <= 10,
    },
  ]);

  const selectedMarket = markets.find((m: Market) => m.id === answers.marketId);
  
  return {
    marketId: answers.marketId,
    marketSymbol: selectedMarket?.symbol || 'UNKNOWN',
    gridLevels: answers.gridLevels,
    gridSpacing: answers.gridSpacing,
    orderSize: answers.orderSize,
    maxPositionSize: answers.maxPositionSize,
    maxLeverage: answers.maxLeverage,
  };
}