const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark: (bookmark) => ipcRenderer.invoke('add-bookmark', bookmark),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (e, data) => callback(data)),
  onDownloadDone: (callback) => ipcRenderer.on('download-done', (e, data) => callback(data)),
  showSaveDialog: (item) => ipcRenderer.invoke('show-save-dialog', item)
});
