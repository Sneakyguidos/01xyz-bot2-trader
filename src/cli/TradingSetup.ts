import inquirer from 'inquirer';
import { NordClient } from '@n1xyz/nord-ts';
import { logger } from '../utils/Logger.js';
import { GridSpec } from '../trading/AutoTradingEngine.js';

export async function interactiveSetup(client: NordClient): Promise<GridSpec[]> {
  const markets = await client.getMarkets();
  const choices = markets.map((m) => ({
    name: `${m.name} (farmability ${(Math.random() * 10).toFixed(1)})`, // dummy score
    value: m,
  }));

  const { market } = await inquirer.prompt([{
    type: 'list',
    name: 'market',
    message: 'Select market',
    choices,
  }]);

  const { direction } = await inquirer.prompt([{
    type: 'list',
    name: 'direction',
    message: 'Direction',
    choices: ['long', 'short'],
  }]);

  const { sizeUsd } = await inquirer.prompt([{
    type: 'number',
    name: 'sizeUsd',
    message: 'Max position size (USD)',
    default: 1000,
  }]);

  const { count } = await inquirer.prompt([{
    type: 'number',
    name: 'count',
    message: 'Number of orders',
    default: 10,
  }]);

  const { lower } = await inquirer.prompt([{
    type: 'number',
    name: 'lower',
    message: 'Price range (lower)',
  }]);

  const { upper } = await inquirer.prompt([{
    type: 'number',
    name: 'upper',
    message: 'Price range (upper)',
  }]);

  const { leverage } = await inquirer.prompt([{
    type: 'number',
    name: 'leverage',
    message: 'Max leverage',
    default: 3,
  }]);

  return [{
    market,
    direction: direction as 'long' | 'short',
    lower,
    upper,
    count,
    sizeUsd,
    leverage,
  }];
}