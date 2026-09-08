import cron from "node-cron";

import { getUsersForTime, removeUser } from "./database.js";
import { fetchOfficialHoroscope } from "./scraper.js";
import { sendPush } from "./push.js";

function getKoreaTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

async function sendMorningNotifications() {
  try {
    const koreaTime = getKoreaTime();
    const users = getUsersForTime(koreaTime);

    if (!users.length) return;

    console.log(`[스케줄러] ${koreaTime} 알림 대상 ${users.length}명`);

    const horoscope = await fetchOfficialHoroscope();

    // ABC의 당일 공식 데이터가 아니면 잘못된 날짜의 알림을 보내지 않는다.
    if (
      !horoscope.updated ||
      horoscope.isToday === false ||
      !horoscope.date ||
      horoscope.rankings?.length !== 12
    ) {
      console.log("[스케줄러] 당일 공식 운세 미확인 → 알림 보내지 않음");
      return;
    }

    for (const user of users) {
      const myFortune = horoscope.rankings.find(item => item.id === user.zodiac);
      const firstPlace = horoscope.rankings.find(item => item.rank === 1);

      if (!myFortune || !firstPlace) continue;

      const result = await sendPush(user, {
        title: "오늘의 오하아사 ☀️",
        body: `오늘의 1위는 ${firstPlace.name}! 내 별자리는 ${myFortune.rank}위예요.`,
        url: "/"
      });

      // 브라우저가 구독을 폐기한 경우 저장된 구독도 제거한다.
      if (!result.success && (result.statusCode === 404 || result.statusCode === 410)) {
        removeUser(user.endpoint);
      }
    }
  } catch (error) {
    console.error("[스케줄러 오류]", error);
  }
}

// 매분 확인하여 사용자가 지정한 한국 시간에 정확히 전송한다.
cron.schedule("* * * * *", sendMorningNotifications, { timezone: "Asia/Seoul" });
