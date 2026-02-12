// --- ІМПОРТ БІБЛІОТЕК ---
// express: створює веб-сервер
const express = require('express');
// cors: дозволяє фронтенду (з іншого порту) звертатися до бекенду
const cors = require('cors');
// dotenv: завантажує секретні ключі з файлу .env
require('dotenv').config();
// Google AI: бібліотека для роботи з Gemini
// const { GoogleGenerativeAI } = require('@google/generative-ai'); // Вимкнено для Ollama
// uuid: генерує унікальні ID для подій
const { v4: uuidv4 } = require('uuid');
// fs & path: вбудовані модулі Node.js для роботи з файлами
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- НАЛАШТУВАННЯ СЕРВЕРА ---
const app = express();
app.use(cors()); // Вмикаємо CORS
app.use(express.json()); // Дозволяємо серверу розуміти JSON у запитах

const PORT = process.env.PORT || 5000;

// --- НАЛАШТУВАННЯ AI ---
// const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genai.getGenerativeModel({ model: 'gemini-pro' });
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = 'llama3'; // Переконайтеся, що ви запустили `ollama pull llama3`

// --- ФАЙЛОВА СИСТЕМА (БАЗА ДАНИХ) ---
// Визначаємо шляхи до файлів, де будуть зберігатися дані
const DATA_DIR = path.join(__dirname, '../data');
const FILES = {
  HISTORY: path.join(DATA_DIR, 'chat_history.json'),
  EVENTS: path.join(DATA_DIR, 'events.json')
};

// Створюємо папку data, якщо її немає
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- УТИЛІТИ (ДОПОМІЖНІ ФУНКЦІЇ) ---
// Цей об'єкт містить функції, які допомагають читати/писати файли
const Utils = {
  // Отримати поточний час у форматі ISO
  getTimestamp: () => new Date().toISOString(),

  // Безпечне читання JSON файлу
  loadJson: (filePath, defaultValue = []) => {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.error(`Помилка читання ${filePath}:`, err.message);
    }
    return defaultValue;
  },

  // Безпечний запис у JSON файл
  saveJson: (filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Помилка запису ${filePath}:`, err.message);
    }
  }
};

// --- СЕРВІСИ (БІЗНЕС-ЛОГІКА) ---
// Тут ми групуємо функції за їх призначенням

const EventService = {
  // Записати нову подію (наприклад, прийом ліків)
  record: (type, content, metadata = {}) => {
    const events = Utils.loadJson(FILES.EVENTS, {});
    if (!events[type]) events[type] = [];
    
    const event = { 
      id: uuidv4(), 
      type, 
      content, 
      metadata, 
      timestamp: Utils.getTimestamp() 
    };
    
    events[type].push(event);
    Utils.saveJson(FILES.EVENTS, events);
    return event;
  },

  // Отримати список подій певного типу
  get: (type) => {
    const events = Utils.loadJson(FILES.EVENTS, {});
    return events[type] || [];
  },

  // Спробувати знайти відповідь у локальних даних (без AI)
  tryAnswerQuery: (message) => {
    const lower = message.toLowerCase();
    const events = Utils.loadJson(FILES.EVENTS, {});

    if (lower.includes('вітамін') || lower.includes('витамин')) {
      const list = events.vitamin;
      return list?.length ? `Ви приймаєте вітаміни: ${list[list.length - 1].content}` : null;
    }
    
    if (lower.includes('лікар') || lower.includes('врач')) {
      const list = events.doctor;
      return list?.length ? `Останній запис про лікаря: ${list[list.length - 1].content}` : null;
    }
    
    return null;
  }
};

const AiService = {
  // Відповідь, якщо інтернет або API недоступні
  getOfflineResponse: (message) => {
    const lower = message.toLowerCase();
    const responses = {
      'привіт': 'Привіт! Я працюю в офлайн-режимі, але готовий допомагати. 👋',
      'як справи': 'У мене все чудово! Як я можу вам допомогти? 😊',
      'дякую': 'Будь ласка! Звертайтеся ще. ✨',
      'час': `Зараз ${new Date().toLocaleTimeString('uk-UA')}. 🕒`
    };
  
    for (const [key, val] of Object.entries(responses)) {
      if (lower.includes(key)) return val;
    }
    return 'Отримав ваше повідомлення! Наразі я в офлайн-режимі (API Google недоступне). 📝';
  },

  // Генерація відповіді через Google Gemini
  generateResponse: async (message, history) => {
    try {
      const now = new Date();
      const systemTimeInfo = `Current real-world time: ${now.toLocaleString('uk-UA')}`;
      
      // Формуємо промпт для Ollama (оптимізовано для Llama 3)
      const contextStr = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a helpful AI assistant. You must always answer in Ukrainian, unless the user explicitly asks for another language. ${systemTimeInfo}.
Use the following conversation history for context:
${contextStr}<|eot_id|><|start_header_id|>user<|end_header_id|>

${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;
      
      // Запит до локальної Ollama
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Ollama connection error: ${response.statusText}`);
      const data = await response.json();
      
      return { text: data.response, mode: 'local-ollama' };
    } catch (err) {
      console.error('❌ OLLAMA ERROR:', err.message);
      const errorMsg = `⚠️ [LOCAL AI ERROR]: Не можу підключитися до Ollama. Переконайтеся, що програма запущена.`;
      const offlineMsg = AiService.getOfflineResponse(message);
      return { text: `${errorMsg}\n\n${offlineMsg}`, mode: 'offline' };
    }
  }
};

// --- API МАРШРУТИ (ROUTES) ---
// Це "двері", через які фронтенд спілкується з бекендом

// 1. Перевірка статусу сервера
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
    serverTime: Utils.getTimestamp() 
  });
});

// 2. Отримання історії чату
app.get('/api/chat-history', (req, res) => {
  res.json({ history: Utils.loadJson(FILES.HISTORY) });
});

// 3. Основний чат (обробка повідомлень)
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Повідомлення обов’язкове' });

  // Завантажуємо останні 15 повідомлень для контексту
  let history = Utils.loadJson(FILES.HISTORY).slice(-15);
  
  // КРОК 1: Перевіряємо, чи це запит про події (ліки, лікарі)
  const eventAnswer = EventService.tryAnswerQuery(message);
  if (eventAnswer) {
    const aiMsg = { role: 'assistant', content: eventAnswer, timestamp: Utils.getTimestamp() };
    const newHistory = [...history, { role: 'user', content: message, timestamp: Utils.getTimestamp() }, aiMsg];
    Utils.saveJson(FILES.HISTORY, newHistory);
    return res.json({ response: eventAnswer, mode: 'memory' });
  }

  // КРОК 2: Якщо це не подія, запитуємо AI
  const { text, mode } = await AiService.generateResponse(message, history);
  
  const updatedHistory = [
    ...history, 
    { role: 'user', content: message, timestamp: Utils.getTimestamp() },
    { role: 'assistant', content: text, timestamp: Utils.getTimestamp() }
  ];
  Utils.saveJson(FILES.HISTORY, updatedHistory);
  
  res.json({ response: text, mode });
});

// 4. Запис події (наприклад, з мобільного додатку)
app.post('/api/event', (req, res) => {
  const { type, content, metadata } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'Type and content required' });
  const event = EventService.record(type, content, metadata);
  res.json({ success: true, event });
});

// 5. Отримання списку подій
app.get('/api/events/:type', (req, res) => {
  res.json({ events: EventService.get(req.params.type) });
});

// Запуск сервера
app.listen(PORT, () => {
  // Функція для пошуку IP адреси комп'ютера в мережі
  const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  };

  console.log(`✅ AI Assistant Backend запущено!`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
  console.log(`📱 Network: http://${getLocalIp()}:${PORT} (використовуйте цей IP у chatService.js)`);
  console.log(`🦙 Local Ollama Mode: Active`);
});
