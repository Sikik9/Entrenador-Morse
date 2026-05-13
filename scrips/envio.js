const ALPHABET = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'Ñ': '--.--', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..'
};

const QWERTY = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];
const MAX_ROUNDS = 10;
const DASH_TIME_MS = 200;

let audioCtx;
let oscillator;
let selectedLetters = [];
let sequence = [];
let currentIndex = 0;
let correctCount = 0;
let isProcessing = false;
let inactivityTimer = null;
let timeoutMs = 3000;

let currentProgress = "";
let pressStartTime = 0;
let isKeyPressed = false;

let screens = {};
let dom = {};

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function startTone() {
    if (oscillator || !audioCtx) return;
    oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 600;
    gainNode.gain.value = 0.1;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}

function stopTone() {
    if (oscillator) {
        oscillator.stop();
        oscillator = null;
    }
}

function buildUI() {
    QWERTY.forEach(letter => {
        if (dom.grid) {
            const label = document.createElement('label');
            label.className = 'letter-checkbox';
            label.innerHTML = `<input type="checkbox" value="${letter}"> ${letter}`;
            dom.grid.appendChild(label);
        }
    });
}

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startGame() {
    const checkboxes = document.querySelectorAll('#letter-grid input:checked');
    selectedLetters = Array.from(checkboxes).map(cb => cb.value);

    if (selectedLetters.length === 0) {
        if(dom.setupError) dom.setupError.classList.remove('hidden');
        return;
    }

    const diffRadio = document.querySelector('input[name="difficulty"]:checked');
    timeoutMs = diffRadio ? parseInt(diffRadio.value) : 3000;

    if(dom.setupError) dom.setupError.classList.add('hidden');
    sequence = [];
    for (let i = 0; i < MAX_ROUNDS; i++) {
        sequence.push(selectedLetters[Math.floor(Math.random() * selectedLetters.length)]);
    }

    currentIndex = 0;
    correctCount = 0;
    switchScreen('practice');
    loadRound();
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (timeoutMs > 0 && !isProcessing) {
        inactivityTimer = setTimeout(() => {
            if (!isProcessing) processFailure();
        }, timeoutMs);
    }
}

function loadRound() {
    clearTimeout(inactivityTimer);
    if (currentIndex >= MAX_ROUNDS) {
        endGame();
        return;
    }
    
    isProcessing = false;
    currentProgress = "";
    const targetLetter = sequence[currentIndex];

    if(dom.target) dom.target.textContent = targetLetter;
    if(dom.input) dom.input.textContent = "";
    if(dom.feedback) {
        dom.feedback.textContent = "";
        dom.feedback.className = "";
    }
    if(dom.progress) dom.progress.textContent = `${currentIndex + 1} / ${MAX_ROUNDS}`;

    resetInactivityTimer();
}

function handlePress() {
    if (screens.practice && screens.practice.classList.contains('active') && !isProcessing && !isKeyPressed) {
        isKeyPressed = true;
        clearTimeout(inactivityTimer);
        initAudio();
        pressStartTime = Date.now();
        startTone();
        if(dom.transmitBtn) dom.transmitBtn.classList.add('active-press');
    }
}

function handleRelease() {
    if (screens.practice && screens.practice.classList.contains('active') && !isProcessing && isKeyPressed) {
        isKeyPressed = false;
        const duration = Date.now() - pressStartTime;
        stopTone();
        if(dom.transmitBtn) dom.transmitBtn.classList.remove('active-press');

        const symbol = duration < DASH_TIME_MS ? '.' : '-';
        currentProgress += symbol;
        if(dom.input) dom.input.textContent = currentProgress;

        checkProgress();
    }
}

function checkProgress() {
    const targetCode = ALPHABET[sequence[currentIndex]];
    
    if (currentProgress === targetCode) {
        isProcessing = true;
        clearTimeout(inactivityTimer);
        if(dom.feedback) {
            dom.feedback.textContent = "BIEN";
            dom.feedback.className = "correct";
        }
        correctCount++;
        currentIndex++;
        setTimeout(loadRound, 1000);
    } else if (!targetCode.startsWith(currentProgress)) {
        processFailure();
    } else {
        resetInactivityTimer();
    }
}

function processFailure() {
    isProcessing = true;
    clearTimeout(inactivityTimer);
    if(dom.feedback) {
        dom.feedback.textContent = "MAL";
        dom.feedback.className = "incorrect";
    }
    currentIndex++;
    setTimeout(loadRound, 1500);
}

function endGame() {
    clearTimeout(inactivityTimer);
    stopTone();
    switchScreen('summary');
    if(dom.score) dom.score.textContent = `Aciertos: ${correctCount} de ${MAX_ROUNDS}`;
}

document.addEventListener('DOMContentLoaded', () => {
    screens = {
        setup: document.getElementById('setup-screen'),
        practice: document.getElementById('practice-screen'),
        summary: document.getElementById('summary-screen')
    };

    dom = {
        grid: document.getElementById('letter-grid'),
        startBtn: document.getElementById('start-btn'),
        selectAllBtn: document.getElementById('select-all-btn'),
        setupError: document.getElementById('setup-error'),
        progress: document.getElementById('progress-counter'),
        target: document.getElementById('target-letter'),
        input: document.getElementById('input-display'),
        feedback: document.getElementById('feedback-display'),
        transmitBtn: document.getElementById('transmit-btn'),
        score: document.getElementById('score-display'),
        restartBtn: document.getElementById('restart-btn')
    };

    if (dom.startBtn) dom.startBtn.addEventListener('click', startGame);
    if (dom.restartBtn) dom.restartBtn.addEventListener('click', () => {
        clearTimeout(inactivityTimer);
        stopTone();
        switchScreen('setup');
    });
    
    if (dom.selectAllBtn) {
        let allSelected = false;
        dom.selectAllBtn.addEventListener('click', () => {
            allSelected = !allSelected;
            const checkboxes = document.querySelectorAll('#letter-grid input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = allSelected);
            dom.selectAllBtn.textContent = allSelected ? "Deseleccionar Todo" : "Seleccionar Todo";
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            handlePress();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleRelease();
        }
    });

    if (dom.transmitBtn) {
        dom.transmitBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); handlePress(); });
        dom.transmitBtn.addEventListener('pointerup', (e) => { e.preventDefault(); handleRelease(); });
        dom.transmitBtn.addEventListener('pointercancel', (e) => { e.preventDefault(); handleRelease(); });
        dom.transmitBtn.addEventListener('pointerleave', (e) => { e.preventDefault(); handleRelease(); });
        dom.transmitBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    buildUI();
});