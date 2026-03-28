/**
 * NebulaTrialsScene.js — Phaser 3 Scene for Nebula Trials Quiz Background
 *
 * Renders an immersive space flight experience behind the quiz UI:
 * - Multi-layer parallax starfield scrolling upward (sense of speed)
 * - Player spaceship with engine thrust particles
 * - Correct answer: ship boosts, green particle burst, stardust trail
 * - Wrong answer: ship shakes, red flash, debris particles
 * - Combo streak: escalating fire trail behind ship
 * - Speed rank changes: ship glow color shifts
 * - Nebula clouds drifting for atmosphere
 * - Progress waypoints along the flight path
 *
 * Data via scene.registry:
 *   - onCorrect: () => void (called when correct effect finishes)
 *   - onWrong: () => void
 *   - combo: number
 *   - speedRank: { label, color }
 *   - progress: 0–1
 *   - totalQuestions: number
 */

export function createNebulaTrialsScene(Phaser) {
  if (!Phaser || !Phaser.Scene) return null;

  class NebulaTrialsScene extends Phaser.Scene {
    constructor() {
      super({ key: "NebulaTrialsScene" });
      this.stars = [];        // parallax star layers
      this.nebulae = [];      // drifting nebula clouds
      this.ship = null;       // player spaceship container
      this.thrustParticles = [];
      this.time0 = 0;
      this.scrollSpeed = 1.0; // base scroll speed
      this.boostTimer = 0;    // boost effect timer
      this.shakeTimer = 0;    // shake effect timer
      this.comboLevel = 0;
      this.waypoints = [];
      this._lastCombo = 0;
      this._lastProgress = 0;
    }

    create() {
      const { width, height } = this.scale;

      // ── Deep space background ──
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x030012, 0x050520, 0x0a0830, 0x020010, 1);
      bg.fillRect(0, 0, width, height);

      // ── Parallax star layers ──
      this.createStarLayers(width, height);

      // ── Nebula clouds ──
      this.createNebulae(width, height);

      // ── Flight path waypoints ──
      this.createWaypoints(width, height);

      // ── Player spaceship ──
      this.createShip(width, height);

      // ── Registry listener for game events ──
      this.registry.events.on("changedata", (parent, key, value) => {
        if (key === "triggerCorrect") this.onCorrectAnswer();
        if (key === "triggerWrong") this.onWrongAnswer();
        if (key === "combo") this.comboLevel = value || 0;
        if (key === "speedRank") this.updateShipGlow(value);
        if (key === "progress") this.updateProgress(value);
      });

      // Initialize combo from registry
      this.comboLevel = this.registry.get("combo") || 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // PARALLAX STARFIELD
    // ═══════════════════════════════════════════════════════════════
    createStarLayers(w, h) {
      const layers = [
        { count: 120, sizeMin: 0.3, sizeMax: 0.8, alphaMin: 0.1, alphaMax: 0.3, speed: 0.3 },  // distant
        { count: 80,  sizeMin: 0.6, sizeMax: 1.5, alphaMin: 0.2, alphaMax: 0.5, speed: 0.8 },  // mid
        { count: 40,  sizeMin: 1.0, sizeMax: 2.5, alphaMin: 0.3, alphaMax: 0.7, speed: 1.6 },  // close
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
    // NEBULA CLOUDS
    // ═══════════════════════════════════════════════════════════════
    createNebulae(w, h) {
      const colors = [0x6366f1, 0x8b5cf6, 0xa78bfa, 0x7c3aed, 0xc084fc, 0x4f46e5];
      for (let i = 0; i < 6; i++) {
        const g = this.add.graphics();
        const cx = Phaser.Math.Between(0, w);
        const cy = Phaser.Math.Between(0, h);
        const radius = Phaser.Math.Between(60, 140);
        const color = Phaser.Utils.Array.GetRandom(colors);
        // Multi-layer soft circle to simulate nebula
        for (let r = radius; r > 10; r -= 15) {
          g.fillStyle(color, 0.008 + (radius - r) * 0.0003);
          g.fillCircle(cx, cy, r);
        }
        g.setAlpha(0.6);
        g._scrollSpeed = 0.15;
        g._baseY = cy;
        g._cx = cx;
        g._driftOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.nebulae.push(g);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // WAYPOINTS (progress markers along the flight path)
    // ═══════════════════════════════════════════════════════════════
    createWaypoints(w, h) {
      const total = this.registry.get("totalQuestions") || 20;
      const spacing = h / (total + 1);
      for (let i = 0; i < total; i++) {
        const y = h - spacing * (i + 1);
        const g = this.add.graphics();
        // Small diamond marker
        g.fillStyle(0x6366f1, 0.15);
        g.fillCircle(w / 2, 0, 4);
        g.lineStyle(1, 0x6366f1, 0.3);
        g.strokeCircle(w / 2, 0, 6);
        g.setPosition(0, y);
        g.setAlpha(0.4);
        g._idx = i;
        g._baseY = y;
        this.waypoints.push(g);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SPACESHIP
    // ═══════════════════════════════════════════════════════════════
    createShip(w, h) {
      const container = this.add.container(w / 2, h * 0.82);
      container.setDepth(50);

      // Ship body (geometric design)
      const body = this.add.graphics();
      // Main fuselage
      body.fillStyle(0xc4b5fd, 0.9); // light purple
      body.fillTriangle(0, -18, -10, 12, 10, 12); // main body triangle
      // Wings
      body.fillStyle(0x8b5cf6, 0.8);
      body.fillTriangle(-10, 8, -22, 16, -6, 14);  // left wing
      body.fillTriangle(10, 8, 22, 16, 6, 14);     // right wing
      // Cockpit
      body.fillStyle(0xe0e7ff, 0.7);
      body.fillTriangle(0, -10, -4, 2, 4, 2);
      // Engine glow base
      body.fillStyle(0x6366f1, 0.4);
      body.fillCircle(0, 14, 5);
      container.add(body);

      // Engine thrust (animated)
      const thrust = this.add.graphics();
      container.add(thrust);
      container._thrust = thrust;

      // Ship glow (outer)
      const glow = this.add.graphics();
      glow.fillStyle(0x6366f1, 0.08);
      glow.fillCircle(0, 0, 30);
      glow.fillStyle(0x6366f1, 0.04);
      glow.fillCircle(0, 0, 45);
      container.add(glow);
      container._glow = glow;
      container._glowColor = 0x6366f1;

      this.ship = container;
      this.ship._baseX = w / 2;
      this.ship._baseY = h * 0.82;
    }

    // ═══════════════════════════════════════════════════════════════
    // GAME EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════
    onCorrectAnswer() {
      if (!this.ship) return;
      const { width, height } = this.scale;

      // Speed boost
      this.boostTimer = 1.5; // 1.5 seconds of boost

      // Ship boost animation
      this.tweens.add({
        targets: this.ship,
        y: this.ship._baseY - 30,
        duration: 200,
        yoyo: true,
        ease: "Sine.easeOut",
      });

      // Green particle burst
      this.spawnParticleBurst(
        this.ship._baseX,
        this.ship._baseY,
        0x10b981,
        12,
        "up"
      );

      // Stardust sparkles
      for (let i = 0; i < 8; i++) {
        const sx = this.ship._baseX + Phaser.Math.Between(-40, 40);
        const sy = this.ship._baseY + Phaser.Math.Between(-30, 10);
        const sparkle = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2.5), 0xfde68a, 0.8);
        sparkle.setDepth(55);
        this.tweens.add({
          targets: sparkle,
          y: sy - Phaser.Math.Between(30, 80),
          x: sx + Phaser.Math.Between(-20, 20),
          alpha: 0,
          scale: 0,
          duration: Phaser.Math.Between(400, 800),
          ease: "Sine.easeOut",
          onComplete: () => sparkle.destroy(),
        });
      }

      // Screen flash
      this.flashScreen(0x10b981, 0.08, 300);
    }

    onWrongAnswer() {
      if (!this.ship) return;

      // Shake effect
      this.shakeTimer = 0.4;

      // Red particle burst
      this.spawnParticleBurst(
        this.ship._baseX,
        this.ship._baseY,
        0xef4444,
        8,
        "scatter"
      );

      // Screen flash red
      this.flashScreen(0xef4444, 0.1, 250);

      // Ship jolt
      this.tweens.add({
        targets: this.ship,
        x: this.ship._baseX + 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.ship.x = this.ship._baseX;
        },
      });
    }

    spawnParticleBurst(x, y, color, count, direction) {
      for (let i = 0; i < count; i++) {
        const size = Phaser.Math.FloatBetween(1, 3);
        const p = this.add.circle(x, y, size, color, 0.8);
        p.setDepth(55);
        let tx, ty;
        if (direction === "up") {
          tx = x + Phaser.Math.Between(-50, 50);
          ty = y - Phaser.Math.Between(40, 120);
        } else {
          tx = x + Phaser.Math.Between(-60, 60);
          ty = y + Phaser.Math.Between(-60, 60);
        }
        this.tweens.add({
          targets: p,
          x: tx,
          y: ty,
          alpha: 0,
          scale: Phaser.Math.FloatBetween(0.2, 0.5),
          duration: Phaser.Math.Between(300, 700),
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

    updateShipGlow(rank) {
      if (!this.ship || !rank) return;
      const colorMap = {
        Legend: 0xf59e0b,
        Admiral: 0x6366f1,
        Commander: 0x0891b2,
        Navigator: 0x059669,
        Cadet: 0x64748b,
      };
      const color = colorMap[rank.label] || 0x6366f1;
      this.ship._glowColor = color;
      // Redraw glow
      const glow = this.ship._glow;
      if (glow) {
        glow.clear();
        glow.fillStyle(color, 0.1);
        glow.fillCircle(0, 0, 30);
        glow.fillStyle(color, 0.05);
        glow.fillCircle(0, 0, 45);
      }
    }

    updateProgress(progress) {
      // Light up passed waypoints
      const total = this.waypoints.length;
      const passed = Math.floor(progress * total);
      this.waypoints.forEach((wp, i) => {
        if (i < passed) {
          wp.setAlpha(0.8);
          // Already passed — could tween but keeping simple
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════
    update(time, delta) {
      const dt = delta / 1000;
      this.time0 += dt;
      const { width, height } = this.scale;

      // ── Boost / shake timers ──
      if (this.boostTimer > 0) this.boostTimer -= dt;
      if (this.shakeTimer > 0) this.shakeTimer -= dt;

      const speedMult = this.boostTimer > 0 ? 3.0 : 1.0;

      // ── Scroll starfield ──
      this.stars.forEach((star) => {
        star.y += star._scrollSpeed * this.scrollSpeed * speedMult * 60 * dt;
        if (star.y > height + 5) {
          star.y = -5;
          star.x = Phaser.Math.Between(0, width);
        }
        // Twinkle
        const twinkle = Math.sin(this.time0 * star._twinkleSpeed + star._twinkleOffset);
        star.setAlpha(star._baseAlpha * (0.4 + 0.6 * (twinkle * 0.5 + 0.5)));
      });

      // ── Scroll nebulae ──
      this.nebulae.forEach((n) => {
        n.y += n._scrollSpeed * this.scrollSpeed * speedMult * 60 * dt;
        // Gentle horizontal drift
        const drift = Math.sin(this.time0 * 0.3 + n._driftOffset) * 0.3;
        n.x += drift * dt * 60;
        if (n.y > height + 150) {
          n.y = -150;
          n.x = Phaser.Math.Between(0, width);
        }
      });

      // ── Ship engine thrust ──
      if (this.ship) {
        const thrust = this.ship._thrust;
        if (thrust) {
          thrust.clear();
          const isBoosting = this.boostTimer > 0;
          const combo = this.comboLevel || 0;

          // Base thrust flame
          const flameLen = isBoosting ? 28 : 14;
          const flameWidth = isBoosting ? 8 : 5;
          const flameAlpha = 0.4 + Math.sin(this.time0 * 12) * 0.15;
          const thrustColor = isBoosting ? 0x10b981 : this.ship._glowColor || 0x6366f1;

          // Outer flame
          thrust.fillStyle(thrustColor, flameAlpha * 0.4);
          thrust.fillTriangle(
            -flameWidth - 2, 14,
            flameWidth + 2, 14,
            0, 14 + flameLen + 6
          );
          // Inner flame
          thrust.fillStyle(0xffffff, flameAlpha * 0.6);
          thrust.fillTriangle(
            -flameWidth + 1, 14,
            flameWidth - 1, 14,
            0, 14 + flameLen
          );

          // Combo fire trail — escalating visual intensity
          if (combo >= 3) {
            const trailLen = Math.min(combo * 8, 60);
            const trailAlpha = Math.min(0.1 + combo * 0.03, 0.4);
            thrust.fillStyle(0xf59e0b, trailAlpha);
            thrust.fillTriangle(
              -flameWidth - 4, 14,
              flameWidth + 4, 14,
              0, 14 + flameLen + trailLen
            );
            // Hot core of combo trail
            thrust.fillStyle(0xfde68a, trailAlpha * 0.7);
            thrust.fillTriangle(
              -3, 14,
              3, 14,
              0, 14 + flameLen + trailLen - 8
            );
          }

          // Combo >= 5: side exhaust jets
          if (combo >= 5) {
            const jetAlpha = 0.2 + Math.sin(this.time0 * 15) * 0.1;
            thrust.fillStyle(0xc084fc, jetAlpha);
            thrust.fillTriangle(-12, 10, -8, 10, -16, 22);
            thrust.fillTriangle(12, 10, 8, 10, 16, 22);
          }
        }

        // Ship gentle float
        const floatY = Math.sin(this.time0 * 1.2) * 3;
        const floatX = Math.sin(this.time0 * 0.7) * 1.5;
        this.ship.y = this.ship._baseY + floatY;
        if (this.shakeTimer <= 0) {
          this.ship.x = this.ship._baseX + floatX;
        }

        // Ship glow pulse
        const glow = this.ship._glow;
        if (glow) {
          const pulse = 0.7 + 0.3 * Math.sin(this.time0 * 2);
          glow.setAlpha(pulse * (this.boostTimer > 0 ? 1.5 : 1));
        }
      }

      // ── Spawn trailing particles during boost ──
      if (this.boostTimer > 0 && this.ship && Math.random() < 0.4) {
        const px = this.ship._baseX + Phaser.Math.Between(-6, 6);
        const py = this.ship._baseY + 20;
        const trailP = this.add.circle(
          px, py,
          Phaser.Math.FloatBetween(0.5, 2),
          0x10b981,
          0.6
        );
        trailP.setDepth(45);
        this.tweens.add({
          targets: trailP,
          y: py + Phaser.Math.Between(30, 80),
          alpha: 0,
          duration: Phaser.Math.Between(300, 600),
          onComplete: () => trailP.destroy(),
        });
      }

      // ── Occasional shooting stars ──
      if (Math.random() < 0.001) {
        this.launchShootingStar(width, height);
      }
    }

    launchShootingStar(w, h) {
      const startX = Phaser.Math.Between(0, w);
      const startY = Phaser.Math.Between(0, h * 0.4);
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
        x: endX,
        y: endY,
        alpha: 0,
        duration: Phaser.Math.Between(400, 800),
        ease: "Sine.easeIn",
        onUpdate: () => {
          trail.clear();
          const dx = endX - startX;
          const dy = endY - startY;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          trail.lineStyle(1, 0xffffff, head.alpha * 0.3);
          trail.lineBetween(
            head.x - (dx / d) * 30,
            head.y - (dy / d) * 30,
            head.x,
            head.y
          );
        },
        onComplete: () => {
          trail.destroy();
          head.destroy();
        },
      });
    }
  }

  return NebulaTrialsScene;
}
