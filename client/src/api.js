const BASE = "/api/expenses";

async function request(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Something went wrong");
  }
  return res.status === 204 ? null : res.json();
}

export const getExpenses = () => request(BASE);
export const addExpense = (data) =>
  request(BASE, { method: "POST", body: JSON.stringify(data) });
export const updateExpense = (id, data) =>
  request(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteExpense = (id) => request(`${BASE}/${id}`, { method: "DELETE" });
