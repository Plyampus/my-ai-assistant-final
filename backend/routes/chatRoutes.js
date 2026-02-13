// 3. Основний чат (обробка повідомлень)

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message)
    return res.status(400).json({ error: "Повідомлення обов’язкове" });

  // Завантажуємо останні 15 повідомлень для контексту
  let history = Utils.loadJson(FILES.HISTORY).slice(-15);

  // КРОК 1: Перевіряємо, чи це запит про події (ліки, лікарі)
  const eventAnswer = EventService.tryAnswerQuery(message);
  if (eventAnswer) {
    const aiMsg = {
      role: "assistant",
      content: eventAnswer,
      timestamp: Utils.getTimestamp(),
    };
    const newHistory = [
      ...history,
      { role: "user", content: message, timestamp: Utils.getTimestamp() },
      aiMsg,
    ];
    Utils.saveJson(FILES.HISTORY, newHistory);
    return res.json({ response: eventAnswer, mode: "memory" });
  }

  // КРОК 2: Якщо це не подія, запитуємо AI
  const { text, mode } = await AiService.generateResponse(message, history);

  const updatedHistory = [
    ...history,
    { role: "user", content: message, timestamp: Utils.getTimestamp() },
    { role: "assistant", content: text, timestamp: Utils.getTimestamp() },
  ];
  Utils.saveJson(FILES.HISTORY, updatedHistory);

  res.json({ response: text, mode });
});