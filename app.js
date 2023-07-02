const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;
const key = {
  key:'01d21k32j13j12k231l31'
}

// Middleware для обработки входящих запросов
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Middleware для включения Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Создаем подключение к базе данных SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the database.");
});

// Создаем таблицы 'artists' и 'performances', если они еще не существуют
db.serialize(() => {
  db.run(`
      CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        genre TEXT,
        popularity INTEGER,
        photo_url TEXT
      )
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS performances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_id INTEGER,
        title TEXT,
        location TEXT,
        date TEXT,
        photo_url TEXT,
        FOREIGN KEY(artist_id) REFERENCES artists(id)
      )
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )
    `);
});

// Получаем всех артистов
app.get("/artists", (req, res) => {
  const sql = "SELECT * FROM artists";

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    res.json(rows);
  });
});

// Получаем артиста по ID
app.get("/artists/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM artists WHERE id = ?";

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    if (!row) {
      return res.status(404).json({ error: "Артист не найден" });
    }

    // Получаем выступления по ID артиста
    const performancesSql = "SELECT * FROM performances WHERE artist_id = ?";
    db.all(performancesSql, [id], (err, performances) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
      row.performances = performances;
      res.json(row);
    });
  });
});

// Получаем артиста по имени
app.get("/artists/name/:name", (req, res) => {
  const { name } = req.params;
  const sql = "SELECT * FROM artists WHERE name = ?";

  db.get(sql, [name], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    if (!row) {
      return res.status(404).json({ error: "Артист не найден" });
    }

    // Получаем выступления по ID артиста
    const performancesSql = "SELECT * FROM performances WHERE artist_id = ?";
    db.all(performancesSql, [row.id], (err, performances) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
      row.performances = performances;
      res.json(row);
    });
  });
});

// Добавляем нового артиста
app.post("/artists", (req, res) => {
  const { name, genre, popularity, photo_url } = req.body;

  if (!name || !genre || !popularity) {
    return res
      .status(400)
      .json({ error: "Пожалуйста, укажите имя, жанр и популярность" });
  }

  const sql =
    "INSERT INTO artists (name, genre, popularity, photo_url) VALUES (?, ?, ?, ?)";
  db.run(sql, [name, genre, popularity, photo_url], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    // возвращаем только что созданный объект артиста
    const artist = {
      id: this.lastID,
      name,
      genre,
      popularity,
      photo_url,
    };
    res.status(201).json(artist);
  });
});

// Добавляем новое выступление для артиста по ID
app.post("/artists/:id/performances", (req, res) => {
  const { id } = req.params;
  const { title, location, date, photo_url } = req.body;

  if (!title || !location || !date) {
    return res
      .status(400)
      .json({ error: "Пожалуйста, укажите название,место проведения и дату" });
  }
  // проверяем, существует ли артист с указанным ID
  const artistSql = "SELECT * FROM artists WHERE id = ?";
  db.get(artistSql, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    if (!row) {
      return res.status(404).json({ error: "Артист не найден" });
    }
    const sql =
      "INSERT INTO performances (artist_id, title, location, date, photo_url) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [id, title, location, date, photo_url], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Ошибка сервера" });
      }

      const performance = {
        id: this.lastID,
        artist_id: id,
        title,
        location,
        date,
        photo_url,
      };
      res.status(201).json(performance);
    });
  });
});

// Удаление артиста по ID
app.delete("/artists/:id", (req, res) => {
  const { id } = req.params;

  // Удаляем всех выступления артиста с указанным ID
  const deletePerformancesSql = "DELETE FROM performances WHERE artist_id = ?";
  db.run(deletePerformancesSql, [id], (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }

    // Удаляем артиста с указанным ID
    const deleteArtistSql = "DELETE FROM artists WHERE id = ?";
    db.run(deleteArtistSql, [id], (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
      res.json({ message: "Артист успешно удален" });
    });
  });
});

// Удаление выступления по ID артиста и ID гастроли
app.delete("/artists/:artistId/performances/:performanceId", (req, res) => {
  const { artistId, performanceId } = req.params;

  // Проверяем, существует ли артист с указанным ID
  const artistSql = "SELECT * FROM artists WHERE id = ?";
  db.get(artistSql, [artistId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    if (!row) {
      return res.status(404).json({ error: "Артист не найден" });
    }

    // Удаляем выступление с указанным ID и ID артиста
    const deletePerformanceSql =
      "DELETE FROM performances WHERE id = ? AND artist_id = ?";
    db.run(deletePerformanceSql, [performanceId, artistId], (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
      res.json({ message: "Выступление успешно удалено" });
    });
  });
});

//registration
app.post("/users", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Пожалуйста, укажите имя пользователя и пароль" });
  }

  const checkUserSql = "SELECT * FROM users WHERE username = ?";
  db.get(checkUserSql, [username], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    if (row) {
      return res
        .status(409)
        .json({ error: "Такой пользователь уже существует" });
    }
    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    db.run(sql, [username, password], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
      const user = {
        id: this.lastID,
        username,
        password,
        key: key.key
      };
      res.status(201).json(user);
    });
  });
});
//login
app.post("/users/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.get(sql, [username, password], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
    if (!row) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }
    row.key = key.key
    res.json(row);
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
