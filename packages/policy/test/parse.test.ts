import { describe, expect, it } from 'vitest';
import { compilePolicy, parsePaymentRequired, parsePaymentRequirements } from '../src';
import { paymentRequiredBody, policyConfig, requirements } from './fixtures';

describe('parsePaymentRequired', () => {
  it('accepts the spec example shape', () => {
    expect(parsePaymentRequired(paymentRequiredBody()).ok).toBe(true);
  });

  it.each([undefined, null, 'x', 42, [], { x402Version: 1 }, { x402Version: '2' }])(
    'rejects unsupported version input %j',
    (input) => {
      expect(parsePaymentRequired(input)).toEqual({ ok: false, reason: 'UNSUPPORTED_VERSION' });
    },
  );

  it('rejects unknown top-level fields', () => {
    expect(parsePaymentRequired({ ...paymentRequiredBody(), surprise: true })).toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
  });

  it('rejects an empty accepts list', () => {
    expect(parsePaymentRequired(paymentRequiredBody([]))).toEqual({ ok: false, reason: 'MALFORMED' });
  });

  it('rejects unknown keys inside extra (fail closed)', () => {
    const body = paymentRequiredBody([{ ...requirements(), extra: { name: 'USDC', version: '2', hook: 'x' } }]);
    expect(parsePaymentRequired(body)).toEqual({ ok: false, reason: 'MALFORMED' });
  });

  it('rejects wrongly typed fields', () => {
    const body = paymentRequiredBody([{ ...requirements(), amount: 10000 }]);
    expect(parsePaymentRequired(body)).toEqual({ ok: false, reason: 'MALFORMED' });
  });
});

describe('parsePaymentRequirements', () => {
  it('round-trips a valid object', () => {
    const r = parsePaymentRequirements(requirements());
    expect(r.ok && r.value.payTo).toBe(requirements().payTo);
  });
});

describe('compilePolicy', () => {
  it('compiles a valid policy', () => {
    expect(compilePolicy(policyConfig).maxAmountPerRequest).toBe(100000n);
  });

  it('refuses transfer methods other than eip3009', () => {
    expect(() => compilePolicy({ ...policyConfig, allowedTransferMethods: ['permit2'] })).toThrow();
  });

  it('refuses empty allowlists and unknown keys', () => {
    expect(() => compilePolicy({ ...policyConfig, recipients: [] })).toThrow();
    expect(() => compilePolicy({ ...policyConfig, extra: 1 })).toThrow();
  });

  it('refuses malformed addresses, networks and limits', () => {
    expect(() => compilePolicy({ ...policyConfig, recipients: ['0x123'] })).toThrow();
    expect(() => compilePolicy({ ...policyConfig, networks: ['base'] })).toThrow();
    expect(() => compilePolicy({ ...policyConfig, maxAmountPerRequest: '-1' })).toThrow();
    expect(() => compilePolicy({ ...policyConfig, maxTimeoutSeconds: 0 })).toThrow();
  });
});
