const ALPHABET = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'Ñ': '--.--', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..'
};

const QWERTY = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];
const MAX_ROUNDS = 10;
const DOT_DURATION_MS = 180;

let audioCtx;
let oscillator;
let selectedLetters = [];
let sequence = [];
let currentIndex = 0;
let correctCount = 0;
let isProcessing = false;
let inactivityTimer = null;
let audioSequenceId = 0;
let timeoutMs = 3000;
let isAudioOnly = false;
let isFlashMode = false;

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
    
    if (isFlashMode) document.body.classList.add('flash-active');
}

function stopTone() {
    if (isFlashMode) document.body.classList.remove('flash-active');
    
    if (oscillator) {
        oscillator.stop();
        oscillator = null;
    }
}

async function playMorseSequence(morseStr) {
    audioSequenceId++;
    const currentId = audioSequenceId;
    initAudio();

    for (let char of morseStr) {
        if (currentId !== audioSequenceId || isProcessing) {
            stopTone();
            return false;
        }
        
        const duration = char === '.' ? DOT_DURATION_MS : DOT_DURATION_MS * 3;
        startTone();
        
        await new Promise(r => setTimeout(r, duration));
        
        stopTone();
        if (currentId !== audioSequenceId || isProcessing) return false;
        await new Promise(r => setTimeout(r, DOT_DURATION_MS));
    }
    return true;
}

function buildUI() {
    QWERTY.forEach(letter => {
        if (dom.grid) {
            const label = document.createElement('label');
            label.className = 'letter-checkbox';
            label.innerHTML = `<input type="checkbox" value="${letter}"> ${letter}`;
            dom.grid.appendChild(label);
        }

        if (dom.keyboard) {
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.textContent = letter;
            btn.addEventListener('click', () => handleVirtualKey(letter));
            dom.keyboard.appendChild(btn);
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
    const modeRadio = document.querySelector('input[name="mode"]:checked');
    
    timeoutMs = diffRadio ? parseInt(diffRadio.value) : 3000;
    
    const modeValue = modeRadio ? modeRadio.value : 'visual';
    isAudioOnly = modeValue === 'audio';
    isFlashMode = modeValue === 'flash';

    if(dom.setupError) dom.setupError.classList.add('hidden');
    sequence = [];
    for (let i = 0; i < MAX_ROUNDS; i++) {
        sequence.push(selectedLetters[Math.floor(Math.random() * selectedLetters.length)]);
    }

    currentIndex = 0;
    correctCount = 0;
    switchScreen('practice');

    // const mobileInput = document.getElementById('mobile-input');
    // if (mobileInput) mobileInput.focus();

    loadRound();
}

async function loadRound() {
    clearTimeout(inactivityTimer);
    if (currentIndex >= MAX_ROUNDS) {
        endGame();
        return;
    }
    
    isProcessing = false;
    const targetLetter = sequence[currentIndex];
    const targetMorse = ALPHABET[targetLetter];

    if(dom.target) {
        if (isAudioOnly) dom.target.textContent = "🔊";
        else if (isFlashMode) dom.target.textContent = "👁️";
        else dom.target.textContent = targetMorse;
    }
    
    if(dom.input) dom.input.textContent = "_";
    if(dom.feedback) {
        dom.feedback.textContent = "";
        dom.feedback.className = "";
    }
    if(dom.progress) dom.progress.textContent = `${currentIndex + 1} / ${MAX_ROUNDS}`;

    const sequenceCompleted = await playMorseSequence(targetMorse);

    if (sequenceCompleted && !isProcessing && timeoutMs > 0) {
        inactivityTimer = setTimeout(() => {
            if (!isProcessing) evaluateInput(null);
        }, timeoutMs);
    }
}

function evaluateInput(inputChar) {
    clearTimeout(inactivityTimer);
    isProcessing = true;
    stopTone();

    const targetLetter = sequence[currentIndex];

    if (inputChar === targetLetter) {
        if(dom.input) dom.input.textContent = inputChar;
        if(dom.feedback) {
            dom.feedback.textContent = "BIEN";
            dom.feedback.className = "correct";
        }
        correctCount++;
    } else {
        if(dom.input) dom.input.textContent = inputChar || "-";
        if(dom.feedback) {
            dom.feedback.textContent = `MAL (Era ${targetLetter})`;
            dom.feedback.className = "incorrect";
        }
    }

    currentIndex++;
    setTimeout(loadRound, 1500);
}

function handleKeyDown(e) {
    if (screens.practice && screens.practice.classList.contains('active') && !isProcessing) {
        const key = e.key.toUpperCase();
        if (/^[A-ZÑ]$/.test(key)) {
            evaluateInput(key);
        }
    }
}

function handleVirtualKey(key) {
    if (screens.practice && screens.practice.classList.contains('active') && !isProcessing) {
        evaluateInput(key);
    }
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
        keyboard: document.getElementById('virtual-keyboard'),
        startBtn: document.getElementById('start-btn'),
        selectAllBtn: document.getElementById('select-all-btn'),
        setupError: document.getElementById('setup-error'),
        progress: document.getElementById('progress-counter'),
        target: document.getElementById('target-morse'),
        input: document.getElementById('input-display'),
        feedback: document.getElementById('feedback-display'),
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

    window.addEventListener('keydown', handleKeyDown);

    buildUI();

//     // Captura la entrada del teclado nativo del móvil
//     const mobileInput = document.getElementById('mobile-input');
//     if (mobileInput) {
//         mobileInput.addEventListener('input', (e) => {
//             // Obtiene el último carácter escrito y lo pasa a mayúsculas
//             const char = e.target.value.slice(-1).toUpperCase();
            
//             // Valida que sea una letra o Ñ y que no estemos en pausa entre rondas
//             if (/^[A-ZÑ]$/.test(char) && !isProcessing) {
//                 evaluateInput(char);
//             }
            
//             // Vacía el input para que esté listo para la siguiente letra
//             e.target.value = "";
//         });

//         // Si el usuario toca la pantalla, forzamos que el teclado no se cierre
//         document.getElementById('practice-screen').addEventListener('click', () => {
//             mobileInput.focus();
//         });
// }

});