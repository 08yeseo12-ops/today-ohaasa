const zodiacList = [
  { id: "aries", name: "양자리", symbol: "♈" },
  { id: "taurus", name: "황소자리", symbol: "♉" },
  { id: "gemini", name: "쌍둥이자리", symbol: "♊" },
  { id: "cancer", name: "게자리", symbol: "♋" },
  { id: "leo", name: "사자자리", symbol: "♌" },
  { id: "virgo", name: "처녀자리", symbol: "♍" },
  { id: "libra", name: "천칭자리", symbol: "♎" },
  { id: "scorpio", name: "전갈자리", symbol: "♏" },
  { id: "sagittarius", name: "사수자리", symbol: "♐" },
  { id: "capricorn", name: "염소자리", symbol: "♑" },
  { id: "aquarius", name: "물병자리", symbol: "♒" },
  { id: "pisces", name: "물고기자리", symbol: "♓" }
];

let currentData = null;
const $ = selector => document.querySelector(selector);

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00+09:00`);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul"
  });
}

async function loadHoroscope() {
  const ranking = $("#ranking");
  if (ranking) ranking.innerHTML = `<div class="loading">운세를 불러오는 중... 🌅</div>`;

  try {
    const response = await fetch(`/api/horoscope?ts=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.updated || !data.rankings?.length) {
      throw new Error(data.message || "운세 데이터를 불러오지 못했습니다.");
    }

    currentData = data;
    renderDate(data.date);
    renderMyFortune(data);
    renderRanking(data);
    renderUpdateTime(data);
  } catch (error) {
    console.error(error);
    if (ranking) {
      ranking.innerHTML = `
        <div class="error-card">
          <div>☁️</div>
          <p>오늘의 운세를 불러오지 못했어요.</p>
          <small>${error.message || "서버를 확인해주세요."}</small>
          <button onclick="loadHoroscope()">다시 불러오기</button>
        </div>`;
    }
  }
}

function renderDate(date) {
  const el = $("#today");
  if (el) el.textContent = formatDate(date);
}

function renderUpdateTime(data) {
  const el = $("#updateTime");
  if (!el) return;
  const stale = data.isToday === false ? " · 공식 데이터 방송일 기준" : "";
  el.textContent = `${data.date || ""}${stale}`;
}

function getSavedZodiac() {
  return localStorage.getItem("myZodiac") || "";
}

function renderMyFortune(data) {
  const container = $("#myFortuneContent");
  if (!container) return;

  const zodiacId = getSavedZodiac();
  if (!zodiacId) {
    container.innerHTML = `<div class="my-fortune-empty"><div class="big-star">⭐</div><h2>내 별자리를 설정해주세요</h2><p>내 별자리를 설정하면<br>오늘의 운세를 바로 볼 수 있어요.</p></div>`;
    return;
  }

  const item = data.rankings?.find(fortune => fortune.id === zodiacId);
  if (!item) {
    container.innerHTML = `<div class="my-fortune-empty"><div class="big-star">⭐</div><h2>내 별자리 정보를 찾을 수 없어요</h2></div>`;
    return;
  }

  container.innerHTML = `
    <div class="my-fortune-card">
      <div class="my-fortune-top"><span>MY HOROSCOPE</span><span>${item.rank}위</span></div>
      <div class="my-zodiac">
        <div class="zodiac-symbol">${item.symbol || "⭐"}</div>
        <div><h2>${item.name}</h2><p>${item.description || "오늘의 운세를 확인해보세요."}</p></div>
      </div>
      <div class="lucky-info">
        <div><span>🍀 행운의 아이템</span><strong>${item.luckyItem || "-"}</strong></div>
        <div><span>🎨 행운의 컬러</span><strong>${item.luckyColor || "-"}</strong></div>
      </div>
    </div>`;
}

function renderRanking(data) {
  const container = $("#ranking");
  if (!container) return;
  if (!data.rankings?.length) {
    container.innerHTML = `<div class="error-card">오늘의 운세 데이터가 아직 없어요.</div>`;
    return;
  }

  const myZodiac = getSavedZodiac();
  container.innerHTML = [...data.rankings]
    .sort((a, b) => a.rank - b.rank)
    .map(item => {
      const isMine = item.id === myZodiac;
      const isFirst = item.rank === 1;
      return `
        <div class="rank-card ${isFirst ? "first" : ""} ${isMine ? "my-ranking" : ""}">
          <div class="rank">${item.rank}</div>
          <div style="flex:1;min-width:0">
            <div class="zodiac">${item.symbol || "⭐"} ${item.name} ${isMine ? '<span class="mine-badge">나</span>' : ""}</div>
            <div class="fortune">${item.description || "오늘의 운세를 확인해보세요."}</div>
            <div class="lucky">🍀 ${item.luckyItem ? `아이템: ${item.luckyItem}` : "아이템 없음"} · 🎨 ${item.luckyColor || "색상 없음"}</div>
          </div>
        </div>`;
    }).join("");
}

function openSettings() {
  const modal = $("#settingsModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  loadSettingsValues();
}

function closeSettings() {
  $("#settingsModal")?.classList.add("hidden");
}

function loadSettingsValues() {
  const zodiacSelect = $("#zodiacSelect");
  if (zodiacSelect) zodiacSelect.value = getSavedZodiac();

  const toggle = $("#notificationToggle");
  if (toggle) toggle.checked = localStorage.getItem("notificationEnabled") !== "false";

  const time = $("#notificationTime");
  if (time) time.value = localStorage.getItem("notificationTime") || "08:00";
  const customTime = $("#customTime");
  if (customTime) customTime.value = localStorage.getItem("customTime") || "";
}

async function saveSettings() {
  const zodiac = $("#zodiacSelect")?.value || "";
  const notificationEnabled = $("#notificationToggle")?.checked ?? true;
  const notificationTime = $("#customTime")?.value || $("#notificationTime")?.value || "08:00";

  if (zodiac) localStorage.setItem("myZodiac", zodiac);
  else localStorage.removeItem("myZodiac");
  localStorage.setItem("notificationEnabled", String(notificationEnabled));
  localStorage.setItem("notificationTime", notificationTime);

  closeSettings();
  if (currentData) {
    renderMyFortune(currentData);
    renderRanking(currentData);
  }

  if (notificationEnabled) {
    await requestNotificationPermission();
  } else {
    await syncPushSettings(false);
    alert("알림을 껐어요.");
  }
}

async function requestNotificationPermission() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("이 기기에서는 웹 푸시를 사용할 수 없습니다.");
    return;
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

  // iPhone/iPad Web Push는 홈 화면에 추가된 웹 앱에서 사용할 수 있다.
  if (isIOS && !isStandalone) {
    alert("아이폰에서는 먼저 Safari의 공유 버튼 → '홈 화면에 추가'로 앱을 설치한 뒤, 홈 화면의 오하아사 앱에서 알림을 켜주세요.");
    return;
  }

  if (!("Notification" in window)) {
    alert("이 브라우저에서는 알림을 사용할 수 없습니다.");
    return;
  }

  try {
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

    if (permission !== "granted") {
      alert("알림 권한이 허용되지 않았습니다. 아이폰 설정 → 알림 → 오늘의 오하아사에서 허용해주세요.");
      return;
    }

    await subscribePush();
  } catch (error) {
    console.error("Notification permission error:", error);
    alert("알림 설정 중 문제가 발생했어요. 홈 화면 앱에서 다시 시도해주세요.");
  }
}

async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const response = await fetch("/api/push/public-key", { cache: "no-store" });
    if (!response.ok) throw new Error("VAPID 공개키를 가져오지 못했습니다.");
    const { publicKey } = await response.json();
    if (!publicKey) throw new Error("서버에 VAPID 공개키가 설정되지 않았습니다.");

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  return subscription;
}

async function subscribePush() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const subscription = await getPushSubscription();
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON ? subscription.toJSON() : subscription,
        zodiac: getSavedZodiac(),
        notificationTime: localStorage.getItem("notificationTime") || "08:00"
      })
    });

    if (!response.ok) throw new Error("푸시 구독 저장에 실패했습니다.");

    alert("알림 설정 완료! 지금 테스트 알림이 도착하면 성공입니다. 🔔");
  } catch (error) {
    console.error("Push subscription error:", error);
    alert(error.message || "알림 설정에 실패했습니다.");
  }
}

async function syncPushSettings(notificationEnabled) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const response = await fetch("/api/push/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        zodiac: getSavedZodiac(),
        notificationTime: localStorage.getItem("notificationTime") || "08:00",
        notificationEnabled
      })
    });

    if (!response.ok) console.warn("푸시 설정 동기화 실패");
  } catch (error) {
    console.error("Push settings sync error:", error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function shareHoroscope() {
  const text = "오늘의 오하아사 별자리 운세를 확인해보세요! ☀️";
  if (navigator.share) {
    navigator.share({ title: "오늘의 오하아사", text, url: location.href }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(location.href);
    alert("링크가 복사됐어요!");
  }
}

function setupEvents() {
  $("#selectZodiac")?.addEventListener("click", openSettings);
  $("#refreshButton")?.addEventListener("click", loadHoroscope);
  $("#closeSettings")?.addEventListener("click", closeSettings);
  $("#saveSettings")?.addEventListener("click", saveSettings);
  $("#enableNotification")?.addEventListener("click", requestNotificationPermission);
  $("#settingsModal")?.addEventListener("click", event => {
    if (event.target.id === "settingsModal") closeSettings();
  });
  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.page === "settings") openSettings();
      if (button.dataset.page === "home") window.scrollTo({ top: 0, behavior: "smooth" });
      if (button.dataset.page === "history") alert("지난 운세 기능은 다음 단계에서 연결합니다.");
    });
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupEvents();
  await registerServiceWorker();
  await loadHoroscope();
});

window.loadHoroscope = loadHoroscope;
