import { CatEngine } from './engine.js';

const STYLE_ID = 'cat-screensaver-style';

const CSS = `
#cat-screensaver {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    background: rgba(0, 0, 0, var(--cs-dim, 0.85));
    cursor: none;
    opacity: 0;
    transition: opacity 600ms ease;
    overflow: hidden;
}
#cat-screensaver.cs-open { opacity: 1; }
#cat-screensaver.cs-closing { opacity: 0; transition-duration: 200ms; }
#cat-screensaver canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#cat-screensaver .cs-clock {
    position: absolute;
    right: 4vw;
    bottom: 4vh;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: clamp(48px, 9vw, 128px);
    font-variant-numeric: tabular-nums;
    font-weight: 300;
    letter-spacing: 0.04em;
    line-height: 1;
    color: rgba(255, 255, 255, 0.78);
    text-shadow: 0 2px 30px rgba(0, 0, 0, 0.75);
    transition: transform 1.2s ease;
    pointer-events: none;
    user-select: none;
}
@media (prefers-reduced-motion: reduce) {
    #cat-screensaver { transition-duration: 1ms; }
    #cat-screensaver .cs-clock { transition: none; }
}
`;

const DRIFT = [
    [0, 0],
    [-24, -14],
    [12, -22],
    [-10, 10]
];

function injectStyle() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

function clockText() {
    return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function clampDim(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : 0.85;
}

/**
 * The fullscreen layer. It does not decide when to appear; main.js owns that.
 */
export class Overlay {
    constructor(config, options = {}) {
        this.config = config || {};
        this.onClose = options.onClose;
        this.element = null;
        this.engine = null;
        this.clock = null;
        this.clockTimer = 0;
        this.driftStep = 0;
        this.lastMinute = -1;
        this.previousFocus = null;
    }

    get isOpen() {
        return this.element !== null;
    }

    open() {
        if (this.element) {
            return;
        }

        injectStyle();
        this.previousFocus = document.activeElement;
        this.driftStep = 0;
        this.lastMinute = new Date().getMinutes();

        const element = document.createElement('div');
        element.id = 'cat-screensaver';
        element.setAttribute('role', 'presentation');
        element.setAttribute('aria-hidden', 'true');
        element.style.setProperty('--cs-dim', String(clampDim(this.config.BackgroundDim)));
        element.tabIndex = -1;

        const canvas = document.createElement('canvas');
        element.appendChild(canvas);

        if (this.config.ShowClock !== false) {
            this.clock = document.createElement('div');
            this.clock.className = 'cs-clock';
            this.clock.textContent = clockText();
            element.appendChild(this.clock);
        }

        document.body.appendChild(element);
        this.element = element;

        // Force a style flush so the 600 ms fade actually runs.
        void element.offsetWidth;
        element.classList.add('cs-open');

        try {
            element.focus({ preventScroll: true });
        } catch {
            // Focus is a nicety, not a requirement.
        }

        this.engine = new CatEngine(canvas, this.config);
        this.engine.start();
        this.clockTimer = window.setInterval(() => this.tickClock(), 1000);
    }

    tickClock() {
        if (!this.element) {
            return;
        }

        const now = new Date();
        if (this.clock) {
            this.clock.textContent = clockText();
            if (this.config.DriftAntiBurnIn !== false && now.getMinutes() !== this.lastMinute) {
                this.lastMinute = now.getMinutes();
                this.driftStep = (this.driftStep + 1) % DRIFT.length;
                const [x, y] = DRIFT[this.driftStep];
                this.clock.style.transform = `translate(${x}px, ${y}px)`;
            }
        }
    }

    close() {
        if (!this.element) {
            return;
        }

        const element = this.element;
        this.element = null;

        if (this.clockTimer) {
            window.clearInterval(this.clockTimer);
            this.clockTimer = 0;
        }

        if (this.engine) {
            this.engine.stop();
            this.engine = null;
        }

        element.classList.remove('cs-open');
        element.classList.add('cs-closing');
        window.setTimeout(() => element.remove(), 220);

        if (this.previousFocus && typeof this.previousFocus.focus === 'function'
            && document.contains(this.previousFocus)) {
            try {
                this.previousFocus.focus({ preventScroll: true });
            } catch {
                // The element may have been removed while the screensaver ran.
            }
        }

        this.previousFocus = null;
        this.clock = null;
        if (typeof this.onClose === 'function') {
            this.onClose();
        }
    }
}
