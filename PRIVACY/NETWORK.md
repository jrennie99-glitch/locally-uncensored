# Network

What this app contacts, and when. A fresh install with no account and with the
update switches left off does not open a connection of its own. Crash reports
stay in a local file. There is no analytics kit.

Fonts (Inter, JetBrains Mono, Space Grotesk) are files under `public/fonts`.
The page does not load a font or script from a CDN.

The Daily video client and the Sentry browser client that ride along with it
are not in the build. `src/api/voice-no-daily.ts` stands in for that package.

## Removed

| What | Where it went | What changed |
|---|---|---|
| Cloud-switch counter | `POST https://lrrhheztdytyfpizvuup.supabase.co/rest/v1/rpc/funnel_count` | Removed. The Rust command `funnel_ping` is still registered so an older screen does not error, and it does not open a socket. |
| The same press, per account | `POST https://lu-labs.ai/api/funnel/switch` | Removed. A signed-in press is not reported either. |

## Opt-in, off until you turn it on

Settings → Updates. Both switches start off. An install that already had the
old "on" defaults is opted out once.

| What | Address | When |
|---|---|---|
| Update check (desktop) | `https://github.com/purpledoubled/locally-uncensored/releases/latest/download/latest.json` | Only after **Check for updates automatically** is on (a few seconds after start, then at most every six hours), or when you press **Check for updates**. The bundle is signed; a bad signature is rejected. |
| Update check (browser dev build) | `https://api.github.com/repos/purpledoubled/locally-uncensored/releases/latest` | Same switch. This build cannot install the result. |
| Update download | The file named in `latest.json` (GitHub Releases) | Only after **Download updates automatically** is on and a check found a newer build, or when you press **Download**. Installing always needs a click. |

## Only while you are signed in to LU Cloud

Signing in is a choice (email and password, or Google / GitHub in the system
browser). Signing out stops these.

| What | Address | When |
|---|---|---|
| Account session | `https://lrrhheztdytyfpizvuup.supabase.co` | Sign-in, and a refresh of an expired session. The anon key in the app is the public project key. No session means no request. |
| Account, credits, jobs, catalog, memory, voice, checkout | `https://lu-labs.ai` (`/api/me` about every five minutes while signed in, plus the calls for the feature you are using) | Chat, Create, voice, or memory sync while Cloud is on. Your prompt and files go only on the request you started. |
| Outage line | `https://lu-labs.ai/api/app/status` | While signed in: once, then about every three minutes, and after a cloud request fails. |

## You start it

| What | Address | When |
|---|---|---|
| A model, a voice pack, an engine, Python, or a trainer | Hugging Face, Civitai, GitHub, PyTorch, PyPI, Ollama (`https://ollama.com/download/OllamaSetup.exe` on Windows), or the URL you pasted | The download or install button for that thing. Voice packs and many model files are checked against a SHA-256. Installer downloads stay on HTTPS and are refused if a redirect points at a private address. Ollama's Windows installer URL always serves the current file, so there is no single digest to pin; the app checks the size and, on Windows, the Authenticode signature before it runs the file. |
| A cloud provider you configured | The base URL in Settings (OpenAI, Anthropic, OpenRouter, Groq, Together, DeepSeek, Mistral, or your own). OpenRouter also receives `HTTP-Referer: https://lu-labs.ai` and `X-Title: LU`, which that API requires. | A chat or tool call that uses that provider. |
| Web search or page fetch | The search backend the agent is set to, then the page URL | An agent turn that is allowed to use the web. |
| Remote Access on the LAN | Your phone connects to this computer on port 11435. The listener binds all interfaces only while Remote Access is on, and it requires pairing. | You turn Remote Access on. |
| Remote Access over the internet | A Cloudflare quick tunnel (`*.trycloudflare.com`), plus `https://lu-labs.ai` to hand the address to a signed-in phone | You turn the tunnel on. Traffic is encrypted to Cloudflare. It is not end to end. |
| Local API on the LAN | This computer, port 8129. Default bind is `127.0.0.1`. "Reachable on the network" binds all interfaces and still requires the token. | You turn it on. |
| Ollama, LM Studio, ComfyUI, the bundled engine | `127.0.0.1` (Ollama's default is port 11434) | Local inference. Nothing here leaves the machine unless you pointed the backend at another host yourself. |
| A link in a reply | `http` or `https` only, and only after you click. `file:` and `javascript:` are refused. Pictures in a reply are fetched only from localhost, LU's storage host, Civitai, or `githubusercontent.com`. Anything else is a click. | You click. |
| WebView2 is missing (Windows) | The app can point you at `https://developer.microsoft.com/microsoft-edge/webview2/`. It does not download it by itself. | You follow that link. |

## Not the running app

`setup.sh` can install Node and, if you agree, Ollama, by running the
publisher's install script. That is the setup script, not a timer inside the
app.
