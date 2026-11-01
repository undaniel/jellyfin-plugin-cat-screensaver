/**
 * Pure inactivity logic. No DOM access here except the small helpers that
 * receive a document explicitly, so the rules can be tested without a browser.
 */

export const DEFAULT_TIMEOUT_SECONDS = 180;
export const MIN_TIMEOUT_SECONDS = 30;
export const MAX_TIMEOUT_SECONDS = 3600;

export const ACTIVITY_EVENTS = [
    'mousedown',
    'pointerdown',
    'keydown',
    'wheel',
    'touchstart',
    'focusin'
];

export function createIdleState(now = Date.now()) {
    return {
        lastActivityAt: now,
        videoPlaying: false,
        audioPlaying: false,
        hidden: false,
        typing: false
    };
}

export function recordActivity(state, now = Date.now()) {
    state.lastActivityAt = now;
    return state;
}

export function isTypingElement(element) {
    if (!element) {
        return false;
    }

    const tag = String(element.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return true;
    }

    if (element.isContentEditable) {
        return true;
    }

    const editable = element.getAttribute && element.getAttribute('contenteditable');
    return editable === '' || editable === 'true' || editable === 'plaintext-only';
}

export function collectMediaState(doc = document) {
    const result = { videoPlaying: false, audioPlaying: false };
    if (!doc || typeof doc.querySelectorAll !== 'function') {
        return result;
    }

    const media = doc.querySelectorAll('video, audio');
    for (const element of media) {
        if (element.paused || element.ended) {
            continue;
        }

        if (String(element.tagName || '').toLowerCase() === 'video') {
            result.videoPlaying = true;
        } else if (!element.muted && element.volume !== 0) {
            result.audioPlaying = true;
        }
    }

    return result;
}

/**
 * The one decision the whole plugin hangs on.
 *
 * @param {{lastActivityAt:number, videoPlaying:boolean, audioPlaying:boolean, hidden:boolean, typing:boolean}} state
 * @param {number} now milliseconds
 * @param {object} config plugin configuration
 * @returns {boolean}
 */
export function shouldActivate(state, now, config = {}) {
    if (!state || !config || config.Enabled === false) {
        return false;
    }

    const configured = Number(config.IdleTimeoutSeconds);
    const timeout = Math.min(
        MAX_TIMEOUT_SECONDS,
        Math.max(MIN_TIMEOUT_SECONDS, Number.isFinite(configured) ? configured : DEFAULT_TIMEOUT_SECONDS)
    );

    if (!Number.isFinite(now) || now - state.lastActivityAt < timeout * 1000) {
        return false;
    }

    if (state.videoPlaying || state.hidden || state.typing) {
        return false;
    }

    if (state.audioPlaying && config.ActivateDuringMusic === false) {
        return false;
    }

    return true;
}
