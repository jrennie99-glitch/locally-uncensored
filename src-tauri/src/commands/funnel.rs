//! The Cloud switch used to count presses (event, platform, app version) by
//! posting to Supabase. That counter was telemetry the user did not ask for,
//! so the command stays registered for older frontends and sends nothing.
//!
//! The event list stays so it cannot drift from the TypeScript names. It is
//! not used to build a request.

#![allow(dead_code)]

/// The four things a press on the Cloud switch can do (lib/cloud-switch-guard
/// on the frontend), and the three clicks in the pop-up behind it: a model,
/// a plan, a pack. The SQL function carries the same list.
pub(crate) const FUNNEL_EVENTS: &[&str] = &[
    "cloud_switch_gate",
    "cloud_switch_arm",
    "cloud_switch_enter",
    "cloud_switch_leave",
    "cloud_gate_model_click",
    "cloud_gate_pick_sub",
    "cloud_gate_pick_credits",
];

pub(crate) fn funnel_event_allowed(event: &str) -> bool {
    FUNNEL_EVENTS.contains(&event)
}

pub(crate) fn platform_label(os: &str) -> &'static str {
    match os {
        "windows" => "windows",
        "linux" => "linux",
        "macos" => "macos",
        "android" => "android",
        "ios" => "ios",
        _ => "unknown",
    }
}

/// The RPC arguments of `funnel_count`, exactly three, nothing user-shaped.
pub(crate) fn funnel_payload(event: &str, platform: &str, version: &str) -> serde_json::Value {
    serde_json::json!({
        "p_event": event,
        "p_platform": platform,
        "p_app_version": version,
    })
}

/// Kept so an older frontend that still invokes it does not error. It does
/// not open a connection. The event name is ignored on purpose.
#[tauri::command]
pub async fn funnel_ping(_event: String) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_listed_presses_count() {
        for e in FUNNEL_EVENTS {
            assert!(funnel_event_allowed(e), "{e}");
        }
        assert_eq!(FUNNEL_EVENTS.len(), 7);
        for e in ["", "cloud_switch_seen", "cloud_gate_model", "cloud_gate_pick_sub ", "app_start", "cloud_switch_gate'; drop table x; --", "CLOUD_SWITCH_GATE"] {
            assert!(!funnel_event_allowed(e), "{e:?} must not count");
        }
    }

    #[test]
    fn the_platform_is_one_of_six_words() {
        assert_eq!(platform_label("windows"), "windows");
        assert_eq!(platform_label("linux"), "linux");
        assert_eq!(platform_label("macos"), "macos");
        // The phones count under their own name, not under "unknown" and
        // not under "linux" (Android's kernel) or "macos" (iOS's family).
        assert_eq!(platform_label("android"), "android");
        assert_eq!(platform_label("ios"), "ios");
        assert_eq!(platform_label("freebsd"), "unknown");
        assert_eq!(platform_label(""), "unknown");
    }

    #[test]
    fn the_payload_is_exactly_the_three_rpc_arguments() {
        let p = funnel_payload("cloud_switch_enter", "windows", "2.6.8");
        let obj = p.as_object().expect("object");
        let mut keys: Vec<&String> = obj.keys().collect();
        keys.sort();
        assert_eq!(keys, ["p_app_version", "p_event", "p_platform"]);
        assert_eq!(p["p_event"], "cloud_switch_enter");
        assert_eq!(p["p_platform"], "windows");
        assert_eq!(p["p_app_version"], "2.6.8");
    }

    #[test]
    fn the_command_sends_nothing() {
        let src = include_str!("funnel.rs");
        let body = &src[src.find("pub async fn funnel_ping").expect("command")..];
        let body = &body[..body.find("#[cfg(test)]").expect("end")];
        assert!(body.contains("Ok(())"));
        assert!(!body.contains("reqwest") && !body.contains("supabase") && !body.contains("http"), "the counter must not open a connection");
        assert!(!body.contains("spawn"), "nothing is sent in the background either");
    }
}
