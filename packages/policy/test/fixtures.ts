import { compilePolicy, type PaymentRequirements } from '../src';

/** Values taken from the examples in the x402 v2 exact EVM spec (Base Sepolia USDC). */
export const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const RECIPIENT = '0x209693Bc6afc0C5328bA36FaF03C514EF312287C';

export const policyConfig = {
  version: 'policy-test-1',
  networks: ['eip155:84532'],
  assets: [
    { network: 'eip155:84532', address: USDC_BASE_SEPOLIA, name: 'USDC', version: '2' },
  ],
  recipients: [RECIPIENT],
  maxAmountPerRequest: '100000',
  maxTimeoutSeconds: 120,
  allowedTransferMethods: ['eip3009'],
};

export const policy = compilePolicy(policyConfig);

export function requirements(
  overrides: Partial<PaymentRequirements> = {},
): PaymentRequirements {
  return {
    scheme: 'exact',
    network: 'eip155:84532',
    amount: '10000',
    asset: USDC_BASE_SEPOLIA,
    payTo: RECIPIENT,
    maxTimeoutSeconds: 60,
    extra: { name: 'USDC', version: '2' },
    ...overrides,
  };
}

export function paymentRequiredBody(
  accepts: unknown[] = [requirements()],
): Record<string, unknown> {
  return {
    x402Version: 2,
    error: 'PAYMENT-SIGNATURE header is required',
    resource: {
      url: 'https://api.example.com/premium-data',
      description: 'Access to premium market data',
      mimeType: 'application/json',
    },
    accepts,
    extensions: {},
  };
}
