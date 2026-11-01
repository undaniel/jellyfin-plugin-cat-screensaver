import {
    ACTIVITY_EVENTS,
    collectMediaState,
    createIdleState,
    isTypingElement,
    recordActivity,
    shouldActivate
} from './idle.js';
import { Overlay } from './overlay.js';

const VERSION = '1.0.0.6';
const BOOTED_KEY = '__catScreensaverBooted';
const STORAGE_KEY = 'catScreensaver.disabled';
const MENU_ATTRIBUTE = 'data-cat-screensaver-toggle';

const SCRIPT_SRC = (() => {
    try {
        return document.currentScript?.src
            || document.querySelector('script[src*="cat-screensaver.js"]')?.src
            || null;
    } catch {
        return null;
    }
})();

let config = null;
let idle = createIdleState();
let overlay = null;
let disabled = false;
let dismissHandlers = [];
let menuTimer = 0;
let tickTimer = 0;

function getConfigUrl() {
    if (SCRIPT_SRC) {
        try {
            return new URL('Config', SCRIPT_SRC).href;
        } catch {
            // Fall through to the relative guess.
        }
    }

    try {
        return new URL('../CatScreensaver/Config', document.baseURI).href;
    } catch {
        return null;
    }
}

async function fetchConfig() {
    const url = getConfigUrl();
    if (!url) {
        throw new Error('CatScreensaver: no config URL');
    }

    const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error(`CatScreensaver: config HTTP ${response.status}`);
    }

    return response.json();
}

function readDisabled() {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeDisabled(value) {
    try {
        if (value) {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Private mode or blocked storage: keep the in-memory value only.
    }
}

function getApiClient() {
    return window.ApiClient || window.apiClient || null;
}

function currentUserId() {
    try {
        const client = getApiClient();
        return client?.getCurrentUserId?.() || null;
    } catch {
        return null;
    }
}

function isUserDisabled() {
    return disabled || readDisabled();
}

function showOverlay(force = false) {
    if (!config || overlay) {
        return Boolean(overlay);
    }

    if (!force && (isUserDisabled() || !currentUserId())) {
        return false;
    }

    const effective = force ? { ...config, Enabled: true } : config;
    overlay = new Overlay(effective, {
        onClose: () => {
            overlay = null;
        }
    });
    overlay.open();
    installDismissListeners();
    return true;
}

function closeOverlay() {
    recordActivity(idle, Date.now());
    removeDismissListeners();
    if (overlay) {
        overlay.close();
    }
}

function installDismissListeners() {
    if (dismissHandlers.length) {
        return;
    }

    // The click or key that opened the preview must not close it immediately.
    const armedAt = performance.now() + 300;
    const handler = (event) => {
        if (performance.now() < armedAt) {
            return;
        }

        if (event.type !== 'mousemove') {
            if (event.cancelable) {
                event.preventDefault();
            }
            event.stopImmediatePropagation?.();
        }
        event.stopPropagation();
        closeOverlay();
    };

    const types = ['mousedown', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'focusin', 'mousemove'];
    for (const type of types) {
        const options = { capture: true, passive: type === 'mousemove' };
        document.addEventListener(type, handler, options);
        dismissHandlers.push([type, handler, options]);
    }
}

function removeDismissListeners() {
    for (const [type, handler, options] of dismissHandlers) {
        document.removeEventListener(type, handler, options);
    }
    dismissHandlers = [];
}

function menuLabel() {
    return `🐈 Salvapantallas de gatos: ${isUserDisabled() ? 'Desactivado' : 'Activado'}`;
}

function refreshMenuLabel() {
    const item = document.querySelector(`[${MENU_ATTRIBUTE}]`);
    if (item) {
        item.textContent = menuLabel();
    }
}

function closeMuiMenu() {
    const menu = document.querySelector('#app-user-menu');
    if (!menu || menu.classList.contains('MuiModal-hidden')) {
        return;
    }

    // MUI closes its menu on Escape; the injected item is not a React MenuItem.
    menu.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true
    }));
}

function toggleOptOut(event) {
    const inMuiMenu = Boolean(event.currentTarget?.closest?.('#app-user-menu'));
    event.preventDefault();
    event.stopPropagation();
    disabled = !isUserDisabled();
    writeDisabled(disabled);

    if (disabled) {
        closeOverlay();
    }

    refreshMenuLabel();

    if (inMuiMenu) {
        closeMuiMenu();
    }
}

function ensureUserMenu() {
    try {
        if (!config || !currentUserId() || !document.body) {
            return;
        }

        if (config.AllowUserOptOut === false) {
            document.querySelector(`[${MENU_ATTRIBUTE}]`)?.remove();
            return;
        }

        const existing = document.querySelector(`[${MENU_ATTRIBUTE}]`);
        if (existing) {
            return;
        }

        // Prefer the 12.4 MUI user menu; the legacy drawer still exists but is
        // hidden behind the new shell.
        const container = document.querySelector('#app-user-menu .MuiMenu-list')
            || document.querySelector('#app-user-menu')
            || document.querySelector('.mainDrawer-scrollContainer')
            || document.querySelector('.mainDrawer .scrollContainer')
            || document.querySelector('.navMenuItems')
            || document.querySelector('#userMenu');

        if (!container) {
            return;
        }

        // Jellyfin 12.4 uses a MUI Menu (a list of role=menuitem nodes);
        // older versions use an anchor inside the side drawer.
        const isMuiMenu = container.id === 'app-user-menu'
            || container.classList.contains('MuiMenu-list');
        const item = document.createElement(isMuiMenu ? 'li' : 'a');
        if (!isMuiMenu) {
            item.href = '#';
            item.className = 'navMenuOption';
        } else {
            item.className = 'MuiButtonBase-root MuiMenuItem-root MuiMenuItem-gutters';
            item.setAttribute('role', 'menuitem');
            item.tabIndex = 0;
            item.style.cssText = 'display:flex;align-items:center;padding:8px 16px;cursor:pointer;font-size:.875rem;';
        }
        item.setAttribute(MENU_ATTRIBUTE, '1');
        item.textContent = menuLabel();
        item.addEventListener('click', toggleOptOut);
        container.appendChild(item);
    } catch {
        // A changed Jellyfin menu is not a reason to break the page.
    }
}

function updateIdleState() {
    const media = collectMediaState(document);
    idle.videoPlaying = media.videoPlaying;
    idle.audioPlaying = media.audioPlaying;
    idle.hidden = document.visibilityState === 'hidden';
    idle.typing = isTypingElement(document.activeElement);
}

function tick() {
    try {
        if (!config) {
            return;
        }

        const hasUser = Boolean(currentUserId());
        updateIdleState();

        if (!hasUser) {
            if (overlay) {
                closeOverlay();
            }
            return;
        }

        if (isUserDisabled()) {
            if (overlay) {
                closeOverlay();
            }
            return;
        }

        if (overlay) {
            if (idle.videoPlaying || (idle.audioPlaying && config.ActivateDuringMusic === false)) {
                closeOverlay();
            }
            return;
        }

        if (shouldActivate(idle, Date.now(), config)) {
            showOverlay();
        }
    } catch {
        // Never let a screensaver error reach Jellyfin's UI.
    }
}

function installActivityListeners() {
    let lastMove = { x: 0, y: 0, at: 0 };

    const activity = () => recordActivity(idle, Date.now());

    for (const type of ACTIVITY_EVENTS) {
        document.addEventListener(type, activity, { capture: true, passive: true });
    }

    window.addEventListener('focus', activity, { capture: true, passive: true });

    document.addEventListener('mousemove', (event) => {
        const now = Date.now();
        if (now - lastMove.at < 250) {
            return;
        }

        if (Math.hypot(event.clientX - lastMove.x, event.clientY - lastMove.y) < 4) {
            return;
        }

        lastMove = { x: event.clientX, y: event.clientY, at: now };
        recordActivity(idle, now);
    }, { capture: true, passive: true });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            recordActivity(idle, Date.now());
        }
    });
}

function installPublicApi() {
    window.CatScreensaver = {
        version: VERSION,
        isActive: () => Boolean(overlay),
        preview: async () => {
            try {
                const fresh = await fetchConfig();
                if (fresh) {
                    config = fresh;
                }
                return showOverlay(true);
            } catch {
                return false;
            }
        },
        stop: closeOverlay
    };
}

async function boot() {
    if (window[BOOTED_KEY]) {
        return;
    }
    window[BOOTED_KEY] = true;

    idle = createIdleState();
    disabled = readDisabled();
    installPublicApi();

    try {
        config = await fetchConfig();
    } catch {
        return;
    }

    if (!config || config.Enabled === false) {
        return;
    }

    installActivityListeners();
    tickTimer = window.setInterval(tick, 1000);
    menuTimer = window.setInterval(ensureUserMenu, 4000);
    ensureUserMenu();
    tick();
}

function whenReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

try {
    whenReady(() => {
        boot().catch(() => {
            // The plugin must never break the Jellyfin UI.
        });
    });
} catch {
    // Same, but for the synchronous phase.
}

// Keep timers reachable for the browser devtools without exposing internals.
void menuTimer;
void tickTimer;
