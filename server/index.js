const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = process.env.EXPENSES_FILE || path.join(__dirname, "expenses.json");

app.use(cors());
app.use(express.json());

const readData = () => {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeCategory = (value) => {
  const category = typeof value === "string" ? value.trim() : value;
  return category || "Other";
};

const writeData = (data) => {
  const directory = path.dirname(DB_FILE);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const validate = (payload = {}) => {
  const { title, amount } = payload;
  const trimmedTitle = typeof title === "string" ? title.trim() : String(title ?? "").trim();

  if (!trimmedTitle) return "Title is required";
  if (
    typeof amount === "boolean" ||
    amount === undefined ||
    amount === null ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  )
    return "Amount must be a number greater than 0";
  return null;
};

// List expenses (optional ?category=Food), newest first
app.get("/api/expenses", (req, res) => {
  let expenses = readData();
  if (req.query.category) {
    expenses = expenses.filter((e) => e.category === req.query.category);
  }
  expenses.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  res.json(expenses);
});

// Add
app.post("/api/expenses", (req, res) => {
  const payload = req.body || {};
  const error = validate(payload);
  if (error) return res.status(400).json({ error });
  const { title, amount, category, date } = payload;
  const expenses = readData();
  const expense = {
    id: Date.now().toString(),
    title: String(title).trim(),
    amount: Number(amount),
    category: normalizeCategory(category),
    date: String(date || new Date().toISOString().slice(0, 10)).trim() || new Date().toISOString().slice(0, 10),
  };
  expenses.push(expense);
  writeData(expenses);
  res.status(201).json(expense);
});

// Update
app.put("/api/expenses/:id", (req, res) => {
  const expenses = readData();
  const i = expenses.findIndex((e) => e.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Expense not found" });
  const merged = { ...expenses[i], ...(req.body || {}), id: req.params.id };
  const error = validate(merged);
  if (error) return res.status(400).json({ error });
  merged.title = String(merged.title).trim();
  merged.category = normalizeCategory(merged.category);
  merged.date = String(merged.date || expenses[i].date).trim() || expenses[i].date;
  merged.amount = Number(merged.amount);
  expenses[i] = merged;
  writeData(expenses);
  res.json(merged);
});

// Delete
app.delete("/api/expenses/:id", (req, res) => {
  const expenses = readData();
  const rest = expenses.filter((e) => e.id !== req.params.id);
  if (rest.length === expenses.length)
    return res.status(404).json({ error: "Expense not found" });
  writeData(rest);
  res.status(204).end();
});

if (process.env.FRONTEND_DIST) {
  const frontendDir = path.resolve(process.env.FRONTEND_DIST);
  app.use(express.static(frontendDir));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.sendStatus(404);
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

if (require.main === module) {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
