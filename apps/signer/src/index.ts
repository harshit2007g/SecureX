// Signer service (doc section 8.1). Stage 1 work: authenticate gateway, run the
// firewall on live requirements, reserve budget, build and sign the EIP-3009
// authorization. Not implemented yet.
import type { FirewallDecision } from '@securex/policy';

export type AuthorizeDecision = FirewallDecision;
