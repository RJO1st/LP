"use client";
// ─── KenneyVisuals.jsx ───────────────────────────────────────────────────────
// Reusable Kenney sprite-based visual components for quiz questions.
// Renders Kenney assets from public/assets/kenney/ (Physics, Puzzle, Planets).
// Designed for inline quiz panels (mobile-first, lightweight).
//
// INTEGRATION: In MathsVisualiser.jsx resolveVisual() function, add after line ~2925:
//   const kenneyVis = resolveKenneyVisual(question, subject, yearLevel);
//   if (kenneyVis) return { type: "kenney_sprite", ...kenneyVis };
//
// Then in the render switch (around line 3262), add:
//   case "kenney_sprite": return <KenneyVisuals {...visual} />;
//
// And in the ariaLabel switch (around line 3164), add:
//   case "kenney_sprite": return visual.ariaLabel || "Sprite visual";
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

// ─── SHAPE VISUAL ────────────────────────────────────────────────────────────
// Renders Kenney puzzle shapes (blue/red/green/yellow diamonds, squares, etc.)
// Usage: <KenneyShape type="square" color="blue" size={80} />

export function KenneyShape({ type = "square", color = "blue", glossy = false, size = 80 }) {
  // Kenney puzzle shapes: 6 colors × multiple shapes
  const COLORS = {
    blue: "blue",
    red: "red",
    green: "green",
    yellow: "yellow",
    purple: "purple",
    orange: "orange",
  };

  const TYPES = {
    diamond: "diamond",
    square: "square",
    rectangle: "rectangle",
    polygon: "polygon",
    ball: "ball",
    star: "star",
  };

  const actualColor = COLORS[color?.toLowerCase()] || "blue";
  const actualType = TYPES[type?.toLowerCase()] || "square";

  let src = `/assets/kenney/puzzle/element_${actualColor}`;
  if (actualType === "ball") {
    src = `/assets/kenney/puzzle/ball${actualColor.charAt(0).toUpperCase() + actualColor.slice(1)}`;
  } else if (actualType === "star") {
    src = `/assets/kenney/puzzle/particleCartoonStar`;
  } else {
    src += `_${actualType}`;
    if (glossy) src += "_glossy";
  }
  src += ".png";

  return (
    <div
      className="inline-block flex-shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url('${src}')`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      role="img"
      aria-label={`${actualColor} ${actualType}${glossy ? " glossy" : ""}`}
    />
  );
}

// ─── PHYSICS VISUAL ──────────────────────────────────────────────────────────
// Renders Kenney physics elements (wood, metal, glass, stone blocks, etc.)
// Usage: <KenneyPhysics material="wood" variant={3} size={60} />

export function KenneyPhysics({ material = "wood", variant = 0, size = 60 }) {
  const MATERIALS = {
    wood: "elementWood",
    metal: "elementMetal",
    glass: "elementGlass",
    stone: "elementStone",
  };

  const actualMaterial = MATERIALS[material?.toLowerCase()] || "elementWood";
  const actualVariant = Math.min(Math.max(Math.floor(variant), 0), 54); // 0-54 variants

  const src = `/assets/kenney/physics/${actualMaterial}${String(actualVariant).padStart(3, "0")}.png`;

  return (
    <div
      className="inline-block flex-shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url('${src}')`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      role="img"
      aria-label={`${material} block variant ${variant}`}
    />
  );
}

// ─── PLANET VISUAL ───────────────────────────────────────────────────────────
// Renders Kenney planets with optional label
// Usage: <KenneyPlanet index={3} size={120} label="Mars" />

export function KenneyPlanet({ index = 0, size = 120, label = null }) {
  const actualIndex = Math.min(Math.max(Math.floor(index), 0), 9); // 0-9
  const src = `/assets/kenney/planets/planet${String(actualIndex).padStart(2, "0")}.png`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="inline-block flex-shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: `url('${src}')`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        role="img"
        aria-label={label || `Planet ${index}`}
      />
      {label && (
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </p>
      )}
    </div>
  );
}

// ─── SPRITE GRID ─────────────────────────────────────────────────────────────
// Displays multiple copies of a sprite in a grid (for counting/multiplication)
// Usage: <KenneyGrid items={12} columns={4} sprite="ballBlue" size={40} />

export function KenneyGrid({ items = 12, columns = 4, sprite = "ballBlue", size = 40 }) {
  const SPRITES = {
    ballBlue: "ballBlue",
    ballRed: "ballRed",
    ballGreen: "ballGreen",
    ballGrey: "ballGrey",
    star: "particleStar",
    cartoonStar: "particleCartoonStar",
  };

  const actualSprite = SPRITES[sprite] || "ballBlue";
  const src = `/assets/kenney/puzzle/${actualSprite}.png`;
  const rows = Math.ceil(items / columns);

  return (
    <div
      className="inline-grid gap-1 p-2"
      style={{
        gridTemplateColumns: `repeat(${columns}, ${size}px)`,
        gridAutoRows: `${size}px`,
      }}
      role="img"
      aria-label={`Grid of ${items} ${actualSprite}s in ${columns} columns`}
    >
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="flex-shrink-0"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: `url('${src}')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
      ))}
    </div>
  );
}

// ─── FRACTION VISUAL ─────────────────────────────────────────────────────────
// Shows shaded fraction using puzzle shapes
// Usage: <KenneyFraction numerator={3} denominator={4} shape="diamond" color="blue" size={60} />

export function KenneyFraction({ numerator = 1, denominator = 4, shape = "diamond", color = "blue", size = 60 }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="inline-grid gap-2 p-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(denominator, 4)}, ${size}px)`,
          gridAutoRows: `${size}px`,
        }}
        role="img"
        aria-label={`Fraction: ${numerator} out of ${denominator} ${shape}s shaded`}
      >
        {Array.from({ length: denominator }).map((_, idx) => {
          const isShaded = idx < numerator;
          return (
            <div key={idx} className="relative">
              <KenneyShape
                type={shape}
                color={isShaded ? color : "grey"}
                size={size}
              />
              {!isShaded && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: "rgba(200, 200, 200, 0.3)",
                    borderRadius: "4px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {numerator}/{denominator}
      </p>
    </div>
  );
}

// ─── MAIN KENNEY VISUALS WRAPPER ─────────────────────────────────────────────
// Generic wrapper for any kenney sprite type resolved by resolveKenneyVisual()

export default function KenneyVisuals({ component = null, ...props }) {
  if (component === "shape") {
    return <KenneyShape {...props} />;
  }
  if (component === "physics") {
    return <KenneyPhysics {...props} />;
  }
  if (component === "planet") {
    return <KenneyPlanet {...props} />;
  }
  if (component === "grid") {
    return <KenneyGrid {...props} />;
  }
  if (component === "fraction") {
    return <KenneyFraction {...props} />;
  }
  return null;
}

// ─── RESOLVER FUNCTION ───────────────────────────────────────────────────────
// Matches question text patterns and returns kenney sprite configuration
// Returns null if no kenney visual applies (fall through to SVG visuals)

export function resolveKenneyVisual(question, subject, yearLevel) {
  if (!question) return null;

  const subj = (subject || "").toLowerCase();
  const q = (question.q || question.question_text || "").toLowerCase();
  const topic = (question.topic || "").toLowerCase();

  // ── SHAPES: Square, rectangle, diamond, polygon, star ───────────────────────
  if (subj.includes("math")) {
    // "Which shape is a square?" / "properties of a rectangle"
    if (/shape|square|rectangle|diamond|polygon|pentagon|hexagon/i.test(q + topic)) {
      const shape = (/square/i.test(q) || /square/i.test(topic))
        ? "square"
        : /rectangle/i.test(q) || /rectangle/i.test(topic)
        ? "rectangle"
        : /diamond/i.test(q) || /diamond/i.test(topic)
        ? "diamond"
        : /polygon|hexagon|pentagon/i.test(q) || /polygon/i.test(topic)
        ? "polygon"
        : /star/i.test(q) || /star/i.test(topic)
        ? "star"
        : null;

      if (shape) {
        // KS1-2: prefer bright colors, KS3+: diverse palette
        const colors = ["blue", "red", "green", "yellow"];
        const yearNum = parseInt(yearLevel ?? 1, 10);
        const color = yearNum > 6 ? colors[yearNum % colors.length] : colors[0];

        return {
          ariaLabel: `Shape: ${shape} in ${color}`,
          component: "shape",
          type: shape,
          color,
          size: Math.min(150, Math.max(80, 60 + yearNum * 5)),
        };
      }
    }

    // Fraction questions with kenney shapes
    if (/fraction|shaded|part of|one third|one quarter|one half/i.test(q + topic)) {
      const frMatch = q.match(/(\d+)[^\d]*(?:out of|\/)\s*(\d+)/);
      if (frMatch) {
        const num = parseInt(frMatch[1]);
        const denom = parseInt(frMatch[2]);
        const colors = ["blue", "red", "green", "yellow"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        return {
          ariaLabel: `Fraction: ${num} out of ${denom}`,
          component: "fraction",
          numerator: num,
          denominator: denom,
          shape: "diamond",
          color,
          size: Math.min(100, 40 + parseInt(yearLevel ?? 1, 10) * 3),
        };
      }
    }

    // Multiplication as grid: "3 groups of 4" or "2 rows of 5"
    if (/multiply|multiplication|groups? of|rows? of|array/i.test(q + topic)) {
      const groupMatch = q.match(/(\d+)\s+(?:groups? of|rows? of|×|x)\s+(\d+)/i);
      if (groupMatch) {
        const groups = parseInt(groupMatch[1]);
        const perGroup = parseInt(groupMatch[2]);
        const total = groups * perGroup;

        if (total <= 48) {
          return {
            ariaLabel: `Multiplication grid: ${groups} × ${perGroup} = ${total}`,
            component: "grid",
            items: total,
            columns: Math.min(perGroup, 6),
            sprite: "ballBlue",
            size: Math.max(30, 60 - parseInt(yearLevel ?? 1, 10)),
          };
        }
      }
    }
  }

  // ── PHYSICS: Materials, forces, blocks ─────────────────────────────────────
  if (subj.includes("science") || subj.includes("physics")) {
    // "Which material..." / "wood block" / "metal spring"
    if (/material|wood|metal|glass|stone|block|spring|force|friction/i.test(q + topic)) {
      const material = /wood/i.test(q) || /wood/i.test(topic)
        ? "wood"
        : /metal/i.test(q) || /metal/i.test(topic)
        ? "metal"
        : /glass/i.test(q) || /glass/i.test(topic)
        ? "glass"
        : /stone/i.test(q) || /stone/i.test(topic)
        ? "stone"
        : null;

      if (material) {
        return {
          ariaLabel: `Physics: ${material} element`,
          component: "physics",
          material,
          variant: Math.floor(Math.random() * 20), // variety
          size: Math.min(150, 60 + parseInt(yearLevel ?? 1, 10) * 5),
        };
      }
    }
  }

  // ── PLANETS: Solar system, space ─────────────────────────────────────────────
  if (
    subj.includes("science") ||
    (subj.includes("geograph") && /planet|solar|space|orbit/i.test(q + topic))
  ) {
    // "Which planet..." / "Mercury orbit" / "size of Mars"
    const planets = {
      mercury: 0,
      venus: 1,
      earth: 2,
      mars: 3,
      jupiter: 4,
      saturn: 5,
      uranus: 6,
      neptune: 7,
      pluto: 8,
      sun: 9,
    };

    if (/planet|mercury|venus|earth|mars|jupiter|saturn|uranus|neptune|pluto|solar|orbit/i.test(
      q + topic
    )) {
      let planetName = null;
      for (const [name, idx] of Object.entries(planets)) {
        if (new RegExp(name, "i").test(q)) {
          planetName = name.charAt(0).toUpperCase() + name.slice(1);
          return {
            ariaLabel: `Planet: ${planetName}`,
            component: "planet",
            index: idx,
            label: planetName,
            size: Math.min(200, 80 + parseInt(yearLevel ?? 1, 10) * 8),
          };
        }
      }

      // Generic solar system context
      if (/solar|planet|orbit|space|earth/i.test(q + topic)) {
        const idx = Math.floor(Math.random() * 8); // exclude Pluto for general
        return {
          ariaLabel: `Solar system planet`,
          component: "planet",
          index: idx,
          size: 120,
        };
      }
    }
  }

  // No Kenney visual matched — return null to fall through to SVG visuals
  return null;
}
