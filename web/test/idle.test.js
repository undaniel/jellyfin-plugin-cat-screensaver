import { describe, expect, it } from 'vitest';
import {
    collectMediaState,
    createIdleState,
    isTypingElement,
    recordActivity,
    shouldActivate
} from '../src/idle.js';

const CONFIG = {
    Enabled: true,
    IdleTimeoutSeconds: 180,
    ActivateDuringMusic: true
};

function stateAt(now, overrides = {}) {
    return {
        ...createIdleState(now),
        ...overrides
    };
}

describe('shouldActivate', () => {
    it('waits for the configured timeout', () => {
        const state = stateAt(1_000_000);
        expect(shouldActivate(state, 1_000_000 + 179_999, CONFIG)).toBe(false);
        expect(shouldActivate(state, 1_000_000 + 180_000, CONFIG)).toBe(true);
    });

    it('never activates when the plugin is disabled', () => {
        expect(shouldActivate(stateAt(0), 10_000_000, { ...CONFIG, Enabled: false })).toBe(false);
    });

    it('does not activate while a video plays', () => {
        expect(shouldActivate(stateAt(0, { videoPlaying: true }), 10_000_000, CONFIG)).toBe(false);
    });

    it('does not activate while audio plays and music activation is off', () => {
        const config = { ...CONFIG, ActivateDuringMusic: false };
        expect(shouldActivate(stateAt(0, { audioPlaying: true }), 10_000_000, config)).toBe(false);
        expect(shouldActivate(stateAt(0, { audioPlaying: true }), 10_000_000, CONFIG)).toBe(true);
    });

    it('does not activate in a hidden tab', () => {
        expect(shouldActivate(stateAt(0, { hidden: true }), 10_000_000, CONFIG)).toBe(false);
    });

    it('does not activate while typing', () => {
        expect(shouldActivate(stateAt(0, { typing: true }), 10_000_000, CONFIG)).toBe(false);
    });

    it('clamps a too small timeout up to 30 seconds', () => {
        const config = { ...CONFIG, IdleTimeoutSeconds: 10 };
        expect(shouldActivate(stateAt(0), 20_000, config)).toBe(false);
        expect(shouldActivate(stateAt(0), 30_000, config)).toBe(true);
    });

    it('clamps a too large timeout down to one hour', () => {
        const config = { ...CONFIG, IdleTimeoutSeconds: 99_999 };
        expect(shouldActivate(stateAt(0), 3_599_000, config)).toBe(false);
        expect(shouldActivate(stateAt(0), 3_600_000, config)).toBe(true);
    });

    it('falls back to 180 seconds for invalid input', () => {
        const config = { ...CONFIG, IdleTimeoutSeconds: 'nope' };
        expect(shouldActivate(stateAt(0), 179_000, config)).toBe(false);
        expect(shouldActivate(stateAt(0), 180_000, config)).toBe(true);
    });
});

describe('recordActivity', () => {
    it('moves the deadline', () => {
        const state = createIdleState(0);
        recordActivity(state, 5_000);
        expect(state.lastActivityAt).toBe(5_000);
        expect(shouldActivate(state, 184_999, CONFIG)).toBe(false);
        expect(shouldActivate(state, 185_000, CONFIG)).toBe(true);
    });
});

describe('isTypingElement', () => {
    it('detects inputs, textareas and contenteditable', () => {
        expect(isTypingElement({ tagName: 'INPUT' })).toBe(true);
        expect(isTypingElement({ tagName: 'TEXTAREA' })).toBe(true);
        expect(isTypingElement({ tagName: 'DIV', isContentEditable: true })).toBe(true);
        expect(isTypingElement({ tagName: 'DIV', getAttribute: () => 'true' })).toBe(true);
        expect(isTypingElement({ tagName: 'DIV', getAttribute: () => null })).toBe(false);
        expect(isTypingElement(null)).toBe(false);
    });
});

describe('collectMediaState', () => {
    it('ignores paused media and muted audio', () => {
        const doc = document.implementation.createHTMLDocument('media');
        const video = doc.createElement('video');
        const audio = doc.createElement('audio');
        doc.body.appendChild(video);
        doc.body.appendChild(audio);

        Object.defineProperty(video, 'paused', { value: true });
        Object.defineProperty(video, 'ended', { value: false });
        Object.defineProperty(audio, 'paused', { value: false });
        Object.defineProperty(audio, 'ended', { value: false });
        Object.defineProperty(audio, 'muted', { value: true });

        expect(collectMediaState(doc)).toEqual({ videoPlaying: false, audioPlaying: false });
    });

    it('reports playing video and audible audio', () => {
        const doc = document.implementation.createHTMLDocument('media');
        const video = doc.createElement('video');
        const audio = doc.createElement('audio');
        doc.body.appendChild(video);
        doc.body.appendChild(audio);

        Object.defineProperty(video, 'paused', { value: false });
        Object.defineProperty(video, 'ended', { value: false });
        Object.defineProperty(audio, 'paused', { value: false });
        Object.defineProperty(audio, 'ended', { value: false });
        Object.defineProperty(audio, 'muted', { value: false });
        Object.defineProperty(audio, 'volume', { value: 1 });

        expect(collectMediaState(doc)).toEqual({ videoPlaying: true, audioPlaying: true });
    });
});
