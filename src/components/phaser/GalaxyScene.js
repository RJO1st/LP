/**
 * GalaxyScene.js — Phaser 3 Scene for 3D-Perspective Galaxy Map
 *
 * Renders a high-fidelity solar system inspired by NASA-style artwork:
 * - Massive glowing sun with animated corona rays + lens flare
 * - Planets with multi-layer rendering: core, gradient surface, highlight,
 *   atmosphere halo, and optional Saturn-style rings
 * - Elliptical orbits with perspective depth (Y-squash + depth scaling)
 * - Wide orbital spacing filling full canvas width
 * - Multi-layer parallax starfield with coloured accents
 * - Nebula gas clouds with slow drift
 * - Orbital dust particles along each ring
 * - Hover/click interactivity piped back to React
 *
 * Mobile-first: responsive sizing based on container dimensions
 *
 * Data arrives via scene.registry (set by PhaserScene wrapper):
 *   - planets: Array<{ subject, label, avgScore, tier, color }>
 *   - onPlanetClick: (subjectKey) => void
 */

export function createGalaxyScene(Phaser) {
  if (!Phaser || !Phaser.Scene) return null;

  // Subject-specific visual configs for extra planet personality
  const PLANET_TRAITS = {
    mathematics: { hasRings: true, ringColor: 0x818cf8, ringTilt: 0.25 },
    english:     { hasRings: false, moons: 1 },
    science:     { hasRings: true, ringColor: 0x34d399, ringTilt: 0.3 },
    history:     { hasRings: false, moons: 2 },
    geography:   { hasRings: false, craterCount: 3 },
    computing:   { hasRings: true, ringColor: 0x60a5fa, ringTilt: 0.2 },
    french:      { hasRings: false, moons: 1 },
    spanish:     { hasRings: false, moons: 0 },
    art:         { hasRings: true, ringColor: 0xf472b6, ringTilt: 0.35 },
    music:       { hasRings: false, moons: 1 },
  };

  class GalaxyScene extends Phaser.Scene {
    constructor() {
      super({ key: "GalaxyScene" });
      this.planetSprites = [];
      this.orbitGraphics = null;
      this.nebulae = [];
      this.starLayers = [];
      this.centralSun = null;
      this.coronaContainer = null;
      this.dustParticles = [];
      this.time0 = 0;
      this._hasRenderedPlanets = false;

      // 3D perspective
      this.TILT = 0.35;
      this.DEPTH_SCALE_MIN = 0.55;
      this.DEPTH_SCALE_MAX = 1.2;
    }

    create() {
      const { width, height } = this.scale;
      this.cx = width * 0.5;
      this.cy = height * 0.48;
      this.time0 = 0;
      this._hasRenderedPlanets = false;

      // ── Deep space gradient background ──
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x020012, 0x050520, 0x0a0830, 0x030015, 1);
      bg.fillRect(0, 0, width, height);

      // ── Starfield (3 parallax layers) ──
      this.createStarfield(width, height);

      // ── Distant galaxies (tiny smudges) ──
      this.createDistantGalaxies(width, height);

      // ── Nebula gas clouds ──
      this.createNebulae(width, height);

      // ── Orbital ring container ──
      this.orbitGraphics = this.add.graphics();
      this.orbitGraphics.setDepth(5);

      // ── Central Sun with corona ──
      this.createSun();

      // ── Lens flare ──
      this.createLensFlare();

      // ── Planets from data ──
      const planets = this.registry.get("planets") || [];
      if (planets.length > 0) {
        this.drawOrbitalRings();
        this.createPlanets();
        this._hasRenderedPlanets = true;
      }

      // ── Listen for data updates ──
      this.registry.events.on("changedata", (parent, key) => {
        if (key === "planets") {
          this.drawOrbitalRings();
          this.refreshPlanets();
          this._hasRenderedPlanets = true;
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ORBITAL RADIUS — fills FULL canvas width
    // ═══════════════════════════════════════════════════════════════
    getOrbitRadius(index, total) {
      const { width } = this.scale;
      const minR = width * 0.1;
      const maxR = width * 0.44;
      if (total <= 1) return (minR + maxR) / 2;
      const t = index / (total - 1);
      return minR + (maxR - minR) * Math.pow(t, 0.6);
    }

    // ═══════════════════════════════════════════════════════════════
    // STARFIELD — 3 depth layers with coloured accent stars
    // ═══════════════════════════════════════════════════════════════
    createStarfield(w, h) {
      const layerConfigs = [
        { count: 160, minSize: 0.2, maxSize: 0.8, alpha: 0.15 },
        { count: 90,  minSize: 0.6, maxSize: 1.5, alpha: 0.35 },
        { count: 35,  minSize: 1.2, maxSize: 2.8, alpha: 0.65 },
      ];

      layerConfigs.forEach((cfg) => {
        const stars = [];
        for (let i = 0; i < cfg.count; i++) {
          const x = Phaser.Math.Between(0, w);
          const y = Phaser.Math.Between(0, h);
          const size = Phaser.Math.FloatBetween(cfg.minSize, cfg.maxSize);
          const useColor = Math.random() < 0.1;
          const starColor = useColor
            ? Phaser.Utils.Array.GetRandom([0xa78bfa, 0x93c5fd, 0xfde68a, 0xfca5a5, 0x86efac])
            : 0xffffff;
          const star = this.add.circle(x, y, size, starColor, cfg.alpha);
          star._baseAlpha = cfg.alpha;
          star._twinkleSpeed = Phaser.Math.FloatBetween(0.3, 2.5);
          star._twinkleOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
          star.setDepth(0);
          stars.push(star);
        }
        this.starLayers.push({ stars });
      });

      this._shootingStarTimer = 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // DISTANT GALAXIES — tiny smudged ovals in the background
    // ═══════════════════════════════════════════════════════════════
    createDistantGalaxies(w, h) {
      for (let i = 0; i < 4; i++) {
        const g = this.add.graphics();
        const gx = Phaser.Math.Between(w * 0.05, w * 0.95);
        const gy = Phaser.Math.Between(h * 0.05, h * 0.95);
        const size = Phaser.Math.Between(6, 18);
        const angle = Phaser.Math.FloatBetween(0, Math.PI);
        const color = Phaser.Utils.Array.GetRandom([0x818cf8, 0x93c5fd, 0xc4b5fd]);

        g.fillStyle(color, 0.04);
        g.fillEllipse(gx, gy, size * 3, size);
        g.fillStyle(color, 0.08);
        g.fillEllipse(gx, gy, size * 1.5, size * 0.5);
        g.fillStyle(0xffffff, 0.06);
        g.fillCircle(gx, gy, size * 0.3);
        g.setRotation(angle);
        g.setDepth(1);
      }
    }

    launchShootingStar() {
      const { width, height } = this.scale;
      const startX = Phaser.Math.Between(0, width);
      const startY = Phaser.Math.Between(0, height * 0.3);
      const endX = startX + Phaser.Math.Between(80, 220);
      const endY = startY + Phaser.Math.Between(60, 150);

      const trail = this.add.graphics();
      trail.setDepth(2);
      const head = this.add.circle(startX, startY, 1.5, 0xffffff, 0.9);
      head.setDepth(3);

      this.tweens.add({
        targets: head,
        x: endX, y: endY, alpha: 0,
        duration: Phaser.Math.Between(500, 1000),
        ease: "Sine.easeIn",
        onUpdate: () => {
          trail.clear();
          trail.lineStyle(1.2, 0xffffff, head.alpha * 0.4);
          const dx = endX - startX, dy = endY - startY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          trail.lineBetween(head.x - (dx / dist) * 35, head.y - (dy / dist) * 35, head.x, head.y);
        },
        onComplete: () => { trail.destroy(); head.destroy(); },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // NEBULA GAS CLOUDS — multi-layered with colour variety
    // ═══════════════════════════════════════════════════════════════
    createNebulae(w, h) {
      const configs = [
        { color: 0x7c3aed, x: 0.15, y: 0.2, rx: 140, ry: 90 },
        { color: 0x6366f1, x: 0.8,  y: 0.7, rx: 120, ry: 80 },
        { color: 0xa855f7, x: 0.5,  y: 0.85, rx: 160, ry: 60 },
        { color: 0x3b82f6, x: 0.9,  y: 0.15, rx: 100, ry: 70 },
        { color: 0x2563eb, x: 0.3,  y: 0.6, rx: 90, ry: 110 },
        { color: 0xc084fc, x: 0.65, y: 0.3, rx: 130, ry: 55 },
      ];

      configs.forEach((cfg) => {
        const g = this.add.graphics();
        const nx = w * cfg.x + Phaser.Math.Between(-30, 30);
        const ny = h * cfg.y + Phaser.Math.Between(-20, 20);

        // Multi-layer soft ellipses for gas cloud look
        g.fillStyle(cfg.color, 0.012);
        g.fillEllipse(nx, ny, cfg.rx * 2.8, cfg.ry * 2.8);
        g.fillStyle(cfg.color, 0.025);
        g.fillEllipse(nx, ny, cfg.rx * 1.8, cfg.ry * 1.8);
        g.fillStyle(cfg.color, 0.04);
        g.fillEllipse(nx, ny, cfg.rx, cfg.ry);
        // Wisps
        g.fillStyle(cfg.color, 0.015);
        g.fillEllipse(nx + cfg.rx * 0.5, ny - cfg.ry * 0.3, cfg.rx * 1.5, cfg.ry * 0.4);

        g._driftX = Phaser.Math.FloatBetween(-0.08, 0.08);
        g._driftY = Phaser.Math.FloatBetween(-0.04, 0.04);
        g.setDepth(2);
        this.nebulae.push(g);
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ORBITAL RINGS — elliptical with perspective shading
    // ═══════════════════════════════════════════════════════════════
    drawOrbitalRings() {
      const g = this.orbitGraphics;
      g.clear();
      const planets = this.registry.get("planets") || [];
      const total = planets.length;

      for (let i = 0; i < total; i++) {
        const radius = this.getOrbitRadius(i, total);
        const ry = radius * (1 - this.TILT);

        // Outer soft glow ring
        g.lineStyle(5, 0x6366f1, 0.015);
        this.drawEllipsePath(g, this.cx, this.cy, radius, ry, 80);

        // Main dashed ring with depth-based alpha
        const segments = 100;
        for (let s = 0; s < segments; s++) {
          const a1 = (s / segments) * Math.PI * 2;
          const a2 = ((s + 0.6) / segments) * Math.PI * 2;
          // Brighter in front (bottom), dimmer behind (top)
          const depthFactor = 0.5 + 0.5 * Math.sin(a1);
          const alpha = 0.04 + depthFactor * 0.12;

          g.lineStyle(1.0, 0x818cf8, alpha);
          const x1 = this.cx + Math.cos(a1) * radius;
          const y1 = this.cy + Math.sin(a1) * ry;
          const x2 = this.cx + Math.cos(a2) * radius;
          const y2 = this.cy + Math.sin(a2) * ry;
          g.beginPath();
          g.moveTo(x1, y1);
          g.lineTo(x2, y2);
          g.strokePath();
        }
      }
    }

    drawEllipsePath(g, cx, cy, rx, ry, segments) {
      g.beginPath();
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }

    // ═══════════════════════════════════════════════════════════════
    // CENTRAL SUN — massive glow with animated corona rays
    // ═══════════════════════════════════════════════════════════════
    createSun() {
      const { width } = this.scale;
      const isMobile = width < 500;
      const sunScale = isMobile ? 0.7 : 1.0;

      const container = this.add.container(this.cx, this.cy);
      container.setDepth(50);

      // Outermost soft glow layers
      const glow = this.add.graphics();
      const glowLayers = [
        { r: 80 * sunScale, a: 0.01, color: 0xfbbf24 },
        { r: 60 * sunScale, a: 0.02, color: 0xfbbf24 },
        { r: 45 * sunScale, a: 0.04, color: 0xf59e0b },
        { r: 35 * sunScale, a: 0.07, color: 0xf59e0b },
        { r: 28 * sunScale, a: 0.12, color: 0xfbbf24 },
      ];
      glowLayers.forEach((l) => {
        glow.fillStyle(l.color, l.a);
        glow.fillCircle(0, 0, l.r);
      });
      container.add(glow);

      // Sun body with gradient effect
      const body = this.add.graphics();
      body.fillStyle(0xfbbf24, 0.85);
      body.fillCircle(0, 0, 18 * sunScale);
      body.fillStyle(0xfef3c7, 0.95);
      body.fillCircle(0, 0, 12 * sunScale);
      body.fillStyle(0xffffff, 0.5);
      body.fillCircle(-3 * sunScale, -3 * sunScale, 5 * sunScale);
      container.add(body);

      // Corona rays — long thin triangles radiating out
      this._coronaRays = [];
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const ray = this.add.graphics();
        const angle = (i / rayCount) * Math.PI * 2;
        const length = Phaser.Math.Between(25, 45) * sunScale;
        const baseWidth = Phaser.Math.FloatBetween(1.5, 4) * sunScale;
        const rayAlpha = Phaser.Math.FloatBetween(0.04, 0.1);

        ray.fillStyle(0xfbbf24, rayAlpha);
        // Triangle ray from sun edge outward
        const innerR = 16 * sunScale;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const perpCos = Math.cos(angle + Math.PI / 2);
        const perpSin = Math.sin(angle + Math.PI / 2);
        ray.fillTriangle(
          cos * innerR + perpCos * baseWidth, sin * innerR + perpSin * baseWidth,
          cos * innerR - perpCos * baseWidth, sin * innerR - perpSin * baseWidth,
          cos * (innerR + length), sin * (innerR + length)
        );
        container.add(ray);
        this._coronaRays.push({ ray, baseAngle: angle, baseLength: length, baseAlpha: rayAlpha });
      }

      this.centralSun = container;

      // Pulsing corona ring
      const coronaRing = this.add.graphics();
      coronaRing.lineStyle(2.5, 0xfbbf24, 0.1);
      coronaRing.strokeCircle(0, 0, 24 * sunScale);
      coronaRing.lineStyle(1.5, 0xfde68a, 0.06);
      coronaRing.strokeCircle(0, 0, 30 * sunScale);
      container.add(coronaRing);
      this._coronaRing = coronaRing;
    }

    // ═══════════════════════════════════════════════════════════════
    // LENS FLARE — subtle light artifacts near the sun
    // ═══════════════════════════════════════════════════════════════
    createLensFlare() {
      const container = this.add.container(this.cx, this.cy);
      container.setDepth(48);

      // Horizontal flare streak
      const streak = this.add.graphics();
      streak.fillStyle(0xfbbf24, 0.03);
      streak.fillEllipse(0, 0, 200, 4);
      streak.fillStyle(0xffffff, 0.015);
      streak.fillEllipse(0, 0, 300, 2);
      container.add(streak);

      // Small flare dots along the horizontal
      const dots = [
        { x: 60, r: 6, a: 0.03, color: 0x818cf8 },
        { x: -80, r: 4, a: 0.04, color: 0xfbbf24 },
        { x: 120, r: 8, a: 0.02, color: 0xa78bfa },
        { x: -140, r: 3, a: 0.03, color: 0x93c5fd },
      ];
      dots.forEach((d) => {
        const dot = this.add.graphics();
        dot.fillStyle(d.color, d.a);
        dot.fillCircle(d.x, 0, d.r);
        dot.fillStyle(d.color, d.a * 2);
        dot.fillCircle(d.x, 0, d.r * 0.4);
        container.add(dot);
      });

      this._lensFlare = container;
    }

    // ═══════════════════════════════════════════════════════════════
    // PLANETS — high-fidelity multi-layer rendering
    // ═══════════════════════════════════════════════════════════════
    createPlanets() {
      this.planetSprites.forEach((ps) => ps.container?.destroy());
      this.planetSprites = [];
      this.dustParticles.forEach((d) => d?.destroy());
      this.dustParticles = [];

      const planets = this.registry.get("planets") || [];
      if (!planets.length) return;

      const { width } = this.scale;
      const isMobile = width < 500;

      // Sort by score descending — best subjects get innermost orbit
      const sorted = [...planets].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

      sorted.forEach((planet, i) => {
        const radius = this.getOrbitRadius(i, sorted.length);
        const ry = radius * (1 - this.TILT);
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const angleOffset = i * goldenAngle + (i * 0.7);
        const speed = 0.2 / Math.sqrt(1 + i * 0.5);

        const container = this.add.container(this.cx, this.cy);
        const color = this.parseColor(planet.color || "#6366f1");
        const basePlanetSize = isMobile
          ? 11 + (planet.avgScore || 0) * 0.04
          : 15 + (planet.avgScore || 0) * 0.06;

        const subjectKey = (planet.subject || "").toLowerCase().replace(/[^a-z]/g, "");
        const traits = PLANET_TRAITS[subjectKey] || {};

        // ── Atmosphere halo (outermost) ──
        const atmos = this.add.graphics();
        atmos.fillStyle(color, 0.04);
        atmos.fillCircle(0, 0, basePlanetSize + 14);
        atmos.fillStyle(color, 0.06);
        atmos.fillCircle(0, 0, basePlanetSize + 8);
        container.add(atmos);

        // ── Planet body ──
        const body = this.add.graphics();
        // Shadow side (dark crescent)
        body.fillStyle(0x0f172a, 0.5);
        body.fillCircle(2, 2, basePlanetSize);
        // Main colour fill
        body.fillStyle(color, 0.8);
        body.fillCircle(0, 0, basePlanetSize);
        // Lighter band across middle (surface texture hint)
        body.fillStyle(0xffffff, 0.06);
        body.fillEllipse(0, -basePlanetSize * 0.1, basePlanetSize * 1.6, basePlanetSize * 0.5);
        // Bright highlight (top-left)
        body.fillStyle(0xffffff, 0.22);
        body.fillCircle(-basePlanetSize * 0.28, -basePlanetSize * 0.32, basePlanetSize * 0.35);
        // Small specular dot
        body.fillStyle(0xffffff, 0.35);
        body.fillCircle(-basePlanetSize * 0.2, -basePlanetSize * 0.35, basePlanetSize * 0.12);
        // Dark terminator shadow (right side)
        body.fillStyle(0x000000, 0.2);
        body.fillCircle(basePlanetSize * 0.25, basePlanetSize * 0.2, basePlanetSize * 0.55);
        container.add(body);

        // ── Optional craters (geography-style) ──
        if (traits.craterCount) {
          const craters = this.add.graphics();
          for (let c = 0; c < traits.craterCount; c++) {
            const cx = Phaser.Math.FloatBetween(-basePlanetSize * 0.4, basePlanetSize * 0.4);
            const cy = Phaser.Math.FloatBetween(-basePlanetSize * 0.3, basePlanetSize * 0.4);
            const cr = basePlanetSize * Phaser.Math.FloatBetween(0.08, 0.15);
            craters.fillStyle(0x000000, 0.12);
            craters.fillCircle(cx, cy, cr);
            craters.lineStyle(0.5, 0xffffff, 0.08);
            craters.strokeCircle(cx, cy, cr);
          }
          container.add(craters);
        }

        // ── Optional Saturn-style rings ──
        if (traits.hasRings) {
          const rings = this.add.graphics();
          const ringColor = traits.ringColor || color;
          const tilt = traits.ringTilt || 0.25;
          const innerRingR = basePlanetSize + 5;
          const outerRingR = basePlanetSize + 12;

          // Draw ring as a thin tilted ellipse
          rings.lineStyle(3, ringColor, 0.2);
          rings.beginPath();
          for (let r = 0; r <= 60; r++) {
            const a = (r / 60) * Math.PI * 2;
            const x = Math.cos(a) * outerRingR;
            const y = Math.sin(a) * outerRingR * tilt;
            if (r === 0) rings.moveTo(x, y);
            else rings.lineTo(x, y);
          }
          rings.strokePath();

          rings.lineStyle(1.5, ringColor, 0.35);
          rings.beginPath();
          for (let r = 0; r <= 60; r++) {
            const a = (r / 60) * Math.PI * 2;
            const x = Math.cos(a) * (innerRingR + 3);
            const y = Math.sin(a) * (innerRingR + 3) * tilt;
            if (r === 0) rings.moveTo(x, y);
            else rings.lineTo(x, y);
          }
          rings.strokePath();

          container.add(rings);
        }

        // ── Optional tiny moons ──
        if (traits.moons > 0) {
          for (let m = 0; m < Math.min(traits.moons, 2); m++) {
            const moonDist = basePlanetSize + 10 + m * 8;
            const moonSize = 2 + m;
            const moon = this.add.graphics();
            moon.fillStyle(0xc4b5fd, 0.5);
            moon.fillCircle(moonDist, -moonDist * 0.3 * (m + 1) * 0.5, moonSize);
            moon.fillStyle(0xffffff, 0.3);
            moon.fillCircle(moonDist - 0.5, -moonDist * 0.3 * (m + 1) * 0.5 - 0.5, moonSize * 0.4);
            container.add(moon);
          }
        }

        // ── Mastery ring arc ──
        if ((planet.avgScore || 0) > 0) {
          const ringG = this.add.graphics();
          const pct = (planet.avgScore || 0) / 100;
          ringG.lineStyle(2.5, color, 0.85);
          ringG.beginPath();
          ringG.arc(0, 0, basePlanetSize + 4, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
          ringG.strokePath();
          // Background track
          ringG.lineStyle(1.2, 0x334155, 0.25);
          ringG.beginPath();
          ringG.arc(0, 0, basePlanetSize + 4, -Math.PI / 2 + pct * Math.PI * 2, Math.PI * 1.5, false);
          ringG.strokePath();
          container.add(ringG);
        }

        // ── Label with background pill ──
        const labelText = planet.label || planet.subject || "";
        const fontSize = isMobile ? "10px" : "11px";
        const label = this.add.text(0, basePlanetSize + 20, labelText, {
          fontSize,
          fontFamily: "'DM Sans', sans-serif",
          color: "#e2e8f0",
          fontStyle: "bold",
          align: "center",
        }).setOrigin(0.5);

        const labelBg = this.add.graphics();
        const lw = label.width + 16;
        const lh = label.height + 8;
        labelBg.fillStyle(0x0f172a, 0.85);
        labelBg.fillRoundedRect(-lw / 2, basePlanetSize + 20 - lh / 2, lw, lh, 6);
        labelBg.lineStyle(1, color, 0.2);
        labelBg.strokeRoundedRect(-lw / 2, basePlanetSize + 20 - lh / 2, lw, lh, 6);
        container.add(labelBg);
        container.add(label);

        // ── Score text on planet ──
        const scoreText = this.add.text(0, -1, `${Math.round(planet.avgScore || 0)}%`, {
          fontSize: isMobile ? "9px" : "10px",
          fontFamily: "'DM Sans', sans-serif",
          fontStyle: "bold",
          color: "#ffffff",
          align: "center",
        }).setOrigin(0.5);
        container.add(scoreText);

        // ── Tier indicator dot ──
        const tierColors = {
          exceeding: 0x22c55e, expected: 0x3b82f6,
          developing: 0xf59e0b, unexplored: 0x64748b,
        };
        const tierDot = this.add.graphics();
        tierDot.fillStyle(tierColors[planet.tier] || 0xa78bfa, 0.9);
        tierDot.fillCircle(basePlanetSize + 7, -basePlanetSize - 3, 3.5);
        tierDot.fillStyle(0xffffff, 0.4);
        tierDot.fillCircle(basePlanetSize + 6.5, -basePlanetSize - 3.5, 1.2);
        container.add(tierDot);

        // ── Interactive zone ──
        const hitSize = Math.max(basePlanetSize * 3, 40);
        const hitZone = this.add.zone(0, 0, hitSize, hitSize);
        hitZone.setInteractive({ useHandCursor: true });
        container.add(hitZone);

        hitZone.on("pointerover", () => {
          this.tweens.add({
            targets: container, scaleX: 1.25, scaleY: 1.25,
            duration: 200, ease: "Back.easeOut",
          });
          // Brighten atmosphere on hover
          atmos.setAlpha(1.5);
        });
        hitZone.on("pointerout", () => {
          this.tweens.add({
            targets: container,
            scaleX: container._depthScale || 1,
            scaleY: container._depthScale || 1,
            duration: 200, ease: "Sine.easeOut",
          });
          atmos.setAlpha(1);
        });
        hitZone.on("pointerdown", () => {
          const callback = this.registry.get("onPlanetClick");
          if (callback) callback(planet.subject);
          this.tweens.add({
            targets: container, scaleX: 1.4, scaleY: 1.4,
            duration: 100, yoyo: true, ease: "Sine.easeInOut",
          });
        });

        container._depthScale = 1;

        this.planetSprites.push({
          container, radius, radiusY: ry,
          angleOffset, speed, planet, basePlanetSize, index: i,
        });
      });

      this.createOrbitalDust(sorted);
    }

    refreshPlanets() { this.createPlanets(); }

    // ═══════════════════════════════════════════════════════════════
    // ORBITAL DUST
    // ═══════════════════════════════════════════════════════════════
    createOrbitalDust(sorted) {
      const total = (sorted || []).length;
      for (let i = 0; i < total; i++) {
        const radius = this.getOrbitRadius(i, total);
        const ry = radius * (1 - this.TILT);
        const dustCount = 8 + Math.floor(radius * 0.025);

        for (let d = 0; d < dustCount; d++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const jitter = Phaser.Math.FloatBetween(-4, 4);
          const x = this.cx + Math.cos(angle) * (radius + jitter);
          const y = this.cy + Math.sin(angle) * (ry + jitter);
          const size = Phaser.Math.FloatBetween(0.3, 1.3);
          const alpha = Phaser.Math.FloatBetween(0.06, 0.18);

          const dot = this.add.circle(x, y, size, 0xa78bfa, alpha);
          dot._orbitRadius = radius;
          dot._orbitRadiusY = ry;
          dot._orbitAngle = angle;
          dot._orbitSpeed = Phaser.Math.FloatBetween(0.02, 0.06);
          dot._baseAlpha = alpha;
          dot.setDepth(4);
          this.dustParticles.push(dot);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════
    update(time, delta) {
      const dt = delta / 1000;
      this.time0 += dt;

      // ── Star twinkling ──
      this.starLayers.forEach((layer) => {
        layer.stars.forEach((star) => {
          const twinkle = Math.sin(this.time0 * star._twinkleSpeed + star._twinkleOffset);
          star.setAlpha(star._baseAlpha * (0.3 + 0.7 * (twinkle * 0.5 + 0.5)));
        });
      });

      // ── Shooting stars ──
      this._shootingStarTimer += dt;
      if (this._shootingStarTimer > Phaser.Math.FloatBetween(5, 12)) {
        this.launchShootingStar();
        this._shootingStarTimer = 0;
      }

      // ── Nebula drift ──
      this.nebulae.forEach((n) => {
        n.x += n._driftX * dt;
        n.y += n._driftY * dt;
      });

      // ── Sun corona pulse ──
      if (this.centralSun) {
        const pulse = 0.8 + 0.2 * Math.sin(this.time0 * 1.5);
        this.centralSun.setScale(pulse * 0.03 + 0.97);

        // Animate corona rays
        if (this._coronaRays) {
          this._coronaRays.forEach((cr, idx) => {
            const flicker = 0.6 + 0.4 * Math.sin(this.time0 * (2 + idx * 0.3) + idx);
            cr.ray.setAlpha(flicker);
          });
        }

        // Corona ring pulse
        if (this._coronaRing) {
          const ringPulse = 0.6 + 0.4 * Math.sin(this.time0 * 2);
          this._coronaRing.setAlpha(ringPulse);
          this._coronaRing.setScale(1 + 0.08 * Math.sin(this.time0 * 2.5));
        }
      }

      // ── Lens flare breathe ──
      if (this._lensFlare) {
        const flarePulse = 0.7 + 0.3 * Math.sin(this.time0 * 0.8);
        this._lensFlare.setAlpha(flarePulse);
      }

      // ── Orbit planets with 3D depth ──
      const depthList = [];

      this.planetSprites.forEach((ps) => {
        const angle = ps.angleOffset + this.time0 * ps.speed * 0.25;
        const x = this.cx + Math.cos(angle) * ps.radius;
        const y = this.cy + Math.sin(angle) * ps.radiusY;
        const depthFactor = Math.sin(angle);
        const normalizedDepth = (depthFactor + 1) / 2;
        const depthScale = this.DEPTH_SCALE_MIN + normalizedDepth * (this.DEPTH_SCALE_MAX - this.DEPTH_SCALE_MIN);
        const depthAlpha = 0.5 + normalizedDepth * 0.5;

        ps.container.setPosition(x, y);
        ps.container.setScale(depthScale);
        ps.container.setAlpha(depthAlpha);
        ps.container._depthScale = depthScale;
        depthList.push({ container: ps.container, depth: depthFactor });
      });

      // Depth sort — behind-sun planets rendered first
      depthList.sort((a, b) => a.depth - b.depth);
      depthList.forEach((item, i) => {
        item.container.setDepth(100 + i);
      });

      // Sun stays in middle of depth order
      const sunDepth = 100 + Math.floor(depthList.length / 2);
      if (this.centralSun) this.centralSun.setDepth(sunDepth);
      if (this._lensFlare) this._lensFlare.setDepth(sunDepth - 1);

      // ── Dust particles orbit ──
      this.dustParticles.forEach((dot) => {
        dot._orbitAngle += dot._orbitSpeed * dt;
        const x = this.cx + Math.cos(dot._orbitAngle) * dot._orbitRadius;
        const y = this.cy + Math.sin(dot._orbitAngle) * dot._orbitRadiusY;
        const depthFactor = (Math.sin(dot._orbitAngle) + 1) / 2;
        dot.setPosition(x, y);
        dot.setAlpha(dot._baseAlpha * (0.3 + depthFactor * 0.7));
      });
    }

    parseColor(hex) {
      if (typeof hex === "number") return hex;
      const clean = (hex || "#6366f1").replace("#", "");
      return parseInt(clean, 16);
    }
  }

  return GalaxyScene;
}
