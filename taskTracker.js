const Joi = require("joi");
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// ─── File paths ───────────────────────────────────────────────────────────────
const TASK_FILE = path.join(__dirname, "taskTracker.json");

// ─── Load persisted data ──────────────────────────────────────────────────────
const tasks = JSON.parse(fs.readFileSync(TASK_FILE, "utf-8"));

const taskSchema = {
  title: Joi.string().min(3).required(),
  isCompleted: Joi.boolean().default(false),
};

function validateTask(task) {
  return Joi.validate(task, taskSchema, { allowUnknown: false });
}
function findTask(id) {
  return tasks.find((t) => t.id === parseInt(id));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("Task Tracker API is running!");
});

// GET /api/tasks — optional ?status=pending|in progress|completed filter
app.get("/api/tasks", (req, res) => {
  res.send(tasks);
});

// POST /api/tasks
app.post("/api/tasks", (req, res) => {
  const { error } = validateTask(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const newTask = {
    id: UUID(),
    ...req.body,
  };
  tasks.push(newTask);
  fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
  res.status(201).send(newTask);
});

// DELETE /api/tasks/:id
app.delete("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).send("Task not found");
  }
  const index = tasks.indexOf(task);
  tasks.splice(index, 1);
  fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
  res.send(task);
});

// PUT /api/tasks/:id change isCompleted status
app.put("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).send("Task not found");
  }
  task.isCompleted = req.body.isCompleted !== undefined ? req.body.isCompleted : task.isCompleted;
  fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
  res.send(task);
});

app.listen(port, () => {
  console.log(`Task Tracker API is listening on port ${port}`);
});