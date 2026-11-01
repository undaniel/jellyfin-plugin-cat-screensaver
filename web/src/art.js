/**
 * Original procedural cat art. Every shape is drawn here with canvas
 * primitives; the project ships no third-party sprites.
 *
 * Sprite space is 128 x 96 with the floor at y = 88.
 */

export const SPRITE_WIDTH = 128;
export const SPRITE_HEIGHT = 96;

export const POSE_FRAMES = Object.freeze({
    walk: 4,
    run: 4,
    idle: 2,
    sit: 4,
    groom: 2,
    stretch: 1,
    sleep: 2
});

const PALETTES = {
    orange: {
        body: '#E8913A', belly: '#F6D2A8', outline: '#7A3E10',
        eye: '#2B2118', nose: '#E8788A', inner: '#F2A7A0'
    },
    black: {
        body: '#2B2B2B', belly: '#3D3D3D', outline: '#101010',
        eye: '#E5D44A', nose: '#C46A76', inner: '#7A4650'
    },
    gray: {
        body: '#8C8F96', belly: '#C9CBD0', outline: '#4A4D54',
        eye: '#2B2118', nose: '#D08A96', inner: '#C58E96'
    },
    white: {
        body: '#F2F2F2', belly: '#FFFFFF', outline: '#9A9A9A',
        eye: '#3B6E8F', nose: '#E79AA8', inner: '#F4C5CD'
    },
    calico: {
        body: '#F6F1E7', belly: '#FFFFFF', outline: '#8C6B4A',
        eye: '#8A6A1E', nose: '#E79AA8', inner: '#F4C5CD',
        patches: ['#E8913A', '#2B2B2B']
    }
};

export const PALETTE_NAMES = Object.keys(PALETTES);

export function paletteFor(name, seed = 1) {
    const base = PALETTES[name] || PALETTES.orange;
    return { ...base, name: PALETTES[name] ? name : 'orange', seed };
}

export function frameForPose(pose, elapsed) {
    const t = Math.max(0, Number(elapsed) || 0);

    switch (pose) {
        case 'walk':
            return Math.floor(t * 9) % 4;
        case 'run':
            return Math.floor(t * 15) % 4;
        case 'idle': {
            const phase = t % 4.6;
            return phase > 1 && phase < 1.18 ? 1 : 0;
        }
        case 'sit':
            return Math.floor(t * 2.5) % 4;
        case 'groom':
            return Math.floor(t * 3) % 2;
        case 'sleep':
            return Math.floor(t * 0.9) % 2;
        default:
            return 0;
    }
}

function ellipse(ctx, x, y, rx, ry, fill, stroke, width = 2.5) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
    }
}

function polygon(ctx, points, fill, stroke, width = 2.5) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.closePath();
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
    }
}

function line(ctx, x1, y1, x2, y2, color, width = 2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function tailCurve(ctx, palette, x0, y0, x1, y1, x2, y2, x3, y3, width = 7) {
    const draw = (color, strokeWidth) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    };

    draw(palette.outline, width + 3);
    draw(palette.body, width);
}

function leg(ctx, palette, x, y, lean, length = 15) {
    line(ctx, x, y, x + lean, y + length, palette.outline, 8);
    line(ctx, x, y, x + lean, y + length, palette.body, 5);
}

function ear(ctx, palette, ax, ay, bx, by, cx, cy) {
    polygon(ctx, [ax, ay, bx, by, cx, cy], palette.body, palette.outline, 2.2);
    polygon(ctx, [
        ax + (bx - ax) * 0.35, ay + (by - ay) * 0.4,
        bx + (cx - bx) * 0.25, by + (cy - by) * 0.3,
        cx + (ax - cx) * 0.3, cy + (ay - cy) * 0.4
    ], palette.inner);
}

function eye(ctx, palette, x, y, closed) {
    if (closed) {
        line(ctx, x - 3, y, x + 3, y, palette.outline, 2);
        return;
    }

    ellipse(ctx, x, y, 2.2, 2.4, palette.eye);
}

function nose(ctx, palette, x, y) {
    polygon(ctx, [x - 2.5, y - 1.5, x + 2.5, y - 1.5, x, y + 2], palette.nose);
}

function whiskers(ctx, palette, x, y, direction = 1) {
    line(ctx, x, y, x + 13 * direction, y - 4, palette.outline, 1.2);
    line(ctx, x, y + 2, x + 14 * direction, y + 2, palette.outline, 1.2);
    line(ctx, x, y + 4, x + 13 * direction, y + 8, palette.outline, 1.2);
}

function seededRandom(seed) {
    let value = (Math.floor(seed) >>> 0) || 1;
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

function patches(ctx, palette, seed, cx, cy, rx, ry, count = 3) {
    if (!palette.patches) {
        return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    const random = seededRandom(seed * 7919 + 31);
    for (let i = 0; i < count; i += 1) {
        const px = cx + (random() - 0.5) * rx * 1.8;
        const py = cy + (random() - 0.5) * ry * 1.6;
        const size = 5 + random() * Math.min(rx, ry) * 0.7;
        ellipse(ctx, px, py, size, size * (0.6 + random() * 0.5), palette.patches[i % palette.patches.length]);
    }

    ctx.restore();
}

function drawStanding(ctx, palette, frame, options) {
    const running = options.running;
    const blink = options.blink;
    const cycle = frame % 4;
    const bob = running ? [0, -2, 0, -1][cycle] : [0, -1, 0, 1][cycle];
    const swing = running ? [10, -10, 10, -10][cycle] : [6, -6, 6, -6][cycle];
    const bodyY = 60 + bob;

    tailCurve(
        ctx, palette,
        32, bodyY + 4,
        14, 54 + bob,
        6, 28 + bob,
        24, 24 + bob
    );

    leg(ctx, palette, 44, 70 + bob, swing, 15);
    leg(ctx, palette, 52, 71 + bob, -swing * 0.5, 14);

    ellipse(ctx, 64, bodyY, 30, 17, palette.body, palette.outline, 2.5);
    ellipse(ctx, 63, bodyY + 5, 23, 9, palette.belly);
    patches(ctx, palette, palette.seed, 64, bodyY, 30, 17);

    leg(ctx, palette, 78, 70 + bob, -swing, 15);
    leg(ctx, palette, 86, 71 + bob, swing * 0.5, 14);

    const hx = 97;
    const hy = 42 + bob;
    ear(ctx, palette, hx - 15, hy - 7, hx - 14, hy - 26, hx - 2, hy - 13);
    ear(ctx, palette, hx - 2, hy - 13, hx + 10, hy - 25, hx + 14, hy - 6);
    ellipse(ctx, hx, hy, 17, 17, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed + 3, hx, hy, 17, 17, 1);
    ellipse(ctx, hx + 8, hy + 7, 8, 5, palette.belly);

    eye(ctx, palette, hx + 3, hy - 2, blink);
    eye(ctx, palette, hx + 12, hy - 2, blink);
    nose(ctx, palette, hx + 14, hy + 4);
    line(ctx, hx + 14, hy + 6, hx + 12, hy + 8, palette.outline, 1.2);
    whiskers(ctx, palette, hx + 15, hy + 4);
}

function drawSitting(ctx, palette, frame, options) {
    const wave = Math.sin((frame / 4) * Math.PI * 2) * 5;
    const blink = options.blink;

    tailCurve(ctx, palette, 40, 79, 12, 70, 16 + wave, 93, 46 + wave, 91);

    ellipse(ctx, 57, 75, 27, 19, palette.body, palette.outline, 2.5);
    ellipse(ctx, 62, 54, 17, 23, palette.body, palette.outline, 2.5);
    ellipse(ctx, 59, 79, 15, 9, palette.belly);
    patches(ctx, palette, palette.seed, 60, 66, 27, 24, 3);

    leg(ctx, palette, 73, 63, 0, 24);
    leg(ctx, palette, 83, 63, 0, 24);

    const hx = 67;
    const hy = 29;
    ear(ctx, palette, hx - 16, hy - 5, hx - 14, hy - 24, hx - 3, hy - 12);
    ear(ctx, palette, hx + 3, hy - 12, hx + 14, hy - 23, hx + 16, hy - 4);
    ellipse(ctx, hx, hy, 18, 18, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed + 5, hx, hy, 18, 18, 1);
    ellipse(ctx, hx, hy + 8, 9, 6, palette.belly);

    eye(ctx, palette, hx - 6, hy - 1, blink);
    eye(ctx, palette, hx + 6, hy - 1, blink);
    nose(ctx, palette, hx, hy + 7);
    line(ctx, hx, hy + 9, hx - 2, hy + 11, palette.outline, 1.2);
    line(ctx, hx, hy + 9, hx + 2, hy + 11, palette.outline, 1.2);
    whiskers(ctx, palette, hx - 9, hy + 7, -1);
    whiskers(ctx, palette, hx + 9, hy + 7, 1);
}

function drawGrooming(ctx, palette, frame) {
    const wave = Math.sin((frame / 2) * Math.PI * 2) * 3;

    tailCurve(ctx, palette, 40, 79, 12, 70, 16 + wave, 93, 46 + wave, 91);

    ellipse(ctx, 57, 75, 27, 19, palette.body, palette.outline, 2.5);
    ellipse(ctx, 62, 55, 16, 22, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed, 60, 66, 27, 24, 3);
    leg(ctx, palette, 72, 63, 0, 24);

    // Raised paw, licked by the tilted head.
    leg(ctx, palette, 79, 61, 7, 17);
    const hx = 72;
    const hy = 38;
    ear(ctx, palette, hx - 15, hy - 6, hx - 13, hy - 24, hx - 2, hy - 12);
    ear(ctx, palette, hx + 2, hy - 12, hx + 13, hy - 23, hx + 15, hy - 5);
    ellipse(ctx, hx, hy, 17, 17, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed + 5, hx, hy, 17, 17, 1);
    ellipse(ctx, hx + 2, hy + 8, 8, 5, palette.belly);

    eye(ctx, palette, hx - 5, hy + 1, true);
    eye(ctx, palette, hx + 6, hy + 1, true);
    nose(ctx, palette, hx + 3, hy + 7);
    polygon(ctx, [hx + 5, hy + 11, hx + 12, hy + 9, hx + 6, hy + 15], '#E8788A');
}

function drawStretching(ctx, palette) {
    tailCurve(ctx, palette, 32, 73, 18, 58, 8, 34, 22, 21);

    ellipse(ctx, 35, 68, 17, 16, palette.body, palette.outline, 2.5);
    ellipse(ctx, 66, 74, 38, 11, palette.body, palette.outline, 2.5);
    ellipse(ctx, 66, 78, 28, 6, palette.belly);
    patches(ctx, palette, palette.seed, 66, 74, 38, 11, 3);

    leg(ctx, palette, 101, 76, 14, 9);
    leg(ctx, palette, 94, 77, 12, 8);

    const hx = 101;
    const hy = 60;
    ear(ctx, palette, hx - 14, hy - 6, hx - 16, hy - 23, hx - 2, hy - 12);
    ear(ctx, palette, hx + 2, hy - 12, hx + 12, hy - 23, hx + 15, hy - 5);
    ellipse(ctx, hx, hy, 16, 16, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed + 5, hx, hy, 16, 16, 1);

    eye(ctx, palette, hx - 5, hy, true);
    eye(ctx, palette, hx + 5, hy, true);
    nose(ctx, palette, hx + 4, hy + 6);
    whiskers(ctx, palette, hx + 8, hy + 5);
}

function drawZ(ctx, x, y, size, color) {
    line(ctx, x, y, x + size, y, color, 2.2);
    line(ctx, x + size, y, x, y + size, color, 2.2);
    line(ctx, x, y + size, x + size, y + size, color, 2.2);
}

function drawSleeping(ctx, palette, frame) {
    const breathe = frame % 2 === 0 ? 0 : 1;

    tailCurve(ctx, palette, 30, 84, 16, 94, 48, 95, 72, 89);

    ellipse(ctx, 58, 76 + breathe, 38, 19 - breathe, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed, 58, 76, 38, 19, 4);

    const hx = 90;
    const hy = 68;
    ear(ctx, palette, hx - 14, hy - 5, hx - 14, hy - 21, hx - 2, hy - 11);
    ear(ctx, palette, hx + 2, hy - 11, hx + 12, hy - 21, hx + 14, hy - 4);
    ellipse(ctx, hx, hy, 15, 15, palette.body, palette.outline, 2.5);
    patches(ctx, palette, palette.seed + 5, hx, hy, 15, 15, 1);
    ellipse(ctx, hx + 2, hy + 7, 7, 4, palette.belly);

    eye(ctx, palette, hx - 3, hy, true);
    eye(ctx, palette, hx + 5, hy, true);
    nose(ctx, palette, hx + 3, hy + 6);
    whiskers(ctx, palette, hx + 7, hy + 5);

    drawZ(ctx, 98, 42, 7, '#FFFFFF');
    drawZ(ctx, 108, 29, 9, '#FFFFFF');
    drawZ(ctx, 120, 14, 11, '#FFFFFF');
}

/**
 * Draws one pose frame into a 128 x 96 space.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} pose one of POSE_FRAMES keys
 * @param {number} frame
 * @param {object} palette
 * @param {number} t unused by the baked frames, kept for the public contract
 */
export function drawPose(ctx, pose, frame, palette, t = 0) {
    void t;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (pose) {
        case 'walk':
            drawStanding(ctx, palette, frame, { running: false, blink: false });
            break;
        case 'run':
            drawStanding(ctx, palette, frame, { running: true, blink: false });
            break;
        case 'idle':
            drawStanding(ctx, palette, 0, { running: false, blink: frame === 1 });
            break;
        case 'sit':
            drawSitting(ctx, palette, frame, { blink: false });
            break;
        case 'groom':
            drawGrooming(ctx, palette, frame);
            break;
        case 'stretch':
            drawStretching(ctx, palette);
            break;
        case 'sleep':
            drawSleeping(ctx, palette, frame);
            break;
        default:
            drawStanding(ctx, palette, 0, { running: false, blink: false });
    }

    ctx.restore();
}

function createCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

/**
 * Bakes each palette/pose/frame once so the animation loop only calls
 * drawImage.
 */
export class SpriteCache {
    constructor(renderScale = 2) {
        this.renderScale = Math.max(1, renderScale);
        this.cache = new Map();
    }

    get(paletteName, pose, frame, seed = 1) {
        const key = `${paletteName}|${seed}|${pose}|${frame}`;
        const cached = this.cache.get(key);
        if (cached) {
            return cached;
        }

        const canvas = createCanvas(
            SPRITE_WIDTH * this.renderScale,
            SPRITE_HEIGHT * this.renderScale
        );
        const ctx = canvas.getContext('2d');
        ctx.scale(this.renderScale, this.renderScale);
        drawPose(ctx, pose, frame, paletteFor(paletteName, seed));

        this.cache.set(key, canvas);
        return canvas;
    }
}
