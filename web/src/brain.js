/**
 * Cat state machine and movement. Everything takes an injectable rng so the
 * tests can pin every branch.
 */

export const STATES = ['walk', 'run', 'idle', 'sit', 'groom', 'stretch', 'sleep'];

export const SPEEDS = { walk: 60, run: 160 };

export const DURATIONS = {
    walk: [3, 8],
    run: [1, 3],
    idle: [2, 5],
    sit: [4, 10],
    groom: [3, 6],
    stretch: [1.5, 1.5],
    sleep: [15, 40]
};

const TRANSITIONS = {
    walk: [['idle', 0.4], ['sit', 0.3], ['run', 0.1], ['walk', 0.2]],
    run: [['walk', 0.6], ['idle', 0.4]],
    idle: [['walk', 0.5], ['sit', 0.3], ['stretch', 0.2]],
    sit: [['groom', 0.35], ['sleep', 0.25], ['walk', 0.4]],
    groom: [['sit', 0.7], ['walk', 0.3]],
    stretch: [['walk', 1]],
    sleep: [['stretch', 1]]
};

function clamp01(value) {
    return Math.min(Math.max(value, 0), 0.999999999);
}

function pickWeighted(entries, rng) {
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    let roll = clamp01(rng()) * total;

    for (const [state, weight] of entries) {
        if (roll < weight) {
            return state;
        }
        roll -= weight;
    }

    return entries[entries.length - 1][0];
}

/**
 * @param {string} current current state
 * @param {() => number} rng
 * @param {{tired?: boolean}} context tired doubles the sleep weight
 * @returns {string}
 */
export function nextState(current, rng = Math.random, context = {}) {
    const base = TRANSITIONS[current] || TRANSITIONS.idle;
    const weighted = base.map(([state, weight]) => [
        state,
        context.tired && state === 'sleep' ? weight * 2 : weight
    ]);

    return pickWeighted(weighted, rng);
}

export function pickDuration(state, rng = Math.random) {
    const range = DURATIONS[state] || DURATIONS.idle;
    return range[0] + (range[1] - range[0]) * clamp01(rng());
}

export function createCat(options = {}) {
    const rng = options.rng || Math.random;
    const state = options.state || 'walk';

    return {
        x: options.x ?? 0,
        y: options.y ?? 0,
        direction: options.direction ?? (rng() < 0.5 ? -1 : 1),
        scale: options.scale ?? 1,
        palette: options.palette ?? 'orange',
        seed: options.seed ?? 1,
        state,
        stateTime: 0,
        duration: options.duration ?? pickDuration(state, rng),
        elapsed: 0
    };
}

/**
 * Moves one cat and advances its state machine.
 *
 * @param {object} cat mutable cat
 * @param {number} dt seconds, already clamped by the caller
 * @param {{minX:number,maxX:number}} bounds walking limits, in pixels
 * @param {() => number} rng
 * @param {{tired?: boolean}} context
 * @returns {object} the same cat
 */
export function update(cat, dt, bounds, rng = Math.random, context = {}) {
    const step = Math.min(Math.max(Number(dt) || 0, 0), 0.05);
    cat.elapsed += step;
    cat.stateTime += step;

    if (cat.state === 'walk' || cat.state === 'run') {
        cat.x += SPEEDS[cat.state] * cat.scale * cat.direction * step;

        if (cat.x < bounds.minX && cat.direction < 0) {
            cat.x = bounds.minX;
            cat.direction = 1;
        } else if (cat.x > bounds.maxX && cat.direction > 0) {
            cat.x = bounds.maxX;
            cat.direction = -1;
        }
    }

    if (cat.stateTime >= cat.duration) {
        const previous = cat.state;
        cat.state = nextState(previous, rng, context);
        cat.stateTime = 0;
        cat.duration = pickDuration(cat.state, rng);

        // "walk" can follow "walk": that means the cat turns around.
        if (previous === 'walk' && cat.state === 'walk') {
            cat.direction *= -1;
        }
    }

    return cat;
}

/**
 * Stops one of two walkers that got too close, so they do not walk through
 * each other for long.
 */
export function separateCats(cats, rng = Math.random, distance = 80) {
    for (let i = 0; i < cats.length; i += 1) {
        for (let j = i + 1; j < cats.length; j += 1) {
            const a = cats[i];
            const b = cats[j];
            if (a.state !== 'walk' || b.state !== 'walk') {
                continue;
            }

            const gap = distance * Math.max(a.scale, b.scale);
            if (Math.abs(a.x - b.x) >= gap) {
                continue;
            }

            const loser = rng() < 0.5 ? a : b;
            loser.state = 'sit';
            loser.stateTime = 0;
            loser.duration = pickDuration('sit', rng);
        }
    }
}
