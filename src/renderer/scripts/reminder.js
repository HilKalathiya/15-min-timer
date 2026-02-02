const { ipcRenderer } = require('electron');

// DOM Elements
const breakScreen = document.getElementById('break-screen');
const quizScreen = document.getElementById('quiz-screen');
const successScreen = document.getElementById('success-screen');
const skipBtn = document.getElementById('skip-btn');
const backBtn = document.getElementById('back-btn');
const timerValue = document.getElementById('timer-value');
const timerProgress = document.getElementById('timer-progress');
const breakMessage = document.getElementById('break-message');
const tipText = document.getElementById('tip-text');
const quizType = document.getElementById('quiz-type');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const quizInputContainer = document.getElementById('quiz-input-container');
const quizInput = document.getElementById('quiz-input');
const submitAnswer = document.getElementById('submit-answer');
const quizFeedback = document.getElementById('quiz-feedback');

// State
let breakDuration = 5 * 60 * 1000; // 5 minutes in ms
let remainingTime = breakDuration;
let timerInterval = null;
let currentQuiz = null;
let quizEnabled = true;

// Health Tips
const healthTips = [
    "Try some gentle stretches for your neck and shoulders! 🧘",
    "Walk around for a minute to get your blood flowing! 🚶",
    "Look at something 20 feet away for 20 seconds (20-20-20 rule)! 👀",
    "Take 5 deep breaths to reduce stress! 🌬️",
    "Roll your shoulders backward and forward! 💪",
    "Stand up and do a quick full-body stretch! 🙆",
    "Give your eyes a rest by closing them for a moment! 😌",
    "Drink some water to stay hydrated! 💧",
    "Do some wrist circles to prevent strain! ✋",
    "Practice good posture - sit up straight! 🪑"
];

// Quiz Database
const quizDatabase = {
    math: [
        { question: "What is 15 × 7?", answer: "105", options: ["95", "105", "115", "125"] },
        { question: "What is 144 ÷ 12?", answer: "12", options: ["10", "11", "12", "14"] },
        { question: "What is 23 + 48?", answer: "71", options: ["61", "71", "81", "91"] },
        { question: "What is 256 ÷ 16?", answer: "16", options: ["14", "15", "16", "18"] },
        { question: "What is 17 × 6?", answer: "102", options: ["96", "102", "108", "112"] },
        { question: "What is √169?", answer: "13", options: ["11", "12", "13", "14"] },
        { question: "What is 7³?", answer: "343", options: ["243", "343", "443", "543"] },
        { question: "What is 15% of 200?", answer: "30", options: ["25", "30", "35", "40"] },
        { question: "What is 88 - 29?", answer: "59", options: ["49", "59", "69", "79"] },
        { question: "What is 12 × 12?", answer: "144", options: ["124", "134", "144", "154"] }
    ],
    gk: [
        { question: "What is the capital of Japan?", answer: "Tokyo", options: ["Seoul", "Tokyo", "Beijing", "Bangkok"] },
        { question: "How many continents are there?", answer: "7", options: ["5", "6", "7", "8"] },
        { question: "What planet is known as the Red Planet?", answer: "Mars", options: ["Venus", "Mars", "Jupiter", "Saturn"] },
        { question: "What is the largest ocean?", answer: "Pacific", options: ["Atlantic", "Pacific", "Indian", "Arctic"] },
        { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci", options: ["Picasso", "Van Gogh", "Leonardo da Vinci", "Michelangelo"] },
        { question: "What is the chemical symbol for Gold?", answer: "Au", options: ["Ag", "Au", "Go", "Gd"] },
        { question: "How many bones are in the human body?", answer: "206", options: ["186", "196", "206", "216"] },
        { question: "What is the largest mammal?", answer: "Blue Whale", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"] },
        { question: "Which country has the most population?", answer: "India", options: ["USA", "China", "India", "Indonesia"] },
        { question: "What gas do plants absorb?", answer: "Carbon Dioxide", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"] }
    ],
    riddles: [
        { question: "I have keys but no locks. I have space but no room. You can enter but can't go inside. What am I?", answer: "Keyboard", options: ["Piano", "Keyboard", "House", "Car"] },
        { question: "What has hands but can't clap?", answer: "Clock", options: ["Tree", "Clock", "Robot", "Statue"] },
        { question: "What has a head and a tail but no body?", answer: "Coin", options: ["Snake", "Coin", "Arrow", "Pin"] },
        { question: "The more you take, the more you leave behind. What am I?", answer: "Footsteps", options: ["Time", "Footsteps", "Memories", "Photos"] },
        { question: "What can travel around the world while staying in a corner?", answer: "Stamp", options: ["Stamp", "Spider", "Shadow", "Sound"] },
        { question: "What gets wetter the more it dries?", answer: "Towel", options: ["Sponge", "Towel", "Paper", "Cloth"] },
        { question: "I speak without a mouth and hear without ears. What am I?", answer: "Echo", options: ["Wind", "Echo", "Shadow", "Dream"] },
        { question: "What has cities, but no houses; forests, but no trees; and water, but no fish?", answer: "Map", options: ["Picture", "Map", "Dream", "Story"] }
    ],
    typing: [
        { question: "Type this word backwards: 'COMPUTER'", answer: "RETUPMOC", type: "input" },
        { question: "Type the result: 'HELLO' + 'WORLD' (no space)", answer: "HELLOWORLD", type: "input" },
        { question: "Type the 5th letter of 'PROGRAMMING'", answer: "R", type: "input" },
        { question: "How many letters in 'JAVASCRIPT'?", answer: "10", type: "input" },
        { question: "Type 'BREAK TIME' without the space", answer: "BREAKTIME", type: "input" }
    ]
};

// Initialize
ipcRenderer.on('start-break', (event, data) => {
    breakDuration = data.duration;
    remainingTime = breakDuration;
    quizEnabled = data.quizToClose;
    breakMessage.textContent = data.message;

    if (!quizEnabled) {
        skipBtn.style.display = 'none';
    }

    // Set random tip
    tipText.textContent = healthTips[Math.floor(Math.random() * healthTips.length)];

    startTimer();
});

function startTimer() {
    const totalDuration = breakDuration;
    const circumference = 2 * Math.PI * 90;
    timerProgress.style.strokeDasharray = circumference;

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        remainingTime -= 1000;

        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            closeReminder();
            return;
        }

        updateTimerDisplay();

        // Update progress ring
        const progress = remainingTime / totalDuration;
        const offset = circumference * (1 - progress);
        timerProgress.style.strokeDashoffset = offset;
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function closeReminder() {
    // IMPORTANT: Clear the timer interval to stop the timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    showSuccess();
    setTimeout(() => {
        ipcRenderer.invoke('close-reminder');
    }, 1500);
}

function showSuccess() {
    breakScreen.classList.add('hidden');
    quizScreen.classList.add('hidden');
    successScreen.classList.remove('hidden');
}

// Quiz Functions
function generateQuiz() {
    const categories = Object.keys(quizDatabase);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const quizzes = quizDatabase[randomCategory];
    const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];

    currentQuiz = { ...quiz, category: randomCategory };

    // Set quiz type badge
    const categoryNames = {
        math: '🔢 Math Challenge',
        gk: '🌍 General Knowledge',
        riddles: '🧩 Brain Teaser',
        typing: '⌨️ Typing Challenge'
    };
    quizType.textContent = categoryNames[randomCategory];
    quizQuestion.textContent = quiz.question;

    // Clear previous options
    quizOptions.innerHTML = '';
    quizFeedback.classList.add('hidden');

    if (quiz.type === 'input') {
        quizOptions.classList.add('hidden');
        quizInputContainer.classList.remove('hidden');
        quizInput.value = '';
        quizInput.focus();
    } else {
        quizOptions.classList.remove('hidden');
        quizInputContainer.classList.add('hidden');

        // Shuffle options
        const shuffledOptions = [...quiz.options].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach(option => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'quiz-option';
            optionBtn.textContent = option;
            optionBtn.addEventListener('click', () => checkAnswer(option));
            quizOptions.appendChild(optionBtn);
        });
    }
}

function checkAnswer(answer) {
    const isCorrect = answer.toLowerCase().trim() === currentQuiz.answer.toLowerCase().trim();

    if (isCorrect) {
        closeReminder();
    } else {
        showWrongAnswer();

        // Generate new quiz after wrong answer
        setTimeout(() => {
            generateQuiz();
        }, 1500);
    }
}

function showWrongAnswer() {
    quizFeedback.classList.remove('hidden');
    quizFeedback.querySelector('.feedback-icon').textContent = '❌';
    quizFeedback.querySelector('.feedback-text').textContent = 'Wrong answer! Try again with a new question.';

    // Shake animation
    quizScreen.classList.add('shake');
    setTimeout(() => {
        quizScreen.classList.remove('shake');
    }, 500);
}

// Event Listeners
skipBtn.addEventListener('click', () => {
    breakScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    generateQuiz();
});

backBtn.addEventListener('click', () => {
    quizScreen.classList.add('hidden');
    breakScreen.classList.remove('hidden');
});

submitAnswer.addEventListener('click', () => {
    checkAnswer(quizInput.value);
});

quizInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkAnswer(quizInput.value);
    }
});

// Prevent closing
document.addEventListener('keydown', (e) => {
    // Block Alt+F4, Escape, etc.
    if (e.altKey && e.key === 'F4') {
        e.preventDefault();
    }
    if (e.key === 'Escape') {
        e.preventDefault();
    }
    if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
    }
    if (e.metaKey) {
        e.preventDefault();
    }
});

// Disable right-click context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Change tip periodically
setInterval(() => {
    tipText.style.opacity = 0;
    setTimeout(() => {
        tipText.textContent = healthTips[Math.floor(Math.random() * healthTips.length)];
        tipText.style.opacity = 1;
    }, 300);
}, 15000);

// Change break icons periodically
const breakIcons = ['🧘', '🚶', '💪', '🙆', '🧍', '🛋️', '🌟', '✨'];
let iconIndex = 0;
setInterval(() => {
    const iconMain = document.querySelector('.icon-main');
    iconIndex = (iconIndex + 1) % breakIcons.length;
    iconMain.style.transform = 'scale(0)';
    setTimeout(() => {
        iconMain.textContent = breakIcons[iconIndex];
        iconMain.style.transform = 'scale(1)';
    }, 200);
}, 5000);
