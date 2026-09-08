import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export async function sendPush(user, payload) {
  if (!isPushConfigured()) {
    console.log("VAPID 설정이 아직 없습니다.");
    return { success: false, reason: "vapid_not_configured" };
  }

  if (!user?.subscription) {
    return { success: false, reason: "subscription_missing" };
  }

  try {
    await webpush.sendNotification(user.subscription, JSON.stringify(payload));
    console.log(`알림 전송 성공: ${user.zodiac || "별자리 미설정"}`);
    return { success: true };
  } catch (error) {
    console.error("알림 전송 실패:", error.statusCode, error.message);

    return {
      success: false,
      statusCode: error.statusCode,
      reason: error.message
    };
  }
}
