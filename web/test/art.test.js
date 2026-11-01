import { describe, expect, it } from 'vitest';
import {
    PALETTE_NAMES,
    POSE_FRAMES,
    frameForPose,
    paletteFor
} from '../src/art.js';

describe('art metadata', () => {
    it('has the documented palettes', () => {
        expect(PALETTE_NAMES).toEqual(['orange', 'black', 'gray', 'white', 'calico']);
    });

    it('has frames for every pose', () => {
        expect(POSE_FRAMES).toEqual({
            walk: 4,
            run: 4,
            idle: 2,
            sit: 4,
            groom: 2,
            stretch: 1,
            sleep: 2
        });
    });

    it('selects deterministic frames', () => {
        expect(frameForPose('walk', 0)).toBe(0);
        expect(frameForPose('walk', 0.12)).toBe(1);
        expect(frameForPose('run', 0.21)).toBe(3);
        expect(frameForPose('idle', 0)).toBe(0);
        expect(frameForPose('idle', 1.1)).toBe(1);
        expect(frameForPose('idle', 4.61)).toBe(0);
        expect(frameForPose('sit', 0.5)).toBe(1);
        expect(frameForPose('stretch', 12)).toBe(0);
        expect(frameForPose('unknown', 12)).toBe(0);
    });

    it('falls back to orange for an unknown palette', () => {
        const palette = paletteFor('nope', 7);
        expect(palette.name).toBe('orange');
        expect(palette.seed).toBe(7);
    });

    it('keeps a calico seed for per-cat patches', () => {
        expect(paletteFor('calico', 3).seed).toBe(3);
    });
});
