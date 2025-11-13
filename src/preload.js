

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // Expose function to open the native folder dialog
  selectFolder: () => ipcRenderer.invoke("dialog:select-folder"),

  // Expose function to tell the main process to load images from a given path
  loadImages: (path) => ipcRenderer.invoke("load-images-from-path", path),
  readImageFile: (imagePath) =>
    ipcRenderer.invoke("read-image-file", imagePath), // 👈 new line
});