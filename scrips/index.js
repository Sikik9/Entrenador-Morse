const DOT_DURATION_MS = 180;
let audioCtx;
let oscillator;
let isPlaying = false;

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
        oscillator.disconnect();
        oscillator = null;
    }
}

async function playMorseSequence(morseStr) {
    if (isPlaying) return;
    isPlaying = true;

    try {
        for (let char of morseStr) {
            if (char !== '.' && char !== '-') continue;
            
            const duration = char === '.' ? DOT_DURATION_MS : DOT_DURATION_MS * 3;
            startTone();
            await new Promise(r => setTimeout(r, duration));
            stopTone();
            await new Promise(r => setTimeout(r, DOT_DURATION_MS));
        }
    } finally {
        isPlaying = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dicItems = document.querySelectorAll('.dic-item');
    
    dicItems.forEach(item => {
        
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        
        item.addEventListener('click', async () => {
            initAudio();
            
            const spanElement = item.querySelector('span');
            if (!spanElement) return;
            
            const morseStr = spanElement.textContent.trim();
            if (morseStr) {
                await playMorseSequence(morseStr);
            }
        });
    });
});