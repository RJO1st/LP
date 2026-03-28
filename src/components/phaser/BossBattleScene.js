/**
 * BossBattleScene.js
 * Deploy to: src/components/phaser/BossBattleScene.js
 *
 * A Phaser Scene for the weekly challenge "boss battle".
 * Pure JS (no JSX) — imported into PhaserScene wrapper.
 *
 * Features:
 * - Animated boss character (floating geometric shapes — no external assets)
 * - Question display with answer options
 * - Answer feedback: correct = boss damage, wrong = boss attack
 * - Health bars + particle effects
 * - Difficulty scaling (1-5)
 * - Events: 'game-event' with payloads for answer-result, boss-defeated, battle-complete
 * - Registry: reads question, bossHealth, scholarHealth, difficulty
 *
 * NOTE: This file does NOT import Phaser at the top level. Phaser is available
 * via `this.scene` context when the scene is running inside a Phaser.Game.
 * The scene class is passed to PhaserScene.jsx which handles the Phaser import.
 */

// We need Phaser.Scene as base class — this file must be dynamically imported
// after Phaser is loaded. The consuming component should do:
//   const Phaser = await import('phaser');
//   const { default: BossBattleScene } = await import('./BossBattleScene');
// Or pass the class to PhaserScene which handles the lifecycle.

// Factory function: call with Phaser module to get the scene class
export function createBossBattleScene(Phaser) {
  return class BossBattleScene extends Phaser.Scene {
    constructor() {
      super({ key: "BossBattleScene" });
      this.bossHealthMax = 100;
      this.scholarHealthMax = 100;
      this.bossHealth = 100;
      this.scholarHealth = 100;
      this.difficulty = 1;
      this.isAnswering = false;
      this.answerStreak = 0;
    }

    create() {
      const { width, height } = this.scale;

      // Read initial data from registry
      this.difficulty = this.registry.get("difficulty") || 1;
      this.bossHealth = this.registry.get("bossHealth") || this.bossHealthMax;
      this.scholarHealth =
        this.registry.get("scholarHealth") || this.scholarHealthMax;

      // ── Background ──
      this.createBackground(width, height);

      // ── Boss character ──
      this.createBoss(width, height);

      // ── Health bars ──
      this.createHealthBars(width);

      // ── Question UI ──
      this.createQuestionUI(width, height);

      // ── Particle textures ──
      this.createParticleTextures();

      // ── Listen for registry changes ──
      this.registry.events.on(
        "changedata-question",
        this.handleNewQuestion,
        this
      );

      // ── Floating boss animation ──
      this.tweens.add({
        targets: this.bossContainer,
        y: this.bossContainer.y - 12,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });

      // Show initial question if one exists
      const q = this.registry.get("question");
      if (q) this.displayQuestion(q);
    }

    // ─── BACKGROUND ─────────────────────────────────────────────────
    createBackground(w, h) {
      // Dark gradient arena
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1);
      bg.fillRect(0, 0, w, h);

      // Ambient particles (stars)
      for (let i = 0; i < 40; i++) {
        const star = this.add.circle(
          Phaser.Math.Between(0, w),
          Phaser.Math.Between(0, h),
          Phaser.Math.Between(1, 2),
          0xffffff,
          Phaser.Math.FloatBetween(0.1, 0.4)
        );
        this.tweens.add({
          targets: star,
          alpha: { from: star.alpha, to: star.alpha * 0.3 },
          duration: Phaser.Math.Between(1500, 3000),
          yoyo: true,
          repeat: -1,
        });
      }

      // Arena ring
      const ring = this.add.circle(w / 2, h * 0.35, 90, 0x6366f1, 0.06);
      ring.setStrokeStyle(2, 0x6366f1, 0.15);
    }

    // ─── BOSS CHARACTER ─────────────────────────────────────────────
    createBoss(w, h) {
      this.bossContainer = this.add.container(w / 2, h * 0.28);

      // Main body — glowing orb
      const bodyGlow = this.add.circle(0, 0, 48 + this.difficulty * 4, 0x7c3aed, 0.15);
      const body = this.add.circle(0, 0, 40 + this.difficulty * 3, 0x7c3aed, 0.9);
      body.setStrokeStyle(3, 0xa78bfa, 0.8);

      // Inner core
      const core = this.add.circle(0, 0, 16, 0xc4b5fd, 0.7);

      // Eye
      const eye = this.add.circle(0, -6, 8, 0xffffff, 0.95);
      const pupil = this.add.circle(0, -6, 4, 0x1e1b4b, 1);
      this.bossPupil = pupil;

      // Spikes (difficulty-based)
      const spikeCount = 4 + this.difficulty;
      for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2;
        const dist = 50 + this.difficulty * 4;
        const spike = this.add.triangle(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist,
          0, -8, -5, 5, 5, 5,
          0xa78bfa, 0.6
        );
        spike.setRotation(angle + Math.PI / 2);
        this.bossContainer.add(spike);
      }

      this.bossContainer.add([bodyGlow, body, core, eye, pupil]);

      // Boss name
      const bossNames = ["Glitch", "Byte", "Cipher", "Phantom", "Overlord"];
      const bossName = bossNames[Math.min(this.difficulty - 1, 4)];
      this.add
        .text(w / 2, h * 0.28 + 70, bossName, {
          font: "bold 14px Arial",
          fill: "#a78bfa",
          align: "center",
        })
        .setOrigin(0.5);
    }

    // ─── HEALTH BARS ────────────────────────────────────────────────
    createHealthBars(w) {
      const barW = 140;
      const barH = 12;
      const y = 18;

      // Boss health (right side)
      this.add
        .text(w - 20, y - 2, "Boss", {
          font: "bold 10px Arial",
          fill: "#a78bfa",
        })
        .setOrigin(1, 1);
      const bossBarBg = this.add
        .rectangle(w - 20 - barW / 2, y + barH / 2, barW, barH, 0x334155)
        .setOrigin(0.5);
      bossBarBg.setStrokeStyle(1, 0x475569);
      this.bossBar = this.add
        .rectangle(w - 20 - barW + 1, y + barH / 2, barW - 2, barH - 2, 0x7c3aed)
        .setOrigin(0, 0.5);

      // Scholar health (left side)
      this.add
        .text(20, y - 2, "You", {
          font: "bold 10px Arial",
          fill: "#34d399",
        })
        .setOrigin(0, 1);
      const scholarBarBg = this.add
        .rectangle(20 + barW / 2, y + barH / 2, barW, barH, 0x334155)
        .setOrigin(0.5);
      scholarBarBg.setStrokeStyle(1, 0x475569);
      this.scholarBar = this.add
        .rectangle(21, y + barH / 2, barW - 2, barH - 2, 0x10b981)
        .setOrigin(0, 0.5);

      // Streak counter
      this.streakText = this.add
        .text(w / 2, y + 4, "", {
          font: "bold 12px Arial",
          fill: "#fbbf24",
          align: "center",
        })
        .setOrigin(0.5);
    }

    // ─── QUESTION UI ────────────────────────────────────────────────
    createQuestionUI(w, h) {
      const qY = h * 0.55;

      // Question text
      this.questionText = this.add
        .text(w / 2, qY, "Get ready...", {
          font: "bold 16px Arial",
          fill: "#e2e8f0",
          align: "center",
          wordWrap: { width: w - 40 },
        })
        .setOrigin(0.5);

      // Answer buttons
      this.answerButtons = [];
      this.answerTexts = [];

      const btnW = (w - 50) / 2;
      const btnH = 44;
      const startY = qY + 50;

      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 15 + col * (btnW + 10) + btnW / 2;
        const y = startY + row * (btnH + 8) + btnH / 2;

        const btn = this.add
          .rectangle(x, y, btnW, btnH, 0x1e293b, 0.9)
          .setStrokeStyle(2, 0x475569)
          .setInteractive({ useHandCursor: true });

        const label = String.fromCharCode(65 + i);
        const text = this.add
          .text(x, y, `${label}. —`, {
            font: "bold 13px Arial",
            fill: "#cbd5e1",
            align: "center",
            wordWrap: { width: btnW - 20 },
          })
          .setOrigin(0.5);

        btn.on("pointerover", () => {
          if (!this.isAnswering) btn.setStrokeStyle(2, 0x818cf8);
        });
        btn.on("pointerout", () => {
          if (!this.isAnswering) btn.setStrokeStyle(2, 0x475569);
        });
        btn.on("pointerdown", () => this.handleAnswer(i));

        this.answerButtons.push(btn);
        this.answerTexts.push(text);
      }
    }

    // ─── PARTICLE TEXTURES ──────────────────────────────────────────
    createParticleTextures() {
      // Hit particle texture
      const hitGfx = this.make.graphics({ add: false });
      hitGfx.fillStyle(0xfbbf24, 1);
      hitGfx.fillCircle(4, 4, 4);
      hitGfx.generateTexture("hitParticle", 8, 8);
      hitGfx.destroy();

      // Damage particle
      const dmgGfx = this.make.graphics({ add: false });
      dmgGfx.fillStyle(0xef4444, 1);
      dmgGfx.fillCircle(3, 3, 3);
      dmgGfx.generateTexture("dmgParticle", 6, 6);
      dmgGfx.destroy();

      // Victory particle
      const vicGfx = this.make.graphics({ add: false });
      vicGfx.fillStyle(0xa78bfa, 1);
      vicGfx.fillCircle(5, 5, 5);
      vicGfx.generateTexture("victoryParticle", 10, 10);
      vicGfx.destroy();
    }

    // ─── DISPLAY QUESTION ───────────────────────────────────────────
    handleNewQuestion(_parent, _key, question) {
      this.displayQuestion(question);
    }

    displayQuestion(question) {
      if (!question) return;
      this.isAnswering = false;

      this.questionText.setText(question.q || question.text || "");

      const opts = question.opts || question.options || [];
      for (let i = 0; i < 4; i++) {
        if (i < opts.length) {
          const label = String.fromCharCode(65 + i);
          this.answerTexts[i].setText(`${label}. ${opts[i]}`);
          this.answerButtons[i].setFillStyle(0x1e293b, 0.9);
          this.answerButtons[i].setStrokeStyle(2, 0x475569);
          this.answerButtons[i].setInteractive();
          this.answerTexts[i].setColor("#cbd5e1");
        } else {
          this.answerTexts[i].setText("");
          this.answerButtons[i].disableInteractive();
        }
      }
    }

    // ─── HANDLE ANSWER ──────────────────────────────────────────────
    handleAnswer(index) {
      if (this.isAnswering) return;
      this.isAnswering = true;

      const question = this.registry.get("question");
      if (!question) return;

      const correctIndex = question.a ?? question.answer ?? 0;
      const isCorrect = index === correctIndex;

      // Visual feedback on buttons
      for (let i = 0; i < 4; i++) {
        this.answerButtons[i].disableInteractive();
        if (i === correctIndex) {
          this.answerButtons[i].setFillStyle(0x065f46, 0.9);
          this.answerButtons[i].setStrokeStyle(2, 0x10b981);
          this.answerTexts[i].setColor("#6ee7b7");
        } else if (i === index && !isCorrect) {
          this.answerButtons[i].setFillStyle(0x7f1d1d, 0.9);
          this.answerButtons[i].setStrokeStyle(2, 0xef4444);
          this.answerTexts[i].setColor("#fca5a5");
        } else {
          this.answerButtons[i].setFillStyle(0x1e293b, 0.4);
          this.answerTexts[i].setColor("#64748b");
        }
      }

      if (isCorrect) {
        this.onCorrectAnswer();
      } else {
        this.onWrongAnswer();
      }

      // Emit result
      this.events.emit("game-event", "answer-result", {
        correct: isCorrect,
        index,
        correctIndex,
        bossHealth: this.bossHealth,
        scholarHealth: this.scholarHealth,
      });
    }

    // ─── CORRECT ANSWER ─────────────────────────────────────────────
    onCorrectAnswer() {
      this.answerStreak++;
      const damage = 15 + this.answerStreak * 3;
      this.bossHealth = Math.max(0, this.bossHealth - damage);

      // Update streak display
      if (this.answerStreak > 1) {
        this.streakText.setText(`🔥 ${this.answerStreak}x streak!`);
        this.tweens.add({
          targets: this.streakText,
          scale: { from: 1.4, to: 1 },
          duration: 300,
          ease: "Back.out",
        });
      }

      // Boss damage effect — shake + flash
      this.cameras.main.shake(200, 0.01);
      this.tweens.add({
        targets: this.bossContainer,
        alpha: 0.3,
        duration: 80,
        yoyo: true,
        repeat: 2,
      });

      // Hit particles
      const { width } = this.scale;
      const emitter = this.add.particles(width / 2, this.bossContainer.y, "hitParticle", {
        speed: { min: 100, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 600,
        quantity: 12,
        emitting: false,
      });
      emitter.explode(12);
      this.time.delayedCall(1000, () => emitter.destroy());

      // Update boss health bar
      this.updateBossHealthBar();

      // Check boss defeated
      if (this.bossHealth <= 0) {
        this.time.delayedCall(500, () => this.onBossDefeated());
        return;
      }
    }

    // ─── WRONG ANSWER ───────────────────────────────────────────────
    onWrongAnswer() {
      this.answerStreak = 0;
      this.streakText.setText("");

      const damage = 10 + this.difficulty * 5;
      this.scholarHealth = Math.max(0, this.scholarHealth - damage);

      // Screen shake (stronger)
      this.cameras.main.shake(300, 0.02);

      // Boss attack animation — lunge forward
      this.tweens.add({
        targets: this.bossContainer,
        y: this.bossContainer.y + 30,
        duration: 150,
        yoyo: true,
        ease: "Quad.in",
      });

      // Damage particles on scholar side
      const emitter = this.add.particles(this.scale.width / 2, this.scale.height * 0.7, "dmgParticle", {
        speed: { min: 80, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 500,
        quantity: 8,
        emitting: false,
      });
      emitter.explode(8);
      this.time.delayedCall(800, () => emitter.destroy());

      // Red flash on scholar health
      this.tweens.add({
        targets: this.scholarBar,
        fillColor: 0xef4444,
        duration: 200,
        yoyo: true,
        onComplete: () => this.scholarBar.setFillStyle(0x10b981),
      });

      // Update scholar health bar
      this.updateScholarHealthBar();

      if (this.scholarHealth <= 0) {
        this.time.delayedCall(500, () => this.onBattleComplete(false));
      }
    }

    // ─── HEALTH BAR UPDATES ─────────────────────────────────────────
    updateBossHealthBar() {
      const pct = this.bossHealth / this.bossHealthMax;
      this.tweens.add({
        targets: this.bossBar,
        displayWidth: Math.max(1, (140 - 2) * pct),
        duration: 300,
        ease: "Quad.out",
      });
    }

    updateScholarHealthBar() {
      const pct = this.scholarHealth / this.scholarHealthMax;
      this.tweens.add({
        targets: this.scholarBar,
        displayWidth: Math.max(1, (140 - 2) * pct),
        duration: 300,
        ease: "Quad.out",
      });
    }

    // ─── BOSS DEFEATED ──────────────────────────────────────────────
    onBossDefeated() {
      // Explosion effect
      const { width, height } = this.scale;

      // Boss shatter
      this.tweens.add({
        targets: this.bossContainer,
        scale: 1.5,
        alpha: 0,
        duration: 600,
        ease: "Quad.in",
      });

      // Victory particles
      const emitter = this.add.particles(width / 2, height * 0.28, "victoryParticle", {
        speed: { min: 100, max: 350 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1500,
        quantity: 30,
        emitting: false,
      });
      emitter.explode(30);

      // Victory text
      const victoryText = this.add
        .text(width / 2, height / 2, "DEFEATED!", {
          font: "bold 36px Arial",
          fill: "#fbbf24",
          stroke: "#92400e",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setScale(0.5);

      this.tweens.add({
        targets: victoryText,
        alpha: 1,
        scale: 1.2,
        duration: 500,
        ease: "Back.out",
      });

      this.events.emit("game-event", "boss-defeated", {
        bossHealth: 0,
        scholarHealth: this.scholarHealth,
        streak: this.answerStreak,
      });

      this.time.delayedCall(2000, () => this.onBattleComplete(true));
    }

    // ─── BATTLE COMPLETE ────────────────────────────────────────────
    onBattleComplete(won) {
      this.events.emit("game-event", "battle-complete", {
        won,
        bossHealth: this.bossHealth,
        scholarHealth: this.scholarHealth,
        streak: this.answerStreak,
      });
    }

    // ─── UPDATE LOOP ────────────────────────────────────────────────
    update() {
      // Boss eye tracking (follows cursor position loosely)
      if (this.bossPupil && this.input.activePointer) {
        const pointer = this.input.activePointer;
        const bossX = this.bossContainer.x;
        const bossY = this.bossContainer.y;
        const dx = pointer.worldX - bossX;
        const dy = pointer.worldY - bossY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const maxOffset = 3;
          this.bossPupil.x = (dx / dist) * maxOffset;
          this.bossPupil.y = -6 + (dy / dist) * maxOffset;
        }
      }
    }

    // ─── CLEANUP ────────────────────────────────────────────────────
    shutdown() {
      this.registry.events.off("changedata-question", this.handleNewQuestion, this);
    }
  };
}
