import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { saveSubscription, updateUser } from "./database.js";
import { isPushConfigured, sendPush } from "./push.js";
import { fetchOfficialHoroscope } from "./scraper.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// public/server/index.js -> public/
app.use(express.static(PUBLIC_DIR));

app.get("/api/horoscope", async (req, res) => {
  try {
    const data = await fetchOfficialHoroscope();

    if (!data.updated) {
      return res.status(503).json({
        updated: false,
        date: data.date || null,
        rankings: [],
        message: data.message || "아직 공식 오하아사 운세 데이터가 확인되지 않았습니다."
      });
    }

    res.json(data);
  } catch (error) {
    console.error("/api/horoscope 오류:", error);
    res.status(500).json({
      updated: false,
      date: null,
      rankings: [],
      message: "운세를 불러오는 중 오류가 발생했습니다."
    });
  }
});

app.get("/api/push/public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { subscription, zodiac, notificationTime } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: "subscription이 없습니다." });
    }

    const user = saveSubscription({ subscription, zodiac, notificationTime });

    // 구독 직후 1회 테스트 알림을 보내 실제 Push 연결을 확인한다.
    if (isPushConfigured()) {
      await sendPush(user, {
        title: "오늘의 오하아사 🔔",
        body: "알림 설정이 완료됐어요! 다음 알림은 설정한 시간에 도착합니다.",
        url: "/"
      });
    }

    res.json({
      success: true,
      user: {
        zodiac: user.zodiac,
        notificationTime: user.notificationTime
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "구독 저장 실패" });
  }
});

app.post("/api/push/settings", (req, res) => {
  try {
    const { endpoint, zodiac, notificationTime, notificationEnabled } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "endpoint가 없습니다." });
    }

    const user = updateUser(endpoint, {
      zodiac,
      notificationTime,
      notificationEnabled
    });

    if (!user) {
      return res.status(404).json({ error: "등록된 사용자를 찾을 수 없습니다." });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "설정 저장 실패" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Express 5: "*" 대신 이 문법을 사용한다.
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`오늘의 오하아사 서버 실행: http://localhost:${PORT}`);
});

import "./scheduler.js";
