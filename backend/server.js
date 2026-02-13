// --- ІМПОРТ БІБЛІОТЕК ---
// express: створює веб-сервер
const express = require("express");
// cors: дозволяє фронтенду (з іншого порту) звертатися до бекенду
const cors = require("cors");
// dotenv: завантажує секретні ключі з файлу .env
require("dotenv").config();
// Google AI: бібліотека для роботи з Gemini
// uuid: генерує унікальні ID для подій
const { v4: uuidv4 } = require("uuid");
// fs & path: вбудовані модулі Node.js для роботи з файлами
const fs = require("fs");
const path = require("path");
const os = require("os");

// --- НАЛАШТУВАННЯ СЕРВЕРА ---
const app = express();
app.use(cors()); // Вмикаємо CORS
app.use(express.json()); // Дозволяємо серверу розуміти JSON у запитах

const PORT = process.env.PORT || 5000;

// --- НАЛАШТУВАННЯ AI ---
// const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genai.getGenerativeModel({ model: 'gemini-pro' });
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = "llama3"; // Переконайтеся, що ви запустили `ollama pull llama3`

// --- ФАЙЛОВА СИСТЕМА (БАЗА ДАНИХ) ---
// Визначаємо шляхи до файлів, де будуть зберігатися дані
const DATA_DIR = path.join(__dirname, "../data");
const FILES = {
  HISTORY: path.join(DATA_DIR, "chat_history.json"),
  EVENTS: path.join(DATA_DIR, "events.json"),
};

// Створюємо папку data, якщо її немає
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}



// --- API МАРШРУТИ (ROUTES) ---
// Це "двері", через які фронтенд спілкується з бекендом

// 1. Перевірка статусу сервера
app.get("/api/status", (req, res) => {
  res.json({
    apiKeyConfigured: false,
    status: "online",
    serverTime: Utils.getTimestamp(),
  });
});

// 2. Отримання історії чату
app.get("/api/chat-history", (req, res) => {
  res.json({ history: Utils.loadJson(FILES.HISTORY) });
});



// 4. Запис події (наприклад, з мобільного додатку)
app.post("/api/event", (req, res) => {
  const { type, content, metadata } = req.body;
  if (!type || !content)
    return res.status(400).json({ error: "Type and content required" });
  const event = EventService.record(type, content, metadata);
  res.json({ success: true, event });
});

// 5. Отримання списку подій
app.get("/api/events/:type", (req, res) => {
  res.json({ events: EventService.get(req.params.type) });
});

// Запуск сервера
app.listen(PORT, "0.0.0.0", () => {
  // Функція для пошуку IP адреси комп'ютера в мережі
  const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "localhost";
  };

  console.log(`✅ AI Assistant Backend запущено!`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
  console.log(
    `📱 Network: http://${getLocalIp()}:${PORT} (використовуйте цей IP у chatService.js)`,
  );
  console.log(`🦙 Local Ollama Mode: Active`);
});
