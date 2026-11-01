import { createCat, update, separateCats, pickDuration } from './brain.js';
import { SpriteCache, frameForPose, SPRITE_WIDTH, SPRITE_HEIGHT, PALETTE_NAMES } from './art.js';

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Owns the canvas, the cats and the single requestAnimationFrame loop.
 */
export class CatEngine {
    constructor(canvas, config = {}, rng = Math.random) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.rng = rng;
        this.sprites = new SpriteCache();
        this.cats = [];
        this.running = false;
        this.raf = 0;
        this.last = 0;
        this.fps = 60;
        this.slowSince = 0;
        this.activeSeconds = 0;
        this.width = 0;
        this.height = 0;
        this.reducedMotion = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.loop = this.loop.bind(this);
        this.onVisibilityChange = this.onVisibilityChange.bind(this);

        this.resize();
        this.spawn();
    }

    get catCount() {
        return clamp(Math.round(Number(this.config.CatCount) || 1), 1, 5);
    }

    get catScale() {
        return clamp(Number(this.config.CatScale) || 1, 0.5, 3);
    }

    get paletteNames() {
        const configured = Array.isArray(this.config.CatPalettes) ? this.config.CatPalettes : [];
        const valid = configured.filter((name) => PALETTE_NAMES.includes(name));
        return valid.length ? valid : ['orange'];
    }

    resize() {
        const width = Math.max(1, window.innerWidth || 1);
        const height = Math.max(1, window.innerHeight || 1);
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        this.width = width;
        this.height = height;
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const floorTop = this.floorTop();
        for (const cat of this.cats) {
            const minX = 40 * cat.scale;
            const maxX = width - 40 * cat.scale;
            cat.x = clamp(cat.x, minX, maxX);
            cat.y = clamp(cat.y, floorTop + 10, height - 6);
        }
    }

    floorTop() {
        return this.height * 0.85;
    }

    spawn() {
        this.cats = [];
        const count = this.catCount;
        const scale = this.catScale;
        const names = this.paletteNames;
        const floorTop = this.floorTop();
        const bottom = Math.max(floorTop + 12, this.height - 6);
        const band = Math.max(1, bottom - floorTop - 10);

        for (let i = 0; i < count; i += 1) {
            const direction = i % 2 === 0 ? 1 : -1;
            const x = direction > 0 ? -70 * scale : this.width + 70 * scale;
            const slot = (i + 0.5) / count;
            const y = clamp(
                floorTop + 10 + slot * band + (this.rng() - 0.5) * 10,
                floorTop + 10,
                bottom
            );

            const cat = createCat({
                x,
                y,
                direction,
                scale,
                palette: names[i % names.length],
                seed: i + 1,
                state: this.reducedMotion ? 'sleep' : 'walk',
                rng: this.rng
            });

            if (this.reducedMotion) {
                cat.state = 'sleep';
                cat.duration = pickDuration('sleep', this.rng);
            }

            this.cats.push(cat);
        }
    }

    start() {
        if (this.running) {
            return;
        }

        this.running = true;
        this.last = performance.now();
        document.addEventListener('visibilitychange', this.onVisibilityChange);

        if (document.visibilityState !== 'hidden') {
            this.raf = requestAnimationFrame(this.loop);
        }
    }

    stop() {
        this.running = false;
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.cats = [];
    }

    onVisibilityChange() {
        if (!this.running) {
            return;
        }

        if (document.visibilityState === 'hidden') {
            if (this.raf) {
                cancelAnimationFrame(this.raf);
                this.raf = 0;
            }
            return;
        }

        this.last = performance.now();
        this.slowSince = 0;
        if (!this.raf) {
            this.raf = requestAnimationFrame(this.loop);
        }
    }

    loop(now) {
        if (!this.running) {
            return;
        }

        this.raf = requestAnimationFrame(this.loop);

        const interval = 1000 / this.fps;
        const since = now - this.last;
        if (since < interval - 1) {
            return;
        }

        this.last = now;

        // Three sustained seconds above 30 ms per frame drop the loop to 30 fps.
        if (this.fps === 60) {
            if (since > 30) {
                if (!this.slowSince) {
                    this.slowSince = now;
                } else if (now - this.slowSince >= 3000) {
                    this.fps = 30;
                    this.slowSince = 0;
                }
            } else {
                this.slowSince = 0;
            }
        }

        const dt = Math.min(since / 1000, 0.05);
        this.activeSeconds += dt;
        this.update(dt);
        this.draw();
    }

    update(dt) {
        if (!this.reducedMotion) {
            const context = { tired: this.activeSeconds > 10 * 60 };

            for (const cat of this.cats) {
                update(cat, dt, {
                    minX: 40 * cat.scale,
                    maxX: this.width - 40 * cat.scale
                }, this.rng, context);
            }

            separateCats(this.cats, this.rng, 80);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const ordered = this.cats.slice().sort((a, b) => a.y - b.y);
        for (const cat of ordered) {
            const frame = frameForPose(cat.state, cat.elapsed);
            const sprite = this.sprites.get(cat.palette, cat.state, frame, cat.seed);
            const width = SPRITE_WIDTH * cat.scale;
            const height = SPRITE_HEIGHT * cat.scale;

            ctx.save();
            ctx.translate(cat.x, cat.y);
            if (cat.direction < 0) {
                ctx.scale(-1, 1);
            }
            ctx.drawImage(sprite, -width / 2, -height, width, height);
            ctx.restore();
        }
    }
}
