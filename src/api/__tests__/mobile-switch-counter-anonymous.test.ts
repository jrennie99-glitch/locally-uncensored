/**
 * The Cloud switch counter does not leave the phone, signed in or not.
 *
 * Run: npx vitest run src/api/__tests__/mobile-switch-counter-anonymous.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  backendCall: vi.fn(async () => undefined),
  cloudFetch: vi.fn(async () => new Response('{}')),
}))
vi.mock('../backend', async (orig) => ({ ...((await orig()) as object), backendCall: mocks.backendCall }))
vi.mock('../cloud/client', async (orig) => ({ ...((await orig()) as object), cloudFetch: mocks.cloudFetch }))
vi.mock('../../lib/mobile-prefs', () => ({ cloudSwitchCounterAllowed: () => true }))

import { countCloudSwitch } from '../cloud/switch-counter'
import { reportCloudSwitch } from '../funnel'
import { SETTINGS_STRINGS } from '../../mobile/strings/settings'

beforeEach(() => {
  mocks.backendCall.mockClear()
  mocks.cloudFetch.mockClear()
})

describe('the counter of the Cloud switch', () => {
  it('phone: a press sends nothing, with or without a session', () => {
    for (const action of ['open-gate', 'arm', 'enter-cloud', 'leave-cloud'] as const) countCloudSwitch(action)
    expect(mocks.backendCall).not.toHaveBeenCalled()
    expect(mocks.cloudFetch).not.toHaveBeenCalled()
  })

  it('desktop: a press is not counted for the account either', () => {
    reportCloudSwitch('enter-cloud')
    expect(mocks.backendCall).not.toHaveBeenCalled()
    expect(mocks.cloudFetch).not.toHaveBeenCalled()
  })

  it('nothing under src/mobile counts around the anonymous counter', () => {
    const counter = readFileSync(resolve(__dirname, '../cloud/switch-counter.ts'), 'utf8')
    expect(counter).not.toMatch(/reportCloudSwitch\(|reportCloudSwitchForAccount/)
    expect(SETTINGS_STRINGS.privacy.counter).toContain('No account, no content')
    expect(SETTINGS_STRINGS.privacy.counter).toContain('are not counted')
  })
})
