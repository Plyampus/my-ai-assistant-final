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
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

function loadChatHistory() {
  if (fs.existsSync(CHAT_HISTORY_FILE)) {
    return JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
  }
  return [];
}

function saveChatHistory(history) {
  fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function loadEvents() {
  if (fs.existsSync(EVENTS_FILE)) {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  }
  return {};
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

function recordEvent(type, content, metadata = {}) {
  const events = loadEvents();
  if (!events[type]) events[type] = [];
  const event = { id: uuidv4(), type, content, metadata, timestamp: getCurrentTimestamp() };
  events[type].push(event);
  saveEvents(events);
  return event;
}

function getEvents(type) {
  const events = loadEvents();
  return events[type] || [];
}

function tryAnswerEventQuery(message) {
  const lower = message.toLowerCase();
  if (lower.includes('вітамін') || lower.includes('витамин')) {
    const vitamins = getEvents('vitamin');
    if (vitamins.length > 0) {
      return `Ви приймаєте вітаміни: ${vitamins[vitamins.length - 1].content}`;
    }
  }
  if (lower.includes('лікар') || lower.includes('врач')) {
    const doctors = getEvents('doctor');
    if (doctors.length > 0) {
      return `Останній візит: ${doctors[doctors.length - 1].content}`;
    }
  }
  return null;
}

function getOfflineResponse(message) {
  const lower = message.toLowerCase();
  if (lower.includes('привіт')) return 'Привіт! 👋';
  if (lower.includes('як дела')) return 'Спасибі, добре! 😊';
  if (lower.includes('час')) return `Час: ${getCurrentTimestamp()}`;
  return 'Спасибі за повідомлення! 📝';
}

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!process.env.GOOGLE_API_KEY, timestamp: getCurrentTimestamp() });
});

app.get('/api/chat-history', (req, res) => {
  res.json({ history: loadChatHistory() });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let history = loadChatHistory().slice(-20);
    
    const eventAnswer = tryAnswerEventQuery(message);
    if (eventAnswer) {
      history.push({ role: 'user', content: message, timestamp: getCurrentTimestamp() });
      history.push({ role: 'assistant', content: eventAnswer, timestamp: getCurrentTimestamp() });
      saveChatHistory(history);
      return res.json({ response: eventAnswer, history, mode: 'event' });
    }

    try {
      const systemPrompt = `You are a helpful AI assistant. Time: ${getCurrentTimestamp()}`;
      let fullPrompt = systemPrompt + '\n';
      history.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullPrompt += `User: ${message}\nAssistant:`;

      const result = await model.generateContent(fullPrompt);
      const assistantMessage = result.response.text();
      
      history.push({ role: 'user', content: message, timestamp: getCurrentTimestamp() });
      history.push({ role: 'assistant', content: assistantMessage, timestamp: getCurrentTimestamp() });
      saveChatHistory(history);
      
      return res.json({ response: assistantMessage, history, mode: 'api' });
    } catch (apiError) {
      console.warn('API Error, using offline mode:', apiError.message);
      const offlineResponse = getOfflineResponse(message);
      
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: offlineResponse });
      saveChatHistory(history);
      
      return res.json({ response: offlineResponse, history, mode: 'offline', warning: 'API unavailable' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
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
