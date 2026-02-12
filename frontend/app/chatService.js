import axios from 'axios';

// Визначаємо адресу бекенду. Якщо ми на локальному комп'ютері - це localhost:5000
// 📱 ДЛЯ ТЕЛЕФОНУ: Замініть 'localhost' на вашу IP-адресу (знайдіть через ipconfig)
// Наприклад: 'http://192.168.0.105:5000'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.1:5000';

// Створюємо налаштований екземпляр axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Об'єкт, який містить всі функції для роботи з чатом
const ChatService = {
  // Отримати історію повідомлень
  getHistory: async () => {
    const res = await api.get('/api/chat-history');
    return res.data.history || [];
  },

  // Відправити нове повідомлення
  sendMessage: async (message) => {
    try {
      const res = await api.post('/api/chat', { message });
      return {
        response: res.data.response,
        mode: res.data.mode
      };
    } catch (error) {
      console.error('Connection Error:', error);
      return {
        response: `⚠️ Помилка з'єднання! Перевірте, чи запущено сервер на комп'ютері та чи правильна IP-адреса (${API_URL}). Можливо, блокує Windows Firewall.`,
        mode: 'offline'
      };
    }
  }
};

export default ChatService;