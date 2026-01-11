import { Nord, NordUser, Side, FillMode } from '@n1xyz/nord-ts';
import { Market } from '@n1xyz/nord-ts';

// Example usage
const nordConfig = {
  webServerUrl: 'https://api.nord.exchange',
  app: 'your_app_addr', // Provide the app verification key
  solanaUrl: 'https://api.mainnet-beta.solana.com',
};

const nord = await Nord.initNord(nordConfig);

const user = NordUser.fromPrivateKey(
  nord,
  'your_private_key', // Can be string or Uint8Array
);

// Place a limit order
try {
  const orderId = await user.placeOrder({
    marketId: 0, // BTC/USDC market
    side: Side.Bid, // Buy
    fillMode: FillMode.Limit,
    isReduceOnly: false,
    size: 0.1, // 0.1 BTC
    price: 50000, // $50,000 per BTC
  });

  console.log(`Order placed with ID: ${orderId}`);

  // Cancel the order
  await user.cancelOrder(orderId);
} catch (error) {
  console.error(`Trading error: ${error}`);
}