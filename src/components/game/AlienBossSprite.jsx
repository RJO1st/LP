'use client';

import React, { useState, useEffect } from 'react';

const AlienBossSprite = ({
  bossType = 'counting-critter',
  hp = 100,
  maxHp = 100,
  animationState = 'idle',
  size = 'md',
}) => {
  const [damageStage, setDamageStage] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Update damage stage based on HP
  useEffect(() => {
    const hpPercent = (hp / maxHp) * 100;
    if (hpPercent > 66) {
      setDamageStage(0);
    } else if (hpPercent > 33) {
      setDamageStage(1);
    } else if (hpPercent > 0) {
      setDamageStage(2);
    }
  }, [hp, maxHp]);

  // Trigger shake animation on hit
  useEffect(() => {
    if (animationState === 'hit') {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 300);
      return () => clearTimeout(timer);
    }
  }, [animationState]);

  // Trigger particles on defeat
  useEffect(() => {
    if (animationState === 'defeat') {
      setShowParticles(true);
    }
  }, [animationState]);

  const isCritter = bossType === 'counting-critter';
  const sizeMap = {
    sm: { width: 'clamp(80px, 20vw, 140px)', height: 'clamp(80px, 20vw, 140px)' },
    md: { width: 'clamp(120px, 30vw, 200px)', height: 'clamp(120px, 30vw, 200px)' },
    lg: { width: 'clamp(160px, 40vw, 280px)', height: 'clamp(160px, 40vw, 280px)' },
  };

  const containerSize = sizeMap[size] || sizeMap.md;
  const shipImageSize = 'clamp(100px, 25vw, 220px)';

  // Asset paths
  const assets = isCritter
    ? {
        ship: '/assets/kenney/alien-ufo/shipGreen_manned.png',
        shipDamage1: '/assets/kenney/alien-ufo/shipGreen_damage1.png',
        shipDamage2: '/assets/kenney/alien-ufo/shipGreen_damage2.png',
        laser: '/assets/kenney/alien-ufo/laserGreen1.png',
        laserBurst: '/assets/kenney/alien-ufo/laserGreen_burst.png',
        color: '#4ade80', // green
      }
    : {
        ship: '/assets/kenney/alien-ufo/shipYellow_manned.png',
        shipDamage1: '/assets/kenney/alien-ufo/shipYellow_damage1.png',
        shipDamage2: '/assets/kenney/alien-ufo/shipYellow_damage2.png',
        laser: '/assets/kenney/alien-ufo/laserYellow1.png',
        laserBurst: '/assets/kenney/alien-ufo/laserYellow_burst.png',
        color: '#facc15', // yellow
      };

  // Select ship sprite based on damage stage
  const shipSrc =
    damageStage === 0
      ? assets.ship
      : damageStage === 1
        ? assets.shipDamage1
        : assets.shipDamage2;

  // Get animation class
  const getAnimationClass = () => {
    if (animationState === 'defeat') return 'animate-boss-defeat';
    if (animationState === 'attack') return 'animate-boss-attack';
    if (animationState === 'hit') return isShaking ? 'animate-shake' : '';
    return 'animate-boss-float';
  };

  return (
    <style>{`
      @keyframes bossFloat {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-12px);
        }
      }

      @keyframes bossTilt {
        0%, 100% {
          transform: rotateZ(-2deg);
        }
        50% {
          transform: rotateZ(2deg);
        }
      }

      @keyframes shake {
        0%, 100% {
          transform: translateX(0);
        }
        25% {
          transform: translateX(-6px);
        }
        75% {
          transform: translateX(6px);
        }
      }

      @keyframes flashWhite {
        0%, 100% {
          filter: brightness(1);
        }
        50% {
          filter: brightness(1.6);
        }
      }

      @keyframes bossAttack {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1) translateY(-20px);
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes bossDefeat {
        0% {
          transform: scale(1) rotateZ(0deg);
          opacity: 1;
        }
        50% {
          transform: scale(1.05) rotateZ(5deg);
        }
        100% {
          transform: scale(0.3) rotateZ(360deg) translateY(100px);
          opacity: 0;
        }
      }

      @keyframes beamPulse {
        0%, 100% {
          opacity: 0.3;
          filter: blur(2px);
        }
        50% {
          opacity: 0.7;
          filter: blur(0px);
        }
      }

      @keyframes particleFloat {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(var(--tx), var(--ty)) scale(0);
          opacity: 0;
        }
      }

      .animate-boss-float {
        animation: bossFloat 2s ease-in-out infinite, bossTilt 3s ease-in-out infinite;
      }

      .animate-shake {
        animation: shake 0.3s ease-in-out, flashWhite 0.3s ease-in-out;
      }

      .animate-boss-attack {
        animation: bossAttack 0.6s ease-in-out;
      }

      .animate-boss-defeat {
        animation: bossDefeat 1.2s ease-in-out forwards;
      }

      .beam-pulse {
        animation: beamPulse 1.5s ease-in-out infinite;
      }

      .particle {
        animation: particleFloat 0.8s ease-out forwards;
        position: absolute;
        pointer-events: none;
      }
    `}</style>

    <div
      className={`relative inline-flex flex-col items-center justify-center ${getAnimationClass()}`}
      style={{
        ...containerSize,
        perspective: '1000px',
        filter: animationState === 'hit' ? 'brightness(1.3)' : 'brightness(1)',
        transition: 'filter 0.1s ease',
      }}
    >
      {/* Golden glow aura for Riddle Sphinx */}
      {!isCritter && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${assets.color}40 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Ship container with stacked layout */}
      <div className="relative" style={{ width: shipImageSize, height: shipImageSize }}>
        {/* Energy glow dome (below ship, pulses to show UFO energy) */}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: 'clamp(60px, 18vw, 120px)',
            height: 'clamp(40px, 12vw, 80px)',
            marginTop: 'clamp(-12px, -3vw, -20px)',
            opacity: 0.6,
          }}
        >
          <img
            src="/assets/kenney/alien-ufo/dome.png"
            alt="energy glow"
            className="beam-pulse w-full h-full object-contain"
            style={{
              filter: `drop-shadow(0 0 ${isCritter ? '6px' : '10px'} ${assets.color}a0)`,
            }}
          />
        </div>

        {/* Ship sprite (includes alien in dome on _manned variant) */}
        <img
          src={shipSrc}
          alt={`${bossType} ship`}
          className="w-full h-full object-contain drop-shadow-lg"
          style={{
            filter:
              animationState === 'hit'
                ? `drop-shadow(0 0 12px ${assets.color})`
                : `drop-shadow(0 0 6px ${assets.color}80)`,
            transition: 'filter 0.2s ease',
          }}
        />

        {/* Laser bolt fired during attack */}
        {animationState === 'attack' && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: 'clamp(8px, 3vw, 20px)',
              height: 'clamp(40px, 15vw, 100px)',
              animation: 'bossAttack 0.6s ease-in-out',
            }}
          >
            <img
              src={assets.laser}
              alt="laser"
              className="w-full h-full object-contain"
              style={{
                filter: `drop-shadow(0 0 6px ${assets.color})`,
              }}
            />
          </div>
        )}
      </div>

      {/* Particle burst on defeat */}
      {showParticles &&
        animationState === 'defeat' &&
        Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const distance = clamp(40, 15, 100);
          const tx = Math.cos(angle) * distance;
          const ty = Math.sin(angle) * distance;

          return (
            <div
              key={`particle-${i}`}
              className="particle"
              style={{
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
                width: 'clamp(4px, 1.5vw, 12px)',
                height: 'clamp(4px, 1.5vw, 12px)',
                backgroundColor: assets.color,
                borderRadius: '50%',
                boxShadow: `0 0 clamp(2px, 1vw, 6px) ${assets.color}`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}

      {/* HP Bar (below sprite) */}
      <div
        className="mt-2 w-full rounded-full overflow-hidden bg-slate-800 border-2"
        style={{
          width: 'clamp(80px, 25vw, 200px)',
          height: 'clamp(8px, 2.5vw, 16px)',
          borderColor: assets.color,
        }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.max(0, (hp / maxHp) * 100)}%`,
            backgroundColor: hp > maxHp * 0.66 ? assets.color : hp > maxHp * 0.33 ? '#f59e0b' : '#ef4444',
            boxShadow: `inset 0 0 clamp(2px, 1vw, 4px) ${assets.color}40`,
          }}
        />
      </div>

      {/* Boss name label */}
      <div
        className="mt-1 text-center font-bold text-xs sm:text-sm"
        style={{
          color: assets.color,
          textShadow: `0 0 4px ${assets.color}80`,
          fontSize: 'clamp(10px, 2.5vw, 16px)',
          fontWeight: 700,
        }}
      >
        {isCritter ? 'Counting Critter' : 'Riddle Sphinx'}
      </div>
    </div>
  );
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default AlienBossSprite;
