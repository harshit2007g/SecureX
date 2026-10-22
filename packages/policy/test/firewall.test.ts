import { describe, expect, it } from 'vitest';
import { evaluatePaymentRequired, evaluateRequirements, type ReasonCode } from '../src';
import { RECIPIENT, USDC_BASE_SEPOLIA, paymentRequiredBody, policy, requirements } from './fixtures';
import { parsePaymentRequired } from '../src';

function reasonsFor(overrides: Parameters<typeof requirements>[0]): ReasonCode[] {
  const d = evaluateRequirements(requirements(overrides), policy);
  return d.decision === 'DENY' ? d.reasons : [];
}

describe('firewall: allow path', () => {
  it('allows the spec example', () => {
    expect(evaluateRequirements(requirements(), policy)).toEqual({
      decision: 'ALLOW',
      policyVersion: 'policy-test-1',
    });
  });

  it('compares addresses case-insensitively', () => {
    const d = evaluateRequirements(
      requirements({ payTo: RECIPIENT.toLowerCase(), asset: USDC_BASE_SEPOLIA.toLowerCase() }),
      policy,
    );
    expect(d.decision).toBe('ALLOW');
  });

  it('treats a missing transfer method as the eip3009 default', () => {
    expect(evaluateRequirements(requirements({ extra: { name: 'USDC', version: '2' } }), policy).decision).toBe('ALLOW');
  });
});

describe('firewall: scheme, network, asset, domain', () => {
  it('denies other schemes', () => {
    expect(reasonsFor({ scheme: 'upto' })).toEqual(['SCHEME_NOT_ALLOWED']);
  });

  it('denies networks outside the allowlist', () => {
    expect(reasonsFor({ network: 'eip155:8453' })).toContain('NETWORK_NOT_ALLOWED');
  });

  it('denies unknown token contracts', () => {
    expect(reasonsFor({ asset: '0x0000000000000000000000000000000000000001' })).toEqual(['ASSET_NOT_ALLOWED']);
  });

  it('denies a non-address asset such as a fiat code', () => {
    expect(reasonsFor({ asset: 'USD' })).toEqual(['ASSET_NOT_ALLOWED']);
  });

  it('denies a mismatched or missing EIP-712 domain', () => {
    expect(reasonsFor({ extra: { name: 'USDC', version: '1' } })).toEqual(['TOKEN_DOMAIN_MISMATCH']);
    expect(reasonsFor({ extra: { name: 'Evil', version: '2' } })).toEqual(['TOKEN_DOMAIN_MISMATCH']);
    expect(reasonsFor({ extra: undefined })).toEqual(['TOKEN_DOMAIN_MISMATCH']);
  });
});

describe('firewall: transfer method', () => {
  it.each(['permit2', 'erc7710', 'something-new'])('denies %s', (method) => {
    expect(
      reasonsFor({ extra: { assetTransferMethod: method, name: 'USDC', version: '2' } }),
    ).toEqual(['TRANSFER_METHOD_NOT_ALLOWED']);
  });
});

describe('firewall: recipient', () => {
  it('denies recipients outside the allowlist', () => {
    expect(reasonsFor({ payTo: '0x0000000000000000000000000000000000000002' })).toEqual(['RECIPIENT_NOT_ALLOWED']);
  });

  it('denies role constants and malformed addresses', () => {
    expect(reasonsFor({ payTo: 'merchant' })).toEqual(['RECIPIENT_NOT_ALLOWED']);
    expect(reasonsFor({ payTo: RECIPIENT.slice(0, 20) })).toEqual(['RECIPIENT_NOT_ALLOWED']);
  });
});

describe('firewall: amount', () => {
  it('allows exactly the limit', () => {
    expect(evaluateRequirements(requirements({ amount: '100000' }), policy).decision).toBe('ALLOW');
  });

  it('denies amounts above the limit', () => {
    expect(reasonsFor({ amount: '100001' })).toEqual(['AMOUNT_EXCEEDS_LIMIT']);
  });

  it.each(['0', '', '-1', '1.5', '0x10', '1e3', ' 10', '10 ', 'ten', '9'.repeat(79)])(
    'denies malformed amount %j',
    (amount) => {
      expect(reasonsFor({ amount })).toEqual(['AMOUNT_INVALID']);
    },
  );
});

describe('firewall: timeout', () => {
  it.each([0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('denies invalid timeout %s', (t) => {
    expect(reasonsFor({ maxTimeoutSeconds: t })).toEqual(['TIMEOUT_INVALID']);
  });

  it('denies timeouts above the ceiling', () => {
    expect(reasonsFor({ maxTimeoutSeconds: 121 })).toEqual(['TIMEOUT_EXCEEDS_LIMIT']);
  });
});

describe('firewall: combined behaviour', () => {
  it('reports every violation in a stable order', () => {
    const d = evaluateRequirements(
      requirements({ scheme: 'upto', amount: '0', payTo: 'merchant', maxTimeoutSeconds: 0 }),
      policy,
    );
    expect(d).toEqual({
      decision: 'DENY',
      policyVersion: 'policy-test-1',
      reasons: ['AMOUNT_INVALID', 'RECIPIENT_NOT_ALLOWED', 'SCHEME_NOT_ALLOWED', 'TIMEOUT_INVALID'],
    });
  });

  it('evaluates each option a provider offers independently', () => {
    const parsed = parsePaymentRequired(
      paymentRequiredBody([requirements({ amount: '999999' }), requirements()]),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const out = evaluatePaymentRequired(parsed.value, policy);
    expect(out.map((o) => o.decision.decision)).toEqual(['DENY', 'ALLOW']);
  });
});
