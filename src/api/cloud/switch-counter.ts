/**
 * The old anonymous counter of the Cloud switch, with its opt out.
 *
 * `reportCloudSwitchAnonymous` no longer sends anything. This function still
 * consults the phone preference and still calls that hook, so a screen cannot
 * grow a request of its own: the only door is here, and the door does not
 * open a connection. A guard test under src/mobile keeps every screen on this
 * door.
 */
import { reportCloudSwitchAnonymous } from '../funnel'
import type { CloudSwitchAction } from '../../lib/cloud-switch-guard'
import { cloudSwitchCounterAllowed } from '../../lib/mobile-prefs'

/** Count one press, unless the user opted out. Fire and forget, never throws. Returns whether it was counted. */
export function countCloudSwitch(action: CloudSwitchAction): boolean {
  if (!cloudSwitchCounterAllowed()) return false
  try {
    reportCloudSwitchAnonymous(action)
  } catch {
    /* the switch never waits on the counter and never hears from it */
  }
  return true
}
