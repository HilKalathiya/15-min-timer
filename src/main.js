const { app, BrowserWindow, ipcMain, Tray, Menu, screen, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Create a simple tray icon programmatically
function createTrayImage() {
    // Create a 16x16 canvas-like image using nativeImage
    const size = 16;

    // Base64 encoded 16x16 PNG icon (rich purple-pink gradient clock)
    const iconData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABeklEQVQ4jY2TO04DQRBEX9eOYRciQATgAAQ+AhdYiQtwBC7AFbgAN6CloKGhoaChIaGBCIQISEC7s9ONBzQer22BpMh6ND1T/apGkviPqdHR0cXa2tp7kucA3ABwAH4A2CX5nOTLYrF4NTg4OJ5Op+PBYHAFYBvAOoAPST5L8hPAdwA/ST4CeEbysoqqLwCOAUwA7JB8BOAAvKuq6ng6nZ4kSW4lSbJH8gzAFsnzJIfz+XyL5BWANZLXJIdJbpZl+RbAA5JbJIdJXpBcI7mTZJvkWwDXkRypquoCwAXJHZJbJC+TXCCZJtkhuQPgkOQOgB2ShyQvSS6SHCZ5TnKW5CzJeZLz//UP+S/sAfT0+Q/hEFrRBQ8AdQAAAABJRU5ErkJggg==`;

    return nativeImage.createFromDataURL(iconData);
}

// Initialize store for settings
const store = new Store({
    defaults: {
        reminderInterval: 15, // minutes
        breakDuration: 5, // minutes
        quizToClose: true,
        soundEnabled: true,
        autoStart: false,
        theme: 'dark',
        breakMessages: [
            "Time to stand up! Give your back a rest 🧘",
            "Break time! Stretch those muscles 💪",
            "Your body needs a break! Stand up and move 🚶",
            "Rest time! Lie down or stand up for your back 🛋️",
            "Health break! Take care of your spine 🌟"
        ]
    }
});

let mainWindow = null;
let reminderWindow = null;
let tray = null;
let reminderTimer = null;
let breakTimer = null;
let isPaused = false;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        minWidth: 450,
        minHeight: 600,
        frame: false,
        transparent: false,
        resizable: true,
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/settings.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

function createReminderWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    reminderWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        fullscreen: true,
        kiosk: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    reminderWindow.loadFile(path.join(__dirname, 'renderer/reminder.html'));
    reminderWindow.setAlwaysOnTop(true, 'screen-saver');

    // Block keyboard shortcuts
    reminderWindow.webContents.on('before-input-event', (event, input) => {
        // Block Alt+F4, Alt+Tab, Ctrl+Esc, Windows key combinations
        if (input.alt || input.meta || (input.control && input.key === 'Escape')) {
            event.preventDefault();
        }
    });

    return reminderWindow;
}

function createTray() {
    // Create tray icon programmatically
    const trayImage = createTrayImage();
    tray = new Tray(trayImage);
    updateTrayMenu();

    tray.setToolTip('Break Reminder');

    tray.on('double-click', () => {
        mainWindow.show();
    });
}

function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: isPaused ? '▶️ Resume' : '⏸️ Pause',
            click: () => {
                isPaused = !isPaused;
                if (isPaused) {
                    stopReminderTimer();
                } else {
                    startReminderTimer();
                }
                updateTrayMenu();
            }
        },
        { type: 'separator' },
        {
            label: '⚙️ Settings',
            click: () => mainWindow.show()
        },
        {
            label: '🔔 Take Break Now',
            click: () => showReminder()
        },
        { type: 'separator' },
        {
            label: '❌ Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
}

function startReminderTimer() {
    stopReminderTimer();
    const interval = store.get('reminderInterval') * 60 * 1000; // Convert to milliseconds
    reminderTimer = setInterval(() => {
        if (!isPaused) {
            showReminder();
        }
    }, interval);
    console.log(`Timer started: ${store.get('reminderInterval')} minutes`);
}

function stopReminderTimer() {
    if (reminderTimer) {
        clearInterval(reminderTimer);
        reminderTimer = null;
    }
}

function showReminder() {
    if (reminderWindow && !reminderWindow.isDestroyed()) {
        reminderWindow.close();
    }

    reminderWindow = createReminderWindow();

    const breakDuration = store.get('breakDuration') * 60 * 1000;
    const messages = store.get('breakMessages');
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    reminderWindow.webContents.on('did-finish-load', () => {
        reminderWindow.webContents.send('start-break', {
            duration: breakDuration,
            message: randomMessage,
            quizToClose: store.get('quizToClose')
        });
    });
}

function closeReminder() {
    if (reminderWindow && !reminderWindow.isDestroyed()) {
        reminderWindow.close();
        reminderWindow = null;
    }
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
    return store.store;
});

ipcMain.handle('save-settings', (event, settings) => {
    Object.keys(settings).forEach(key => {
        store.set(key, settings[key]);
    });
    startReminderTimer(); // Restart timer with new settings
    return true;
});

ipcMain.handle('close-reminder', () => {
    closeReminder();
    return true;
});

ipcMain.handle('minimize-window', () => {
    mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
    mainWindow.hide();
});

ipcMain.handle('test-reminder', () => {
    showReminder();
});

// App Events
app.whenReady().then(() => {
    createMainWindow();
    createTray();
    startReminderTimer();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit, keep running in tray
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    stopReminderTimer();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}
