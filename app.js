const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

// Initialize Database and Server
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY,
        todo TEXT,
        priority TEXT,
        status TEXT
      );
    `);

    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// Utility function
const convertDbObjToResponseObj = (obj) => ({
  id: obj.id,
  todo: obj.todo,
  priority: obj.priority,
  status: obj.status,
});

// API 1: Get todos with filters
app.get("/todos/", async (req, res) => {
  const { status, priority, search_q = "" } = req.query;

  let query = "SELECT * FROM todo WHERE 1=1";
  const params = [];

  if (status !== undefined) {
    query += " AND status = ?";
    params.push(status);
  }

  if (priority !== undefined) {
    query += " AND priority = ?";
    params.push(priority);
  }

  if (search_q !== "") {
    query += " AND todo LIKE ?";
    params.push(`%${search_q}%`);
  }

  const todos = await db.all(query, params);
  res.send(todos.map(convertDbObjToResponseObj));
});

// API 2: Get todo by ID
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const todo = await db.get("SELECT * FROM todo WHERE id = ?", [todoId]);
  res.send(convertDbObjToResponseObj(todo));
});

// API 3: Add todo
app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status } = req.body;
  await db.run(
    "INSERT INTO todo (id, todo, priority, status) VALUES (?, ?, ?, ?)",
    [id, todo, priority, status]
  );
  res.send("Todo Successfully Added");
});

// API 4: Update todo
app.put("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const { status, priority, todo } = req.body;

  let updateColumn = "";
  let updateValue = "";

  if (status !== undefined) {
    updateColumn = "status";
    updateValue = status;
  } else if (priority !== undefined) {
    updateColumn = "priority";
    updateValue = priority;
  } else if (todo !== undefined) {
    updateColumn = "todo";
    updateValue = todo;
  }

  await db.run(`UPDATE todo SET ${updateColumn} = ? WHERE id = ?`, [
    updateValue,
    todoId,
  ]);

  res.send(
    updateColumn.charAt(0).toUpperCase() +
      updateColumn.slice(1) +
      " Updated"
  );
});

// API 5: Delete todo
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  await db.run("DELETE FROM todo WHERE id = ?", [todoId]);
  res.send("Todo Deleted");
});

module.exports = app; // Default export
