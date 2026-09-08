import axios from "axios";

const HOROSCOPE_URL =
  "https://www.asahi.co.jp/data/ohaasa2020/horoscope.json";

const ZODIAC_MAP = {
  "01": { id: "aries", name: "양자리", originalName: "おひつじ座", symbol: "♈" },
  "02": { id: "taurus", name: "황소자리", originalName: "おうし座", symbol: "♉" },
  "03": { id: "gemini", name: "쌍둥이자리", originalName: "ふたご座", symbol: "♊" },
  "04": { id: "cancer", name: "게자리", originalName: "かに座", symbol: "♋" },
  "05": { id: "leo", name: "사자자리", originalName: "しし座", symbol: "♌" },
  "06": { id: "virgo", name: "처녀자리", originalName: "おとめ座", symbol: "♍" },
  "07": { id: "libra", name: "천칭자리", originalName: "てんびん座", symbol: "♎" },
  "08": { id: "scorpio", name: "전갈자리", originalName: "さそり座", symbol: "♏" },
  "09": { id: "sagittarius", name: "사수자리", originalName: "いて座", symbol: "♐" },
  "10": { id: "capricorn", name: "염소자리", originalName: "やぎ座", symbol: "♑" },
  "11": { id: "aquarius", name: "물병자리", originalName: "みずがめ座", symbol: "♒" },
  "12": { id: "pisces", name: "물고기자리", originalName: "うお座", symbol: "♓" }
};

const COLOR_WORDS = new Set([
  "赤色", "青色", "黄色", "緑色", "水色", "黄緑色", "深緑色", "紫色",
  "桃色", "ピンク", "オレンジ色", "白色", "黒色", "茶色", "金色", "銀色",
  "ベージュ", "紺色", "灰色", "グレー"
]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseText(raw) {
  const parts = String(raw ?? "")
    .split("\t")
    .map(clean)
    .filter(Boolean);

  const descriptionParts = parts.slice(0, 3);
  const last = parts[parts.length - 1] || "";

  let luckyItem = null;
  let luckyColor = null;

  if (last) {
    if (COLOR_WORDS.has(last)) luckyColor = last;
    else luckyItem = last;
  }

  return {
    description: descriptionParts.join(" "),
    luckyItem,
    luckyColor
  };
}

function getKoreaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function fetchOfficialHoroscope() {
  try {
    const response = await axios.get(HOROSCOPE_URL, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://www.asahi.co.jp/ohaasa/week/horoscope/index.html"
      }
    });

    const rows = Array.isArray(response.data) ? response.data : [];

    if (!rows.length) {
      return { updated: false, date: null, rankings: [], message: "공식 JSON이 비어 있습니다." };
    }

    const latest = rows
      .filter(row => /^\d{8}$/.test(String(row?.onair_date || "")))
      .sort((a, b) => String(b.onair_date).localeCompare(String(a.onair_date)))[0];

    if (!latest || !Array.isArray(latest.detail)) {
      return { updated: false, date: null, rankings: [], message: "최신 운세 detail을 찾지 못했습니다." };
    }

    const rankings = latest.detail
      .map(item => {
        const code = String(item?.horoscope_st || "").padStart(2, "0");
        const info = ZODIAC_MAP[code];
        const rank = Number(item?.ranking_no);
        if (!info || !Number.isInteger(rank)) return null;

        const parsed = parseText(item?.horoscope_text);

        return {
          rank,
          id: info.id,
          name: info.name,
          originalName: info.originalName,
          symbol: info.symbol,
          description: parsed.description,
          luckyItem: parsed.luckyItem,
          luckyColor: parsed.luckyColor
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank);

    const valid =
      rankings.length === 12 &&
      rankings.every((item, index) => item.rank === index + 1) &&
      new Set(rankings.map(item => item.id)).size === 12;

    if (!valid) {
      console.log(`공식 운세 데이터 검증 실패: ${rankings.length}/12`);
      return {
        updated: false,
        date: null,
        rankings: [],
        message: "공식 운세 12개 데이터 검증에 실패했습니다."
      };
    }

    const date = `${String(latest.onair_date).slice(0, 4)}-${String(latest.onair_date).slice(4, 6)}-${String(latest.onair_date).slice(6, 8)}`;

    console.log("==========================================");
    console.log(`ABC 공식 오하아사 운세 추출 성공: ${date}`);
    for (const item of rankings) {
      console.log(`${item.rank}위 ${item.name}`);
      console.log(`  ${item.description}`);
      console.log(`  행운 아이템: ${item.luckyItem || "-"}`);
      console.log(`  행운 색상: ${item.luckyColor || "-"}`);
    }
    console.log("==========================================");

    // 공식 JSON의 방송일을 그대로 사용한다. 오늘 날짜와 다르면 알림/화면에서 stale 데이터로 취급할 수 있다.
    const today = getKoreaDate();
    return {
      updated: true,
      date,
      isToday: date === today,
      rankings
    };
  } catch (error) {
    console.error("공식 오하아사 JSON 가져오기 실패:", error.message);
    return { updated: false, date: null, rankings: [], message: error.message };
  }
}
