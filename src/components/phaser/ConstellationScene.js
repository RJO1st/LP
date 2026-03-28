/**
 * ConstellationScene.js — Phaser 3 Scene for Topic Constellation Map
 *
 * Renders topics as glowing star nodes in a constellation pattern.
 * Each topic = one star. Stars are connected by luminous lines.
 * Full-canvas layout with excellent spacing and mobile readability.
 *
 * Data via scene.registry:
 *   - nodes: Array<{ topic, label, mastery, status, color }>
 *   - edges: Array<{ from, to }> (optional — auto-generates sequential if empty)
 *   - onNodeClick: (topic, subject) => void
 *   - subject: string
 */

export function createConstellationScene(Phaser) {
  if (!Phaser || !Phaser.Scene) return null;

  // ── Subject color palette ──
  const SUBJECT_COLORS = {
    mathematics: 0x6366f1, maths: 0x6366f1,
    english: 0xf59e0b, science: 0x10b981,
    history: 0xef4444, geography: 0x3b82f6,
    computing: 0x8b5cf6, french: 0xec4899,
    spanish: 0x14b8a6, art: 0xf97316, music: 0x06b6d4,
  };

  function subjectHex(subject) {
    return SUBJECT_COLORS[(subject || "").toLowerCase().replace(/\s+/g, "_")] || 0xa78bfa;
  }

  function hexStr(color) {
    if (typeof color === "string") return color;
    return "#" + color.toString(16).padStart(6, "0");
  }

  // ── Layout helpers ──
  // Arrange N nodes in a pleasing constellation layout across the full canvas.
  // Uses a zig-zag grid with slight randomness for organic feel.
  function layoutNodes(count, canvasW, canvasH, isMobile) {
    if (count === 0) return [];

    const padX = isMobile ? 40 : 55;
    const padTop = isMobile ? 28 : 36;
    const padBot = isMobile ? 28 : 36;
    const usableW = canvasW - padX * 2;
    const usableH = canvasH - padTop - padBot;

    // For very few nodes, simple centered layout
    if (count <= 3) {
      const positions = [];
      const spacing = usableW / (count + 1);
      for (let i = 0; i < count; i++) {
        positions.push({
          x: padX + spacing * (i + 1),
          y: padTop + usableH * (0.35 + Math.sin(i * 1.8) * 0.15),
        });
      }
      return positions;
    }

    // ── Improved grid: wider spread, fewer rows ──
    // Use more columns to reduce vertical stacking and prevent overlap
    let cols, rows;
    if (isMobile) {
      cols = count <= 6 ? 2 : 3;
    } else {
      // Wider layout: aim for 4-6 columns on desktop so topics spread out
      if (count <= 6) cols = 3;
      else if (count <= 12) cols = 4;
      else if (count <= 20) cols = 5;
      else cols = 6;
    }
    rows = Math.ceil(count / cols);

    const cellW = usableW / cols;
    const cellH = usableH / Math.max(rows, 1);

    // Minimum vertical spacing — prevents labels overlapping vertically
    const minCellH = isMobile ? 70 : 85;
    const effectiveCellH = Math.max(cellH, minCellH);

    const positions = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      // Offset every other row for zig-zag constellation pattern
      // Reduce offset to avoid pushing nodes off-canvas
      const rowOffset = row % 2 === 1 ? cellW * 0.25 : 0;

      // Controlled jitter — smaller to prevent collisions
      const jitterX = Math.sin(i * 2.7 + 0.5) * cellW * 0.08;
      const jitterY = Math.cos(i * 3.1 + 1.2) * effectiveCellH * 0.06;

      positions.push({
        x: padX + col * cellW + cellW * 0.5 + rowOffset + jitterX,
        y: padTop + row * effectiveCellH + effectiveCellH * 0.5 + jitterY,
      });
    }

    // Clamp all positions within canvas bounds with generous margins
    const marginX = isMobile ? 35 : 50;
    const marginTop = padTop + 10;
    const marginBot = padBot + 10;
    positions.forEach((p) => {
      p.x = Math.max(marginX, Math.min(canvasW - marginX, p.x));
      p.y = Math.max(marginTop, Math.min(canvasH - marginBot, p.y));
    });

    // ── Overlap prevention pass ──
    // Push apart nodes that are too close (labels need at least MIN_DIST)
    const MIN_DIST = isMobile ? 65 : 80;
    for (let pass = 0; pass < 6; pass++) {
      for (let a = 0; a < positions.length; a++) {
        for (let b = a + 1; b < positions.length; b++) {
          const dx = positions[b].x - positions[a].x;
          const dy = positions[b].y - positions[a].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MIN_DIST && dist > 0) {
            const push = (MIN_DIST - dist) / 2;
            const nx = dx / dist, ny = dy / dist;
            positions[a].x -= nx * push * 0.5;
            positions[a].y -= ny * push * 0.5;
            positions[b].x += nx * push * 0.5;
            positions[b].y += ny * push * 0.5;
          }
        }
      }
      // Re-clamp after each pass
      positions.forEach((p) => {
        p.x = Math.max(marginX, Math.min(canvasW - marginX, p.x));
        p.y = Math.max(marginTop, Math.min(canvasH - marginBot, p.y));
      });
    }

    return positions;
  }

  class ConstellationScene extends Phaser.Scene {
    constructor() {
      super({ key: "ConstellationScene" });
      this._nodeObjects = [];
      this._edgeGraphics = null;
      this._bgStars = [];
      this._shootingTimer = 0;
      this._time = 0;
      this._glowPulses = [];
    }

    create() {
      const { width, height } = this.scale;
      this._isMobile = width < 500;

      // ── Deep space background ──
      this._drawBackground(width, height);

      // ── Background stars ──
      this._createBgStars(width, height);

      // ── Edge graphics layer ──
      this._edgeGraphics = this.add.graphics();
      this._edgeGraphics.setDepth(5);

      // ── Initial render ──
      const nodes = this.registry.get("nodes") || [];
      if (nodes.length > 0) this._render();

      // ── Registry change listener ──
      this.registry.events.on("changedata", (_parent, key) => {
        if (key === "nodes" || key === "edges") this._render();
      });
    }

    // ═════════════════════════════════════════════════════════════
    // BACKGROUND
    // ═════════════════════════════════════════════════════════════
    _drawBackground(w, h) {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x030015, 0x050520, 0x080830, 0x030018, 1);
      bg.fillRect(0, 0, w, h);
      bg.setDepth(0);

      // Subject-tinted nebula clouds
      const subject = this.registry.get("subject") || "";
      const color = subjectHex(subject);

      const nebulaG = this.add.graphics();
      nebulaG.setDepth(0);

      // Central nebula cloud
      const cx = w * 0.5, cy = h * 0.45;
      for (let r = Math.min(w, h) * 0.5; r > 20; r -= 18) {
        nebulaG.fillStyle(color, 0.003 + (1 - r / (Math.min(w, h) * 0.5)) * 0.004);
        nebulaG.fillCircle(cx + Math.sin(r) * 15, cy + Math.cos(r) * 10, r);
      }

      // Secondary smaller nebula
      const cx2 = w * 0.25, cy2 = h * 0.65;
      for (let r = 100; r > 10; r -= 15) {
        nebulaG.fillStyle(color, 0.002);
        nebulaG.fillCircle(cx2, cy2, r);
      }

      // Distant galaxy smudge
      const galaxyG = this.add.graphics();
      galaxyG.setDepth(0);
      const gx = w * 0.8, gy = h * 0.2;
      for (let r = 30; r > 3; r -= 4) {
        galaxyG.fillStyle(0xc4b5fd, 0.005 + (30 - r) * 0.001);
        galaxyG.fillEllipse(gx, gy, r * 2.5, r);
      }
    }

    _createBgStars(w, h) {
      const count = this._isMobile ? 90 : 160;
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(0, w);
        const y = Phaser.Math.Between(0, h);
        const size = Phaser.Math.FloatBetween(0.3, 1.6);
        const alpha = Phaser.Math.FloatBetween(0.08, 0.4);
        const useColor = Math.random() < 0.06;
        const color = useColor
          ? Phaser.Utils.Array.GetRandom([0xa78bfa, 0x93c5fd, 0xfde68a])
          : 0xffffff;
        const star = this.add.circle(x, y, size, color, alpha);
        star._baseAlpha = alpha;
        star._speed = Phaser.Math.FloatBetween(0.3, 2.5);
        star._offset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        star.setDepth(1);
        this._bgStars.push(star);
      }
    }

    _launchShootingStar() {
      const { width, height } = this.scale;
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(0, height * 0.3);
      const ex = sx + Phaser.Math.Between(80, 200);
      const ey = sy + Phaser.Math.Between(60, 140);
      const trail = this.add.graphics().setDepth(2);
      const head = this.add.circle(sx, sy, 1.2, 0xffffff, 0.8).setDepth(2);

      this.tweens.add({
        targets: head,
        x: ex, y: ey, alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        ease: "Sine.easeIn",
        onUpdate: () => {
          trail.clear();
          trail.lineStyle(1, 0xffffff, head.alpha * 0.4);
          const dx = ex - sx, dy = ey - sy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          trail.lineBetween(
            head.x - (dx / dist) * 25,
            head.y - (dy / dist) * 25,
            head.x, head.y
          );
        },
        onComplete: () => { trail.destroy(); head.destroy(); },
      });
    }

    // ═════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═════════════════════════════════════════════════════════════
    _render() {
      // Cleanup previous
      this._nodeObjects.forEach((o) => {
        if (o.container) o.container.destroy();
        if (o.glowCircle) o.glowCircle.destroy();
      });
      this._nodeObjects = [];
      this._glowPulses = [];
      if (this._edgeGraphics) this._edgeGraphics.clear();

      const nodes = this.registry.get("nodes") || [];
      const subject = this.registry.get("subject") || "";
      const color = subjectHex(subject);
      const { width, height } = this.scale;

      if (!nodes.length) return;

      // ── Compute positions ──
      const positions = layoutNodes(nodes.length, width, height, this._isMobile);

      // ── Draw connecting lines (edges) ──
      this._drawEdges(positions, nodes, color);

      // ── Draw star nodes ──
      nodes.forEach((node, i) => {
        this._drawStarNode(node, positions[i], i, color);
      });
    }

    // ═════════════════════════════════════════════════════════════
    // EDGES — glowing constellation lines connecting sequential nodes
    // ═════════════════════════════════════════════════════════════
    _drawEdges(positions, nodes, color) {
      const g = this._edgeGraphics;
      const edges = this.registry.get("edges") || [];

      // If explicit edges provided, use them; otherwise auto-connect sequentially
      const pairs = edges.length > 0
        ? edges.map((e) => [e.from, e.to])
        : positions.map((_, i) => (i < positions.length - 1 ? [i, i + 1] : null)).filter(Boolean);

      pairs.forEach(([fromIdx, toIdx]) => {
        const a = positions[fromIdx];
        const b = positions[toIdx];
        if (!a || !b) return;

        const isLocked = nodes[fromIdx]?.status === "locked" && nodes[toIdx]?.status === "locked";

        // Outer glow
        g.lineStyle(this._isMobile ? 4 : 5, color, isLocked ? 0.02 : 0.06);
        g.lineBetween(a.x, a.y, b.x, b.y);

        // Middle glow
        g.lineStyle(this._isMobile ? 2 : 2.5, color, isLocked ? 0.04 : 0.14);
        g.lineBetween(a.x, a.y, b.x, b.y);

        // Core line
        g.lineStyle(this._isMobile ? 0.8 : 1, isLocked ? 0x334155 : 0xffffff, isLocked ? 0.05 : 0.12);
        g.lineBetween(a.x, a.y, b.x, b.y);
      });

      // Also connect some non-sequential nodes for richer constellation shape
      // Connect every 3rd node to create cross-links
      if (positions.length >= 5) {
        for (let i = 0; i < positions.length - 2; i += 3) {
          const j = Math.min(i + 2, positions.length - 1);
          const a = positions[i], b = positions[j];
          g.lineStyle(3, color, 0.03);
          g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(1, color, 0.06);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
    }

    // ═════════════════════════════════════════════════════════════
    // STAR NODE — one topic
    // ═════════════════════════════════════════════════════════════
    _drawStarNode(node, pos, idx, color) {
      if (!pos) return;

      const { width } = this.scale;
      const isLocked = node.status === "locked";
      const isCurrent = node.status === "current";
      const mastery = node.mastery || 0;
      const mob = this._isMobile;

      // ── Container ──
      const container = this.add.container(pos.x, pos.y);
      container.setDepth(20);

      // ── Outer glow (pulsing for current, static for others) ──
      const glowRadius = mob ? 20 : 28;
      const glowCircle = this.add.graphics();
      glowCircle.setDepth(9);

      if (!isLocked) {
        // Soft outer glow
        for (let r = glowRadius; r > 6; r -= 3) {
          glowCircle.fillStyle(color, 0.005 + (glowRadius - r) * 0.003);
          glowCircle.fillCircle(pos.x, pos.y, r);
        }
      }

      // ── Star core graphics (inside container, so at 0,0) ──
      const starG = this.add.graphics();

      if (isLocked) {
        // Dim locked star
        starG.fillStyle(0x334155, 0.4);
        starG.fillCircle(0, 0, mob ? 4 : 5);
        starG.lineStyle(1, 0x475569, 0.3);
        starG.strokeCircle(0, 0, mob ? 4 : 5);
      } else {
        // ── Bright star with mastery-based intensity ──
        const intensity = 0.5 + mastery * 0.005;
        const coreR = mob ? 5 : 6.5;

        // Mastery ring (arc showing progress)
        if (mastery > 0) {
          const ringR = coreR + (mob ? 4 : 5);
          const pct = mastery / 100;
          starG.lineStyle(mob ? 2 : 2.5, color, 0.6);
          starG.beginPath();
          starG.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
          starG.strokePath();

          // Ring track (dim)
          starG.lineStyle(1, color, 0.1);
          starG.beginPath();
          starG.arc(0, 0, ringR, -Math.PI / 2 + pct * Math.PI * 2, -Math.PI / 2 + Math.PI * 2, false);
          starG.strokePath();
        }

        // Core fill
        starG.fillStyle(0xffffff, intensity);
        starG.fillCircle(0, 0, coreR);

        // Inner colour tint
        starG.fillStyle(color, 0.25);
        starG.fillCircle(0, 0, coreR - 1);

        // Highlight dot
        starG.fillStyle(0xffffff, 0.9);
        starG.fillCircle(mob ? -1.5 : -2, mob ? -1.5 : -2, mob ? 1.2 : 1.8);

        // Cross rays for brighter stars
        if (mastery > 20) {
          const rayLen = (mob ? 6 : 10) + mastery * 0.04;
          starG.lineStyle(0.7, 0xffffff, 0.2 + mastery * 0.002);
          starG.lineBetween(-rayLen, 0, rayLen, 0);
          starG.lineBetween(0, -rayLen, 0, rayLen);
          // Diagonal short rays
          const dLen = rayLen * 0.45;
          starG.lineStyle(0.5, 0xffffff, 0.12);
          starG.lineBetween(-dLen, -dLen, dLen, dLen);
          starG.lineBetween(dLen, -dLen, -dLen, dLen);
        }
      }
      container.add(starG);

      // ── Mastery percentage inside star ──
      if (!isLocked && mastery > 0) {
        const masteryText = this.add.text(0, 0, `${mastery}`, {
          fontSize: mob ? "7px" : "8px",
          fontFamily: "'DM Sans', sans-serif",
          fontStyle: "bold",
          color: "#ffffff",
        }).setOrigin(0.5);
        container.add(masteryText);
      }

      // ── Lock icon ──
      if (isLocked) {
        const lockText = this.add.text(0, 0, "🔒", {
          fontSize: mob ? "7px" : "9px",
        }).setOrigin(0.5);
        container.add(lockText);
      }

      // ── Topic label ──
      const labelOffsetY = mob ? 16 : 22;
      const maxLabelW = mob ? 65 : 110;
      const labelColor = isLocked ? "#64748b" : isCurrent ? "#ffffff" : "#cbd5e1";
      const fontSize = mob ? "8px" : "10px";

      const label = this.add.text(0, labelOffsetY, node.label || "", {
        fontSize: fontSize,
        fontFamily: "'DM Sans', sans-serif",
        fontStyle: isCurrent ? "bold" : "normal",
        color: labelColor,
        align: "center",
        wordWrap: { width: maxLabelW },
        lineSpacing: 1,
      }).setOrigin(0.5, 0);
      container.add(label);

      // ── "Current" indicator — animated arrow ──
      if (isCurrent) {
        const arrow = this.add.text(0, -(mob ? 18 : 24), "▼", {
          fontSize: mob ? "8px" : "10px",
          fontStyle: "bold",
          color: hexStr(color),
        }).setOrigin(0.5);
        container.add(arrow);

        this.tweens.add({
          targets: arrow,
          y: arrow.y + 4,
          alpha: 0.4,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // ── Interactive hit zone ──
      if (!isLocked) {
        const hitSize = mob ? 40 : 48;
        const hitZone = this.add.zone(0, 4, hitSize, hitSize + 20);
        hitZone.setInteractive({ useHandCursor: true });
        container.add(hitZone);

        hitZone.on("pointerover", () => {
          this.tweens.add({
            targets: container,
            scaleX: 1.15, scaleY: 1.15,
            duration: 150,
            ease: "Sine.easeOut",
          });
          label.setColor("#ffffff");
          label.setFontStyle("bold");
        });

        hitZone.on("pointerout", () => {
          this.tweens.add({
            targets: container,
            scaleX: 1, scaleY: 1,
            duration: 150,
            ease: "Sine.easeOut",
          });
          label.setColor(labelColor);
          label.setFontStyle(isCurrent ? "bold" : "normal");
        });

        hitZone.on("pointerdown", () => {
          const callback = this.registry.get("onNodeClick");
          const subj = this.registry.get("subject");
          if (callback) callback(node.topic, subj);

          // Flash burst effect
          const burst = this.add.graphics().setDepth(30);
          burst.fillStyle(color, 0.3);
          burst.fillCircle(pos.x, pos.y, mob ? 15 : 20);
          this.tweens.add({
            targets: burst,
            alpha: 0,
            scaleX: 2, scaleY: 2,
            duration: 300,
            ease: "Sine.easeOut",
            onComplete: () => burst.destroy(),
          });
        });
      }

      // ── Pulse animation for current node's glow ──
      if (isCurrent && !isLocked) {
        this._glowPulses.push({ glow: glowCircle, x: pos.x, y: pos.y, color, idx });
      }

      this._nodeObjects.push({ container, glowCircle, node, pos });
    }

    // ═════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═════════════════════════════════════════════════════════════
    update(time, delta) {
      const dt = delta / 1000;
      this._time += dt;

      // Twinkle background stars
      this._bgStars.forEach((star) => {
        const t = Math.sin(this._time * star._speed + star._offset);
        star.setAlpha(star._baseAlpha * (0.4 + 0.6 * (t * 0.5 + 0.5)));
      });

      // Shooting stars
      this._shootingTimer += dt;
      if (this._shootingTimer > Phaser.Math.FloatBetween(7, 16)) {
        this._launchShootingStar();
        this._shootingTimer = 0;
      }

      // Pulse glow for current nodes
      this._glowPulses.forEach((p) => {
        const pulse = 0.7 + 0.3 * Math.sin(this._time * 1.8 + p.idx);
        p.glow.setAlpha(pulse);
      });
    }
  }

  return ConstellationScene;
}
