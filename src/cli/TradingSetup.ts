import inquirer from 'inquirer';
import { Nord } from '@n1xyz/nord-ts';
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

  const nord = await Nord.new({
    app: nordConfig.app,
    solanaConnection: connection,
    webServerUrl: nordConfig.webServerUrl,
  });

  const choices = [
    { name: 'BTC-PERP (ID: 0)', value: 0 },
    { name: 'ETH-PERP (ID: 1)', value: 1 },
    { name: 'SOL-PERP (ID: 2)', value: 2 },
  ];

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
      default: 0.01,
      validate: (input: number) => input > 0,
    },
    {
      type: 'number',
      name: 'maxPositionSize',
      message: 'Dimensione massima posizione:',
      default: 1,
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

  const selectedChoice = choices.find(c => c.value === answers.marketId);
  
  return {
    marketId: answers.marketId,
    marketSymbol: selectedChoice?.name.split(' ')[0] || 'UNKNOWN',
    gridLevels: answers.gridLevels,
    gridSpacing: answers.gridSpacing,
    orderSize: answers.orderSize,
    maxPositionSize: answers.maxPositionSize,
    maxLeverage: answers.maxLeverage,
  };
}