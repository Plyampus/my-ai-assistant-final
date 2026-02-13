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
      timestamp: Utils.getTimestamp(),
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

    if (lower.includes("вітамін") || lower.includes("витамин")) {
      const list = events.vitamin;
      return list?.length
        ? `Ви приймаєте вітаміни: ${list[list.length - 1].content}`
        : null;
    }

    if (lower.includes("лікар") || lower.includes("врач")) {
      const list = events.doctor;
      return list?.length
        ? `Останній запис про лікаря: ${list[list.length - 1].content}`
        : null;
    }

    return null;
  },
};
