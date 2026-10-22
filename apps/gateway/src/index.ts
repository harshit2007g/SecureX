// Gateway (doc sections 4 and 5). Stage 1 work: ingress, registry, router, live
// 402 handling and the gateway-side firewall pass. Not implemented yet.
import { evaluatePaymentRequired } from '@securex/policy';

export const gatewayFirewallPass = evaluatePaymentRequired;
