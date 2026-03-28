"use client";
/**
 * PhaserScene.jsx
 * Deploy to: src/components/phaser/PhaserScene.jsx
 *
 * Reusable React wrapper for Phaser.Game instances.
 * Manages lifecycle (create/destroy), bidirectional data flow,
 * and SSR safety for Next.js 16.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * @param {object}   props
 * @param {Function|Function[]} props.sceneClass   - Phaser.Scene class(es)
 * @param {object}   props.gameConfig              - Override Phaser config
 * @param {Function} props.onSceneReady            - (scene) => void
 * @param {Function} props.onGameEvent             - (eventName, data) => void
 * @param {object}   props.reactData               - Passed into scene.registry
 * @param {string}   props.className               - Extra CSS classes
 * @param {string|number} props.width              - Container width
 * @param {number}   props.height                  - Container height in px
 * @param {object}   props.gameRef                 - External ref to expose game instance
 */
export default function PhaserScene({
  sceneClass,
  gameConfig = {},
  onSceneReady,
  onGameEvent,
  reactData = {},
  className = "",
  width = "100%",
  height = 400,
  gameRef: externalGameRef,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const phaserRef = useRef(null); // holds the dynamically imported Phaser module
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Stable references for callbacks
  const onSceneReadyRef = useRef(onSceneReady);
  const onGameEventRef = useRef(onGameEvent);
  useEffect(() => { onSceneReadyRef.current = onSceneReady; }, [onSceneReady]);
  useEffect(() => { onGameEventRef.current = onGameEvent; }, [onGameEvent]);

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;

    let destroyed = false;

    const createGame = async () => {
      try {
        // Dynamic import — Phaser needs `window` / `document`
        const PhaserModule = await import("phaser");
        const Phaser = PhaserModule.default || PhaserModule;

        if (destroyed) return;
        phaserRef.current = Phaser;

        // Normalise scene classes to array
        const scenes = Array.isArray(sceneClass) ? sceneClass : [sceneClass];
        if (!scenes.length || !scenes[0]) {
          console.warn("PhaserScene: No scene classes provided");
          return;
        }

        // Resolve container dimensions
        const containerW =
          typeof width === "number"
            ? width
            : containerRef.current?.clientWidth || 800;
        const containerH =
          typeof height === "number" ? height : parseInt(height) || 400;

        // Build config (user overrides merge on top)
        const config = {
          type: Phaser.AUTO,
          width: containerW,
          height: containerH,
          parent: containerRef.current,
          transparent: true,
          physics: {
            default: "arcade",
            arcade: { gravity: { y: 0 }, debug: false },
          },
          render: {
            pixelArt: false,
            antialiasGL: true,
            antialias: true,
          },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          scene: scenes,
          ...gameConfig,
        };

        const game = new Phaser.Game(config);
        if (destroyed) {
          game.destroy(true);
          return;
        }
        gameRef.current = game;
        // Expose to external ref if provided
        if (externalGameRef) externalGameRef.current = game;

        // Push reactData into game registry IMMEDIATELY so scenes
        // can read it during create(). game.registry is shared across
        // all scenes and available before scene.create() fires.
        if (reactData) {
          Object.entries(reactData).forEach(([key, value]) => {
            game.registry.set(key, value);
          });
        }

        // Also push into scene-level registry once scenes are ready
        const pushToScene = () => {
          if (destroyed || !gameRef.current) return;
          const mainScene = game.scene.scenes?.[0];
          if (!mainScene) return;

          // Sync into scene registry (fires changedata events)
          if (reactData) {
            Object.entries(reactData).forEach(([key, value]) => {
              mainScene.registry.set(key, value);
            });
          }

          // Forward Phaser → React events
          if (onGameEventRef.current) {
            const handler = (eventName, ...args) => {
              onGameEventRef.current?.(eventName, ...args);
            };
            mainScene.events.on("game-event", handler);
          }

          // Notify ready
          onSceneReadyRef.current?.(mainScene);
          setIsReady(true);
        };

        // Try immediately for scenes that are already booted
        requestAnimationFrame(pushToScene);
      } catch (err) {
        console.error("PhaserScene: Failed to create game", err);
        setLoadError(err.message);
      }
    };

    createGame();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (externalGameRef) externalGameRef.current = null;
      phaserRef.current = null;
      setIsReady(false);
    };
    // Re-create only when sceneClass changes — NOT on every reactData change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneClass]);

  // Sync reactData into registry when it changes (without recreating game)
  // Uses game.registry which is shared with all scenes (scene.registry === game.registry)
  useEffect(() => {
    if (!gameRef.current) return;
    Object.entries(reactData).forEach(([key, value]) => {
      gameRef.current.registry.set(key, value);
    });
  }, [reactData]);

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 rounded-2xl ${className}`}
        style={{ width, height: typeof height === "number" ? `${height}px` : height }}>
        <p className="text-slate-400 text-sm">Unable to load game engine</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`phaser-container ${className}`}
      style={{
        width,
        height: typeof height === "number" ? `${height}px` : height,
        position: "relative",
        overflow: "hidden",
        borderRadius: "1rem",
      }}
    />
  );
}
