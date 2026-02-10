'use client';

import { useEffect, useRef } from 'react';

export default function ChatWindow({ history, loading }) {
  const bottomRef = useRef(null);

  // Прокрутити до низу при новому повідомленні
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {history.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2">👋 Welcome!</p>
            <p>Start a conversation with your AI assistant</p>
          </div>
        </div>
      ) : (
        history.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-100 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))
      )}
      
      {loading && (
        <div className="flex justify-start">
          <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg rounded-bl-none">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
