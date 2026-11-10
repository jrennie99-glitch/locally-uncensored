/**
 * Das iOS-Datenschutz-Manifest und der sendende Code sagen dasselbe.
 *
 * `PrivacyInfo.xcprivacy` erklaert je erhobenem Datentyp, ob er mit dem Konto
 * verknuepft ist (NSPrivacyCollectedDataTypeLinked). Die Angabe muss zu dem
 * passen, was das Handy wirklich sendet, und zu den Angaben in App Store
 * Connect. Der Zaehler des Cloud-Schalters wurde entfernt und steht nicht
 * mehr im Manifest.
 *
 * Der Waechter liest Quellen, er sendet nichts:
 *   1  Die Liste der erklaerten Typen ist bekannt. Ein neuer Typ braucht hier
 *      eine Zeile mit seinem Anker im Code.
 *   2  Der Zaehler ist weg: kein ProductInteraction im Manifest, und weder
 *      `funnel_ping` noch die TypeScript-Seite oeffnen dafuer eine Verbindung.
 *   3  Verknuepft (Konto, Inhalte, Bilder, Sprache): Die Aufrufe laufen ueber
 *      `cloudFetch` oder eine Sitzung, also mit dem Token des Kontos.
 *
 * Aendert sich der Code, schlaegt der Test fehl und nennt die Angabe, die dann
 * im Manifest UND in App Store Connect zu aendern ist.
 *
 * Grenze: Geprueft sind direkte Importe aus src/mobile, keine Ketten ueber
 * dritte Dateien. Was der Server speichert, steht nicht in diesem Repo.
 *
 * Lauf: npx vitest run src/lib/__tests__/ios-privacy-manifest.test.ts
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8')
const MANIFEST = 'src-tauri/gen/apple/locally-uncensored_iOS/PrivacyInfo.xcprivacy'

interface Declared {
  linked: boolean
  tracking: boolean
  purposes: string[]
}

/** Die erklaerten Datentypen des Manifests, ohne das Praefix von Apple. */
function declaredTypes(xml: string): Map<string, Declared> {
  const start = xml.indexOf('<key>NSPrivacyCollectedDataTypes</key>')
  expect(start, 'NSPrivacyCollectedDataTypes fehlt').toBeGreaterThan(-1)
  const out = new Map<string, Declared>()
  for (const m of xml.slice(start).matchAll(/<dict>([\s\S]*?)<\/dict>/g)) {
    const body = m[1]
    const type = /<key>NSPrivacyCollectedDataType<\/key>\s*<string>NSPrivacyCollectedDataType(\w+)<\/string>/.exec(body)?.[1]
    const linked = /<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<(true|false)\/>/.exec(body)?.[1]
    const tracking = /<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<(true|false)\/>/.exec(body)?.[1]
    if (!type || !linked || !tracking) throw new Error(`Eintrag ohne Typ, Linked oder Tracking: ${body.trim().slice(0, 120)}`)
    const purposes = [...body.matchAll(/<string>NSPrivacyCollectedDataTypePurpose(\w+)<\/string>/g)].map((p) => p[1])
    expect(out.has(type), `${type} steht zweimal im Manifest`).toBe(false)
    out.set(type, { linked: linked === 'true', tracking: tracking === 'true', purposes })
  }
  return out
}

function sources(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(join(root, rel)).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') out.push(...sources(rel))
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(rel)
  }
  return out
}

/** Die Dateien, die eine Quelle direkt und relativ importiert. */
function importsOf(rel: string): string[] {
  const out: string[] = []
  for (const m of read(rel).matchAll(/from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    const base = join(dirname(join(root, rel)), m[1] ?? m[2])
    for (const end of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
      if (existsSync(base + end)) out.push(relative(root, base + end).split('\\').join('/'))
    }
  }
  return out
}

const manifest = read(MANIFEST)
const declared = declaredTypes(manifest)

describe('iOS-Datenschutz-Manifest: erklaerte Daten und sendender Code', () => {
  it('erklaert genau die bekannten Datentypen, keiner dient dem Tracking', () => {
    expect([...declared.keys()].sort()).toEqual(['AudioData', 'EmailAddress', 'OtherUserContent', 'PhotosorVideos', 'UserID'])
    expect(manifest).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/)
    expect(manifest).not.toContain('NSPrivacyCollectedDataTypeProductInteraction')
    expect(manifest).not.toContain('NSPrivacyCollectedDataTypePurposeAnalytics')
    for (const [type, d] of declared) expect(d.tracking, `${type}: Tracking`).toBe(false)
    for (const type of ['AudioData', 'EmailAddress', 'OtherUserContent', 'PhotosorVideos', 'UserID']) {
      expect(declared.get(type)?.purposes, type).toEqual(['AppFunctionality'])
    }
  })

  describe('Zaehler des Cloud-Schalters: entfernt', () => {
    const PER_ACCOUNT = /reportCloudSwitchForAccount|\/api\/funnel\/switch/
    const all = sources('src')
    const phone = all.filter((f) => f.startsWith('src/mobile/'))

    it('unter src/mobile ruft niemand den alten Zaehler', () => {
      const hits = phone.filter((f) => PER_ACCOUNT.test(read(f)) || /backendCall\(\s*'funnel_ping'/.test(read(f)))
      expect(hits).toEqual([])
    })

    it('die anonyme Haelfte oeffnet keine Verbindung', () => {
      const counter = read('src/api/cloud/switch-counter.ts').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(counter).toContain('reportCloudSwitchAnonymous(action)')
      expect(counter).not.toMatch(/cloudFetch|funnel_ping/)
      const funnel = read('src/api/funnel.ts')
      const from = funnel.indexOf('export function reportCloudSwitchAnonymous')
      const anonymous = funnel.slice(from, funnel.indexOf('\n}\n', from))
      expect(anonymous).not.toContain('backendCall')
      expect(anonymous).not.toMatch(/cloudFetch|getAccessToken|fetch\(/)
      expect(funnel).not.toContain("backendCall('funnel_ping'")
      expect(funnel).not.toContain('/api/funnel/switch')
    })

    it('funnel_ping sendet nichts', () => {
      const rust = read('src-tauri/src/commands/funnel.rs')
      const cmdFrom = rust.indexOf('pub async fn funnel_ping')
      const command = rust.slice(cmdFrom, rust.indexOf('#[cfg(test)]', cmdFrom))
      expect(command).toContain('Ok(())')
      expect(command).not.toMatch(/reqwest|supabase|http|spawn/i)
    })
  })

  describe('Konto, Inhalte, Bilder, Sprache: verknuepft', () => {
    const why = (type: string) => `${type} geht nicht mehr mit dem Konto hinaus. Dann die Angabe Linked fuer ${type} im Manifest und in App Store Connect pruefen.`

    it('das Manifest sagt "verknuepft"', () => {
      for (const type of ['EmailAddress', 'UserID', 'OtherUserContent', 'PhotosorVideos', 'AudioData']) {
        expect(declared.get(type)?.linked, type).toBe(true)
      }
    })

    it('cloudFetch haengt an jeden Aufruf das Token des Kontos und sendet ohne Token nicht', () => {
      const client = read('src/api/cloud/client.ts')
      const from = client.indexOf('export async function cloudFetch')
      const body = client.slice(from)
      expect(body).toContain("if (!token) throw new CloudJobError('not signed in', 401)")
      expect(body).toContain('headers.set(\'authorization\', `Bearer ${token}`)')
    })

    it('EmailAddress und UserID: die Anmeldung des Handys geht mit E-Mail an das Konto', () => {
      const auth = read('src/mobile/screens/settings/parts/auth.ts')
      expect(auth, why('EmailAddress')).toMatch(/auth\.signInWithPassword\(\{ email/)
      expect(auth, why('EmailAddress')).toMatch(/auth\.signUp\(\{ email/)
    })

    it('OtherUserContent und PhotosorVideos: Auftraege und ihre Quelldateien laufen ueber cloudFetch', () => {
      const jobs = read('src/api/cloud/jobs.ts')
      expect(jobs, why('PhotosorVideos')).toMatch(/cloudFetch\(`\/api\/jobs\/upload\?role=/)
      expect(jobs, why('OtherUserContent')).toMatch(/cloudFetch\('\/api\/jobs',/)
      expect(jobs.replace(/cloudFetch\(/g, ''), 'jobs.ts ruft fetch an cloudFetch vorbei').not.toMatch(/\bfetch\(/)
    })

    it('OtherUserContent: Erinnerungen gehen mit dem Token der Sitzung', () => {
      expect(read('src/api/cloud/memory-sync.ts'), why('OtherUserContent')).toContain('headers: { authorization: `Bearer ${token}`')
    })

    it('AudioData: das Diktat geht ueber cloudFetch', () => {
      expect(read('src/api/voice.ts'), why('AudioData')).toMatch(/cloudFetch\(\s*["']\/api\/voice\/transcribe["']/)
    })
  })
})
