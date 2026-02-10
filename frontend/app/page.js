'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ChatPage() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyEndRef = useRef(null);

  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chat-history`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setHistory([...history, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: input,
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.response || 'Empty response.',
      };
      setHistory((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Connection error. Check if backend is running.',
      };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">🤖 AI Assistant</div>

      <div className="chat-history">
        {history.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="loading">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={historyEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Write message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
