/**
 * The Cloud switch counter was removed. The event names stay, and a press
 * must not call the bridge or the account endpoint.
 *
 * Run: npx vitest run src/api/__tests__/funnel.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const backendCall = vi.fn()
vi.mock('../backend', () => ({
  backendCall: (...a: unknown[]) => backendCall(...a),
}))
const cloudFetch = vi.fn()
vi.mock('../cloud/client', () => ({
  cloudFetch: (...a: unknown[]) => cloudFetch(...a),
}))

import { funnelEventFor, reportCloudSwitch } from '../funnel'

beforeEach(() => {
  backendCall.mockReset()
  backendCall.mockResolvedValue(undefined)
  cloudFetch.mockReset()
  cloudFetch.mockResolvedValue(new Response(null, { status: 204 }))
})

describe('the Cloud switch counter', () => {
  it('maps the four presses to the four event names and nothing else', () => {
    expect(funnelEventFor('open-gate')).toBe('cloud_switch_gate')
    expect(funnelEventFor('arm')).toBe('cloud_switch_arm')
    expect(funnelEventFor('enter-cloud')).toBe('cloud_switch_enter')
    expect(funnelEventFor('leave-cloud')).toBe('cloud_switch_leave')
  })

  it('does not call the bridge or the account endpoint', () => {
    reportCloudSwitch('enter-cloud')
    reportCloudSwitch('open-gate')
    expect(backendCall).not.toHaveBeenCalled()
    expect(cloudFetch).not.toHaveBeenCalled()
  })

  it('never throws, even when the old endpoints would have failed', () => {
    backendCall.mockImplementation(() => { throw new Error('no tauri') })
    cloudFetch.mockImplementation(() => { throw new Error('no session') })
    expect(() => reportCloudSwitch('arm')).not.toThrow()
    expect(() => reportCloudSwitch('leave-cloud')).not.toThrow()
    expect(backendCall).not.toHaveBeenCalled()
    expect(cloudFetch).not.toHaveBeenCalled()
  })
})
