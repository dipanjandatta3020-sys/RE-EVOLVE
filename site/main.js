/**
 * RE-EVOLVE — Unified JS
 */

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ─── SCENES CONFIGURATION ──────────────────────────────────────────────────
const SCENES = [
  {
    bg: '/1st%20Background.webp',
    char: '/1st%20Character.webp',
    mobileBg: '/Mobile%201.webp',
    accent: '#DAAB2D',
    gradient: 'linear-gradient(135deg, #DAAB2D, #F5D76E)',
    glow: 'rgba(218,171,45,0.35)'
  },
  {
    bg: '/2nd%20Background.webp',
    char: '/2nd%20Character.webp',
    mobileBg: '/Mobile%202.webp',
    accent: '#E63946',
    gradient: 'linear-gradient(135deg, #1A1A1A, #E63946)',
    glow: 'rgba(230,57,70,0.35)'
  },
  {
    bg: '/3rd%20Background.webp',
    char: '/3rd%20Character.webp',
    mobileBg: '/Mobile%203.webp',
    accent: '#7B2CBF',
    gradient: 'linear-gradient(135deg, #240046, #9D4EDD)',
    glow: 'rgba(123,44,191,0.35)'
  }
];

// ─── BACKGROUND & HERO ELEMENTS ──────────────────────────────────────────────
const heroWrapper = document.getElementById("cinematicHeroWrapper");
const bgs = document.querySelectorAll('.hero-bg');
const mobileBgs = document.querySelectorAll('.hero-mobile-bg');
const chars = document.querySelectorAll('.hero-char');
const heroHighlight = document.getElementById('heroHighlight');
const mainCta = document.getElementById('mainCtaButton');
const secondaryCta = document.getElementById('secondaryCtaButton');
const navCta = document.getElementById('navCtaButton');
const heroRadialGlow = document.getElementById('heroRadialGlow');

// ─── PRELOADER ──────────────────────────────────────────────────────────────
const preloader = document.getElementById("preloader");
const loadingDots = document.getElementById("loadingDots");
document.body.style.overflow = "hidden";
window.scrollTo(0, 0);

if (loadingDots) loadingDots.textContent = "0%";
const preloaderStart = Date.now();

let framesLoaded = 0;
const totalAssetsToLoad = SCENES.length * 3; // 3 bg + 3 char + 3 mobile = 9

function updateProgressUI() {
    if (loadingDots) {
        const percent = Math.min(100, Math.floor((framesLoaded / totalAssetsToLoad) * 100));
        loadingDots.innerText = `${percent}%`;
    }
}

function dismissPreloader() {
    const elapsed = Date.now() - preloaderStart;
    const remaining = Math.max(0, 1500 - elapsed);
    setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = "";
        if (preloader) {
            preloader.classList.add("hidden");
            setTimeout(() => preloader.remove(), 700);
        }
        initCinematicLoop();
    }, remaining);
}

// Preload the 6 premium hero images before dismissing loading screen
SCENES.forEach(scene => {
    [scene.bg, scene.char, scene.mobileBg].forEach(url => { if(!url) return;
        const img = new Image();
        img.src = url;
        img.onload = img.onerror = () => {
            framesLoaded++;
            updateProgressUI();
            if (framesLoaded === totalAssetsToLoad) dismissPreloader();
        };
    });
});
if (totalAssetsToLoad === 0) dismissPreloader();


// ─── CINEMATIC HERO LOOP ────────────────────────────────────────────────────
let activeIndex = 0;
function applyScene(index) {
    const scene = SCENES[index];
    
    // Crossfade Class Toggles
    bgs.forEach((bg, i) => {
        bg.classList.toggle('scene-active', i === index);
        bg.classList.toggle('scene-inactive', i !== index);
    });
    mobileBgs.forEach((bg, i) => {
        bg.classList.toggle('scene-active', i === index);
        bg.classList.toggle('scene-inactive', i !== index);
    });
    
    chars.forEach((char, i) => {
        char.classList.toggle('scene-active', i === index);
        char.classList.toggle('scene-inactive', i !== index);
        if (i === index) {
            char.style.filter = `drop-shadow(0px 40px 60px rgba(0,0,0,0.6)) drop-shadow(4px 0px 15px ${scene.glow}) blur(0px) brightness(1)`;
        } else {
            char.style.filter = `drop-shadow(0px 40px 60px rgba(0,0,0,0.6)) blur(4px) brightness(0.7)`;
        }
    });

    // Update Color Tokens directly via JS styling
    if (heroHighlight) heroHighlight.style.color = scene.accent;
    if (heroRadialGlow) heroRadialGlow.style.background = `radial-gradient(circle at 75% 40%, ${scene.glow}, transparent 40%)`;
    
    // UI Button Updates
    if (mainCta) {
        mainCta.style.background = scene.gradient;
        mainCta.style.boxShadow = `0 8px 30px ${scene.glow}`;
    }
    if (secondaryCta) {
        secondaryCta.style.color = scene.accent;
        secondaryCta.style.borderColor = scene.glow;
        secondaryCta.onmouseenter = () => secondaryCta.style.backgroundColor = scene.glow;
        secondaryCta.onmouseleave = () => secondaryCta.style.backgroundColor = 'transparent';
    }
    if (navCta) {
        navCta.style.background = scene.gradient;
        navCta.style.boxShadow = `0 4px 15px ${scene.glow}`;
    }
}

function initCinematicLoop() {
    applyScene(0);
    setInterval(() => {
        activeIndex = (activeIndex + 1) % SCENES.length;
        applyScene(activeIndex);
    }, 1800);
}


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
            const viewH = window.innerHeight;

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
        words.forEach(w => w.classList.remove("illuminated"));
        for (let i = 0; i <= currentWordIndex; i++) {
            words[i].classList.add("illuminated");
        }
        currentWordIndex++;
        if (currentWordIndex >= words.length) {
            setTimeout(() => {
                words.forEach(w => w.classList.remove("illuminated"));
                currentWordIndex = 0;
            }, 1200);
        }
    }

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

if (heroWrapper) cursorObserver.observe(heroWrapper);

// ─── MOBILE HAMBURGER MENU ────────────────────────────────────────────────
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinksEl = document.getElementById('navLinks');

if (mobileMenuBtn && navLinksEl) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinksEl.classList.toggle('mobile-open');
    });

    // Close menu when a link is clicked
    navLinksEl.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            navLinksEl.classList.remove('mobile-open');
        });
    });
}

// ─── MOBILE CAROUSEL NAVIGATION ───────────────────────────────────────────
if (isMobile) {
    const programsGrid = document.querySelector('.programs-grid');
    const progPrev = document.getElementById('progPrev');
    const progNext = document.getElementById('progNext');

    if (programsGrid && progPrev && progNext) {
        const scrollByCard = (direction) => {
            const card = programsGrid.querySelector('.program-card');
            if (!card) return;
            const cardWidth = card.offsetWidth + 16;
            programsGrid.scrollBy({
                left: direction * cardWidth,
                behavior: 'smooth'
            });
        };

        progPrev.addEventListener('click', () => scrollByCard(-1));
        progNext.addEventListener('click', () => scrollByCard(1));
    }
}
