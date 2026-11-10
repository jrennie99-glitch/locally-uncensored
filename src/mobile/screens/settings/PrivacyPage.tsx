/**
 * E17 Privacy. Route /settings/privacy, page, strand 5 (Account, cloud, settings).
 *
 * Written for the phone: what stays on it, what is sent when Cloud is on,
 * and where the backup lives. Presses of the Cloud switch are not counted.
 */
import { ExternalLink } from 'lucide-react'
import { SETTINGS_STRINGS } from '../../strings/settings'
import { Button, Page, toast } from '../../ui'
import { nav } from '../../nav'
import { externalProvidersOffered } from '../../policy/gates'
import { Block, Heading, Hint } from './parts/layout'
import { LINKS, openLink } from './parts/links'
import { aiConsentGivenAt, ensureAiConsent, revokeAiConsent, storePolicy, useAiConsent } from './parts/policy'

const T = SETTINGS_STRINGS.privacy

function Section({ title, text }: { title: string; text: string }) {
  return (
    <Block>
      <Heading>{title}</Heading>
      <Hint strong>{text}</Hint>
    </Block>
  )
}

export default function PrivacyPage() {
  const asks = storePolicy().aiDisclosureConsent
  const allowed = useAiConsent()
  const since = aiConsentGivenAt()
  const aiState = !asks ? T.aiNotNeeded : allowed ? (since ? T.aiAllowedSince(new Date(since).toLocaleDateString()) : T.aiAllowed) : T.aiNotAllowed

  const withdraw = async () => {
    const yes = await nav.confirm({ title: T.aiWithdrawQuestion, text: T.aiWithdrawText, confirmLabel: T.aiWithdrawConfirm, tone: 'danger', testid: 'ai-consent-withdraw' })
    if (!yes) return
    revokeAiConsent()
    toast(T.aiWithdrawn, { testid: 'ai-consent-withdrawn' })
  }

  const allow = async () => {
    if (await ensureAiConsent()) toast(T.aiAllowedToast, { testid: 'ai-consent-allowed' })
  }

  return (
    <Page title={T.title} screen="settings-privacy">
      <div style={{ paddingTop: 'var(--m-s3)' }}>
        <Section title={T.onDeviceTitle} text={T.onDevice} />
        <Section title={T.cloudTitle} text={T.cloud} />
        {externalProvidersOffered() ? <Section title={T.ownKeysTitle} text={T.ownKeys} /> : null}
        <Section title={T.counterTitle} text={T.counter} />
      </div>
      <Section title={T.aiTitle} text={T.aiText} />
      <ListGroup>
        <Row title={T.aiRow} subtitle={aiState} testid="m-settings-privacy-ai" />
      </ListGroup>
      {asks ? (
        <Block>
          <div data-testid="m-settings-privacy-ai-state" data-allowed={allowed ? 'yes' : 'no'}>
            {allowed ? (
              <Button block onPress={() => void withdraw()} risk="destructive" testid="m-settings-privacy-ai-withdraw-reset">
                {T.aiWithdraw}
              </Button>
            ) : (
              <Button block onPress={() => void allow()} testid="m-settings-privacy-ai-allow">
                {T.aiAllow}
              </Button>
            )}
          </div>
        </Block>
      ) : null}
      <Section title={T.backupTitle} text={T.backup} />
      <Block>
        <Hint strong testid="m-settings-privacy-nothing-else">{T.nothingElse}</Hint>
        <Button block icon={ExternalLink} onPress={() => void openLink(LINKS.privacy)} risk="leaves-app" testid="m-settings-privacy-policy" el="E17.2">
          {T.policy}
        </Button>
        <Hint>{SETTINGS_STRINGS.common.onLuLabs}</Hint>
      </Block>
    </Page>
  )
}
