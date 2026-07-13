const MARKET_BASE = "https://mergeos.shop";
const ALARM_NAME = "mrgwallet-badge";
const BADGE_INTERVAL_MINUTES = 15;

async function updateBadge() {
  try {
    const resp = await fetch(`${MARKET_BASE}/api/public/marketplace?limit=1`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const count = Array.isArray(data) ? data.length : data?.data?.length ?? 0;
    const text = count > 0 ? String(count) : "";
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#2dd4bf" });
  } catch {
    chrome.action.setBadgeText({ text: "?" });
    chrome.action.setBadgeBackgroundColor({ color: "#8fa3c5" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: BADGE_INTERVAL_MINUTES,
  });
  updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    updateBadge();
  }
});
