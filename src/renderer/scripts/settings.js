const { ipcRenderer } = require('electron');

// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const testBtn = document.getElementById('test-btn');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

// Setting inputs
const reminderInterval = document.getElementById('reminder-interval');
const breakDuration = document.getElementById('break-duration');
const quizEnabled = document.getElementById('quiz-enabled');
const soundEnabled = document.getElementById('sound-enabled');
const autoStart = document.getElementById('auto-start');
const themeBtns = document.querySelectorAll('.theme-btn');

// Value displays
const intervalValue = document.getElementById('interval-value');
const durationValue = document.getElementById('duration-value');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const nextBreakText = document.getElementById('next-break-text');

// Load settings on startup
async function loadSettings() {
    const settings = await ipcRenderer.invoke('get-settings');

    reminderInterval.value = settings.reminderInterval;
    intervalValue.textContent = settings.reminderInterval;

    breakDuration.value = settings.breakDuration;
    durationValue.textContent = settings.breakDuration;

    quizEnabled.checked = settings.quizToClose;
    soundEnabled.checked = settings.soundEnabled;
    autoStart.checked = settings.autoStart;

    // Set theme
    setTheme(settings.theme);

    // Update next break text
    updateNextBreakText(settings.reminderInterval);
}

function updateNextBreakText(minutes) {
    nextBreakText.textContent = `Next break in ${minutes} minutes`;
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// Event Listeners
minimizeBtn.addEventListener('click', () => {
    ipcRenderer.invoke('minimize-window');
});

closeBtn.addEventListener('click', () => {
    ipcRenderer.invoke('close-window');
});

testBtn.addEventListener('click', () => {
    ipcRenderer.invoke('test-reminder');
});

reminderInterval.addEventListener('input', (e) => {
    intervalValue.textContent = e.target.value;
    updateNextBreakText(e.target.value);
});

breakDuration.addEventListener('input', (e) => {
    durationValue.textContent = e.target.value;
});

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setTheme(btn.dataset.theme);
    });
});

saveBtn.addEventListener('click', async () => {
    const activeTheme = document.querySelector('.theme-btn.active').dataset.theme;

    const settings = {
        reminderInterval: parseInt(reminderInterval.value),
        breakDuration: parseInt(breakDuration.value),
        quizToClose: quizEnabled.checked,
        soundEnabled: soundEnabled.checked,
        autoStart: autoStart.checked,
        theme: activeTheme
    };

    saveBtn.classList.add('saving');
    saveBtn.innerHTML = '<span class="save-icon">⏳</span> Saving...';

    await ipcRenderer.invoke('save-settings', settings);

    setTimeout(() => {
        saveBtn.classList.remove('saving');
        saveBtn.classList.add('saved');
        saveBtn.innerHTML = '<span class="save-icon">✅</span> Saved!';

        setTimeout(() => {
            saveBtn.classList.remove('saved');
            saveBtn.innerHTML = '<span class="save-icon">💾</span> Save Settings';
        }, 2000);
    }, 500);
});

// Slider visual updates
function updateSliderFill(slider) {
    const min = slider.min || 0;
    const max = slider.max || 100;
    const value = slider.value;
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--fill-percentage', `${percentage}%`);
}

reminderInterval.addEventListener('input', () => updateSliderFill(reminderInterval));
breakDuration.addEventListener('input', () => updateSliderFill(breakDuration));

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateSliderFill(reminderInterval);
    updateSliderFill(breakDuration);
});

// Drag functionality for custom title bar
const titleBarDrag = document.querySelector('.title-bar-drag');
let isDragging = false;
let startX, startY;

titleBarDrag.style.cssText = '-webkit-app-region: drag';
document.querySelectorAll('.control-btn, .theme-btn, button, input').forEach(el => {
    el.style.cssText = '-webkit-app-region: no-drag';
});
