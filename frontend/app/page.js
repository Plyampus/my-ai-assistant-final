'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Налаштування URL бекенду
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
console.log('🔗 Connecting to Backend at:', API_URL);

export default function ChatPage() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyEndRef = useRef(null);

  // Автоматична прокрутка до останнього повідомлення
  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  // Завантаження історії при старті
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chat-history`);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error('Помилка завантаження історії:', err);
      }
    };
    fetchHistory();
  }, []);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/chat`, { message: input });
      const aiMsg = { 
        role: 'assistant', 
        content: res.data.response,
        mode: res.data.mode // 'api', 'memory' або 'offline'
      };
      setHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Помилка відправки:', err);
      setHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Помилка зв’язку з сервером. Перевірте, чи бекенд працює.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        🤖 AI Assistant
      </header>

      <main className="chat-history">
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
            Почніть чат першим повідомленням!
          </div>
        ) : (
          history.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              {msg.mode === 'offline' && <small style={{ opacity: 0.5 }}> (offline mode)</small>}
            </div>
          ))
        )}
        {loading && (
          <div className="loading assistant">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={historyEndRef} />
      </main>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишіть повідомлення..."
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
