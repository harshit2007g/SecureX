import { assetKey, type CompiledPolicy } from './config';
import type { PaymentRequired, PaymentRequirements } from './schemas';

/**
 * Payment Intent Firewall (doc section 3.2).
 *
 * Pure and deterministic. It takes no input from routing scores, reputation,
 * canary reports or simulation results, and fails closed: anything it cannot
 * positively match against policy is denied. Reason codes are generic and
 * never reveal allowlist contents.
 */

export type ReasonCode =
  | 'SCHEME_NOT_ALLOWED'
  | 'NETWORK_NOT_ALLOWED'
  | 'ASSET_NOT_ALLOWED'
  | 'TOKEN_DOMAIN_MISMATCH'
  | 'TRANSFER_METHOD_NOT_ALLOWED'
  | 'RECIPIENT_NOT_ALLOWED'
  | 'AMOUNT_INVALID'
  | 'AMOUNT_EXCEEDS_LIMIT'
  | 'TIMEOUT_INVALID'
  | 'TIMEOUT_EXCEEDS_LIMIT';

export type FirewallDecision =
  | { decision: 'ALLOW'; policyVersion: string }
  | { decision: 'DENY'; policyVersion: string; reasons: ReasonCode[] };

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ATOMIC_AMOUNT = /^[0-9]{1,78}$/;

/** Spec default when `extra.assetTransferMethod` is absent. */
const DEFAULT_TRANSFER_METHOD = 'eip3009';

export function evaluateRequirements(
  req: PaymentRequirements,
  policy: CompiledPolicy,
): FirewallDecision {
  const reasons = new Set<ReasonCode>();

  if (req.scheme !== 'exact') reasons.add('SCHEME_NOT_ALLOWED');

  if (!policy.networks.has(req.network)) reasons.add('NETWORK_NOT_ALLOWED');

  // The asset must be a real address on a known network and present in the
  // allowlist; its EIP-712 domain must match what the policy pins. Provider
  // supplied domain values are only ever compared, never trusted.
  const asset = EVM_ADDRESS.test(req.asset)
    ? policy.assets.get(assetKey(req.network, req.asset))
    : undefined;
  if (asset === undefined) {
    reasons.add('ASSET_NOT_ALLOWED');
  } else if (req.extra?.name !== asset.name || req.extra?.version !== asset.version) {
    reasons.add('TOKEN_DOMAIN_MISMATCH');
  }

  const method = req.extra?.assetTransferMethod ?? DEFAULT_TRANSFER_METHOD;
  if (!policy.transferMethods.has(method)) reasons.add('TRANSFER_METHOD_NOT_ALLOWED');

  // `payTo` may be a role constant in the spec; on EVM only a concrete,
  // allowlisted address is acceptable.
  if (!EVM_ADDRESS.test(req.payTo) || !policy.recipients.has(req.payTo.toLowerCase())) {
    reasons.add('RECIPIENT_NOT_ALLOWED');
  }

  if (!ATOMIC_AMOUNT.test(req.amount) || BigInt(req.amount) === 0n) {
    reasons.add('AMOUNT_INVALID');
  } else if (BigInt(req.amount) > policy.maxAmountPerRequest) {
    reasons.add('AMOUNT_EXCEEDS_LIMIT');
  }

  if (!Number.isInteger(req.maxTimeoutSeconds) || req.maxTimeoutSeconds <= 0) {
    reasons.add('TIMEOUT_INVALID');
  } else if (req.maxTimeoutSeconds > policy.maxTimeoutSeconds) {
    reasons.add('TIMEOUT_EXCEEDS_LIMIT');
  }

  if (reasons.size === 0) return { decision: 'ALLOW', policyVersion: policy.version };
  return {
    decision: 'DENY',
    policyVersion: policy.version,
    reasons: [...reasons].sort(),
  };
}

export interface EvaluatedOption {
  readonly requirements: PaymentRequirements;
  readonly decision: FirewallDecision;
}

/** Evaluate every option a provider offers; the caller keeps the ALLOWed ones. */
export function evaluatePaymentRequired(
  required: PaymentRequired,
  policy: CompiledPolicy,
): EvaluatedOption[] {
  return required.accepts.map((requirements) => ({
    requirements,
    decision: evaluateRequirements(requirements, policy),
  }));
}
