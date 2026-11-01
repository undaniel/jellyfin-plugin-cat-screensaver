import { describe, expect, it } from 'vitest';
import {
    DURATIONS,
    createCat,
    nextState,
    pickDuration,
    separateCats,
    update
} from '../src/brain.js';

const fixed = (value) => () => value;

describe('nextState', () => {
    it('follows the walk table', () => {
        expect(nextState('walk', fixed(0))).toBe('idle');
        expect(nextState('walk', fixed(0.41))).toBe('sit');
        expect(nextState('walk', fixed(0.71))).toBe('run');
        expect(nextState('walk', fixed(0.81))).toBe('walk');
    });

    it('follows the run table', () => {
        expect(nextState('run', fixed(0))).toBe('walk');
        expect(nextState('run', fixed(0.61))).toBe('idle');
    });

    it('follows the idle table', () => {
        expect(nextState('idle', fixed(0))).toBe('walk');
        expect(nextState('idle', fixed(0.51))).toBe('sit');
        expect(nextState('idle', fixed(0.81))).toBe('stretch');
    });

    it('follows the sit table', () => {
        expect(nextState('sit', fixed(0))).toBe('groom');
        expect(nextState('sit', fixed(0.36))).toBe('sleep');
        expect(nextState('sit', fixed(0.61))).toBe('walk');
    });

    it('follows the groom table', () => {
        expect(nextState('groom', fixed(0))).toBe('sit');
        expect(nextState('groom', fixed(0.71))).toBe('walk');
    });

    it('returns from stretch and sleep', () => {
        expect(nextState('stretch', fixed(0.99))).toBe('walk');
        expect(nextState('sleep', fixed(0.99))).toBe('stretch');
    });

    it('doubles the sleep weight when tired', () => {
        expect(nextState('sit', fixed(0.32))).toBe('groom');
        expect(nextState('sit', fixed(0.32), { tired: true })).toBe('sleep');
    });

    it('falls back to the idle table for an unknown state', () => {
        expect(nextState('unknown', fixed(0))).toBe('walk');
    });
});

describe('pickDuration', () => {
    it('respects each range', () => {
        for (const [state, [min, max]] of Object.entries(DURATIONS)) {
            expect(pickDuration(state, fixed(0))).toBe(min);
            expect(pickDuration(state, fixed(0.999999))).toBeCloseTo(max, 4);
        }
    });

    it('keeps stretch fixed', () => {
        expect(pickDuration('stretch', fixed(0.5))).toBe(1.5);
    });
});

describe('update', () => {
    it('walks in the current direction', () => {
        const cat = createCat({ x: 100, direction: 1, scale: 1, duration: 100 });
        for (let i = 0; i < 20; i += 1) {
            update(cat, 0.05, { minX: 40, maxX: 400 }, fixed(0));
        }
        expect(cat.x).toBeCloseTo(160, 5);
        expect(cat.direction).toBe(1);
    });

    it('turns around at the left border', () => {
        const cat = createCat({ x: 40.1, direction: -1, duration: 100 });
        update(cat, 0.05, { minX: 40, maxX: 400 }, fixed(0));
        expect(cat.x).toBe(40);
        expect(cat.direction).toBe(1);
    });

    it('turns around at the right border', () => {
        const cat = createCat({ x: 399.9, direction: 1, duration: 100 });
        update(cat, 0.05, { minX: 40, maxX: 400 }, fixed(0));
        expect(cat.x).toBe(400);
        expect(cat.direction).toBe(-1);
    });

    it('changes state when the timer expires', () => {
        const cat = createCat({ x: 100, direction: 1, state: 'walk', duration: 0.01 });
        update(cat, 0.05, { minX: 0, maxX: 1000 }, fixed(0));
        expect(cat.state).toBe('idle');
        expect(cat.stateTime).toBe(0);
        expect(cat.duration).toBeGreaterThanOrEqual(2);
    });

    it('walk to walk means a direction change', () => {
        const cat = createCat({ x: 100, direction: 1, state: 'walk', duration: 0.01 });
        update(cat, 0.05, { minX: 0, maxX: 1000 }, fixed(0.9));
        expect(cat.state).toBe('walk');
        expect(cat.direction).toBe(-1);
    });

    it('clamps enormous dt values', () => {
        const cat = createCat({ x: 100, direction: 1, duration: 100 });
        update(cat, 30, { minX: 0, maxX: 1000 }, fixed(0));
        expect(cat.x).toBeCloseTo(103, 5);
    });
});

describe('separateCats', () => {
    it('sits one of two close walkers', () => {
        const a = createCat({ x: 100, state: 'walk', duration: 100 });
        const b = createCat({ x: 120, state: 'walk', duration: 100 });
        separateCats([a, b], fixed(0));
        expect(a.state).toBe('sit');
        expect(b.state).toBe('walk');
    });

    it('leaves distant cats alone', () => {
        const a = createCat({ x: 100, state: 'walk', duration: 100 });
        const b = createCat({ x: 300, state: 'walk', duration: 100 });
        separateCats([a, b], fixed(0));
        expect(a.state).toBe('walk');
        expect(b.state).toBe('walk');
    });
});
