"use client";
/**
 * MasteryCelebration.jsx
 * Deploy to: src/components/phaser/MasteryCelebration.jsx
 *
 * Overlay celebration when a scholar achieves a mastery tier.
 * Uses Phaser for fireworks/confetti — falls back to CSS if Phaser fails.
 * Auto-dismisses after 4 seconds or on click.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

const TIER_CONFIG = {
  developing: {
    label: "Level Up!",
    subtitle: "Developing",
    emoji: "🚀",
    colors: [0x3b82f6, 0x60a5fa, 0x93c5fd],
    bg: "from-blue-600 to-indigo-700",
    text: "text-blue-200",
  },
  mastered: {
    label: "Mastered!",
    subtitle: "Mastered",
    emoji: "⭐",
    colors: [0xf59e0b, 0xfbbf24, 0xfde68a],
    bg: "from-amber-500 to-orange-600",
    text: "text-amber-200",
  },
  exceeding: {
    label: "Exceeding!",
    subtitle: "Exceeding Expectations",
    emoji: "🏆",
    colors: [0xa855f7, 0xc084fc, 0xe9d5ff],
    bg: "from-purple-600 to-pink-600",
    text: "text-purple-200",
  },
};

export default function MasteryCelebration({
  tier = "developing",
  isOpen = false,
  onClose = () => {},
  subjectName = "",
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [phaserLoaded, setPhaserLoaded] = useState(false);

  const config = TIER_CONFIG[tier] || TIER_CONFIG.developing;

  const handleClose = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setPhaserLoaded(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    let destroyed = false;

    const launchCelebration = async () => {
      try {
        const PhaserModule = await import("phaser");
        const Phaser = PhaserModule.default || PhaserModule;
        if (destroyed) return;

        // Define scene inline (avoids separate file + Phaser import issues)
        class CelebrationScene extends Phaser.Scene {
          constructor() {
            super({ key: "CelebrationScene" });
          }

          create() {
            const { width: w, height: h } = this.scale;
            const colors = config.colors;

            // Semi-transparent background
            this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.15);

            // ── Confetti particles ──
            colors.forEach((color) => {
              const gfx = this.make.graphics({ add: false });
              gfx.fillStyle(color, 1);
              gfx.fillRect(0, 0, 8, 8);
              const key = `confetti_${color}`;
              gfx.generateTexture(key, 8, 8);
              gfx.destroy();

              this.add.particles(0, 0, key, {
                x: { min: 0, max: w },
                y: -10,
                speedY: { min: 120, max: 280 },
                speedX: { min: -60, max: 60 },
                rotate: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0.2 },
                alpha: { start: 1, end: 0.3 },
                lifespan: 3500,
                gravityY: 150,
                frequency: 60,
              });
            });

            // ── Star burst ──
            const burstGfx = this.make.graphics({ add: false });
            burstGfx.fillStyle(0xffffff, 1);
            burstGfx.fillCircle(5, 5, 5);
            burstGfx.generateTexture("burst", 10, 10);
            burstGfx.destroy();

            const burst = this.add.particles(w / 2, h / 2, "burst", {
              speed: { min: 100, max: 300 },
              angle: { min: 0, max: 360 },
              scale: { start: 1, end: 0 },
              alpha: { start: 1, end: 0 },
              lifespan: 1200,
              tint: colors,
              quantity: 20,
              emitting: false,
            });
            burst.explode(20);

            // Second burst delayed
            this.time.delayedCall(600, () => {
              burst.explode(15);
            });

            // ── Main text ──
            const mainText = this.add
              .text(w / 2, h / 2 - 30, config.label, {
                font: "bold 48px Arial",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 6,
                align: "center",
              })
              .setOrigin(0.5)
              .setAlpha(0)
              .setScale(0.3);

            this.tweens.add({
              targets: mainText,
              alpha: 1,
              scale: 1,
              duration: 500,
              ease: "Back.out",
            });

            // Pulse
            this.tweens.add({
              targets: mainText,
              scale: { from: 1, to: 1.08 },
              duration: 800,
              yoyo: true,
              repeat: 3,
              ease: "Sine.inOut",
              delay: 500,
            });

            // ── Subtitle ──
            const sub = this.add
              .text(w / 2, h / 2 + 30, config.subtitle, {
                font: "bold 22px Arial",
                fill: "#e2e8f0",
                align: "center",
              })
              .setOrigin(0.5)
              .setAlpha(0);

            this.tweens.add({
              targets: sub,
              alpha: 1,
              y: h / 2 + 35,
              duration: 600,
              delay: 300,
              ease: "Quad.out",
            });

            // ── Subject name ──
            if (subjectName) {
              const subjText = this.add
                .text(w / 2, h / 2 + 65, subjectName, {
                  font: "18px Arial",
                  fill: "#94a3b8",
                  align: "center",
                })
                .setOrigin(0.5)
                .setAlpha(0);

              this.tweens.add({
                targets: subjText,
                alpha: 1,
                duration: 400,
                delay: 600,
              });
            }

            // ── Dismiss on click ──
            this.input.on("pointerdown", () => {
              handleClose();
            });

            // ── Auto-dismiss ──
            this.time.delayedCall(4000, () => {
              handleClose();
            });
          }
        }

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          width: containerRef.current?.clientWidth || 400,
          height: containerRef.current?.clientHeight || 350,
          parent: containerRef.current,
          transparent: true,
          scene: [CelebrationScene],
          render: { antialias: true },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
        });

        if (destroyed) {
          game.destroy(true);
          return;
        }

        gameRef.current = game;
        setPhaserLoaded(true);
      } catch (err) {
        console.warn("MasteryCelebration: Phaser failed, using CSS fallback", err);
      }
    };

    launchCelebration();

    // Auto-dismiss fallback (if Phaser fails)
    const fallbackTimer = setTimeout(() => {
      if (!phaserLoaded) handleClose();
    }, 5000);

    return () => {
      destroyed = true;
      clearTimeout(fallbackTimer);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tier]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Mastery celebration: ${config.label}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        className="relative w-[400px] h-[350px] max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CSS fallback (visible while Phaser loads or if it fails) */}
        {!phaserLoaded && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${config.bg} animate-pulse`}
          >
            <span className="text-6xl mb-4">{config.emoji}</span>
            <h2 className="text-4xl font-black text-white mb-2">{config.label}</h2>
            <p className={`text-xl font-bold ${config.text}`}>{config.subtitle}</p>
            {subjectName && (
              <p className="text-sm text-white/60 mt-2">{subjectName}</p>
            )}
            <p className="text-xs text-white/40 mt-6">Tap to dismiss</p>
          </div>
        )}
      </div>
    </div>
  );
}
