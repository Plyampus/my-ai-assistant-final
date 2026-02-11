"use client";

import { useState, useEffect, useRef } from "react";
import ChatService from "./chatService";

export default function ChatPage() {
  // --- СТАН (STATE) ---
  // Це "пам'ять" компонента. Коли ці змінні змінюються, React оновлює екран.
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const historyEndRef = useRef(null);

  // --- ЕФЕКТИ (EFFECTS) ---
  // useEffect виконує код після того, як React оновив екран.

  // 1. Авто-скрол вниз при додаванні нового повідомлення
  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  // 2. Завантаження історії чату при першому відкритті сторінки
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await ChatService.getHistory();
        setHistory(data);
      } catch (err) {
        console.error("Помилка завантаження історії:", err);
      }
    };
    fetchHistory();
  }, []);

  // --- ОБРОБНИКИ ПОДІЙ (HANDLERS) ---
  // Функція, яка викликається при натисканні Enter або кнопки Send
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await ChatService.sendMessage(input);
      const aiMsg = {
        role: "assistant",
        content: data.response,
        mode: data.mode, // 'api', 'memory' або 'offline'
      };
      setHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Помилка відправки:", err);
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Помилка зв’язку з сервером. Перевірте, чи бекенд працює.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // --- ВІДОБРАЖЕННЯ (RENDER) ---
  // Те, що бачить користувач (HTML + дані)
  return (
    <div className="chat-container">
      <header className="chat-header">🤖 AI Assistant</header>

      <main className="chat-history">
        {history.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#888", marginTop: "20px" }}
          >
            Почніть чат першим повідомленням!
          </div>
        ) : (
          history.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              {msg.mode === "offline" && (
                <small style={{ opacity: 0.5 }}> (offline mode)</small>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="loading assistant">
            <span></span>
            <span></span>
            <span></span>
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
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
