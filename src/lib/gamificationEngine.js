// lib/gamificationEngine.js
import { getNigerianSubjectLabel, isNigerianCurriculum } from './nigerianCurriculumLabels.js';

export const BADGES = {
  first_quest:      { name: 'Launch Initiated',         icon: '🚀', tier: 'bronze', xp: 25,  coins: 5   },
  maths_bronze:     { name: 'Number Cadet',             icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  maths_silver:     { name: 'Calculation Commander',    icon: '🥈', tier: 'silver', xp: 150, coins: 30  },
  maths_gold:       { name: 'Maths Maestro',            icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  english_bronze:   { name: 'Word Cadet',               icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  english_silver:   { name: 'Grammar Guardian',         icon: '🥈', tier: 'silver', xp: 150, coins: 30  },
  english_gold:     { name: 'Grammar Guru',             icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  verbal_bronze:    { name: 'Puzzle Cadet',             icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  verbal_gold:      { name: 'Verbal Virtuoso',          icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  nvr_bronze:       { name: 'Shape Scout',              icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  nvr_gold:         { name: 'Pattern Pioneer',          icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  science_bronze:   { name: 'Science Scout',            icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  science_gold:     { name: 'Science Sage',             icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  geography_bronze: { name: 'Globe Trotter',            icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  geography_gold:   { name: 'Geography Genius',         icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  history_bronze:   { name: 'Time Traveler',            icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  history_gold:     { name: 'History Hero',             icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  streak_3:         { name: 'On Fire',                  icon: '🔥', tier: 'bronze', xp: 50,  coins: 10  },
  streak_7:         { name: 'Week Warrior',             icon: '🔥', tier: 'silver', xp: 150, coins: 30  },
  streak_30:        { name: 'Monthly Maverick',         icon: '🔥', tier: 'gold',   xp: 500, coins: 100 },
  accuracy_90:      { name: 'Sharp Shooter',            icon: '🎯', tier: 'silver', xp: 150, coins: 30  },
  accuracy_100:     { name: 'Perfect Mission',          icon: '⭐', tier: 'gold',   xp: 300, coins: 75  },
  speed_demon:      { name: 'Warp Speed',               icon: '⚡', tier: 'silver', xp: 150, coins: 30  },
  quest_master:     { name: 'Quest Master',             icon: '🏅', tier: 'gold',   xp: 400, coins: 90  },
};

export const TIER_COLORS = {
  bronze: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  glow: '#f59e0b' },
  silver: { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-300',  glow: '#94a3b8' },
  gold:   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', glow: '#eab308' },
};

export const AVATAR_ITEMS = {
  // ── BASE CHARACTERS (space suits with unique helmet designs) ───────────
  // First 3 are free starters, rest are coin-purchasable / badge-unlocked
  base_astronaut:  { name: 'Astronaut',  category: 'base', icon: '🚀', coinCost: 0,   rarity: 'common',    free: true,  description: 'Classic round helmet with breathing tube' },
  base_explorer:   { name: 'Explorer',   category: 'base', icon: '🧭', coinCost: 0,   rarity: 'common',    free: true,  description: 'Angular helmet with chin guard & side vents' },
  base_scientist:  { name: 'Scientist',  category: 'base', icon: '🔬', coinCost: 0,   rarity: 'common',    free: true,  description: 'Bulb helmet with oversized dome visor' },
  base_pilot:      { name: 'Pilot',      category: 'base', icon: '🛩️', coinCost: 100, rarity: 'rare',      description: 'Wide panoramic visor with large ear cups' },
  base_captain:    { name: 'Captain',    category: 'base', icon: '⚓', coinCost: 200, rarity: 'epic',      description: 'Commander helmet with side fins & crown gems' },
  base_ranger:     { name: 'Ranger',     category: 'base', icon: '🎯', coinCost: 300, rarity: 'epic',      description: 'Tactical helmet with antenna array & HUD bar' },
  base_guardian:   { name: 'Guardian',   category: 'base', icon: '🛡️', coinCost: 0,   rarity: 'legendary', badgeRequired: 'streak_14', description: 'Ornate helmet with twin antennae & jewels' },
  base_vanguard:   { name: 'Vanguard',   category: 'base', icon: '⚡', coinCost: 0,   rarity: 'legendary', badgeRequired: 'quest_master', description: 'Sleek teardrop helmet with centre ridge' },

  // ── FREE STARTER ITEMS (available to all scholars immediately) ──────────
  // Hats — free
  hat_beanie:          { name: 'Space Beanie',     category: 'hat',        icon: '🧶', coinCost: 0,   rarity: 'common', free: true },
  hat_headband:        { name: 'Star Headband',    category: 'hat',        icon: '🌠', coinCost: 0,   rarity: 'common', free: true },
  hat_cap:             { name: 'Explorer Cap',     category: 'hat',        icon: '🧢', coinCost: 0,   rarity: 'common', free: true },
  // Accessories — free
  accessory_sparkle:   { name: 'Sparkle Dust',     category: 'accessory',  icon: '✨', coinCost: 0,   rarity: 'common', free: true },
  accessory_orbit:     { name: 'Orbit Ring',       category: 'accessory',  icon: '🪐', coinCost: 0,   rarity: 'common', free: true },
  // Pets — free
  pet_star:            { name: 'Star Buddy',       category: 'pet',        icon: '⭐', coinCost: 0,   rarity: 'common', free: true },
  pet_moonling:        { name: 'Moonling',         category: 'pet',        icon: '🌙', coinCost: 0,   rarity: 'common', free: true },
  // Backgrounds — free
  background_nebula:   { name: 'Nebula Cloud',     category: 'background', icon: '☁️', coinCost: 0,   rarity: 'common', free: true },
  background_starfield:{ name: 'Starfield',        category: 'background', icon: '🌃', coinCost: 0,   rarity: 'common', free: true },
  // Skin tones — free (new category for true personalization)
  skin_light:          { name: 'Light',            category: 'skin',       icon: '🟡', coinCost: 0,   rarity: 'common', free: true },
  skin_medium_light:   { name: 'Medium Light',     category: 'skin',       icon: '🟠', coinCost: 0,   rarity: 'common', free: true },
  skin_medium:         { name: 'Medium',           category: 'skin',       icon: '🟤', coinCost: 0,   rarity: 'common', free: true },
  skin_medium_dark:    { name: 'Medium Dark',      category: 'skin',       icon: '🤎', coinCost: 0,   rarity: 'common', free: true },
  skin_dark:           { name: 'Dark',             category: 'skin',       icon: '🖤', coinCost: 0,   rarity: 'common', free: true },
  // Hair styles — free (new category)
  hair_short:          { name: 'Short',            category: 'hair',       icon: '💇', coinCost: 0,   rarity: 'common', free: true },
  hair_curly:          { name: 'Curly',            category: 'hair',       icon: '🌀', coinCost: 0,   rarity: 'common', free: true },
  hair_braids:         { name: 'Braids',           category: 'hair',       icon: '🎀', coinCost: 0,   rarity: 'common', free: true },
  hair_afro:           { name: 'Afro',             category: 'hair',       icon: '🦁', coinCost: 0,   rarity: 'common', free: true },
  hair_long:           { name: 'Long',             category: 'hair',       icon: '💆', coinCost: 0,   rarity: 'common', free: true },
  hair_mohawk:         { name: 'Mohawk',           category: 'hair',       icon: '🦔', coinCost: 0,   rarity: 'common', free: true },
  hair_ponytail:       { name: 'Ponytail',         category: 'hair',       icon: '👩‍🦰', coinCost: 0,   rarity: 'common', free: true },
  hair_bun:            { name: 'Bun',              category: 'hair',       icon: '🧘', coinCost: 0,   rarity: 'common', free: true },
  hair_dreadlocks:     { name: 'Dreadlocks',       category: 'hair',       icon: '🧑‍🦱', coinCost: 0,   rarity: 'common', free: true },
  hair_pixie:          { name: 'Pixie Cut',        category: 'hair',       icon: '💇', coinCost: 0,   rarity: 'common', free: true },
  hair_wavy:           { name: 'Wavy',             category: 'hair',       icon: '🌊', coinCost: 0,   rarity: 'common', free: true },
  hair_cornrows:       { name: 'Cornrows',         category: 'hair',       icon: '👩‍🦣', coinCost: 0,   rarity: 'common', free: true },
  hair_twists:         { name: 'Twists',           category: 'hair',       icon: '🧬', coinCost: 0,   rarity: 'common', free: true },
  hair_bob:            { name: 'Bob',              category: 'hair',       icon: '💇‍♀️', coinCost: 0,   rarity: 'common', free: true },
  hair_spiky:          { name: 'Spiky',            category: 'hair',       icon: '⚡', coinCost: 0,   rarity: 'common', free: true },
  hair_bangs:          { name: 'Bangs',            category: 'hair',       icon: '👨‍🦰', coinCost: 0,   rarity: 'common', free: true },
  // Expression — free (new category)
  expression_happy:    { name: 'Happy',            category: 'expression', icon: '😊', coinCost: 0,   rarity: 'common', free: true },
  expression_cool:     { name: 'Cool',             category: 'expression', icon: '😎', coinCost: 0,   rarity: 'common', free: true },
  expression_focused:  { name: 'Focused',          category: 'expression', icon: '🤔', coinCost: 0,   rarity: 'common', free: true },
  expression_excited:  { name: 'Excited',          category: 'expression', icon: '🤩', coinCost: 0,   rarity: 'common', free: true },
  expression_sleepy:   { name: 'Sleepy',           category: 'expression', icon: '😴', coinCost: 0,   rarity: 'common', free: true },
  expression_surprised: { name: 'Surprised',       category: 'expression', icon: '😲', coinCost: 0,   rarity: 'common', free: true },
  expression_determined: { name: 'Determined',     category: 'expression', icon: '😤', coinCost: 0,   rarity: 'common', free: true },
  expression_laughing: { name: 'Laughing',         category: 'expression', icon: '😂', coinCost: 0,   rarity: 'common', free: true },
  expression_wink:     { name: 'Wink',             category: 'expression', icon: '😉', coinCost: 0,   rarity: 'common', free: true },
  expression_thinking: { name: 'Thinking',         category: 'expression', icon: '🤔', coinCost: 0,   rarity: 'common', free: true },

  // ── COIN-PURCHASABLE ITEMS ─────────────────────────────────────────────
  hat_wizard:          { name: 'Wizard Hat',       category: 'hat',        icon: '🧙', coinCost: 50,  rarity: 'rare'      },
  hat_detective:       { name: 'Detective Hat',    category: 'hat',        icon: '🕵️', coinCost: 75,  rarity: 'rare'      },
  hat_cowboy:          { name: 'Cowboy Hat',       category: 'hat',        icon: '🤠', coinCost: 60,  rarity: 'common'    },
  hat_pirate:          { name: 'Pirate Hat',       category: 'hat',        icon: '🏴‍☠️', coinCost: 70,  rarity: 'rare'      },
  hat_viking:          { name: 'Viking Helm',      category: 'hat',        icon: '⚔️', coinCost: 80,  rarity: 'rare'      },
  hat_tiara:           { name: 'Cosmic Tiara',     category: 'hat',        icon: '✨', coinCost: 50,  rarity: 'rare'      },
  hat_ninja:           { name: 'Ninja Headband',   category: 'hat',        icon: '🥋', coinCost: 60,  rarity: 'common'    },
  hat_chef:            { name: 'Chef\'s Hat',      category: 'hat',        icon: '👨‍🍳', coinCost: 40,  rarity: 'common'    },
  hat_construction:    { name: 'Hard Hat',         category: 'hat',        icon: '🧑‍🔧', coinCost: 45,  rarity: 'common'    },
  hat_santa:           { name: 'Holiday Hat',      category: 'hat',        icon: '🎅', coinCost: 100, rarity: 'epic'      },
  hat_bunny_ears:      { name: 'Bunny Ears',       category: 'hat',        icon: '🐰', coinCost: 55,  rarity: 'rare'      },
  hat_flowers:         { name: 'Flower Crown',     category: 'hat',        icon: '🌸', coinCost: 70,  rarity: 'rare'      },
  hat_mohawk_helmet:   { name: 'Punk Helmet',      category: 'hat',        icon: '🎸', coinCost: 80,  rarity: 'rare'      },
  hat_propeller:       { name: 'Propeller Cap',    category: 'hat',        icon: '🚁', coinCost: 90,  rarity: 'epic'      },
  hat_space_crown:     { name: 'Space Crown',      category: 'hat',        icon: '🌠', coinCost: 200, rarity: 'epic'      },
  hat_halo:            { name: 'Star Halo',        category: 'hat',        icon: '⭐', coinCost: 150, rarity: 'epic'      },
  hat_fedora:          { name: 'Fedora',           category: 'hat',        icon: '🎩', coinCost: 65,  rarity: 'rare'      },
  hat_beret:           { name: 'Artist Beret',     category: 'hat',        icon: '🎨', coinCost: 55,  rarity: 'common'    },
  hat_turban:          { name: 'Turban',           category: 'hat',        icon: '🧣', coinCost: 0,   rarity: 'common', free: true },
  hat_hijab:           { name: 'Hijab',            category: 'hat',        icon: '🧕', coinCost: 0,   rarity: 'common', free: true },
  hat_afro_puff:       { name: 'Afro Puff',        category: 'hat',        icon: '👩‍🦱', coinCost: 0,   rarity: 'common', free: true },
  hat_robot_antenna:   { name: 'Robot Antenna',    category: 'hat',        icon: '🤖', coinCost: 0,   badgeRequired: 'maths_gold', rarity: 'legendary' },
  hat_phoenix_crown:   { name: 'Phoenix Crown',    category: 'hat',        icon: '🔥', coinCost: 0,   badgeRequired: 'streak_30', rarity: 'legendary' },
  accessory_stars:     { name: 'Star Aura',        category: 'accessory',  icon: '🌟', coinCost: 100, rarity: 'epic'      },
  accessory_lightning: { name: 'Lightning Bolt',   category: 'accessory',  icon: '⚡', coinCost: 120, rarity: 'epic'      },
  accessory_crystal:   { name: 'Crystal Aura',     category: 'accessory',  icon: '💎', coinCost: 80,  rarity: 'rare'      },
  accessory_comet:     { name: 'Comet Trail',      category: 'accessory',  icon: '☄️', coinCost: 90,  rarity: 'rare'      },
  accessory_shield:    { name: 'Energy Shield',    category: 'accessory',  icon: '🛡️', coinCost: 100, rarity: 'rare'      },
  accessory_jetpack:   { name: 'Jetpack',          category: 'accessory',  icon: '🚀', coinCost: 250, rarity: 'epic'      },
  accessory_music_notes: { name: 'Music Notes',    category: 'accessory',  icon: '🎵', coinCost: 80,  rarity: 'rare'      },
  accessory_butterflies: { name: 'Space Butterflies', category: 'accessory', icon: '🦋', coinCost: 120, rarity: 'epic'      },
  accessory_snowflakes: { name: 'Snowflakes',      category: 'accessory',  icon: '❄️', coinCost: 90,  rarity: 'rare'      },
  accessory_hearts:    { name: 'Heart Aura',       category: 'accessory',  icon: '❤️', coinCost: 60,  rarity: 'common'    },
  accessory_bubbles:   { name: 'Bubbles',          category: 'accessory',  icon: '🫧', coinCost: 70,  rarity: 'common'    },
  accessory_stardust:  { name: 'Stardust Trail',   category: 'accessory',  icon: '✨', coinCost: 110, rarity: 'epic'      },
  accessory_binary_code: { name: 'Binary Rain',    category: 'accessory',  icon: '💻', coinCost: 150, rarity: 'epic'      },
  accessory_geometric: { name: 'Geometric Shapes', category: 'accessory',  icon: '🔷', coinCost: 80,  rarity: 'rare'      },
  accessory_feathers:  { name: 'Cosmic Feathers',  category: 'accessory',  icon: '🪶', coinCost: 100, rarity: 'rare'      },
  accessory_portal:    { name: 'Portal Ring',      category: 'accessory',  icon: '🌀', coinCost: 300, rarity: 'legendary' },
  accessory_hologram:  { name: 'Hologram Effect',  category: 'accessory',  icon: '📡', coinCost: 200, rarity: 'epic'      },
  accessory_aurora_wings: { name: 'Aurora Wings',  category: 'accessory',  icon: '🌈', coinCost: 0,   badgeRequired: 'science_gold', rarity: 'legendary' },
  accessory_dark_matter: { name: 'Dark Matter Aura', category: 'accessory', icon: '⚫', coinCost: 0,   badgeRequired: 'accuracy_100', rarity: 'legendary' },
  pet_cat:             { name: 'Space Cat',        category: 'pet',        icon: '🐱', coinCost: 200, rarity: 'common'    },
  pet_alien:           { name: 'Alien Pal',        category: 'pet',        icon: '👽', coinCost: 500, rarity: 'epic'      },
  pet_rocket:          { name: 'Pet Rocket',       category: 'pet',        icon: '🚀', coinCost: 300, rarity: 'epic'      },
  pet_asteroid:        { name: 'Pet Asteroid',     category: 'pet',        icon: '🪨', coinCost: 150, rarity: 'common'    },
  pet_butterfly:       { name: 'Space Butterfly',  category: 'pet',        icon: '🦋', coinCost: 100, rarity: 'common'    },
  pet_jellyfish:       { name: 'Cosmic Jellyfish', category: 'pet',        icon: '🪼', coinCost: 150, rarity: 'rare'      },
  pet_fox:             { name: 'Star Fox',         category: 'pet',        icon: '🦊', coinCost: 200, rarity: 'rare'      },
  pet_penguin:         { name: 'Space Penguin',    category: 'pet',        icon: '🐧', coinCost: 120, rarity: 'common'    },
  pet_bunny:           { name: 'Moon Bunny',       category: 'pet',        icon: '🐇', coinCost: 130, rarity: 'common'    },
  pet_panda:           { name: 'Nebula Panda',     category: 'pet',        icon: '🐼', coinCost: 180, rarity: 'rare'      },
  pet_unicorn:         { name: 'Space Unicorn',    category: 'pet',        icon: '🦄', coinCost: 350, rarity: 'epic'      },
  pet_griffin:         { name: 'Cosmic Griffin',   category: 'pet',        icon: '🦅', coinCost: 400, rarity: 'epic'      },
  pet_turtle:          { name: 'Astro Turtle',     category: 'pet',        icon: '🐢', coinCost: 160, rarity: 'rare'      },
  pet_chameleon:       { name: 'Nebula Chameleon', category: 'pet',        icon: '🦎', coinCost: 200, rarity: 'rare'      },
  pet_wolf:            { name: 'Lunar Wolf',       category: 'pet',        icon: '🐺', coinCost: 0,   badgeRequired: 'streak_7', rarity: 'epic' },
  pet_serpent:         { name: 'Cosmic Serpent',   category: 'pet',        icon: '🐍', coinCost: 0,   badgeRequired: 'english_gold', rarity: 'legendary' },
  background_space:    { name: 'Deep Space',       category: 'background', icon: '🔭', coinCost: 150, rarity: 'rare'      },
  background_sunset:   { name: 'Sunset Sky',       category: 'background', icon: '🌅', coinCost: 100, rarity: 'common'    },
  background_ocean:    { name: 'Ocean Depths',     category: 'background', icon: '🌊', coinCost: 180, rarity: 'rare'      },
  background_aurora:   { name: 'Aurora Borealis',  category: 'background', icon: '🎆', coinCost: 200, rarity: 'epic'      },
  background_crystal_cave: { name: 'Crystal Cave',  category: 'background', icon: '💎', coinCost: 150, rarity: 'rare'      },
  background_volcanic: { name: 'Volcanic Planet',   category: 'background', icon: '🌋', coinCost: 200, rarity: 'epic'      },
  background_frozen:   { name: 'Ice World',         category: 'background', icon: '❄️', coinCost: 120, rarity: 'rare'      },
  background_jungle:   { name: 'Alien Jungle',      category: 'background', icon: '🌿', coinCost: 130, rarity: 'rare'      },
  background_desert:   { name: 'Mars Desert',       category: 'background', icon: '🏜️', coinCost: 100, rarity: 'common'    },
  background_cyberpunk: { name: 'Cyber City',       category: 'background', icon: '🌃', coinCost: 250, rarity: 'epic'      },
  background_underwater: { name: 'Deep Sea',        category: 'background', icon: '🌊', coinCost: 180, rarity: 'rare'      },
  background_cosmic_library: { name: 'Cosmic Library', category: 'background', icon: '📚', coinCost: 200, rarity: 'epic'      },
  background_black_hole: { name: 'Black Hole',      category: 'background', icon: '🕳️', coinCost: 300, rarity: 'legendary' },
  background_satellite: { name: 'Space Station',    category: 'background', icon: '🛰️', coinCost: 150, rarity: 'rare'      },
  background_meadow:   { name: 'Star Meadow',       category: 'background', icon: '🌼', coinCost: 80,  rarity: 'common'    },

  // ── BADGE-UNLOCKED ITEMS (achievement rewards) ─────────────────────────
  hat_crown:           { name: 'Crown',            category: 'hat',        icon: '👑', coinCost: 0,   badgeRequired: 'accuracy_100', rarity: 'legendary' },
  hat_astronaut:       { name: 'Astronaut Helmet', category: 'hat',        icon: '🪖', coinCost: 0,   badgeRequired: 'maths_silver', rarity: 'rare' },
  hat_graduation:      { name: 'Graduation Cap',   category: 'hat',        icon: '🎓', coinCost: 0,   badgeRequired: 'english_silver', rarity: 'rare' },
  accessory_flame:     { name: 'Flame Trail',      category: 'accessory',  icon: '🔥', coinCost: 0,   badgeRequired: 'streak_7', rarity: 'rare' },
  accessory_galaxy_wings: { name: 'Galaxy Wings',  category: 'accessory',  icon: '🦋', coinCost: 0,   badgeRequired: 'streak_30', rarity: 'legendary' },
  pet_robot:           { name: 'Robot Buddy',      category: 'pet',        icon: '🤖', coinCost: 0,   badgeRequired: 'maths_gold', rarity: 'legendary' },
  pet_owl:             { name: 'Owl Companion',    category: 'pet',        icon: '🦉', coinCost: 0,   badgeRequired: 'english_gold', rarity: 'legendary' },
  pet_dragon:          { name: 'Micro Dragon',     category: 'pet',        icon: '🐉', coinCost: 0,   badgeRequired: 'quest_master', rarity: 'legendary' },
  pet_phoenix:         { name: 'Phoenix',          category: 'pet',        icon: '🐦‍🔥', coinCost: 0,   badgeRequired: 'mastery_10_topics', rarity: 'legendary' },
  background_galaxy:   { name: 'Galaxy',           category: 'background', icon: '🌌', coinCost: 0,   badgeRequired: 'verbal_gold', rarity: 'legendary' },
  background_supernova:{ name: 'Supernova',        category: 'background', icon: '💥', coinCost: 0,   badgeRequired: 'science_gold', rarity: 'legendary' },
};

export const RARITY_COLORS = {
  common:    'text-slate-500',
  rare:      'text-blue-500',
  epic:      'text-purple-500',
  legendary: 'text-yellow-500',
};

// ─── CURRICULA ────────────────────────────────────────────────────────────────
// subjects field added so any component can call getCurriculumInfo(key).subjects
export const CURRICULA = {
  // UK - Two options
  uk_national: {
    name: 'UK National Curriculum', country: '🇬🇧', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], currency: '£', spelling: 'british',
    subjects: ['mathematics', 'english', 'science', 'history', 'geography', 'computing',
               'design_and_technology', 'religious_education'],
  },
  uk_11plus: {
    name: 'UK 11+', country: '🇬🇧', gradeLabel: 'Year',
    grades: [3, 4, 5, 6], currency: '£', spelling: 'british',
    subjects: ['mathematics', 'english', 'verbal_reasoning', 'nvr'],
  },
  // US
  us_common_core: {
    name: 'US Common Core', country: '🇺🇸', gradeLabel: 'Grade',
    grades: [1, 2, 3, 4, 5, 6, 7, 8], currency: '$', spelling: 'american',
    subjects: ['mathematics', 'english', 'science'],
  },
  // Australia
  aus_acara: {
    name: 'Australian Curriculum', country: '🇦🇺', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9], currency: 'A$', spelling: 'british',
    subjects: ['mathematics', 'english', 'science'],
  },
  // IB
  ib_pyp: {
    name: 'IB Primary Years (PYP)', country: '🌍', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5, 6], currency: '$', spelling: 'american',
    subjects: ['mathematics', 'english', 'science'],
  },
  ib_myp: {
    name: 'IB Middle Years (MYP)', country: '🌍', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5], currency: '$', spelling: 'american',
    subjects: ['mathematics', 'english', 'science'],
  },
  // Nigeria - Three stages
  ng_primary: {
    name: 'Nigerian Primary', country: '🇳🇬', gradeLabel: 'Primary',
    grades: [1, 2, 3, 4, 5, 6], currency: '₦', spelling: 'british',
    subjects: ['mathematics', 'english_studies', 'basic_science', 'social_studies',
               'civic_education', 'cultural_and_creative_arts', 'religious_studies'],
    alternateLabel: 'Basic'
  },
  ng_jss: {
    name: 'Nigerian JSS', country: '🇳🇬', gradeLabel: 'JSS',
    grades: [1, 2, 3], currency: '₦', spelling: 'british',
    subjects: ['mathematics', 'english_studies', 'basic_science', 'basic_technology', 'social_studies',
               'civic_education', 'business_education', 'cultural_and_creative_arts',
               'pre_vocational_studies', 'basic_digital_literacy', 'religious_studies', 'agricultural_science'],
    alternateLabel: 'Basic',
    alternateOffset: 6
  },
  ng_sss: {
    name: 'Nigerian SSS', country: '🇳🇬', gradeLabel: 'SS',
    grades: [1, 2, 3], currency: '₦', spelling: 'british',
    subjects: ['mathematics', 'english', 'physics', 'chemistry', 'biology',
               'civic_education', 'digital_technologies', 'economics', 'government', 'geography',
               'further_mathematics', 'accounting', 'agricultural_science'],
    exams: ['WAEC', 'NECO']
  },
  // Canada
  ca_primary: {
    name: 'Canadian Curriculum', country: '🇨🇦', gradeLabel: 'Grade',
    grades: [1, 2, 3, 4, 5, 6, 7, 8], currency: 'C$', spelling: 'british',
    subjects: ['mathematics', 'english', 'science', 'social_studies'],
  },
  ca_secondary: {
    name: 'Canadian Secondary', country: '🇨🇦', gradeLabel: 'Grade',
    grades: [9, 10, 11, 12], currency: 'C$', spelling: 'british',
    subjects: ['mathematics', 'english', 'science', 'canadian_history', 'geography',
               'physics', 'chemistry', 'biology', 'computer_science'],
  },
};

// Kept for backward-compat; derived from CURRICULA so always in sync
export const SUBJECTS_BY_CURRICULUM = Object.fromEntries(
  Object.entries(CURRICULA).map(([key, val]) => [key, val.subjects])
);

// ─── SUBJECT METADATA ─────────────────────────────────────────────────────────
export const SUBJECT_ICONS = {
  maths: '🔢', mathematics: '🔢', english: '📚', verbal: '🧩',
  nvr: '🎨', science: '🔬', geography: '🌍', history: '📜',
  physics: '⚛️', chemistry: '🧪', biology: '🧬',
  social_studies: '🌍', hass: '🌏', commerce: '💰',
  basic_technology: '🔧', financial_accounting: '📊',
  further_mathematics: '📐', economics: '📈', government: '🏛️',
  business_studies: '💼', basic_science: '🧪',
  // Nigerian canonical names
  english_studies: '📖', basic_science: '🔬', basic_technology: '🔧',
  civic_education: '🏛️', business_education: '💼',
  cultural_and_creative_arts: '🎨', pre_vocational_studies: '🛠️',
  basic_digital_literacy: '💻', religious_studies: '📿',
  agricultural_science: '🌱', digital_technologies: '💻',
  accounting: '📒', literature_in_english: '📖',
  verbal_reasoning: '🧩', non_verbal_reasoning: '🎨',
  // UK additional
  computing: '💻', design_and_technology: '⚙️', religious_education: '✝️', citizenship: '⚖️',
};

export const SUBJECT_COLORS = {
  maths:          { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  mathematics:    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  english:        { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  english_studies: { bg: 'bg-rose-50',   text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  verbal:         { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  verbal_reasoning: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',  dot: 'bg-purple-500'  },
  nvr:            { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  non_verbal_reasoning: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200',   dot: 'bg-teal-500'    },
  science:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  basic_science:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  agricultural_science: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', dot: 'bg-lime-500' },
  digital_technologies: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  accounting:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  literature_in_english: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  computing:      { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   dot: 'bg-slate-500'   },
  design_and_technology: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  religious_education: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  citizenship:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    },
  geography:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  history:        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  physics:        { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500'     },
  chemistry:      { bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200',    dot: 'bg-lime-500'    },
  biology:        { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   dot: 'bg-green-500'   },
  social_studies: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    },
  civic_education: { bg: 'bg-blue-50',   text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  business_education: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  cultural_and_creative_arts: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  pre_vocational_studies: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  basic_digital_literacy: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  religious_studies: { bg: 'bg-amber-50', text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  hass:           { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  commerce:          { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  basic_technology:  { bg: 'bg-stone-50',   text: 'text-stone-700',   border: 'border-stone-200',   dot: 'bg-stone-500'   },
  financial_accounting: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  further_mathematics: { bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  economics:         { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  government:        { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  business_studies:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  basic_science:     { bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200',    dot: 'bg-lime-500'    },
};

export const getLevelInfo = (totalXp) => {
  const XP_LEVELS = [
    { level: 1,  xp: 0,     title: 'Space Cadet'      },
    { level: 2,  xp: 500,   title: 'Cosmonaut'        },
    { level: 3,  xp: 1200,  title: 'Mission Pilot'    },
    { level: 4,  xp: 2500,  title: 'Star Navigator'   },
    { level: 5,  xp: 4500,  title: 'Orbit Commander'  },
    { level: 6,  xp: 7500,  title: 'Galaxy Explorer'  },
    { level: 7,  xp: 12000, title: 'Nebula Scout'     },
    { level: 8,  xp: 18000, title: 'Supernova Captain'},
    { level: 9,  xp: 26000, title: 'Black Hole Ranger'},
    { level: 10, xp: 36000, title: 'Universe Master'  },
  ];
  let current = XP_LEVELS[0];
  let next    = XP_LEVELS[1];
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (totalXp >= XP_LEVELS[i].xp) {
      current = XP_LEVELS[i];
      next    = XP_LEVELS[i + 1] || null;
    }
  }
  const progressXp  = next ? totalXp - current.xp : current.xp;
  const neededXp    = next ? next.xp - current.xp : 1;
  const progressPct = Math.min(100, Math.round((progressXp / neededXp) * 100));
  return { current, next, progressPct, progressXp, neededXp };
};

export const localise = (text, curriculum) => {
  // Add robust localisation based on the curriculum passed.
  // This is a placeholder since the full localise function wasn't in this file before.
  if(!text) return text;
  const isUS = curriculum === 'us_common_core';
  if(isUS){
      return text.replace(/maths/gi, "math").replace(/colour/gi, "color");
  }
  return text;
};

export const sounds = {
  correct:       () => {},
  wrong:         () => {},
  badgeEarned:   () => {},
  questComplete: () => {},
  toggle:        () => {},
};

export const ensureQuestsAssigned = async (scholarId) => {};

// ─── HELPER FUNCTIONS (used by student page, parent analytics, components) ────

/** Full curriculum definition; defaults to uk_11plus if key not found */
export const getCurriculumInfo = (key) => CURRICULA[key] ?? CURRICULA.uk_11plus;

/** Subject array for a curriculum */
export const getSubjectsForCurriculum = (key) =>
  (CURRICULA[key] ?? CURRICULA.uk_11plus).subjects;

/** Grades array for a curriculum */
export const getGradesForCurriculum = (key) =>
  (CURRICULA[key] ?? CURRICULA.uk_11plus).grades;

/** "Year 5" / "Grade 4" etc. formatted correctly for the curriculum */
export const formatGradeLabel = (grade, curriculum) => {
  const ci = getCurriculumInfo(curriculum);
  return `${ci.gradeLabel} ${grade}`;
};

/** Combined icon + Tailwind colour classes for a subject */
export const getSubjectMeta = (subject, curriculum = null) => {
  let label;
  if (curriculum && isNigerianCurriculum(curriculum)) {
    label = getNigerianSubjectLabel(subject, curriculum);
  } else {
    label = subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ');
  }
  return {
    label,
    icon:   SUBJECT_ICONS[subject] ?? '📚',
    ...(SUBJECT_COLORS[subject] ?? {
      bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400',
    }),
  };
};

export default {
  BADGES,
  TIER_COLORS,
  AVATAR_ITEMS,
  RARITY_COLORS,
  CURRICULA,
  SUBJECTS_BY_CURRICULUM,
  SUBJECT_ICONS,
  SUBJECT_COLORS,
  getCurriculumInfo,
  getSubjectsForCurriculum,
  getGradesForCurriculum,
  getLevelInfo,
  formatGradeLabel,
  getSubjectMeta,
  sounds,
  localise,
  ensureQuestsAssigned,
};