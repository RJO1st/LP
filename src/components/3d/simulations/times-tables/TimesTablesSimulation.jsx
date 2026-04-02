'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
extend(THREE);

// ============================================================================
// CONSTANTS
// ============================================================================
const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const RANKS = [
  { name: 'Cadet', threshold: 0 },
  { name: 'Navigator', threshold: 5 },
  { name: 'Commander', threshold: 10 },
  { name: 'Admiral', threshold: 18 },
  { name: 'Legend', threshold: 25 },
];

function getRank(score) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) return RANKS[i];
  }
  return RANKS[0];
}

function generateWrongAnswers(answer, a, b) {
  const wrongs = new Set();
  wrongs.add(a * (b + 1));
  wrongs.add(a * (b - 1));
  wrongs.add((a + 1) * b);
  wrongs.add((a - 1) * b);
  wrongs.add(answer + a);
  wrongs.add(answer - a);
  wrongs.add(answer + b);
  const valid = [...wrongs].filter(n => n > 0 && n !== answer && n <= 144);
  while (valid.length < 5) {
    const r = answer + Math.floor(Math.random() * 20) - 10;
    if (r > 0 && r !== answer && !valid.includes(r)) valid.push(r);
  }
  return valid;
}

function generateQuestion(tableNum) {
  const b = Math.floor(Math.random() * 12) + 1;
  const answer = tableNum * b;
  const wrongs = generateWrongAnswers(answer, tableNum, b);
  // Pick 3 wrong answers
  const shuffledWrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [answer, ...shuffledWrongs].sort(() => Math.random() - 0.5);
  return { a: tableNum, b, answer, options };
}

// ============================================================================
// 3D SPACECRAFT — Detailed ship at bottom center
// ============================================================================
function Spacecraft({ posX }) {
  const ref = useRef();
  const engineRef = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, posX, 0.15);
    ref.current.position.y = -7.5 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08;
    if (engineRef.current) {
      engineRef.current.material.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 10) * 0.4;
    }
  });

  return (
    <group ref={ref} position={[0, -7.5, 0]} scale={[1.4, 1.4, 1.4]}>
      {/* Nose cone */}
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.4, 1.0, 6]} />
        <meshPhysicalMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.4, 0.55, 1.6, 8]} />
        <meshPhysicalMaterial color="#60a5fa" metalness={0.5} roughness={0.25} clearcoat={0.5} />
      </mesh>
      {/* Cockpit window */}
      <mesh position={[0, 0.5, 0.5]}>
        <sphereGeometry args={[0.2, 12, 12, 0, Math.PI]} />
        <meshPhysicalMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.7} transmission={0.4} roughness={0.1} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-0.85, 0.05, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.8, 0.08, 0.4]} />
        <meshPhysicalMaterial color="#2563eb" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.85, 0.05, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.8, 0.08, 0.4]} />
        <meshPhysicalMaterial color="#2563eb" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Wing tip - left */}
      <mesh position={[-1.2, -0.1, 0]}>
        <boxGeometry args={[0.15, 0.35, 0.12]} />
        <meshPhysicalMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} />
      </mesh>
      {/* Wing tip - right */}
      <mesh position={[1.2, -0.1, 0]}>
        <boxGeometry args={[0.15, 0.35, 0.12]} />
        <meshPhysicalMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} />
      </mesh>
      {/* Engine left */}
      <mesh ref={engineRef} position={[-0.3, -0.65, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.35, 8]} />
        <meshPhysicalMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} />
      </mesh>
      {/* Engine right */}
      <mesh position={[0.3, -0.65, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.35, 8]} />
        <meshPhysicalMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} />
      </mesh>
      {/* Engine trails */}
      <Sparkles count={15} scale={[1.2, 0.8, 0.5]} position={[0, -0.9, 0]} size={1.5} speed={2} color="#06b6d4" />
      {/* Engine glow */}
      <pointLight position={[0, -0.7, 0]} intensity={8} color="#06b6d4" distance={3} />
    </group>
  );
}

// ============================================================================
// 3D ALIEN ENEMY — Large, detailed, with number clearly visible
// ============================================================================
function AlienEnemy({ position, number, isTarget, flash, onClick, id }) {
  const ref = useRef();
  const bodyRef = useRef();
  const startY = useRef(position[1]);
  const seed = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + seed.current;
    // Bob up and down
    ref.current.position.y = startY.current + Math.sin(t * 2) * 0.15;
    // Slow rotation
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.sin(t * 1.5) * 0.3;
      const s = 1 + Math.sin(t * 3) * 0.05;
      bodyRef.current.scale.set(s, s, s);
    }
  });

  const bodyColor = flash === 'wrong' ? '#ef4444' : flash === 'correct' ? '#22c55e' : '#a855f7';
  const glowColor = flash === 'wrong' ? '#ef4444' : flash === 'correct' ? '#22c55e' : '#c084fc';

  return (
    <group ref={ref} position={position}>
      <group ref={bodyRef} onClick={onClick}>
        {/* Main body - large sphere */}
        <mesh>
          <dodecahedronGeometry args={[0.9, 1]} />
          <meshPhysicalMaterial
            color={bodyColor}
            emissive={glowColor}
            emissiveIntensity={0.35}
            metalness={0.3}
            roughness={0.4}
            clearcoat={0.3}
          />
        </mesh>
        {/* Left eye */}
        <mesh position={[-0.28, 0.25, 0.7]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshPhysicalMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[-0.28, 0.25, 0.85]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshPhysicalMaterial color="#1a1a2e" />
        </mesh>
        {/* Right eye */}
        <mesh position={[0.28, 0.25, 0.7]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshPhysicalMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0.28, 0.25, 0.85]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshPhysicalMaterial color="#1a1a2e" />
        </mesh>
        {/* Left antenna */}
        <mesh position={[-0.35, 0.9, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.04, 0.02, 0.6, 6]} />
          <meshPhysicalMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.5, 1.25, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshPhysicalMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1} />
        </mesh>
        {/* Right antenna */}
        <mesh position={[0.35, 0.9, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.04, 0.02, 0.6, 6]} />
          <meshPhysicalMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.5, 1.25, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshPhysicalMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1} />
        </mesh>
        {/* Little feet */}
        <mesh position={[-0.35, -0.75, 0.15]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshPhysicalMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0.35, -0.75, 0.15]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshPhysicalMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
      {/* Glow */}
      <pointLight intensity={3} color={glowColor} distance={2.5} />
    </group>
  );
}

// ============================================================================
// LASER BOLT — Animated from ship to target
// ============================================================================
function LaserBolt({ from, to, onComplete }) {
  const ref = useRef();
  const progress = useRef(0);
  const fromVec = useMemo(() => new THREE.Vector3(...from), [from]);
  const toVec = useMemo(() => new THREE.Vector3(...to), [to]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    progress.current += delta * 8; // Fast travel
    if (progress.current >= 1) {
      onComplete();
      return;
    }
    const pos = fromVec.clone().lerp(toVec, progress.current);
    ref.current.position.copy(pos);
  });

  return (
    <group ref={ref} position={from}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 6]} />
        <meshPhysicalMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight intensity={10} color="#22d3ee" distance={3} />
    </group>
  );
}

// ============================================================================
// EXPLOSION — Sparkle burst
// ============================================================================
function ExplosionEffect({ position }) {
  return (
    <group position={position}>
      <Sparkles count={40} scale={2.5} size={3} speed={5} color="#f97316" />
      <pointLight intensity={15} color="#f97316" distance={4} />
    </group>
  );
}

// ============================================================================
// GAME SCENE — All 3D objects
// ============================================================================
function GameScene({ enemies, shipX, lasers, explosions, onLaserDone, flashMap }) {
  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <Stars radius={100} depth={60} count={300} factor={5} fade />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 15, 8]} intensity={0.8} />

      <Spacecraft posX={shipX} />

      {enemies.map((e) => (
        <AlienEnemy
          key={e.id}
          id={e.id}
          position={e.pos}
          number={e.number}
          isTarget={false}
          flash={flashMap[e.id] || null}
          onClick={e.onClick}
        />
      ))}

      {lasers.map((l, i) => (
        <LaserBolt key={l.id} from={l.from} to={l.to} onComplete={() => onLaserDone(l.id)} />
      ))}

      {explosions.map((ex) => (
        <ExplosionEffect key={ex.id} position={ex.pos} />
      ))}
    </>
  );
}

// ============================================================================
// HTML OVERLAY — HUD rendered as pure HTML on top of Canvas
// ============================================================================
function HUDOverlay({ score, shields, maxShields, timer, timerMax, streak, question, rank }) {
  const timerPct = (timer / timerMax) * 100;
  const shieldPct = (shields / maxShields) * 100;
  const timerDanger = timer > timerMax - 3;

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: "'Courier New', monospace", zIndex: 10,
    }}>
      {/* Question bar — top center */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(10, 14, 30, 0.85)', border: '2px solid #0ea5e9',
        borderRadius: 12, padding: '10px 28px', textAlign: 'center',
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.35)',
      }}>
        <div style={{ fontSize: 'clamp(22px, 5vw, 40px)', fontWeight: 900, color: '#fff', letterSpacing: 2,
          textShadow: '0 0 20px rgba(6, 182, 212, 0.8)' }}>
          {question.a} × {question.b} = ?
        </div>
      </div>

      {/* Score — top left */}
      <div style={{
        position: 'absolute', top: 14, left: 16,
        color: '#fff', fontWeight: 'bold', fontSize: 'clamp(13px, 2.5vw, 18px)',
        textShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
      }}>
        <span style={{ color: '#94a3b8' }}>SCORE </span>{score}
        {streak > 1 && <span style={{ color: '#f59e0b', marginLeft: 10 }}>🔥{streak}</span>}
      </div>

      {/* Rank — top right */}
      <div style={{
        position: 'absolute', top: 14, right: 16,
        color: '#f59e0b', fontWeight: 'bold', fontSize: 'clamp(13px, 2.5vw, 18px)',
        textShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
      }}>
        {rank.name}
      </div>

      {/* Timer bar — below question */}
      <div style={{
        position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)',
        width: 'min(280px, 60vw)', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${100 - timerPct}%`,
          background: timerDanger ? '#ef4444' : '#22c55e',
          transition: 'width 0.1s linear, background 0.3s',
          boxShadow: timerDanger ? '0 0 8px #ef4444' : 'none',
        }} />
      </div>

      {/* Shield bar — bottom left */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: 'clamp(11px, 2vw, 14px)' }}>SHIELDS</span>
        <div style={{
          width: 'min(160px, 30vw)', height: 10, background: '#1e293b',
          border: '1px solid #334155', borderRadius: 5, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${shieldPct}%`,
            background: shieldPct > 50 ? '#22c55e' : shieldPct > 25 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.3s', borderRadius: 5,
          }} />
        </div>
      </div>

      {/* Instruction — bottom center */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        color: '#475569', fontSize: 'clamp(10px, 2vw, 13px)', textAlign: 'center',
      }}>
        TAP the alien with the correct answer
      </div>
    </div>
  );
}

// ============================================================================
// NUMBER OVERLAY — Rendered as HTML positioned over each alien
// ============================================================================
function NumberOverlay({ enemies, containerRef }) {
  const [positions, setPositions] = useState({});
  const cameraRef = useRef({ projMatrix: new THREE.Matrix4(), viewMatrix: new THREE.Matrix4() });

  // We use a simple mapping: enemies have world positions, we project them
  // But since we use a fixed orthographic-like camera, we can calculate screen positions directly
  // Camera is at z=20 looking at origin, ortho-like with fov=50
  // Screen mapping: x in [-10, 10] maps to [0, width], y in [-10, 10] maps to [height, 0]

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    // For our camera: fov=50 at z=20, visible height ≈ 2 * 20 * tan(25°) ≈ 18.6
    // visible width ≈ 18.6 * aspect
    const aspect = w / h;
    const visH = 2 * 20 * Math.tan((50 / 2) * Math.PI / 180);
    const visW = visH * aspect;

    const newPos = {};
    enemies.forEach(e => {
      const sx = ((e.pos[0] / (visW / 2)) * 0.5 + 0.5) * w;
      const sy = ((-e.pos[1] / (visH / 2)) * 0.5 + 0.5) * h;
      newPos[e.id] = { x: sx, y: sy };
    });
    setPositions(newPos);
  }, [enemies, containerRef]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {enemies.map(e => {
        const p = positions[e.id];
        if (!p) return null;
        return (
          <div key={e.id} style={{
            position: 'absolute',
            left: p.x, top: p.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 52, height: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900,
              color: '#fff', fontFamily: "'Courier New', monospace",
              textShadow: '0 0 12px rgba(168, 85, 247, 0.9), 0 2px 4px rgba(0,0,0,0.8)',
              userSelect: 'none',
            }}>
              {e.number}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TABLE SELECTOR SCREEN
// ============================================================================
function TableSelector({ onSelect }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10, 14, 26, 0.95)', backdropFilter: 'blur(12px)', zIndex: 50,
    }}>
      <div style={{
        textAlign: 'center', padding: 'clamp(20px, 5vw, 40px)',
        borderRadius: 20, background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(10, 14, 26, 0.95))',
        border: '2px solid #0ea5e9', boxShadow: '0 0 60px rgba(6, 182, 212, 0.25)',
        maxWidth: '90vw',
      }}>
        <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 900 }}>
          NEBULA BLASTER
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 'clamp(12px, 3vw, 16px)' }}>
          Choose your times table
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, maxWidth: 360, margin: '0 auto' }}>
          {TABLES.map(t => (
            <button key={t} onClick={() => onSelect(t)} style={{
              padding: 'clamp(10px, 3vw, 16px)', fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 900,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
              border: '2px solid transparent', borderRadius: 10, cursor: 'pointer',
              transition: 'all 0.15s', touchAction: 'manipulation',
            }}
              onMouseEnter={e => { e.target.style.borderColor = '#22d3ee'; e.target.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.target.style.borderColor = 'transparent'; e.target.style.transform = 'scale(1)'; }}
            >
              {t}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GAME OVER SCREEN
// ============================================================================
function GameOverScreen({ score, rank, isVictory, onRestart, onExit }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10, 14, 26, 0.96)', backdropFilter: 'blur(12px)', zIndex: 100,
    }}>
      <div style={{
        textAlign: 'center', padding: 'clamp(24px, 5vw, 50px)', borderRadius: 20, maxWidth: '85vw',
        background: `linear-gradient(135deg, rgba(${isVictory ? '34,197,94' : '239,68,68'}, 0.1), rgba(10, 14, 26, 0.95))`,
        border: `2px solid ${isVictory ? '#22c55e' : '#ef4444'}`,
        boxShadow: `0 0 80px ${isVictory ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}>
        <div style={{
          fontSize: 'clamp(36px, 10vw, 56px)', fontWeight: 900,
          color: isVictory ? '#22c55e' : '#ef4444', marginBottom: 12,
        }}>
          {isVictory ? 'VICTORY!' : 'DEFEAT'}
        </div>
        <div style={{ fontSize: 'clamp(24px, 6vw, 40px)', color: '#fff', fontWeight: 900, marginBottom: 8 }}>
          Score: {score}
        </div>
        <div style={{ fontSize: 'clamp(16px, 4vw, 24px)', color: '#f59e0b', marginBottom: 30, fontWeight: 700 }}>
          Rank: {rank.name}
        </div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRestart} style={{
            padding: '12px 28px', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 800,
            background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
            Play Again
          </button>
          <button onClick={onExit} style={{
            padding: '12px 28px', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 800,
            background: '#475569', color: '#fff', border: 'none', borderRadius: 10,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TimesTablesSimulation({ ksLevel = 2, curriculum, year, onTaskComplete, onSimulationComplete }) {
  const containerRef = useRef();
  const safeKs = typeof ksLevel === 'string' ? parseInt(ksLevel, 10) : ksLevel;

  // Config per KS
  const config = useMemo(() => ({
    cols: safeKs === 2 ? 2 : safeKs === 3 ? 2 : 3,
    rows: safeKs === 2 ? 2 : safeKs === 3 ? 2 : 2,
    timerMax: safeKs === 2 ? 15 : safeKs === 3 ? 12 : 8,
    maxShields: safeKs === 2 ? 5 : safeKs === 3 ? 4 : 3,
    maxQuestions: safeKs === 2 ? 10 : safeKs === 3 ? 15 : 20,
  }), [safeKs]);

  // Game state
  const [phase, setPhase] = useState('select'); // select | playing | gameover
  const [selectedTable, setSelectedTable] = useState(null);
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(config.maxShields);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(0);
  const [shipX, setShipX] = useState(0);
  const [lasers, setLasers] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [flashMap, setFlashMap] = useState({});
  const [gameOverData, setGameOverData] = useState(null);
  const [enemies, setEnemies] = useState([]);
  const questionsAnswered = useRef(0);
  const laserIdCounter = useRef(0);
  const explosionIdCounter = useRef(0);

  // Build enemy positions when question changes
  const buildEnemies = useCallback((q) => {
    if (!q) return [];
    const { cols, rows } = config;
    const totalSlots = cols * rows;
    // We have 4 options (1 correct + 3 wrong)
    const answers = q.options.slice(0, Math.min(totalSlots, q.options.length));

    const spacing = 5.5;
    const rowSpacing = 3.5;
    const startX = -((cols - 1) * spacing) / 2;
    const startY = 4.5;

    const result = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= answers.length) break;
        result.push({
          id: `e-${idx}-${Date.now()}`,
          pos: [startX + c * spacing, startY - r * rowSpacing, 0],
          number: answers[idx],
          isCorrect: answers[idx] === q.answer,
        });
      }
    }
    return result;
  }, [config]);

  // Start game
  const startGame = useCallback((table) => {
    setSelectedTable(table);
    setScore(0);
    setShields(config.maxShields);
    setStreak(0);
    setTimer(0);
    setLasers([]);
    setExplosions([]);
    setFlashMap({});
    questionsAnswered.current = 0;
    const q = generateQuestion(table);
    setQuestion(q);
    setEnemies(buildEnemies(q));
    setPhase('playing');
  }, [config, buildEnemies]);

  // Rebuild enemies when question changes
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    setEnemies(buildEnemies(question));
  }, [question, phase, buildEnemies]);

  // Next question
  const nextQuestion = useCallback(() => {
    if (!selectedTable) return;
    const q = generateQuestion(selectedTable);
    setQuestion(q);
    setTimer(0);
    setFlashMap({});
  }, [selectedTable]);

  // Handle enemy click
  const handleEnemyClick = useCallback((enemyId, isCorrect) => {
    if (phase !== 'playing') return;

    // Find enemy position for laser
    const enemy = enemies.find(e => e.id === enemyId);
    if (!enemy) return;

    // Fire laser
    const laserId = `laser-${laserIdCounter.current++}`;
    setLasers(prev => [...prev, { id: laserId, from: [shipX, -6, 0], to: enemy.pos }]);

    // Move ship toward enemy x
    setShipX(enemy.pos[0] * 0.5);

    if (isCorrect) {
      // Flash green
      setFlashMap(prev => ({ ...prev, [enemyId]: 'correct' }));
      // Explosion after laser
      setTimeout(() => {
        const expId = `exp-${explosionIdCounter.current++}`;
        setExplosions(prev => [...prev, { id: expId, pos: enemy.pos }]);
        setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== expId)), 600);
      }, 120);

      setScore(s => s + 1);
      setStreak(s => s + 1);
      questionsAnswered.current += 1;

      if (questionsAnswered.current >= config.maxQuestions) {
        setTimeout(() => {
          const rank = getRank(score + 1);
          setGameOverData({ score: score + 1, rank, isVictory: true });
          setPhase('gameover');
          onTaskComplete?.({ xp: (score + 1) * 20, coins: (score + 1) * 5 });
        }, 300);
      } else {
        setTimeout(() => nextQuestion(), 400);
      }
    } else {
      // Flash red
      setFlashMap(prev => ({ ...prev, [enemyId]: 'wrong' }));
      setTimeout(() => setFlashMap(prev => { const n = { ...prev }; delete n[enemyId]; return n; }), 400);

      setStreak(0);
      setShields(sh => {
        const next = sh - 1;
        if (next <= 0) {
          setTimeout(() => {
            const rank = getRank(score);
            setGameOverData({ score, rank, isVictory: false });
            setPhase('gameover');
          }, 200);
        }
        return Math.max(0, next);
      });
    }
  }, [phase, enemies, shipX, score, config.maxQuestions, nextQuestion, onTaskComplete]);

  // Wire onClick into enemies
  const enemiesWithClick = useMemo(() => {
    return enemies.map(e => ({
      ...e,
      onClick: (event) => {
        event?.stopPropagation?.();
        handleEnemyClick(e.id, e.isCorrect);
      },
    }));
  }, [enemies, handleEnemyClick]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const iv = setInterval(() => {
      setTimer(t => {
        const next = t + 0.1;
        if (next >= config.timerMax) {
          // Time's up — lose a shield, next question
          setShields(sh => {
            const nextSh = sh - 1;
            if (nextSh <= 0) {
              setTimeout(() => {
                const rank = getRank(score);
                setGameOverData({ score, rank, isVictory: false });
                setPhase('gameover');
              }, 100);
            }
            return Math.max(0, nextSh);
          });
          questionsAnswered.current += 1;
          if (questionsAnswered.current >= config.maxQuestions) {
            setTimeout(() => {
              const rank = getRank(score);
              setGameOverData({ score, rank, isVictory: true });
              setPhase('gameover');
              onTaskComplete?.({ xp: score * 20, coins: score * 5 });
            }, 100);
          } else {
            nextQuestion();
          }
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [phase, config.timerMax, config.maxQuestions, score, nextQuestion, onTaskComplete]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { setShipX(x => Math.max(x - 0.6, -8)); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setShipX(x => Math.min(x + 0.6, 8)); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Laser cleanup
  const handleLaserDone = useCallback((id) => {
    setLasers(prev => prev.filter(l => l.id !== id));
  }, []);

  const rank = getRank(score);

  // Auto-start for KS3/KS4
  useEffect(() => {
    if (safeKs > 2 && phase === 'select') {
      const randomTable = TABLES[Math.floor(Math.random() * TABLES.length)];
      startGame(randomTable);
    }
  }, [safeKs, phase, startGame]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0e1a', overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 20], fov: 50, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        gl={{ antialias: true, alpha: false }}
        dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
      >
        {phase === 'playing' && question && (
          <GameScene
            enemies={enemiesWithClick}
            shipX={shipX}
            lasers={lasers}
            explosions={explosions}
            onLaserDone={handleLaserDone}
            flashMap={flashMap}
          />
        )}
      </Canvas>

      {/* HTML number labels on top of aliens */}
      {phase === 'playing' && (
        <NumberOverlay enemies={enemies} containerRef={containerRef} />
      )}

      {/* HUD overlay */}
      {phase === 'playing' && question && (
        <HUDOverlay
          score={score}
          shields={shields}
          maxShields={config.maxShields}
          timer={timer}
          timerMax={config.timerMax}
          streak={streak}
          question={question}
          rank={rank}
        />
      )}

      {/* Table selector */}
      {phase === 'select' && safeKs === 2 && <TableSelector onSelect={startGame} />}

      {/* Game over */}
      {phase === 'gameover' && gameOverData && (
        <GameOverScreen
          score={gameOverData.score}
          rank={gameOverData.rank}
          isVictory={gameOverData.isVictory}
          onRestart={() => startGame(selectedTable)}
          onExit={() => onSimulationComplete?.()}
        />
      )}
    </div>
  );
}
