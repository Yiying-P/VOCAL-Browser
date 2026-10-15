const { app, BrowserWindow, ipcMain, shell, dialog, DownloadItem } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let bookmarks = [];
let downloads = [];

// 数据文件路径
const dataPath = path.join(app.getPath('userData'), 'browser-data.json');

// 加载书签
function loadBookmarks() {
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      bookmarks = data.bookmarks || [];
    } else {
      // 默认书签
      bookmarks = [
        { title: '洛天依官网', url: 'https://www.luotianyi.fyi/', icon: '🎤' },
        { title: 'Vsinger', url: 'https://www.vsinger.com/', icon: '🎵' },
        { title: '百度搜索', url: 'https://www.baidu.com/', icon: '🔍' },
        { title: '哔哩哔哩', url: 'https://www.bilibili.com/', icon: '📺' }
      ];
      saveData();
    }
  } catch (e) {
    console.error('Failed to load bookmarks:', e);
    bookmarks = [];
  }
}

// 保存数据
function saveData() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify({ bookmarks }, null, 2));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'VOCAL-Browser',
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#66ccff',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 外链用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: 获取书签
ipcMain.handle('get-bookmarks', () => {
  return bookmarks;
});

// IPC: 添加书签
ipcMain.handle('add-bookmark', (event, bookmark) => {
  bookmarks.push(bookmark);
  saveData();
  return bookmarks;
});

// IPC: 删除书签
ipcMain.handle('remove-bookmark', (event, url) => {
  bookmarks = bookmarks.filter(b => b.url !== url);
  saveData();
  return bookmarks;
});

// IPC: 下载管理
ipcMain.handle('show-save-dialog', async (event, item) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath: item.filename || 'download'
  });
  if (!canceled && filePath) {
    return { filePath };
  }
  return { canceled: true };
});

// 下载事件
app.on('will-download', (event, item, webContents) => {
  const downloadInfo = {
    id: Date.now(),
    filename: item.getFilename(),
    totalBytes: item.getTotalBytes(),
    receivedBytes: 0,
    state: 'progressing',
    savePath: item.getSavePath()
  };
  downloads.push(downloadInfo);

  item.on('updated', (e, state) => {
    downloadInfo.receivedBytes = item.getReceivedBytes();
    downloadInfo.state = item.isPaused() ? 'paused' : state;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', downloadInfo);
    }
  });

  item.once('done', (e, state) => {
    downloadInfo.state = state;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-done', downloadInfo);
    }
  });
});

app.whenReady().then(() => {
  loadBookmarks();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
