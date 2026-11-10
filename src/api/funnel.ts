/**
 * The Cloud switch used to report each press (and each click in the gate)
 * to LU Labs: an event name, the platform and the app version, and, when
 * somebody was signed in, the same event on the account. That was telemetry.
 * The names stay so callers and the old command keep compiling. Nothing is
 * sent.
 */
import type { CloudSwitchAction } from '../lib/cloud-switch-guard'

export type FunnelEvent =
  | 'cloud_switch_gate'
  | 'cloud_switch_arm'
  | 'cloud_switch_enter'
  | 'cloud_switch_leave'
  | GateFunnelEvent

/** The clicks in the gate pop-up (3.0.7): a model, then one of the two ways
 *  in. The name is the whole message here too; which model goes with the
 *  checkout, never with the counter. */
export type GateFunnelEvent =
  | 'cloud_gate_model_click'
  | 'cloud_gate_pick_sub'
  | 'cloud_gate_pick_credits'

export function funnelEventFor(action: CloudSwitchAction): FunnelEvent {
  switch (action) {
    case 'open-gate': return 'cloud_switch_gate'
    case 'arm': return 'cloud_switch_arm'
    case 'enter-cloud': return 'cloud_switch_enter'
    case 'leave-cloud': return 'cloud_switch_leave'
  }
}

export function reportCloudSwitch(action: CloudSwitchAction): void {
  reportCloudSwitchAnonymous(action)
}

/** A click in the gate pop-up. Not reported. */
export function reportCloudGate(_event: GateFunnelEvent): void {
  /* the gate does not phone home */
}

/**
 * Returns the event name and does not send it. The phone still calls this
 * through the preference gate (api/cloud/switch-counter.ts) so a later change
 * cannot grow a request on one side only.
 */
export function reportCloudSwitchAnonymous(action: CloudSwitchAction): FunnelEvent {
  return funnelEventFor(action)
}

/** The per-account counter. Removed: a signed-in press is not reported either. */
export function reportCloudSwitchForAccount(_event: FunnelEvent): void {
  /* a signed-in press is not reported */
}
