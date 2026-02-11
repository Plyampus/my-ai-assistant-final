const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Google API
const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Data files
const DATA_DIR = path.join(__dirname, '../data');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// --- Вспомогательные функции для данных ---
function loadJson(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Помилка читання ${filePath}:`, err.message);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Помилка запису ${filePath}:`, err.message);
  }
}

// --- Логика событий (витамины, врачи и т.д.) ---
function recordEvent(type, content, metadata = {}) {
  const events = loadJson(EVENTS_FILE, {});
  if (!events[type]) events[type] = [];
  
  const event = { 
    id: uuidv4(), 
    type, 
    content, 
    metadata, 
    timestamp: getCurrentTimestamp() 
  };
  
  events[type].push(event);
  saveJson(EVENTS_FILE, events);
  return event;
}

function tryAnswerEventQuery(message) {
  const lower = message.toLowerCase();
  const events = loadJson(EVENTS_FILE, {});

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

// --- Офлайн-ответы (заглушки) ---
function getOfflineResponse(message) {
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
}

// --- API Эндпоинты ---

// Статус сервера
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
    serverTime: getCurrentTimestamp() 
  });
});

// История чата
app.get('/api/chat-history', (req, res) => {
  res.json({ history: loadJson(CHAT_HISTORY_FILE) });
});

// Основной чат
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Повідомлення обов’язкове' });

  let history = loadJson(CHAT_HISTORY_FILE).slice(-15); // Ограничиваем контекст для скорости
  
  // 1. Проверяем локальные события
  const eventAnswer = tryAnswerEventQuery(message);
  if (eventAnswer) {
    const aiMsg = { role: 'assistant', content: eventAnswer, timestamp: getCurrentTimestamp() };
    const newHistory = [...history, { role: 'user', content: message, timestamp: getCurrentTimestamp() }, aiMsg];
    saveJson(CHAT_HISTORY_FILE, newHistory);
    return res.json({ response: eventAnswer, mode: 'memory' });
  }

  // 2. Пробуем Google AI
  try {
    const now = new Date();
    const systemTimeInfo = `Current real-world time: ${now.toLocaleString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })}`;
    const prompt = `System: You are a helpful AI assistant. ${systemTimeInfo}. Context: ${JSON.stringify(history)}\nUser: ${message}\nAssistant:`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const updatedHistory = [
      ...history, 
      { role: 'user', content: message, timestamp: getCurrentTimestamp() },
      { role: 'assistant', content: text, timestamp: getCurrentTimestamp() }
    ];
    saveJson(CHAT_HISTORY_FILE, updatedHistory);
    
    res.json({ response: text, mode: 'api' });
  } catch (err) {
    console.error('API Error:', err.message);
    const fallback = getOfflineResponse(message);
    res.json({ response: fallback, mode: 'offline' });
  }
});

app.post('/api/event', (req, res) => {
  const { type, content, metadata } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'Type and content required' });
  const event = recordEvent(type, content, metadata);
  res.json({ success: true, event });
});

app.get('/api/events/:type', (req, res) => {
  res.json({ events: getEvents(req.params.type) });
});

app.listen(PORT, () => {
  console.log(`✅ AI Assistant Backend на http://localhost:${PORT}`);
  console.log(`🔑 Google API: ${process.env.GOOGLE_API_KEY ? '✓' : '✗'}`);
});
