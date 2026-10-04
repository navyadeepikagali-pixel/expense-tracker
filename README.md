# Expense Tracker (React + Node)

## Run it
Requires Node.js 18+.

```bash
npm install            # installs root tools (concurrently and Electron)
npm run install:all    # installs server + client dependencies
npm run dev            # starts API and React app
```

If port 5000 is already in use, run the app with a different API port before starting it:

```bash
set PORT=5001 && npm run dev
```

Open http://localhost:5173

## Use it as an app

The dashboard includes saved expenses and a review basket for comparing a
shortlist of recorded expenses. Saved expenses stay in the current browser;
the review basket is temporary and does not modify expense records.

### Installable website (PWA)

Build and serve the client over HTTPS (or `localhost`):

```bash
npm run dev --prefix server
npm run build --prefix client
npm run preview --prefix client
```

Run the server command in a separate terminal. Then open the preview URL in a
supported browser and choose **Install app** from the browser menu. The app
shell and previously loaded assets are cached for offline startup; expense
data still requires the API server.

### Windows desktop app

Install the dependencies with `npm run install:all`, then run the desktop
version during development with:

```bash
npm run desktop:dev
```

Create a Windows installer with:

```bash
npm run desktop:build
```

The installer is written to `release/` and uses the generated Expense Tracker
Windows icon. Desktop expense data is stored in the user's application data
folder and is separate from `server/expenses.json`.

## Structure
- `server/` Express REST API, data saved in `server/expenses.json`
- `client/` React app (Vite), proxies `/api` to the server
- `desktop/` Electron app wrapper

## API
| Method | Route | Purpose |
|---|---|---|
| GET | /api/expenses?category=Food | List (optional filter) |
| POST | /api/expenses | Add |
| PUT | /api/expenses/:id | Update |
| DELETE | /api/expenses/:id | Delete |
