// --- УТИЛІТИ (ДОПОМІЖНІ ФУНКЦІЇ) ---`
// Цей об'єкт містить функції, які допомагають читати/писати файли

const Utils = {
  // Отримати поточний час у форматі ISO
  getTimestamp: () => new Date().toISOString(),

  // Безпечне читання JSON файлу
  loadJson: (filePath, defaultValue = []) => {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (err) {
      console.error(`Помилка читання ${filePath}:`, err.message);
    }
    return defaultValue;
  },

  // Безпечний запис у JSON файл
  saveJson: (filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error(`Помилка запису ${filePath}:`, err.message);
    }
  },
};