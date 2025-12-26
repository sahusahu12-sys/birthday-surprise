/**
 * Cosmic Birthday Experience
 * Core Logic: Audio Analysis + Advanced Particle Systems
 */

// --- Configuration ---
const CONFIG = {
    particleCount: 150,
    flameHeight: 120,
    blowThreshold: 15,
    colors: {
        // More realistic flame colors
        core: { r: 255, g: 255, b: 220 },   // Pale yellow-white
        inner: { r: 255, g: 200, b: 50 },   // Bright yellow
        outer: { r: 255, g: 80, b: 0 }      // Deep orange-red
    }
};

// --- State ---
const STATE = {
    isListening: false,
    isExtinguished: false,
    blowIntensity: 0,
    flameIntensity: 0, // Starts at 0, set to 1.0 after candle appears
};

// --- Elements ---
const bgCanvas = document.getElementById('bgCanvas');
const fxCanvas = document.getElementById('fxCanvas');
const bgCtx = bgCanvas.getContext('2d');
const fxCtx = fxCanvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const micStatus = document.getElementById('micStatus');
const initialState = document.getElementById('initial-state');
const finalState = document.getElementById('final-state');
const bgMusic = document.getElementById('bgMusic');
const birthdayVideo = document.getElementById('birthdayVideo');

// --- Resize ---
function resize() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    fxCanvas.width = window.innerWidth;
    fxCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Helper Functions ---
function random(min, max) { return Math.random() * (max - min) + min; }

// --- Starfield (Background) ---
const stars = [];
function initStars() {
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            size: Math.random() * 2,
            opacity: Math.random(),
            speed: Math.random() * 0.05
        });
    }
}
function drawStars() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.fillStyle = '#fff';
    stars.forEach(star => {
        bgCtx.globalAlpha = star.opacity;
        bgCtx.beginPath();
        bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        bgCtx.fill();
        star.opacity += (Math.random() - 0.5) * 0.1;
        if (star.opacity < 0) star.opacity = 0; if (star.opacity > 1) star.opacity = 1;
    });
    requestAnimationFrame(drawStars);
}

// --- Flame Particle System ---
class FlameParticle {
    // ... [Same flame logic as before, optimized] ...
    constructor() { this.reset(); }
    reset() {
        // Find candle position dynamically
        const candleRect = document.querySelector('.candle').getBoundingClientRect();
        const originX = candleRect.left + candleRect.width / 2;
        const originY = candleRect.top + 25;

        this.x = originX + random(-5, 5);
        this.y = originY;
        this.vx = random(-0.5, 0.5);
        this.vy = random(-1, -3);
        this.life = 1.0;
        this.decay = random(0.01, 0.03);
        this.size = random(10, 20);
        this.type = 'flame';
    }
    update() {
        // Wind applied from blow intensity - DRAMATIC EFFECT
        if (STATE.blowIntensity > 0) {
            // Chaotic turbulence based on blow intensity
            let turbulence = (Math.random() - 0.5) * STATE.blowIntensity * 5;
            this.vx += turbulence;
            this.x += (Math.random() - 0.5) * STATE.blowIntensity * 8; // Jitter

            // If blowing hard, particles fly upwards faster and fade
            if (STATE.blowIntensity > 0.5) {
                this.vy -= STATE.blowIntensity;
                this.life -= 0.05; // Die faster
            }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.96;
    }
    draw(ctx) {
        let alpha = this.life * STATE.flameIntensity;
        // If blowing hard, make flame transparent/flickery
        if (STATE.blowIntensity > 0.5) alpha *= 0.5;

        if (alpha <= 0) return;

        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        g.addColorStop(0, `rgba(${CONFIG.colors.core.r},${CONFIG.colors.core.g},${CONFIG.colors.core.b},${alpha})`);
        g.addColorStop(0.4, `rgba(${CONFIG.colors.inner.r},${CONFIG.colors.inner.g},${CONFIG.colors.inner.b},${alpha * 0.8})`);
        g.addColorStop(1, `rgba(${CONFIG.colors.outer.r},${CONFIG.colors.outer.g},${CONFIG.colors.outer.b},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

class SmokePuff {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6; // Wider spread
        this.vy = -Math.random() * 4 - 3; // Upward
        this.size = Math.random() * 25 + 15; // Bigger
        this.life = 1.0;
        this.decay = 0.015 + Math.random() * 0.02; // Slower decay
        this.gray = Math.floor(Math.random() * 80 + 150); // Lighter gray (150-230)
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy *= 0.98; // Slow down rising
        this.size *= 1.04; // Expand more
        this.life -= this.decay;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.fillStyle = `rgba(${this.gray},${this.gray},${this.gray},${this.life * 0.6})`; // More opaque
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


// --- REALISTIC FIREWORKS SYSTEM ---
// Physics-based: Launch -> Explode -> Gravity + Drag
class Firework {
    constructor(targetX, targetY) {
        this.x = fxCanvas.width / 2;
        this.y = fxCanvas.height;
        this.sx = this.x;
        this.sy = this.y;
        this.tx = targetX;
        this.ty = targetY;
        this.distanceToTarget = Math.sqrt(Math.pow(this.tx - this.sx, 2) + Math.pow(this.ty - this.sy, 2));
        this.distanceTraveled = 0;
        this.angle = Math.atan2(this.ty - this.sy, this.tx - this.sx);
        // VARIATION: Some fast, some slow
        this.speed = random(2, 4);
        this.acceleration = 1.05;
        this.brightness = random(50, 70);
        this.hue = random(0, 360);
        this.trail = [];
        this.trailLength = 3;
    }

    update(index) {
        this.trail.pop();
        this.trail.unshift([this.x, this.y]);

        this.speed *= this.acceleration;
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;

        this.distanceTraveled = Math.sqrt(Math.pow(this.x - this.sx, 2) + Math.pow(this.y - this.sy, 2));

        if (this.distanceTraveled >= this.distanceToTarget) {
            createPars(this.tx, this.ty, this.hue);
            fireworks.splice(index, 1);
        } else {
            this.x += vx;
            this.y += vy;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.trail[this.trail.length - 1][0], this.trail[this.trail.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
        ctx.stroke();
    }
}

class Spark {
    constructor(x, y, hue, type) {
        this.x = x;
        this.y = y;
        this.trail = [];
        this.trailLength = 5;
        for (let i = 0; i < this.trailLength; i++) this.trail.push([x, y]);

        this.angle = random(0, Math.PI * 2);

        // VARIATION: Speed based on explosion type
        if (type === 'large') {
            this.speed = random(2, 15); // BIG bloom
            this.decay = random(0.01, 0.02); // Lasts longer
            this.friction = 0.94;
        } else if (type === 'fast') {
            this.speed = random(5, 12);
            this.decay = random(0.03, 0.06); // Quick fade
            this.friction = 0.92;
        } else {
            this.speed = random(1, 8);
            this.decay = random(0.015, 0.03);
            this.friction = 0.95;
        }

        this.gravity = 1;
        this.hue = random(hue - 20, hue + 20);
        this.brightness = random(50, 80);
        this.alpha = 1;
    }

    update(index) {
        this.trail.pop();
        this.trail.unshift([this.x, this.y]);

        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;

        this.alpha -= this.decay;
        if (this.alpha <= this.decay) {
            particles.splice(index, 1);
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.trail[this.trail.length - 1][0], this.trail[this.trail.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        ctx.stroke();
    }
}

const fireworks = [];
const particles = [];
const flameParticles = [];
const smokeParticles = []; // NEW

function createPars(x, y, hue) {
    // Randomize explosion type
    const rand = Math.random();
    let type = 'normal';
    let count = 50;

    if (rand > 0.7) {
        type = 'large';
        count = 120; // Massive bloom
    } else if (rand < 0.2) {
        type = 'fast';
        count = 40; // Small snappy pop
    }

    for (let i = 0; i < count; i++) {
        particles.push(new Spark(x, y, hue, type));
    }
}

// --- Loop ---
function loop() {
    try {
        // Clear with fade for trails
        fxCtx.globalCompositeOperation = 'destination-out';
        fxCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        fxCtx.fillRect(0, 0, fxCanvas.width, fxCanvas.height);

        // Use source-over for flame (so it's visible)
        fxCtx.globalCompositeOperation = 'source-over';

        // 1. Flame Logic
        if (!STATE.isExtinguished) {
            if (STATE.flameIntensity > 0.1) {
                for (let i = 0; i < 3; i++) flameParticles.push(new FlameParticle());
            }

            // Draw Flame
            for (let i = flameParticles.length - 1; i >= 0; i--) {
                flameParticles[i].update();
                flameParticles[i].draw(fxCtx);
                if (flameParticles[i].life <= 0) flameParticles.splice(i, 1);
            }
        } else {
            flameParticles.length = 0;
        }

        // Draw Smoke Puffs
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            smokeParticles[i].update();
            smokeParticles[i].draw(fxCtx);
            if (smokeParticles[i].life <= 0) smokeParticles.splice(i, 1);
        }

        // Switch to lighter for fireworks (glowing effect)
        fxCtx.globalCompositeOperation = 'lighter';

        // 2. Fireworks Logic - Always active
        if (Math.random() < 0.05) {
            fireworks.push(new Firework(random(0, fxCanvas.width), random(0, fxCanvas.height / 2)));
        }

        // Run Fireworks (Rocket)
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update(i);
            fireworks[i].draw(fxCtx);
        }

        // Run Particles (Explosion)
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(i);
            particles[i].draw(fxCtx);
        }
    } catch (e) {
        console.error("Loop error:", e);
    }

    // ALWAYS continue the loop, even if there was an error
    requestAnimationFrame(loop);
}

// --- Audio (Non-blocking) ---
function startMic() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // Resume AudioContext
            audioCtx.resume().then(() => {
                const mic = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                mic.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);

                STATE.isListening = true;

                function checkBlow() {
                    if (STATE.isExtinguished) return;
                    analyser.getByteFrequencyData(data);
                    let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i];
                    let avg = sum / data.length;

                    if (avg > CONFIG.blowThreshold) {
                        STATE.blowIntensity = (avg - CONFIG.blowThreshold) / 15; // More sensitive
                        STATE.flameIntensity -= 0.03 * STATE.blowIntensity; // Faster quench

                        // Clamp
                        if (STATE.flameIntensity < 0) STATE.flameIntensity = 0;
                        if (STATE.flameIntensity < 0.2) extinguish();
                    } else {
                        STATE.blowIntensity = Math.max(0, STATE.blowIntensity - 0.1); // Gradual decay
                        if (STATE.flameIntensity < 1.0 && STATE.blowIntensity === 0) {
                            STATE.flameIntensity += 0.02; // Flame recovers
                        }
                    }
                    requestAnimationFrame(checkBlow);
                }
                checkBlow();
            });
        })
        .catch(e => {
            console.error("Mic access denied", e);
            micStatus.classList.remove('hidden');
            micStatus.style.color = '#ff4444';
            micStatus.innerHTML = "🚫 <b>Microphone Denied</b><br><small>Tap the candle to blow it out!</small>";
        });
}

function extinguish() {
    if (STATE.isExtinguished) return;
    STATE.isExtinguished = true;
    STATE.flameIntensity = 0;
    micStatus.classList.add('hidden');

    // Spawn dramatic smoke puff - MORE particles for visibility
    const candleRect = document.querySelector('.candle').getBoundingClientRect();
    const originX = candleRect.left + candleRect.width / 2;
    const originY = candleRect.top + 10;

    for (let i = 0; i < 50; i++) {  // 50 smoke particles
        smokeParticles.push(new SmokePuff(originX, originY));
    }

    setTimeout(() => {
        initialState.classList.add('hidden');
        finalState.classList.remove('hidden');
        finalState.style.opacity = 1;

        // HIDE the entire effects canvas so no flame/particles can appear
        fxCanvas.style.display = 'none';

        bgMusic.play().catch(e => console.log(e));
        // Start Video
        if (birthdayVideo) birthdayVideo.play();
    }, 800); // Quick pause for smoke effect
}

// --- Init ---
initStars();
drawStars();
loop();

// Delay flame start to match candle CSS animation (candle fades in over 1.5s with 1s delay)
setTimeout(() => {
    STATE.flameIntensity = 1.0;
}, 2000);

// Request microphone permission at page load
startMic();

// Mobile Helper: Prime media on first user interaction
function unlockMedia() {
    bgMusic.play().then(() => {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }).catch(e => console.log("Audio unlock failed", e));

    if (birthdayVideo) {
        birthdayVideo.load();
    }
}

// IGNITE BUTTON - Unlock media only (mic already started at page load)
const triggerStart = (e) => {
    if (e.type === 'touchstart') e.preventDefault();

    unlockMedia();

    startBtn.style.opacity = 0;
    setTimeout(() => startBtn.style.display = 'none', 500);
};

startBtn.addEventListener('click', triggerStart);
startBtn.addEventListener('touchstart', triggerStart, { passive: false });

// Candle tap fallback (in case mic doesn't work)
const candleEl = document.querySelector('.candle');
candleEl.addEventListener('click', extinguish);
candleEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    extinguish();
}, { passive: false });
