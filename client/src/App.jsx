import { useEffect, useMemo, useState } from "react";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "./api";

const CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Health", "Other"];
const COLORS = {
  Food: "#1f6f78",
  Transport: "#3d5a9e",
  Bills: "#8a5a9e",
  Shopping: "#c2793a",
  Health: "#4f8f55",
  Other: "#7b8a8d",
};
const emojis = {
  Food: "🛒",
  Transport: "🚕",
  Bills: "🧾",
  Shopping: "🛍️",
  Health: "💊",
  Other: "💡",
};
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { title: "", amount: "", category: "Food", date: today() };
const money = (n) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("expense-favorites") || "[]");
      return Array.isArray(saved) ? saved.map(String) : [];
    } catch {
      return [];
    }
  });
  const [showFavorites, setShowFavorites] = useState(false);
  const [reviewIds, setReviewIds] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem("expense-favorites", JSON.stringify(favorites));
    } catch {
      setError("Favorites could not be saved in this browser.");
    }
  }, [favorites]);

  useEffect(() => {
    getExpenses()
      .then(setExpenses)
      .catch(() => setError("Can't reach the server. Start it with: npm run dev"))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const matchesCategory = selectedCategory === "All" || expense.category === selectedCategory;
      const matchesQuery = `${expense.title} ${expense.category}`.toLowerCase().includes(query.toLowerCase());
      const matchesFavorites = !showFavorites || favorites.includes(String(expense.id));
      return matchesCategory && matchesQuery && matchesFavorites;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "low") return a.amount - b.amount;
      if (sortBy === "high") return b.amount - a.amount;
      if (sortBy === "oldest") return new Date(a.date) - new Date(b.date);
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }, [expenses, favorites, query, selectedCategory, showFavorites, sortBy]);

  const total = visible.reduce((sum, expense) => sum + expense.amount, 0);
  const reviewExpenses = expenses.filter((expense) => reviewIds.includes(String(expense.id)));
  const reviewTotal = reviewExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyBudget = 30000;
  const budgetLeft = monthlyBudget - total;
  const biggest = visible.reduce((largest, current) => (current.amount > largest.amount ? current : largest), { amount: 0, title: "No items" });

  const byCategory = useMemo(() => {
    const totals = {};
    expenses.forEach((expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const maxCat = byCategory[0]?.[1] || 1;

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (editingId) {
        const saved = await updateExpense(editingId, form);
        setExpenses((prev) => prev.map((x) => (x.id === editingId ? saved : x)));
      } else {
        const saved = await addExpense(form);
        setExpenses((prev) => [saved, ...prev]);
      }
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, amount: item.amount, category: item.category, date: item.date });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleFavorite(id) {
    const key = String(id);
    setFavorites((current) =>
      current.includes(key) ? current.filter((favorite) => favorite !== key) : [...current, key],
    );
  }

  function toggleReview(id) {
    const key = String(id);
    setReviewIds((current) =>
      current.includes(key) ? current.filter((reviewId) => reviewId !== key) : [...current, key],
    );
  }

  async function remove(id) {
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((x) => x.id !== id));
      setFavorites((prev) => prev.filter((favorite) => favorite !== String(id)));
      setReviewIds((prev) => prev.filter((reviewId) => reviewId !== String(id)));
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="marketplace">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">E</div>
          <div>
            <p className="brand-name">Expense Tracker</p>
            <p className="brand-sub">Smart spending dashboard</p>
          </div>
        </div>

        <label className="search-box">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search expense, category or title"
          />
        </label>

        <div className="top-actions">
          <button
            className={showFavorites ? "saved-toggle active" : "saved-toggle"}
            aria-pressed={showFavorites}
            onClick={() => setShowFavorites((current) => !current)}
          >
            <span aria-hidden="true">♡</span> Saved <span className="action-count">{favorites.length}</span>
          </button>
          <button className="cart-btn" onClick={() => setReviewOpen(true)}>
            <span aria-hidden="true">▣</span> Review <span className="action-count">{reviewIds.length}</span>
          </button>
        </div>
      </header>

      <nav className="category-strip" aria-label="Expense categories">
        {["All", ...CATEGORIES].map((category) => (
          <button
            key={category}
            className={selectedCategory === category ? "cat-chip active" : "cat-chip"}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-badge">Monthly overview</span>
          <h1>Track every rupee with clarity.</h1>
          <p>
            Monitor spending, compare categories, and keep your budget in control across every part of your life.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => document.getElementById("expense-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Add expense</button>
            <button className="secondary-btn" onClick={() => setSelectedCategory("All")}>View all</button>
          </div>
        </div>

        <div className="hero-deals">
          <div className="deal-box">
            <span>Total spend</span>
            <strong>{money(total)}</strong>
            <small>{visible.length} entries</small>
          </div>
          <div className="deal-box accent">
            <span>Budget left</span>
            <strong>{money(Math.max(budgetLeft, 0))}</strong>
            <small>{budgetLeft >= 0 ? "On track" : "Over budget"}</small>
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div>
          <p className="toolbar-label">Showing</p>
          <h2>{showFavorites ? "Saved expenses" : "Expense marketplace"} <span className="expense-count">{visible.length}</span></h2>
        </div>

        <div className="toolbar-controls">
          <button
            className="review-trigger"
            onClick={() => setShowFavorites(false)}
            hidden={!showFavorites}
          >
            Show all expenses
          </button>
          <label>
            Sort by
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="low">Amount: low to high</option>
              <option value="high">Amount: high to low</option>
            </select>
          </label>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Monthly spend</span>
          <strong>{money(total)}</strong>
          <small>Across all categories</small>
        </div>
        <div className="stat-card">
          <span>Budget left</span>
          <strong>{money(Math.max(budgetLeft, 0))}</strong>
          <small>{budgetLeft < 0 ? `${money(Math.abs(budgetLeft))} over` : "Safe limit"}</small>
        </div>
        <div className="stat-card">
          <span>Biggest expense</span>
          <strong>{money(biggest.amount)}</strong>
          <small>{biggest.title}</small>
        </div>
        <div className="stat-card">
          <span>Top category</span>
          <strong>{byCategory[0]?.[0] || "N/A"}</strong>
          <small>{byCategory[0] ? money(byCategory[0][1]) : "No data"}</small>
        </div>
      </section>

      <section className="layout-two">
        <div className="panel">
          <div className="panel-head">
            <h3>Spend by category</h3>
          </div>
          <ul className="bars">
            {byCategory.length === 0 ? (
              <li className="empty-line">No spending data yet.</li>
            ) : (
              byCategory.map(([category, amount]) => (
                <li key={category}>
                  <div className="bar-label-row">
                    <span>{category}</span>
                    <strong>{money(amount)}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      className="bar-fill"
                      style={{ width: `${(amount / maxCat) * 100}%`, background: COLORS[category] || COLORS.Other }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="panel form-panel" id="expense-form">
          <div className="panel-head">
            <h3>{editingId ? "Edit expense" : "Add expense"}</h3>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <form className="form" onSubmit={submit}>
            <label>
              Title
              <input name="title" value={form.title} onChange={change} placeholder="Groceries" required />
            </label>
            <label>
              Amount
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={change} placeholder="0.00" required />
            </label>
            <label>
              Category
              <select name="category" value={form.category} onChange={change}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Date
              <input name="date" type="date" value={form.date} onChange={change} required />
            </label>
            <div className="actions">
              <button type="submit" className="primary-btn small">{editingId ? "Save changes" : "Add expense"}</button>
              {editingId && <button type="button" className="secondary-btn small" onClick={cancelEdit}>Cancel</button>}
            </div>
          </form>
        </div>
      </section>

      <section className="catalog">
        {loading ? (
          <div className="no-results">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="no-results">No expenses match your search. Try another keyword.</div>
        ) : (
          visible.map((expense) => (
            <article key={expense.id} className="product-card">
              <div className="image-wrap" data-tone={expense.category.toLowerCase()}>
                <span className="badge" style={{ color: COLORS[expense.category] || COLORS.Other }}>{expense.category}</span>
                <span className="product-emoji">{emojis[expense.category] || "💸"}</span>
                <button
                  className={favorites.includes(String(expense.id)) ? "favorite-btn active" : "favorite-btn"}
                  onClick={() => toggleFavorite(expense.id)}
                  aria-label={favorites.includes(String(expense.id)) ? `Remove ${expense.title} from saved expenses` : `Save ${expense.title}`}
                  aria-pressed={favorites.includes(String(expense.id))}
                >
                  {favorites.includes(String(expense.id)) ? "♥" : "♡"}
                </button>
              </div>

              <div className="card-content">
                <p className="brand-line">{expense.date}</p>
                <h3>{expense.title}</h3>
                <div className="rating-row">
                  <span className="star">•</span>
                  <strong>{expense.category}</strong>
                </div>

                <div className="price-row">
                  <span className="current-price">{money(expense.amount)}</span>
                  <span className="amount-caption">amount spent</span>
                </div>

                <div className="meta-row">
                  <span>Recorded</span>
                  <span>{expense.date}</span>
                </div>

                <div className="card-actions">
                  <button
                    className={reviewIds.includes(String(expense.id)) ? "mini-btn review-selected" : "mini-btn"}
                    onClick={() => toggleReview(expense.id)}
                    aria-pressed={reviewIds.includes(String(expense.id))}
                  >
                    {reviewIds.includes(String(expense.id)) ? "Added to review" : "＋ Review"}
                  </button>
                  <button className="mini-btn" onClick={() => startEdit(expense)}>Edit</button>
                  <button className="mini-btn danger" onClick={() => remove(expense.id)}>Delete</button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {reviewOpen && (
        <div className="review-backdrop">
          <section className="review-drawer" role="dialog" aria-modal="true" aria-labelledby="review-title">
            <div className="review-heading">
              <div>
                <p className="toolbar-label">Expense shortlist</p>
                <h2 id="review-title">Review basket <span className="expense-count">{reviewExpenses.length}</span></h2>
              </div>
              <button className="drawer-close" onClick={() => setReviewOpen(false)} aria-label="Close review basket">×</button>
            </div>
            <p className="review-description">Collect expenses to compare them together. This does not change your records.</p>
            {reviewExpenses.length === 0 ? (
              <div className="review-empty">Your review basket is empty. Add expenses using “＋ Review”.</div>
            ) : (
              <>
                <ul className="review-list">
                  {reviewExpenses.map((expense) => (
                    <li key={expense.id}>
                      <span className="review-icon">{emojis[expense.category] || "💸"}</span>
                      <span className="review-item-copy"><strong>{expense.title}</strong><small>{expense.category} · {expense.date}</small></span>
                      <strong>{money(expense.amount)}</strong>
                      <button onClick={() => toggleReview(expense.id)} aria-label={`Remove ${expense.title} from review basket`}>×</button>
                    </li>
                  ))}
                </ul>
                <div className="review-total"><span>Combined spend</span><strong>{money(reviewTotal)}</strong></div>
                <button className="secondary-btn clear-review" onClick={() => setReviewIds([])}>Clear shortlist</button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
