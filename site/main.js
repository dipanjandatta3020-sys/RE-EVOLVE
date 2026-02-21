/**
 * RE-EVOLVE — Unified Hero Scroll-Morph Transition
 *
 * ONE container. THREE overlapping layers. Scroll-driven frame animation.
 * No stacking. No separate sections. No fades. Pure frame-to-frame morph.
 *
 * OPTIMIZED: particle visibility, mobile detection, scroll throttling.
 */

// ─── MOBILE DETECTION ──────────────────────────────────────────────────────
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ─── ELEMENTS ──────────────────────────────────────────────────────────────

const heroWrapper = document.getElementById("heroWrapper");
const heroSticky = document.getElementById("heroSticky");
const scrollCanvas = document.getElementById("scrollCanvas");
const scrollCtx = scrollCanvas.getContext("2d");
const dustCanvas = document.getElementById("dust");
const dustCtx = dustCanvas.getContext("2d");
const contentOne = document.getElementById("contentOne");
const contentTwo = document.getElementById("contentTwo");

// ─── FRAME SEQUENCE (frame_0002.png → frame_0239.png = 238 frames) ────────

const FRAME_START = 2;
const FRAME_END = 239;
const FRAME_COUNT = FRAME_END - FRAME_START + 1; // 238

const frameNames = [];
for (let i = FRAME_START; i <= FRAME_END; i++) {
    frameNames.push(`frame_${String(i).padStart(4, '0')}.webp`);
}

const frames = [];
let framesLoaded = 0;
let currentFrameIndex = -1;

// ─── CACHED DIMENSIONS ────────────────────────────────────────────────────

let cachedW = window.innerWidth;
let cachedH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

// ─── CANVAS SIZING ─────────────────────────────────────────────────────────

let resizeRafPending = false;
function resizeCanvases() {
    // Use full device pixel ratio on all devices for maximum sharpness
    const dpr = window.devicePixelRatio || 1;
    cachedW = window.innerWidth;
    cachedH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    scrollCanvas.width = cachedW * dpr;
    scrollCanvas.height = cachedH * dpr;
    scrollCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Use high quality image smoothing
    scrollCtx.imageSmoothingEnabled = true;
    scrollCtx.imageSmoothingQuality = 'high';

    dustCanvas.width = cachedW * dpr;
    dustCanvas.height = cachedH * dpr;
    dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderFrame(currentFrameIndex);
}

window.addEventListener('resize', () => {
    if (resizeRafPending) return;
    resizeRafPending = true;
    requestAnimationFrame(() => {
        resizeRafPending = false;
        resizeCanvases();
    });
});
resizeCanvases();

// ─── PRELOADER ──────────────────────────────────────────────────────────────

const preloader = document.getElementById("preloader");
const loadingDots = document.getElementById("loadingDots");

document.body.style.overflow = "hidden";
window.scrollTo(0, 0);

let dotCount = 0;
const dotInterval = setInterval(() => {
    dotCount = (dotCount % 5) + 1;
    loadingDots.textContent = '.'.repeat(dotCount);
}, 300);

const preloaderStart = Date.now();

function dismissPreloader() {
    const elapsed = Date.now() - preloaderStart;
    const remaining = Math.max(0, 1500 - elapsed);

    setTimeout(() => {
        clearInterval(dotInterval);
        window.scrollTo(0, 0);
        document.body.style.overflow = "";

        currentFrameIndex = 0;
        renderFrame(0);

        preloader.classList.add("hidden");

        requestAnimationFrame(() => {
            updateFromScroll();
        });

        setTimeout(() => preloader.remove(), 700);
    }, remaining);
}

// Load first EAGER_COUNT frames immediately for fast first paint
const EAGER_COUNT = isMobile ? 3 : 6; // Less eager frames on mobile for faster TTI

function loadFrame(index) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = `/ScrollAnimationIMG_webp/${frameNames[index]}`;
        img.onload = img.onerror = () => {
            framesLoaded++;
            resolve();
        };
        frames[index] = img;
    });
}

const eagerPromises = [];
for (let i = 0; i < Math.min(EAGER_COUNT, FRAME_COUNT); i++) {
    eagerPromises.push(loadFrame(i));
}

// Then load the rest via requestIdleCallback or setTimeout fallback
const scheduleIdle = window.requestIdleCallback
    ? (cb) => window.requestIdleCallback(cb, { timeout: 100 })
    : (cb) => setTimeout(cb, 1);

let nextFrameToLoad = EAGER_COUNT;

function loadRemainingFrames() {
    if (nextFrameToLoad >= FRAME_COUNT) {
        if (framesLoaded >= FRAME_COUNT) {
            console.log(`All ${FRAME_COUNT} scroll frames preloaded`);
        }
        return;
    }

    const batchSize = isMobile ? 3 : 6;
    const batchEnd = Math.min(nextFrameToLoad + batchSize, FRAME_COUNT);
    const batchPromises = [];

    for (let i = nextFrameToLoad; i < batchEnd; i++) {
        batchPromises.push(loadFrame(i));
    }
    nextFrameToLoad = batchEnd;

    Promise.all(batchPromises).then(() => {
        scheduleIdle(loadRemainingFrames);
    });
}

Promise.all(eagerPromises).then(() => {
    // DISMISS PRELOADER IMMEDIATELY AFTER EAGER FRAMES ARE LOADED
    dismissPreloader();
    scheduleIdle(loadRemainingFrames);
});

// ─── RENDER A SINGLE FRAME WITH INTERPOLATION ───────────────────────────────

let lastDrawnImage = null; // Cache the most recently drawn frame 
let bgCanvasMsgOnce = false;

function drawImageCover(ctx, img) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cachedW / iw, cachedH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = (cachedW - dw) / 2;
    const oy = (cachedH - dh) / 2;
    ctx.drawImage(img, ox, oy, dw, dh);
}

function renderFrame(index, fractionalProgress = 0) {
    if (index < 0 || index >= FRAME_COUNT) return;

    let img1 = frames[index];
    let img2 = (index + 1 < FRAME_COUNT) ? frames[index + 1] : img1;

    // Fallback logic if frames aren't loaded
    if (!img1 || !img1.complete || !img1.naturalWidth) {
        let fallbackFound = false;
        for (let i = index - 1; i >= 0; i--) {
            if (frames[i] && frames[i].complete && frames[i].naturalWidth) {
                img1 = frames[i];
                img2 = img1;
                fractionalProgress = 0; // Disable interpolation if falling back
                fallbackFound = true;
                break;
            }
        }
        if (!fallbackFound) {
            if (lastDrawnImage) img1 = lastDrawnImage;
            else return;
        }
    }

    if (!img2 || !img2.complete || !img2.naturalWidth) {
        img2 = img1;
    }

    lastDrawnImage = img1;

    scrollCtx.clearRect(0, 0, cachedW, cachedH);

    // If no fractional progress or imgs are same, simple draw
    if (fractionalProgress <= 0.01 || img1 === img2) {
        scrollCtx.globalAlpha = 1.0;
        drawImageCover(scrollCtx, img1);
        return;
    }

    // Otherwise, Crossfade (Interpolation) between adjecent frames for smooth motion
    scrollCtx.globalAlpha = 1.0;
    drawImageCover(scrollCtx, img1);

    scrollCtx.globalAlpha = fractionalProgress;
    drawImageCover(scrollCtx, img2);

    scrollCtx.globalAlpha = 1.0; // Reset alpha
}

// ─── SCROLL-DRIVEN UPDATE — linear mapping, no easing ─────────────────────

let scrollRafPending = false;

function updateFromScroll() {
    const wrapperRect = heroWrapper.getBoundingClientRect();
    const scrollableDistance = heroWrapper.offsetHeight - cachedH;
    if (scrollableDistance <= 0) return;

    const scrolled = -wrapperRect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));

    const exactFrame = progress * (FRAME_COUNT - 1);
    const frameIndex = Math.floor(exactFrame);
    const fractionalProgress = exactFrame - frameIndex;

    // We now update on every frame if there is fraction changing
    currentFrameIndex = frameIndex;
    renderFrame(frameIndex, fractionalProgress);

    // Text layer switching — earlier threshold on mobile so second text is visible longer
    const fadeOutAt = isMobile ? 0.10 : 0.08;
    const fadeInAt = isMobile ? 0.80 : 0.85;

    if (progress <= fadeOutAt) {
        contentOne.style.opacity = "1";
        contentOne.style.visibility = "visible";
        contentTwo.style.opacity = "0";
        contentTwo.style.visibility = "hidden";
    } else if (progress >= fadeInAt) {
        contentOne.style.opacity = "0";
        contentOne.style.visibility = "hidden";
        contentTwo.style.opacity = "1";
        contentTwo.style.visibility = "visible";
    } else {
        contentOne.style.opacity = "0";
        contentOne.style.visibility = "hidden";
        contentTwo.style.opacity = "0";
        contentTwo.style.visibility = "hidden";
    }
}

function onScroll() {
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(() => {
        scrollRafPending = false;
        updateFromScroll();
    });
}

window.addEventListener('scroll', onScroll, { passive: true });
updateFromScroll();

// Recalculate after full page load — critical for real mobile where
// dynamic toolbar resizes the viewport after DOMContentLoaded
window.addEventListener('load', () => {
    resizeCanvases();
    updateFromScroll();

    // Delayed second refresh — catches late iOS Safari toolbar resize
    setTimeout(() => {
        resizeCanvases();
        updateFromScroll();
    }, 300);
});

// Re-sync when tab becomes visible again
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        resizeCanvases();
        updateFromScroll();
    }
});

// Listen to visualViewport resize for real mobile toolbar changes
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (resizeRafPending) return;
        resizeRafPending = true;
        requestAnimationFrame(() => {
            resizeRafPending = false;
            resizeCanvases();
        });
    });
}

// ─── SUBTLE CURSOR DEPTH MOVEMENT (desktop only) ──────────────────────────

if (!isTouchDevice) {
    heroSticky.addEventListener("mousemove", (e) => {
        const x = (e.clientX / cachedW - 0.5) * 10;
        const rawY = (e.clientY / cachedH - 0.5) * 10;
        const y = Math.max(-1, rawY);
        scrollCanvas.style.transform = `scale(1.03) translate3d(${x}px, ${y}px, 0)`;
    });
}

// ─── PARTICLE SYSTEM (visibility-gated, reduced on mobile) ─────────────────

const PARTICLE_COUNT = isMobile ? 30 : 80;
let particles = [];
let particlesActive = true;
let particleRafId = null;

class Particle {
    constructor() { this.init(); }

    init() {
        this.x = Math.random() * cachedW;
        this.y = Math.random() * cachedH;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * 0.3 + 0.1;
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.y -= this.speedY;
        if (this.y < 0) {
            this.y = cachedH;
            this.x = Math.random() * cachedW;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 215, 150, ${this.opacity})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

function animateParticles() {
    if (!particlesActive) {
        particleRafId = null;
        return;
    }
    dustCtx.clearRect(0, 0, cachedW, cachedH);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(dustCtx);
    }
    particleRafId = requestAnimationFrame(animateParticles);
}

// Only run particles when hero is visible
const particleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            if (!particlesActive) {
                particlesActive = true;
                animateParticles();
            }
        } else {
            particlesActive = false;
            if (particleRafId) {
                cancelAnimationFrame(particleRafId);
                particleRafId = null;
            }
            dustCtx.clearRect(0, 0, cachedW, cachedH);
        }
    });
}, { threshold: 0 });

particleObserver.observe(heroSticky);
animateParticles();

// ─── NUTRITION FOOD COLUMN PARALLAX (desktop only) ─────────────────────────

const nutritionSection = document.getElementById("nutritionSection");
const foodColLeft = document.getElementById("foodColLeft");
const foodColRight = document.getElementById("foodColRight");

if (nutritionSection && foodColLeft && foodColRight) {
    if (!isMobile) {
        const RANGE = 120;
        let nutritionRafPending = false;

        function updateFoodParallax() {
            const rect = nutritionSection.getBoundingClientRect();
            const sectionH = nutritionSection.offsetHeight;
            const viewH = cachedH;

            const visible = viewH - rect.top;
            const total = viewH + sectionH;
            const progress = Math.max(0, Math.min(1, visible / total));

            const offset = (progress - 0.5) * RANGE;

            foodColLeft.style.transform = `translateY(${-offset}px)`;
            foodColRight.style.transform = `translateY(${offset}px)`;
        }

        window.addEventListener('scroll', () => {
            if (nutritionRafPending) return;
            nutritionRafPending = true;
            requestAnimationFrame(() => {
                nutritionRafPending = false;
                updateFoodParallax();
            });
        }, { passive: true });

        updateFoodParallax();
    } else {
        // On mobile, reset transforms to avoid jank
        foodColLeft.style.transform = 'translateY(0)';
        foodColRight.style.transform = 'translateY(0)';
    }
}

// ─── FOOTER WORD-BY-WORD ILLUMINATION ──────────────────────────────────────

const footerHeadline = document.getElementById("footerHeadline");

if (footerHeadline) {
    const words = footerHeadline.querySelectorAll(".footer-word");
    let currentWordIndex = 0;
    let illuminationInterval = null;

    function stepIllumination() {
        // Reset all words
        words.forEach(w => w.classList.remove("illuminated"));

        // Illuminate up to current index
        for (let i = 0; i <= currentWordIndex; i++) {
            words[i].classList.add("illuminated");
        }

        currentWordIndex++;

        // After illuminating all, hold briefly then reset
        if (currentWordIndex >= words.length) {
            setTimeout(() => {
                words.forEach(w => w.classList.remove("illuminated"));
                currentWordIndex = 0;
            }, 1200);
        }
    }

    // Only run when footer is visible
    const footerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!illuminationInterval) {
                    currentWordIndex = 0;
                    illuminationInterval = setInterval(stepIllumination, 450);
                }
            } else {
                if (illuminationInterval) {
                    clearInterval(illuminationInterval);
                    illuminationInterval = null;
                    words.forEach(w => w.classList.remove("illuminated"));
                    currentWordIndex = 0;
                }
            }
        });
    }, { threshold: 0.2 });

    footerObserver.observe(footerHeadline);
}

// ─── SECTION-AWARE CURSOR COLOR ────────────────────────────────────────────
// Black cursor inside hero, white cursor everywhere else.

document.body.classList.add("cursor-light");

const cursorObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            document.body.classList.remove("cursor-light");
        } else {
            document.body.classList.add("cursor-light");
        }
    });
}, { threshold: [0, 0.3, 0.5] });

cursorObserver.observe(heroWrapper);

// ─── MOBILE CAROUSEL NAVIGATION ───────────────────────────────────────────

if (isMobile) {
    const programsGrid = document.querySelector('.programs-grid');
    const progPrev = document.getElementById('progPrev');
    const progNext = document.getElementById('progNext');

    if (programsGrid && progPrev && progNext) {
        const scrollByCard = (direction) => {
            const card = programsGrid.querySelector('.program-card');
            if (!card) return;
            const cardWidth = card.offsetWidth + 16; // card width + gap
            programsGrid.scrollBy({
                left: direction * cardWidth,
                behavior: 'smooth'
            });
        };

        progPrev.addEventListener('click', () => scrollByCard(-1));
        progNext.addEventListener('click', () => scrollByCard(1));
    }
}
