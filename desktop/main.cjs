const { app, BrowserWindow, dialog } = require("electron");
const net = require("node:net");
const path = require("node:path");

let apiServer;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function startApp() {
  if (!app.isPackaged) {
    const window = new BrowserWindow({
      width: 1120,
      height: 820,
      minWidth: 720,
      minHeight: 600,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    await window.loadURL("http://localhost:5173");
    return;
  }

  const port = await findAvailablePort();
  const frontendDir = path.join(__dirname, "..", "client", "dist");
  process.env.PORT = String(port);
  process.env.EXPENSES_FILE = path.join(app.getPath("userData"), "expenses.json");
  process.env.FRONTEND_DIST = frontendDir;

  const serverApp = require("../server/index.js");
  apiServer = serverApp.listen(port, "127.0.0.1");
  apiServer.once("error", (error) => {
    dialog.showErrorBox("Expense Tracker could not start", error.message);
    app.quit();
  });

  const window = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 720,
    minHeight: 600,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  await window.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(startApp).catch((error) => {
  dialog.showErrorBox("Expense Tracker could not start", error.message);
  app.quit();
});

app.on("before-quit", () => {
  if (apiServer) apiServer.close();
});
