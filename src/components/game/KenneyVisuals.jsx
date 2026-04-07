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

// ─── COMPARISON VISUAL ──────────────────────────────────────────────────────
// Side-by-side comparison: "Which is bigger?" type questions
// Usage: <KenneyComparison leftSprite="ballBlue" leftSize={60} leftLabel="6"
//                          rightSprite="ballRed" rightSize={40} rightLabel="4"
//                          operator=">" />

export function KenneyComparison({
  leftSprite = "ballBlue",
  leftSize = 60,
  leftLabel = null,
  rightSprite = "ballRed",
  rightSize = 40,
  rightLabel = null,
  operator = ">",
}) {
  const SPRITES = {
    ballBlue: "ballBlue",
    ballRed: "ballRed",
    ballGreen: "ballGreen",
    ballGrey: "ballGrey",
    star: "particleStar",
    cartoonStar: "particleCartoonStar",
  };

  const leftActual = SPRITES[leftSprite] || "ballBlue";
  const rightActual = SPRITES[rightSprite] || "ballRed";
  const leftSrc = `/assets/kenney/puzzle/${leftActual}.png`;
  const rightSrc = `/assets/kenney/puzzle/${rightActual}.png`;

  const operatorSymbol = operator === ">" ? ">" : operator === "<" ? "<" : "=";
  const operatorText = operator === ">" ? "is greater than" : operator === "<" ? "is less than" : "equals";

  return (
    <div
      className="flex items-center justify-center gap-4 p-4"
      role="img"
      aria-label={`${leftLabel} ${operatorText} ${rightLabel}`}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          style={{
            width: `${leftSize}px`,
            height: `${leftSize}px`,
            backgroundImage: `url('${leftSrc}')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
        {leftLabel && (
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {leftLabel}
          </p>
        )}
      </div>

      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        {operatorSymbol}
      </p>

      <div className="flex flex-col items-center gap-2">
        <div
          style={{
            width: `${rightSize}px`,
            height: `${rightSize}px`,
            backgroundImage: `url('${rightSrc}')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
        {rightLabel && (
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {rightLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── NUMBER LINE VISUAL ──────────────────────────────────────────────────────
// Number line with sprite markers for counting, sequencing, addition
// Usage: <KenneyNumberLine start={0} end={10} markers={[3, 7]} markerSprite="ballGreen" size={30} />

export function KenneyNumberLine({
  start = 0,
  end = 10,
  markers = [],
  markerSprite = "ballGreen",
  size = 30,
}) {
  const SPRITES = {
    ballBlue: "ballBlue",
    ballRed: "ballRed",
    ballGreen: "ballGreen",
    ballGrey: "ballGrey",
  };

  const actualSprite = SPRITES[markerSprite] || "ballGreen";
  const src = `/assets/kenney/puzzle/${actualSprite}.png`;
  const range = end - start;
  const markerSet = new Set(markers.map(m => parseInt(m, 10)));

  return (
    <div className="flex flex-col gap-4 p-4">
      <svg
        width="100%"
        height={size + 60}
        viewBox={`0 0 ${Math.max(400, range * 40)} ${size + 60}`}
        className="max-w-lg"
        role="img"
        aria-label={`Number line from ${start} to ${end} with markers at ${Array.from(markerSet).join(", ")}`}
      >
        <line
          x1="40"
          y1={size + 20}
          x2={Math.max(400, range * 40) - 40}
          y2={size + 20}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-500"
        />
        {Array.from({ length: range + 1 }).map((_, idx) => {
          const num = start + idx;
          const x = 40 + (idx / range) * (Math.max(400, range * 40) - 80);
          const hasMarker = markerSet.has(num);

          return (
            <g key={idx}>
              <line
                x1={x}
                y1={size + 15}
                x2={x}
                y2={size + 25}
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-400 dark:text-gray-500"
              />
              <text
                x={x}
                y={size + 45}
                textAnchor="middle"
                className="text-xs font-semibold text-gray-700 dark:text-gray-200"
              >
                {num}
              </text>
              {hasMarker && (
                <image
                  x={x - size / 2}
                  y={-10}
                  width={size}
                  height={size}
                  href={src}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── BAR CHART VISUAL ────────────────────────────────────────────────────────
// Simple bar chart using stacked sprites (like bar graphs made of cubes)
// Usage: <KenneyBarChart data={[{label:"Red",value:4},...]} sprite="ballBlue" size={28} />

export function KenneyBarChart({ data = [], sprite = "ballBlue", size = 28 }) {
  const SPRITES = {
    ballBlue: "ballBlue",
    ballRed: "ballRed",
    ballGreen: "ballGreen",
    ballGrey: "ballGrey",
  };

  const actualSprite = SPRITES[sprite] || "ballBlue";
  const src = `/assets/kenney/puzzle/${actualSprite}.png`;
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);

  return (
    <div
      className="flex items-end justify-center gap-2 p-4"
      role="img"
      aria-label={`Bar chart with ${data.length} bars`}
    >
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2">
          <div
            className="inline-flex flex-col-reverse items-center gap-1"
            style={{
              height: `${(item.value / maxValue) * 200}px`,
              minHeight: "40px",
            }}
          >
            {Array.from({ length: item.value || 0 }).map((_, spriteIdx) => (
              <div
                key={spriteIdx}
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
          {item.label && (
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-center max-w-16">
              {item.label}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PATTERN VISUAL ─────────────────────────────────────────────────────────
// Repeating pattern with a missing element (what comes next?)
// Usage: <KenneyPattern sequence={["ballRed","ballBlue","ballRed","question"]} size={40} />

export function KenneyPattern({ sequence = [], size = 40 }) {
  const SPRITES = {
    ballBlue: "ballBlue",
    ballRed: "ballRed",
    ballGreen: "ballGreen",
    ballGrey: "ballGrey",
    star: "particleStar",
    cartoonStar: "particleCartoonStar",
  };

  return (
    <div
      className="flex items-center justify-center gap-3 p-4"
      role="img"
      aria-label={`Pattern: ${sequence.filter(s => s !== "question").join(", ")}, what comes next?`}
    >
      {sequence.map((sprite, idx) => {
        const isQuestion = sprite === "question" || sprite === "?";

        if (isQuestion) {
          return (
            <div
              key={idx}
              className="flex items-center justify-center bg-gray-300 dark:bg-gray-600 rounded"
              style={{
                width: `${size}px`,
                height: `${size}px`,
              }}
              role="img"
              aria-label="Unknown pattern element"
            >
              <span className="text-lg font-bold text-white">?</span>
            </div>
          );
        }

        const actualSprite = SPRITES[sprite] || "ballBlue";
        const src = `/assets/kenney/puzzle/${actualSprite}.png`;

        return (
          <div
            key={idx}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundImage: `url('${src}')`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── BALANCE VISUAL ─────────────────────────────────────────────────────────
// Balance scale with items on each side (for equality/equations)
// Usage: <KenneyBalance leftItems={3} rightItems={5} sprite="ballBlue" size={30} balanced={false} />

export function KenneyBalance({ leftItems = 3, rightItems = 5, sprite = "ballBlue", size = 30, balanced = false }) {
  const SPRITES = {
    ballBlue: "ballBlue",
    ballRed: "ballRed",
    ballGreen: "ballGreen",
    ballGrey: "ballGrey",
  };

  const actualSprite = SPRITES[sprite] || "ballBlue";
  const src = `/assets/kenney/puzzle/${actualSprite}.png`;

  const leftHeight = 80 - (leftItems * 5); // Tilt left if fewer items
  const rightHeight = 80 - (rightItems * 5); // Tilt right if fewer items
  const isBalanced = leftItems === rightItems;

  return (
    <div
      className="flex flex-col items-center gap-4 p-4"
      role="img"
      aria-label={`Balance scale: ${leftItems} items on left, ${rightItems} on right. ${isBalanced ? "Balanced" : "Unbalanced"}`}
    >
      <svg width="280" height="140" viewBox="0 0 280 140">
        {/* Fulcrum */}
        <polygon points="140,80 125,100 155,100" fill="currentColor" className="text-gray-600 dark:text-gray-300" />

        {/* Left pan */}
        <g transform={`rotate(${balanced ? 0 : -5} 70 80)`}>
          <rect x="40" y="70" width="60" height="15" fill="currentColor" className="text-blue-500" />
          <rect x="50" y="75" width="40" height="8" fill="currentColor" className="text-blue-400" />
        </g>

        {/* Right pan */}
        <g transform={`rotate(${balanced ? 0 : 5} 210 80)`}>
          <rect x="180" y="70" width="60" height="15" fill="currentColor" className="text-blue-500" />
          <rect x="190" y="75" width="40" height="8" fill="currentColor" className="text-blue-400" />
        </g>

        {/* Left lever */}
        <line x1="40" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="3" className="text-gray-500 dark:text-gray-400" />

        {/* Right lever */}
        <line x1="140" y1="80" x2="240" y2="80" stroke="currentColor" strokeWidth="3" className="text-gray-500 dark:text-gray-400" />
      </svg>

      <div className="flex justify-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap gap-1 justify-center" style={{ maxWidth: `${Math.min(120, size * 4)}px` }}>
            {Array.from({ length: leftItems }).map((_, idx) => (
              <div
                key={idx}
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
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {leftItems}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap gap-1 justify-center" style={{ maxWidth: `${Math.min(120, size * 4)}px` }}>
            {Array.from({ length: rightItems }).map((_, idx) => (
              <div
                key={idx}
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
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {rightItems}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── DICE VISUAL ─────────────────────────────────────────────────────────────
// Dice face with dots (for probability questions)
// Usage: <KenneyDice value={4} size={80} />

export function KenneyDice({ value = 4, size = 80 }) {
  const actualValue = Math.min(Math.max(Math.floor(value), 1), 6);

  // Dice dot patterns for values 1-6
  const PATTERNS = {
    1: [[2, 2]],
    2: [[1, 1], [3, 3]],
    3: [[1, 1], [2, 2], [3, 3]],
    4: [[1, 1], [1, 3], [3, 1], [3, 3]],
    5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
    6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]],
  };

  const pattern = PATTERNS[actualValue] || PATTERNS[1];
  const dotSize = size / 6;

  return (
    <div
      className="relative inline-block bg-white dark:bg-gray-700 border-2 border-gray-700 dark:border-gray-400"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${size / 10}px`,
      }}
      role="img"
      aria-label={`Dice showing ${actualValue}`}
    >
      {pattern.map((pos, idx) => (
        <div
          key={idx}
          className="absolute bg-gray-700 dark:bg-white rounded-full"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            left: `${(pos[1] - 1) * dotSize + dotSize / 2 - dotSize / 2}px`,
            top: `${(pos[0] - 1) * dotSize + dotSize / 2 - dotSize / 2}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── CLOCK FACE VISUAL ───────────────────────────────────────────────────────
// Analogue clock for time-telling questions
// Usage: <KenneyClockFace hours={3} minutes={30} size={120} />

export function KenneyClockFace({ hours = 3, minutes = 30, size = 120 }) {
  const h = parseInt(hours, 10) % 12;
  const m = parseInt(minutes, 10) % 60;

  // Calculate hand angles
  const minuteAngle = (m / 60) * 360;
  const hourAngle = ((h + m / 60) / 12) * 360;

  return (
    <div
      className="flex items-center justify-center"
      role="img"
      aria-label={`Clock showing ${h}:${String(m).padStart(2, "0")}`}
    >
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Clock face */}
        <circle cx="50" cy="50" r="48" fill="white" stroke="currentColor" strokeWidth="2" className="text-gray-700 dark:text-gray-300" />

        {/* Hour markers */}
        {[0, 3, 6, 9].map(num => {
          const angle = (num / 12) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-bold text-gray-700 dark:text-gray-300"
            >
              {num === 0 ? 12 : num}
            </text>
          );
        })}

        {/* Center dot */}
        <circle cx="50" cy="50" r="3" fill="currentColor" className="text-gray-700 dark:text-gray-300" />

        {/* Minute hand */}
        <g transform={`rotate(${minuteAngle} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="2" className="text-gray-700 dark:text-gray-300" />
        </g>

        {/* Hour hand */}
        <g transform={`rotate(${hourAngle} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="28" stroke="currentColor" strokeWidth="3" className="text-gray-700 dark:text-gray-300" />
        </g>
      </svg>
    </div>
  );
}

// ─── MONEY VISUAL ────────────────────────────────────────────────────────────
// Coins and notes display for money questions
// Usage: <KenneyMoneyVisual coins={[100, 50, 20, 10, 5]} size={40} />

export function KenneyMoneyVisual({ coins = [], size = 40 }) {
  // Coin color map (GBP denominations)
  const COIN_COLORS = {
    1: "bg-amber-600",
    2: "bg-blue-600",
    5: "bg-red-600",
    10: "bg-orange-600",
    20: "bg-blue-400",
    50: "bg-yellow-600",
    100: "bg-purple-600",
    200: "bg-green-600",
  };

  return (
    <div
      className="flex flex-wrap gap-3 justify-center p-4"
      role="img"
      aria-label={`Money: ${coins.join("p, ")}p`}
    >
      {coins.map((coin, idx) => {
        const actualCoin = parseInt(coin, 10);
        const colorClass = COIN_COLORS[actualCoin] || "bg-gray-500";

        return (
          <div
            key={idx}
            className={`flex items-center justify-center rounded-full font-semibold text-white ${colorClass}`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              fontSize: `${size / 4}px`,
            }}
          >
            {actualCoin}p
          </div>
        );
      })}
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
  if (component === "comparison") {
    return <KenneyComparison {...props} />;
  }
  if (component === "number_line") {
    return <KenneyNumberLine {...props} />;
  }
  if (component === "bar_chart") {
    return <KenneyBarChart {...props} />;
  }
  if (component === "pattern") {
    return <KenneyPattern {...props} />;
  }
  if (component === "balance") {
    return <KenneyBalance {...props} />;
  }
  if (component === "dice") {
    return <KenneyDice {...props} />;
  }
  if (component === "clock") {
    return <KenneyClockFace {...props} />;
  }
  if (component === "money") {
    return <KenneyMoneyVisual {...props} />;
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
  const fullText = q + " " + topic;

  // ── SHAPES: Square, rectangle, diamond, polygon, star ───────────────────────
  if (subj.includes("math")) {
    // "Which shape is a square?" / "properties of a rectangle"
    if (/shape|square|rectangle|diamond|polygon|pentagon|hexagon/i.test(fullText)) {
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

    // Comparison: "Which is bigger/smaller/greater/less"
    if (/compare|bigger|smaller|greater|less than|more than|fewer|which is/i.test(fullText)) {
      const numMatch = fullText.match(/(\d+)\s+(?:or|vs|and|,)?\s+(\d+)/);
      if (numMatch) {
        const left = parseInt(numMatch[1]);
        const right = parseInt(numMatch[2]);
        const operator = left > right ? ">" : left < right ? "<" : "=";

        return {
          ariaLabel: `Comparison: ${left} ${operator} ${right}`,
          component: "comparison",
          leftLabel: String(left),
          rightLabel: String(right),
          leftSprite: "ballBlue",
          rightSprite: "ballRed",
          operator,
          leftSize: 50,
          rightSize: 50,
        };
      }
    }

    // Number line: "count on", "between", "order numbers"
    if (/number line|count on|count back|between.*and|order.*number/i.test(fullText)) {
      const rangeMatch = fullText.match(/(?:between|from|0?)\s*(\d+)\s*(?:and|to)\s*(\d+)/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);

        return {
          ariaLabel: `Number line from ${start} to ${end}`,
          component: "number_line",
          start,
          end,
          markers: [],
          markerSprite: "ballGreen",
          size: 30,
        };
      }
    }

    // Bar chart: "bar chart", "tally", "data", "most popular"
    if (/bar chart|tally|pictogram|data|graph|how many more|most popular/i.test(fullText)) {
      // Generic 3-category bar chart
      return {
        ariaLabel: `Bar chart with data`,
        component: "bar_chart",
        data: [
          { label: "A", value: 4 },
          { label: "B", value: 7 },
          { label: "C", value: 3 },
        ],
        sprite: "ballBlue",
        size: 28,
      };
    }

    // Pattern: "sequence", "what comes next", "pattern"
    if (/pattern|sequence|next.*number|what comes next|continues|following/i.test(fullText)) {
      return {
        ariaLabel: `Pattern sequence with missing element`,
        component: "pattern",
        sequence: ["ballRed", "ballBlue", "ballRed", "ballBlue", "question"],
        size: 40,
      };
    }

    // Dice: "dice", "roll", "probability", "fair"
    if (/dice|die|roll|probability.*number|fair.*dice|outcome/i.test(fullText)) {
      const valueMatch = fullText.match(/(?:shows?|rolling?|roll)\s+(\d)/);
      const value = valueMatch ? parseInt(valueMatch[1]) : Math.floor(Math.random() * 6) + 1;

      return {
        ariaLabel: `Dice showing ${value}`,
        component: "dice",
        value: Math.min(Math.max(value, 1), 6),
        size: 80,
      };
    }

    // Clock: "time", "o'clock", "half past", "quarter"
    if (/clock|time|o'clock|half past|quarter past|quarter to|:\d{2}/i.test(fullText)) {
      const timeMatch = fullText.match(/(\d{1,2})\s*(?:o'clock|:|)?\s*(?:(\d{2})|half|quarter)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]) || 3;
        let minutes = 0;

        if (timeMatch[2]) {
          minutes = parseInt(timeMatch[2]);
        } else if (/half/i.test(fullText)) {
          minutes = 30;
        } else if (/quarter/i.test(fullText)) {
          minutes = /quarter to/i.test(fullText) ? 45 : 15;
        }

        return {
          ariaLabel: `Clock showing ${hours}:${String(minutes).padStart(2, "0")}`,
          component: "clock",
          hours,
          minutes,
          size: 120,
        };
      }
    }

    // Money: "coin", "penny", "pence", "pound", "cost", "price"
    if (/coin|penny|pence|pound|money|change|cost|price|£|\bp/i.test(fullText)) {
      const coinMatches = fullText.match(/(\d+)\s*(?:p|pence|penny)/gi);
      let coins = [];

      if (coinMatches) {
        coins = coinMatches.map(m => {
          const val = parseInt(m);
          return val;
        });
      } else {
        coins = [5, 10, 20]; // Default set
      }

      return {
        ariaLabel: `Money: ${coins.map(c => c + "p").join(", ")}`,
        component: "money",
        coins,
        size: 40,
      };
    }

    // Balance/Equality: "balance", "equal", "equation", "same as", "both sides"
    if (/balance|equal|equation|same as|both sides|weighs/i.test(fullText)) {
      const lMatch = fullText.match(/left.*?(\d+)|(\d+).*?left/i);
      const rMatch = fullText.match(/right.*?(\d+)|(\d+).*?right/i);

      const leftItems = lMatch ? parseInt(lMatch[1] || lMatch[2]) : 3;
      const rightItems = rMatch ? parseInt(rMatch[1] || rMatch[2]) : 3;

      return {
        ariaLabel: `Balance: ${leftItems} on left, ${rightItems} on right`,
        component: "balance",
        leftItems,
        rightItems,
        sprite: "ballBlue",
        size: 30,
        balanced: leftItems === rightItems,
      };
    }

    // Fraction questions with kenney shapes
    if (/fraction|shaded|part of|one third|one quarter|one half/i.test(fullText)) {
      const frMatch = fullText.match(/(\d+)[^\d]*(?:out of|\/)\s*(\d+)/);
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
    if (/multiply|multiplication|groups? of|rows? of|array/i.test(fullText)) {
      const groupMatch = fullText.match(/(\d+)\s+(?:groups? of|rows? of|×|x)\s+(\d+)/i);
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
    if (/material|wood|metal|glass|stone|block|spring|force|friction/i.test(fullText)) {
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
          variant: Math.floor(Math.random() * 20),
          size: Math.min(150, 60 + parseInt(yearLevel ?? 1, 10) * 5),
        };
      }
    }
  }

  // ── PLANETS: Solar system, space ─────────────────────────────────────────────
  if (
    subj.includes("science") ||
    (subj.includes("geograph") && /planet|solar|space|orbit/i.test(fullText))
  ) {
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

    if (/planet|mercury|venus|earth|mars|jupiter|saturn|uranus|neptune|pluto|solar|orbit/i.test(fullText)) {
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

      if (/solar|planet|orbit|space|earth/i.test(fullText)) {
        const idx = Math.floor(Math.random() * 8);
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
