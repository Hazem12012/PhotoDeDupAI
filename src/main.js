import { app, BrowserWindow, ipcMain, dialog } from "electron";
import started from "electron-squirrel-startup";
import path from "path";
import fs from "fs";

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    // frame: false,
  });

  mainWindow.once("ready-to-show", mainWindow.show);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.webContents.openDevTools();
};

// --- NEW HANDLER: Opens the native folder selection dialog ---
ipcMain.handle("dialog:select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"], // Only allow selecting directories
    title: "Select Folder Containing Images",
  });
  // Returns { canceled: boolean, filePaths: string[] }
  return result;
});

// --- EXISTING HANDLER: Reads image files from the selected path ---
ipcMain.handle("load-images-from-path", async (event, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    return {
      success: true,
      imagePaths: imageFiles.map((file) => path.join(folderPath, file)),
    };
  } catch (error) {
    console.error("Failed to read folder:", error.message);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


