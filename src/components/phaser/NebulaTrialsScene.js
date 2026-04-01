/**
 * NebulaTrialsScene.js — Phaser 3 Scene for Nebula Trials Quiz
 *
 * FULL spacecraft shooting game using Kenney CC0 space-shooter sprites.
 * Ship flies upward through enemy formations — correct answers fire lasers,
 * wrong answers cause damage. Rank upgrades change ship model.
 *
 * Kenney assets used (/public/assets/kenney/space-shooter/):
 *   ships/     — playerShip1-3 (blue/green/orange/red), damage states
 *   enemies/   — enemyBlack/Blue/Green/Red 1-5
 *   lasers/    — laserBlue/Green/Red 01-16
 *   meteors/   — meteorBrown/Grey big/med/small/tiny
 *   effects/   — fire00-19 (engine flame), powerups, shields, stars, bolts
 *   ui/        — playerLife1-3, numerals, buttons
 *   effects/   — fire15-19 reused as explosions
 *
 * Data via scene.registry:
 *   combo, speedRank, progress, totalQuestions, triggerCorrect, triggerWrong
 */

export function createNebulaTrialsScene(Phaser) {
  if (!Phaser || !Phaser.Scene) return null;

  class NebulaTrialsScene extends Phaser.Scene {
    constructor() {
      super({ key: "NebulaTrialsScene" });
      this.stars = [];
      this.ship = null;
      this.enemies = [];
      this.meteors = [];
      this.lasers = [];
      this.powerups = [];
      this.lifeSprites = [];
      this.time0 = 0;
      this.scrollSpeed = 1.0;
      this.boostTimer = 0;
      this.shakeTimer = 0;
      this.comboLevel = 0;
      this.shipColor = "blue";
      this.shipTier = 1; // 1, 2, or 3 — upgrades with rank
      this._lastProgress = 0;
      this._enemySpawnTimer = 0;
      this._meteorSpawnTimer = 0;
      this._powerupSpawnTimer = 0;
      this._engineFrameIdx = 0;
      this._engineFrameTimer = 0;
      this.shields = 3; // visual lives
      this._targetEnemy = null; // enemy to shoot at on correct answer
    }

    preload() {
      // ── Ships (3 tiers × 4 colors) ──
      const colors = ["blue", "green", "orange", "red"];
      for (let t = 1; t <= 3; t++) {
        for (const c of colors) {
          this.load.image(`ship${t}_${c}`, `/assets/kenney/space-shooter/ships/playerShip${t}_${c}.png`);
        }
      }

      // ── Damage states ──
      for (let t = 1; t <= 3; t++) {
        for (let d = 1; d <= 3; d++) {
          this.load.image(`shipDmg${t}_${d}`, `/assets/kenney/space-shooter/effects/playerShip${t}_damage${d}.png`);
        }
      }

      // ── Enemies (4 colors × 5 variants) ──
      const eColors = ["Black", "Blue", "Green", "Red"];
      for (const ec of eColors) {
        for (let v = 1; v <= 5; v++) {
          this.load.image(`enemy${ec}${v}`, `/assets/kenney/space-shooter/enemies/enemy${ec}${v}.png`);
        }
      }

      // ── Lasers ──
      for (const lc of ["Blue", "Green", "Red"]) {
        for (let i = 1; i <= 16; i++) {
          const n = String(i).padStart(2, "0");
          this.load.image(`laser${lc}${n}`, `/assets/kenney/space-shooter/lasers/laser${lc}${n}.png`);
        }
      }

      // ── Meteors ──
      const mTypes = [
        "meteorBrown_big1", "meteorBrown_big2", "meteorBrown_big3", "meteorBrown_big4",
        "meteorBrown_med1", "meteorBrown_med3",
        "meteorBrown_small1", "meteorBrown_small2",
        "meteorGrey_big1", "meteorGrey_big2", "meteorGrey_big3", "meteorGrey_big4",
        "meteorGrey_med1", "meteorGrey_med2",
        "meteorGrey_small1", "meteorGrey_small2",
        "meteorGrey_tiny1", "meteorGrey_tiny2",
        "meteorBrown_tiny1", "meteorBrown_tiny2",
      ];
      for (const m of mTypes) {
        this.load.image(m, `/assets/kenney/space-shooter/meteors/${m}.png`);
      }

      // ── Engine fire frames ──
      for (let i = 0; i <= 19; i++) {
        const n = String(i).padStart(2, "0");
        this.load.image(`fire${n}`, `/assets/kenney/space-shooter/effects/fire${n}.png`);
      }

      // ── Explosions (reuse fire frames — no separate explosion PNGs) ──
      // explosion1 → fire15 (large orange), explosion2 → fire17 (large yellow)
      // These are aliases resolved in create() after all images loaded

      // ── Power-ups ──
      for (const pu of ["Blue", "Green", "Red", "Yellow"]) {
        this.load.image(`powerup${pu}`, `/assets/kenney/space-shooter/effects/powerup${pu}.png`);
        this.load.image(`powerup${pu}_shield`, `/assets/kenney/space-shooter/effects/powerup${pu}_shield.png`);
        this.load.image(`powerup${pu}_bolt`, `/assets/kenney/space-shooter/effects/powerup${pu}_bolt.png`);
        this.load.image(`powerup${pu}_star`, `/assets/kenney/space-shooter/effects/powerup${pu}_star.png`);
      }

      // ── Shields ──
      this.load.image("shield1", "/assets/kenney/space-shooter/effects/shield1.png");
      this.load.image("shield2", "/assets/kenney/space-shooter/effects/shield2.png");
      this.load.image("shield3", "/assets/kenney/space-shooter/effects/shield3.png");

      // ── Stars (collectibles) ──
      this.load.image("star_gold", "/assets/kenney/space-shooter/effects/star_gold.png");

      // ── UI — life indicators ──
      for (const c of colors) {
        this.load.image(`life1_${c}`, `/assets/kenney/space-shooter/ui/playerLife1_${c}.png`);
      }
    }

    create() {
      const { width, height } = this.scale;
      this._gameActive = false; // Start in quiet mode (menu screen)

      // ── Deep space gradient ──
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x030012, 0x050520, 0x0a0830, 0x020010, 1);
      bg.fillRect(0, 0, width, height);

      // ── Parallax starfield (always visible — gentle ambient) ──
      this.createStarLayers(width, height);

      // Ship, enemies, meteors, life indicators created but HIDDEN
      // They activate when registry "activateGame" fires
      this.createShip(width, height);
      this.createLifeIndicators(width);
      this.setGameElementsVisible(false); // Hide until quiz starts

      // ── Registry events ──
      this.registry.events.on("changedata", (parent, key, value) => {
        if (key === "activateGame") {
          this._gameActive = !!value;
          this.setGameElementsVisible(this._gameActive);
          if (this._gameActive) {
            // Spawn fresh enemies & meteors when quiz starts
            this.spawnEnemyWave(width, height);
            this.spawnMeteorField(width, height);
          } else {
            // Quiz ended — clear game elements
            this.clearGameElements();
          }
        }
        if (key === "triggerCorrect") this.onCorrectAnswer();
        if (key === "triggerWrong") this.onWrongAnswer();
        if (key === "combo") {
          this.comboLevel = value || 0;
          if (value >= 5) this.spawnPowerup();
        }
        if (key === "speedRank") this.updateShipRank(value);
        if (key === "progress") this.updateProgress(value);
      });

      this.comboLevel = this.registry.get("combo") || 0;
    }

    /** Show/hide ship + life indicators */
    setGameElementsVisible(visible) {
      if (this.ship) this.ship.setVisible(visible);
      this.lifeSprites.forEach(s => { try { s.setVisible(visible); } catch {} });
    }

    /** Remove all enemies, meteors, powerups — called when returning to menu */
    clearGameElements() {
      this.enemies.forEach(e => { try { e.destroy(); } catch {} });
      this.enemies = [];
      this.meteors.forEach(m => { try { m.destroy(); } catch {} });
      this.meteors = [];
      this.powerups.forEach(p => { try { p.destroy(); } catch {} });
      this.powerups = [];
    }

    // ═══════════════════════════════════════════════════════════════
    // PARALLAX STARFIELD
    // ═══════════════════════════════════════════════════════════════
    createStarLayers(w, h) {
      const layers = [
        { count: 100, sizeMin: 0.3, sizeMax: 0.8, alphaMin: 0.1, alphaMax: 0.3, speed: 0.3 },
        { count: 60, sizeMin: 0.6, sizeMax: 1.5, alphaMin: 0.2, alphaMax: 0.5, speed: 0.8 },
        { count: 30, sizeMin: 1.0, sizeMax: 2.5, alphaMin: 0.3, alphaMax: 0.7, speed: 1.6 },
      ];

      layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          const x = Phaser.Math.Between(0, w);
          const y = Phaser.Math.Between(0, h);
          const size = Phaser.Math.FloatBetween(layer.sizeMin, layer.sizeMax);
          const alpha = Phaser.Math.FloatBetween(layer.alphaMin, layer.alphaMax);
          const useColor = Math.random() < 0.08;
          const color = useColor
            ? Phaser.Utils.Array.GetRandom([0xa78bfa, 0x93c5fd, 0xfde68a, 0xc084fc])
            : 0xffffff;
          const star = this.add.circle(x, y, size, color, alpha);
          star._baseAlpha = alpha;
          star._scrollSpeed = layer.speed;
          star._twinkleSpeed = Phaser.Math.FloatBetween(0.5, 3.0);
          star._twinkleOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
          this.stars.push(star);
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // SPACESHIP — Kenney Sprite with Engine Fire
    // ═══════════════════════════════════════════════════════════════
    createShip(w, h) {
      const container = this.add.container(w / 2, h * 0.82);
      container.setDepth(50);

      // Ship sprite
      const shipKey = `ship${this.shipTier}_${this.shipColor}`;
      let ship;
      try {
        ship = this.add.sprite(0, 0, shipKey);
        ship.setScale(0.9);
      } catch {
        ship = this.createFallbackShip();
      }
      container.add(ship);
      container._shipSprite = ship;

      // Engine fire sprite (animated via frame cycling in update)
      let engine;
      try {
        engine = this.add.sprite(0, 35, "fire00");
        engine.setScale(0.6);
        engine.setAlpha(0.9);
      } catch {
        engine = this.add.circle(0, 35, 4, 0xff6600, 0.6);
      }
      container.add(engine);
      container._engine = engine;

      // Glow ring
      const glow = this.add.graphics();
      glow.fillStyle(0x6366f1, 0.06);
      glow.fillCircle(0, 0, 40);
      glow.fillStyle(0x6366f1, 0.03);
      glow.fillCircle(0, 0, 60);
      container.add(glow);
      container._glow = glow;
      container._glowColor = 0x6366f1;

      // Shield overlay (visible when shields > 0)
      let shield;
      try {
        shield = this.add.sprite(0, 0, "shield1");
        shield.setScale(1.1);
        shield.setAlpha(0.2);
      } catch {
        shield = null;
      }
      if (shield) container.add(shield);
      container._shield = shield;

      this.ship = container;
      this.ship._baseX = w / 2;
      this.ship._baseY = h * 0.82;
    }

    createFallbackShip() {
      const g = this.add.graphics();
      g.fillStyle(0xc4b5fd, 0.9);
      g.fillTriangle(0, -18, -10, 12, 10, 12);
      g.fillStyle(0x8b5cf6, 0.8);
      g.fillTriangle(-10, 8, -22, 16, -6, 14);
      g.fillTriangle(10, 8, 22, 16, 6, 14);
      g.fillStyle(0xe0e7ff, 0.7);
      g.fillTriangle(0, -10, -4, 2, 4, 2);
      return g;
    }

    // ═══════════════════════════════════════════════════════════════
    // LIFE INDICATORS (top-left corner)
    // ═══════════════════════════════════════════════════════════════
    createLifeIndicators(w) {
      this.lifeSprites = [];
      for (let i = 0; i < 3; i++) {
        const key = `life1_${this.shipColor}`;
        let life;
        try {
          life = this.add.sprite(20 + i * 30, 20, key);
          life.setScale(0.6);
          life.setDepth(90);
          life.setAlpha(0.8);
        } catch {
          life = this.add.circle(20 + i * 30, 20, 5, 0x10b981, 0.8);
          life.setDepth(90);
        }
        this.lifeSprites.push(life);
      }
    }

    updateLifeIndicators() {
      this.lifeSprites.forEach((life, i) => {
        if (life) {
          life.setAlpha(i < this.shields ? 0.8 : 0.15);
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ENEMIES — Formations that scroll down
    // ═══════════════════════════════════════════════════════════════
    spawnEnemyWave(w, h) {
      const eColorSets = ["Black", "Blue", "Green", "Red"];
      const count = Phaser.Math.Between(3, 5);
      const spacing = w / (count + 1);

      for (let i = 0; i < count; i++) {
        const eColor = eColorSets[Phaser.Math.Between(0, 3)];
        const eVariant = Phaser.Math.Between(1, 5);
        const key = `enemy${eColor}${eVariant}`;
        const x = spacing * (i + 1);
        const y = -Phaser.Math.Between(40, 120);

        let enemy;
        try {
          enemy = this.add.sprite(x, y, key);
          enemy.setScale(0.5);
          enemy.setDepth(30);
        } catch {
          const g = this.add.graphics();
          g.fillStyle(0xef4444, 0.5);
          g.fillCircle(0, 0, 12);
          g.setPosition(x, y);
          g.setDepth(30);
          enemy = g;
        }

        enemy._scrollSpeed = Phaser.Math.FloatBetween(0.4, 0.9);
        enemy._sway = Phaser.Math.FloatBetween(0.3, 1.2);
        enemy._swayOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        enemy._baseX = x;
        enemy._alive = true;
        this.enemies.push(enemy);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // METEOR FIELD — Drifting space rocks
    // ═══════════════════════════════════════════════════════════════
    spawnMeteorField(w, h) {
      const meteorKeys = [
        "meteorBrown_big1", "meteorBrown_big2", "meteorGrey_big1", "meteorGrey_big2",
        "meteorBrown_med1", "meteorGrey_med1",
        "meteorBrown_small1", "meteorGrey_small1",
        "meteorBrown_tiny1", "meteorGrey_tiny1",
      ];

      for (let i = 0; i < 6; i++) {
        this.spawnOneMeteor(w, h, meteorKeys, true);
      }
    }

    spawnOneMeteor(w, h, meteorKeys, randomY = false) {
      const key = Phaser.Utils.Array.GetRandom(meteorKeys || [
        "meteorBrown_big1", "meteorGrey_big1", "meteorBrown_small1", "meteorGrey_small1",
        "meteorBrown_tiny1", "meteorGrey_tiny1",
      ]);
      const x = Phaser.Math.Between(10, w - 10);
      const y = randomY ? Phaser.Math.Between(-h, h) : -Phaser.Math.Between(40, 100);

      let meteor;
      try {
        meteor = this.add.sprite(x, y, key);
        const isBig = key.includes("big");
        const isMed = key.includes("med");
        const scale = isBig ? 0.35 : isMed ? 0.5 : 0.7;
        meteor.setScale(scale);
        meteor.setAlpha(0.4);
        meteor.setDepth(10);
      } catch {
        return; // skip if texture missing
      }

      meteor._scrollSpeed = Phaser.Math.FloatBetween(0.2, 0.6);
      meteor._rotSpeed = Phaser.Math.FloatBetween(-1, 1);
      meteor._drift = Phaser.Math.FloatBetween(-0.3, 0.3);
      this.meteors.push(meteor);
    }

    // ═══════════════════════════════════════════════════════════════
    // POWER-UPS — spawn on high combos
    // ═══════════════════════════════════════════════════════════════
    spawnPowerup() {
      const { width, height } = this.scale;
      const puTypes = ["powerupBlue_star", "powerupGreen_bolt", "powerupYellow_shield", "star_gold"];
      const key = Phaser.Utils.Array.GetRandom(puTypes);
      const x = Phaser.Math.Between(40, width - 40);
      const y = -30;

      let pu;
      try {
        pu = this.add.sprite(x, y, key);
        pu.setScale(0.5);
        pu.setDepth(35);
        pu.setAlpha(0.9);
      } catch {
        return;
      }

      pu._scrollSpeed = 0.8;
      pu._spinSpeed = 2;
      this.powerups.push(pu);

      // Collect when ship passes — auto-collect after 3 seconds
      this.time.delayedCall(3000, () => {
        if (pu && pu.active) {
          this.collectPowerup(pu);
        }
      });
    }

    collectPowerup(pu) {
      if (!pu || !pu.active) return;
      // Flash effect
      this.tweens.add({
        targets: pu,
        alpha: 0,
        scale: 1.5,
        duration: 300,
        ease: "Sine.easeOut",
        onComplete: () => {
          try { pu.destroy(); } catch {}
        },
      });
      this.powerups = this.powerups.filter(p => p !== pu);

      // Sparkle burst at collection point
      for (let i = 0; i < 6; i++) {
        const sparkle = this.add.circle(
          pu.x + Phaser.Math.Between(-20, 20),
          pu.y + Phaser.Math.Between(-20, 20),
          Phaser.Math.FloatBetween(1, 3),
          0xfde68a, 0.9
        );
        sparkle.setDepth(55);
        this.tweens.add({
          targets: sparkle,
          alpha: 0,
          scale: 0,
          y: sparkle.y - Phaser.Math.Between(20, 50),
          duration: Phaser.Math.Between(300, 600),
          onComplete: () => sparkle.destroy(),
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CORRECT ANSWER — Laser shot at nearest enemy
    // ═══════════════════════════════════════════════════════════════
    onCorrectAnswer() {
      if (!this.ship) return;
      const { width, height } = this.scale;

      this.boostTimer = 1.5;

      // Ship boost pulse
      this.tweens.add({
        targets: this.ship,
        y: this.ship._baseY - 25,
        duration: 200,
        yoyo: true,
        ease: "Sine.easeOut",
      });

      // Find nearest enemy to shoot at
      const aliveEnemies = this.enemies.filter(e => e._alive && e.y > 0 && e.y < height);
      let target = null;
      if (aliveEnemies.length > 0) {
        target = aliveEnemies.reduce((closest, e) => {
          const d = Math.abs(e.x - this.ship._baseX) + Math.abs(e.y - this.ship._baseY);
          const cd = Math.abs(closest.x - this.ship._baseX) + Math.abs(closest.y - this.ship._baseY);
          return d < cd ? e : closest;
        });
      }

      // Fire targeted laser(s)
      this.fireLaser(target);

      // If we have a target, destroy it
      if (target) {
        this.time.delayedCall(200, () => {
          this.destroyEnemy(target);
        });
      }

      // Green sparkle burst
      this.spawnParticleBurst(this.ship._baseX, this.ship._baseY - 20, 0x10b981, 10, "up");

      // Screen flash
      this.flashScreen(0x10b981, 0.06, 250);

      // Stardust sparkles
      for (let i = 0; i < 6; i++) {
        const sx = this.ship._baseX + Phaser.Math.Between(-30, 30);
        const sy = this.ship._baseY + Phaser.Math.Between(-20, 5);
        const sparkle = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2.5), 0xfde68a, 0.8);
        sparkle.setDepth(55);
        this.tweens.add({
          targets: sparkle,
          y: sy - Phaser.Math.Between(30, 70),
          alpha: 0,
          scale: 0,
          duration: Phaser.Math.Between(400, 700),
          ease: "Sine.easeOut",
          onComplete: () => sparkle.destroy(),
        });
      }
    }

    fireLaser(target) {
      const laserColor = this.shipColor === "green" ? "Green" : this.shipColor === "red" ? "Red" : "Blue";
      // Pick a laser variant (01 = thin beam, 07 = thicker, 13 = round)
      const variants = ["01", "07", "09"];
      const sx = this.ship._baseX;
      const sy = this.ship._baseY - 30;

      if (target) {
        // Targeted shot — 2 parallel lasers toward enemy
        for (let offset of [-6, 6]) {
          const variant = variants[Phaser.Math.Between(0, variants.length - 1)];
          const key = `laser${laserColor}${variant}`;
          let laser;
          try {
            laser = this.add.sprite(sx + offset, sy, key);
            laser.setScale(0.7);
            laser.setDepth(45);
            // Rotate to face target
            const angle = Math.atan2(target.y - sy, target.x - (sx + offset));
            laser.setRotation(angle + Math.PI / 2);
          } catch {
            laser = this.add.circle(sx + offset, sy, 2, 0x10b981, 0.9);
            laser.setDepth(45);
          }

          this.tweens.add({
            targets: laser,
            x: target.x + Phaser.Math.Between(-5, 5),
            y: target.y,
            duration: 200,
            ease: "Sine.easeIn",
            onComplete: () => { try { laser.destroy(); } catch {} },
          });
        }
      } else {
        // No target — radial burst upward
        for (let i = 0; i < 4; i++) {
          const angle = -Math.PI / 2 + (i - 1.5) * 0.2;
          const dist = 120;
          const variant = variants[i % variants.length];
          const key = `laser${laserColor}${variant}`;
          let laser;
          try {
            laser = this.add.sprite(sx, sy, key);
            laser.setScale(0.6);
            laser.setDepth(45);
            laser.setRotation(angle + Math.PI / 2);
          } catch {
            laser = this.add.circle(sx, sy, 2, 0x10b981, 0.8);
            laser.setDepth(45);
          }
          this.tweens.add({
            targets: laser,
            x: sx + Math.cos(angle) * dist,
            y: sy + Math.sin(angle) * dist,
            alpha: 0,
            duration: 350,
            ease: "Sine.easeOut",
            onComplete: () => { try { laser.destroy(); } catch {} },
          });
        }
      }
    }

    destroyEnemy(enemy) {
      if (!enemy || !enemy._alive) return;
      enemy._alive = false;

      // Explosion sprites (fire frames 15-19 as explosions)
      const explosionFrames = ["fire15", "fire16", "fire17", "fire18", "fire19"];
      for (let i = 0; i < 3; i++) {
        const eKey = explosionFrames[Phaser.Math.Between(0, 4)];
        let exp;
        try {
          exp = this.add.sprite(
            enemy.x + Phaser.Math.Between(-15, 15),
            enemy.y + Phaser.Math.Between(-15, 15),
            eKey
          );
          exp.setScale(Phaser.Math.FloatBetween(0.5, 1.2));
          exp.setDepth(55);
        } catch {
          exp = this.add.circle(enemy.x, enemy.y, 8, 0xff6600, 0.8);
          exp.setDepth(55);
        }
        this.tweens.add({
          targets: exp,
          alpha: 0,
          scale: 0,
          duration: Phaser.Math.Between(200, 500),
          ease: "Sine.easeOut",
          onComplete: () => { try { exp.destroy(); } catch {} },
        });
      }

      // Orange/yellow particle burst
      this.spawnParticleBurst(enemy.x, enemy.y, 0xf59e0b, 12, "scatter");

      // Fade out enemy
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        scale: 0,
        duration: 300,
        onComplete: () => {
          try { enemy.destroy(); } catch {}
          this.enemies = this.enemies.filter(e => e !== enemy);
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // WRONG ANSWER — Ship takes damage
    // ═══════════════════════════════════════════════════════════════
    onWrongAnswer() {
      if (!this.ship) return;

      this.shakeTimer = 0.4;
      this.shields = Math.max(0, this.shields - 1);
      this.updateLifeIndicators();

      // Red particle burst
      this.spawnParticleBurst(this.ship._baseX, this.ship._baseY, 0xef4444, 10, "scatter");

      // Explosion at ship (fire frames as impact)
      const hitFrames = ["fire15", "fire16", "fire17"];
      for (let i = 0; i < 2; i++) {
        const eKey = hitFrames[Phaser.Math.Between(0, 2)];
        let exp;
        try {
          exp = this.add.sprite(
            this.ship._baseX + Phaser.Math.Between(-20, 20),
            this.ship._baseY + Phaser.Math.Between(-20, 20),
            eKey
          );
          exp.setScale(0.5);
          exp.setDepth(55);
          exp.setTint(0xef4444); // red tint for damage
        } catch {
          exp = this.add.circle(this.ship._baseX, this.ship._baseY, 6, 0xef4444, 0.8);
          exp.setDepth(55);
        }
        this.tweens.add({
          targets: exp,
          alpha: 0,
          scale: 0,
          duration: 300,
          onComplete: () => { try { exp.destroy(); } catch {} },
        });
      }

      // Ship jolt
      this.tweens.add({
        targets: this.ship,
        x: this.ship._baseX + 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: "Sine.easeInOut",
        onComplete: () => { this.ship.x = this.ship._baseX; },
      });

      // Red flash
      this.flashScreen(0xef4444, 0.1, 200);

      // Briefly show shield flash if shields remain
      if (this.shields > 0 && this.ship._shield) {
        this.ship._shield.setAlpha(0.5);
        this.tweens.add({
          targets: this.ship._shield,
          alpha: 0.2,
          duration: 500,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SHIP RANK / COLOR UPDATE
    // ═══════════════════════════════════════════════════════════════
    updateShipRank(rank) {
      if (!this.ship || !rank) return;

      // Ship tier: Legend/Admiral = ship3, Commander = ship2, Navigator/Cadet = ship1
      const newTier = rank.label === "Legend" || rank.label === "Admiral" ? 3
                    : rank.label === "Commander" ? 2 : 1;
      const newColor = rank.shipColor || "blue";

      if (newTier !== this.shipTier || newColor !== this.shipColor) {
        this.shipTier = newTier;
        this.shipColor = newColor;
        const newKey = `ship${newTier}_${newColor}`;
        try {
          if (this.ship._shipSprite && this.ship._shipSprite.setTexture) {
            this.ship._shipSprite.setTexture(newKey);
          }
        } catch {}

        // Update life indicator sprites too
        this.lifeSprites.forEach(life => {
          try { life.setTexture(`life1_${newColor}`); } catch {}
        });

        // Flash on upgrade
        if (newTier > 1) {
          this.flashScreen(0xfde68a, 0.08, 400);
        }
      }

      // Update glow color
      const colorMap = {
        Legend: 0xf59e0b,
        Admiral: 0x6366f1,
        Commander: 0x0891b2,
        Navigator: 0x059669,
        Cadet: 0x64748b,
      };
      const color = colorMap[rank.label] || 0x6366f1;
      this.ship._glowColor = color;
      const glow = this.ship._glow;
      if (glow) {
        glow.clear();
        glow.fillStyle(color, 0.08);
        glow.fillCircle(0, 0, 40);
        glow.fillStyle(color, 0.04);
        glow.fillCircle(0, 0, 60);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PROGRESS
    // ═══════════════════════════════════════════════════════════════
    updateProgress(progress) {
      this._lastProgress = progress;
      // Replenish shields at halfway and three-quarter marks
      if (progress > 0.5 && this.shields < 2) this.shields = 2;
      if (progress > 0.75 && this.shields < 3) this.shields = 3;
      this.updateLifeIndicators();
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARED UTILITIES
    // ═══════════════════════════════════════════════════════════════
    spawnParticleBurst(x, y, color, count, direction) {
      for (let i = 0; i < count; i++) {
        const size = Phaser.Math.FloatBetween(1, 3);
        const p = this.add.circle(x, y, size, color, 0.8);
        p.setDepth(55);
        let tx, ty;
        if (direction === "up") {
          tx = x + Phaser.Math.Between(-40, 40);
          ty = y - Phaser.Math.Between(40, 100);
        } else {
          tx = x + Phaser.Math.Between(-50, 50);
          ty = y + Phaser.Math.Between(-50, 50);
        }
        this.tweens.add({
          targets: p,
          x: tx, y: ty,
          alpha: 0,
          scale: Phaser.Math.FloatBetween(0.2, 0.5),
          duration: Phaser.Math.Between(300, 600),
          ease: "Sine.easeOut",
          onComplete: () => p.destroy(),
        });
      }
    }

    flashScreen(color, alpha, duration) {
      const { width, height } = this.scale;
      const flash = this.add.graphics();
      flash.fillStyle(color, alpha);
      flash.fillRect(0, 0, width, height);
      flash.setDepth(100);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        onComplete: () => flash.destroy(),
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════
    update(time, delta) {
      const dt = delta / 1000;
      this.time0 += dt;
      const { width, height } = this.scale;

      // Timers
      if (this.boostTimer > 0) this.boostTimer -= dt;
      if (this.shakeTimer > 0) this.shakeTimer -= dt;
      this._enemySpawnTimer += dt;
      this._meteorSpawnTimer += dt;
      this._engineFrameTimer += dt;

      const speedMult = this.boostTimer > 0 ? 3.0 : 1.0;

      // ── Starfield scroll ──
      this.stars.forEach((star) => {
        star.y += star._scrollSpeed * this.scrollSpeed * speedMult * 60 * dt;
        if (star.y > height + 5) {
          star.y = -5;
          star.x = Phaser.Math.Between(0, width);
        }
        const twinkle = Math.sin(this.time0 * star._twinkleSpeed + star._twinkleOffset);
        star.setAlpha(star._baseAlpha * (0.4 + 0.6 * (twinkle * 0.5 + 0.5)));
      });

      // ═══ GAME ELEMENTS — only update when quiz is active ═══
      if (!this._gameActive) {
        // Shooting stars still fire in quiet mode
        if (Math.random() < 0.002) this.launchShootingStar(width, height);
        return; // Skip all game element updates
      }

      // ── Enemy scroll + sway ──
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!enemy || !enemy._alive) continue;
        enemy.y += enemy._scrollSpeed * speedMult * 60 * dt;
        if (enemy._baseX !== undefined) {
          enemy.x = enemy._baseX + Math.sin(this.time0 * enemy._sway + enemy._swayOffset) * 20;
        }
        // Remove if off-screen bottom
        if (enemy.y > height + 60) {
          try { enemy.destroy(); } catch {}
          this.enemies.splice(i, 1);
        }
      }

      // ── Spawn new enemy waves periodically ──
      if (this._enemySpawnTimer > 4) {
        this._enemySpawnTimer = 0;
        if (this.enemies.filter(e => e._alive).length < 8) {
          this.spawnEnemyWave(width, height);
        }
      }

      // ── Meteor scroll + rotation ──
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        if (!m || !m.active) { this.meteors.splice(i, 1); continue; }
        m.y += m._scrollSpeed * speedMult * 60 * dt;
        m.x += m._drift * 60 * dt;
        if (m.setRotation) {
          m.rotation += m._rotSpeed * dt;
        }
        if (m.y > height + 60) {
          try { m.destroy(); } catch {}
          this.meteors.splice(i, 1);
        }
      }

      // ── Spawn new meteors ──
      if (this._meteorSpawnTimer > 3) {
        this._meteorSpawnTimer = 0;
        if (this.meteors.length < 8) {
          this.spawnOneMeteor(width, height);
        }
      }

      // ── Power-up scroll ──
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        if (!pu || !pu.active) { this.powerups.splice(i, 1); continue; }
        pu.y += pu._scrollSpeed * 60 * dt;
        if (pu._spinSpeed && pu.setRotation) {
          pu.rotation += pu._spinSpeed * dt;
        }
        // Auto-collect if near ship
        if (this.ship && Math.abs(pu.x - this.ship._baseX) < 50 && Math.abs(pu.y - this.ship._baseY) < 50) {
          this.collectPowerup(pu);
        }
        if (pu.y > height + 40) {
          try { pu.destroy(); } catch {}
          this.powerups.splice(i, 1);
        }
      }

      // ── Ship animation ──
      if (this.ship && this.ship._shipSprite) {
        const isBoosting = this.boostTimer > 0;

        // Scale pulse on boost
        const scale = isBoosting ? 1.0 : 0.9;
        try { this.ship._shipSprite.setScale(scale); } catch {}

        // Float
        const floatY = Math.sin(this.time0 * 1.2) * 3;
        const floatX = Math.sin(this.time0 * 0.7) * 1.5;
        this.ship.y = this.ship._baseY + floatY;
        if (this.shakeTimer <= 0) {
          this.ship.x = this.ship._baseX + floatX;
        }

        // Engine fire frame cycling (20 frames)
        if (this._engineFrameTimer > 0.04) {
          this._engineFrameTimer = 0;
          this._engineFrameIdx = (this._engineFrameIdx + 1) % 20;
          const fireKey = `fire${String(this._engineFrameIdx).padStart(2, "0")}`;
          try {
            if (this.ship._engine && this.ship._engine.setTexture) {
              this.ship._engine.setTexture(fireKey);
              this.ship._engine.setScale(isBoosting ? 0.9 : 0.6);
              this.ship._engine.setAlpha(isBoosting ? 1.0 : 0.8);
            }
          } catch {}
        }

        // Glow pulse
        const glow = this.ship._glow;
        if (glow) {
          const pulse = 0.7 + 0.3 * Math.sin(this.time0 * 2);
          glow.setAlpha(pulse * (isBoosting ? 1.5 : 1));
        }
      }

      // ── Shooting stars ──
      if (Math.random() < 0.0015) {
        this.launchShootingStar(width, height);
      }
    }

    launchShootingStar(w, h) {
      const startX = Phaser.Math.Between(0, w);
      const startY = Phaser.Math.Between(0, h * 0.3);
      const angle = Phaser.Math.FloatBetween(0.3, 1.0);
      const dist = Phaser.Math.Between(100, 250);
      const endX = startX + Math.cos(angle) * dist;
      const endY = startY + Math.sin(angle) * dist;

      const head = this.add.circle(startX, startY, 1.5, 0xffffff, 0.9);
      head.setDepth(30);
      const trail = this.add.graphics();
      trail.setDepth(29);

      this.tweens.add({
        targets: head,
        x: endX, y: endY,
        alpha: 0,
        duration: Phaser.Math.Between(400, 800),
        ease: "Sine.easeIn",
        onUpdate: () => {
          trail.clear();
          const dx = endX - startX;
          const dy = endY - startY;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          trail.lineStyle(1, 0xffffff, head.alpha * 0.3);
          trail.lineBetween(head.x - (dx / d) * 30, head.y - (dy / d) * 30, head.x, head.y);
        },
        onComplete: () => { trail.destroy(); head.destroy(); },
      });
    }
  }

  return NebulaTrialsScene;
}
