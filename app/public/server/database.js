import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "users.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, "[]", "utf8");
}

function readUsers() {
  try {
    const data = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(users, null, 2),
    "utf8"
  );
}

export function getUsers() {
  return readUsers();
}

export function saveSubscription({
  subscription,
  zodiac,
  notificationTime
}) {
  const users = readUsers();

  const endpoint = subscription?.endpoint;

  if (!endpoint) {
    throw new Error("Push subscription endpoint가 없습니다.");
  }

  const existingIndex = users.findIndex(
    (user) => user.endpoint === endpoint
  );

  const user = {
    endpoint,
    subscription,
    zodiac: zodiac || "",
    notificationTime: notificationTime || "08:00",
    notificationEnabled: true,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      ...user
    };
  } else {
    users.push(user);
  }

  saveUsers(users);

  return user;
}

export function updateUser(endpoint, changes) {
  const users = readUsers();

  const index = users.findIndex(
    (user) => user.endpoint === endpoint
  );

  if (index === -1) {
    return null;
  }

  users[index] = {
    ...users[index],
    ...changes,
    updatedAt: new Date().toISOString()
  };

  saveUsers(users);

  return users[index];
}

export function removeUser(endpoint) {
  const users = readUsers().filter(
    (user) => user.endpoint !== endpoint
  );

  saveUsers(users);
}

export function getUsersForTime(time) {
  return readUsers().filter(
    (user) =>
      user.notificationEnabled !== false &&
      user.notificationTime === time
  );
}