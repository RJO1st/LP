/**
 * LaunchPard — Curriculum Expansion Module
 * src/lib/curriculumExpansion.js
 *
 * Adds:
 * - US Common Core maths/english mapping
 * - Australian Curriculum alignment
 * - Science, Geography, History subject generators
 * - Curriculum-aware localisation
 */

import { localise } from './gamificationEngine';

// ── Grade/Year equivalence mapping ────────────────────────────────
export const GRADE_MAP = {
  uk_11plus:      { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 },
  uk_national:    { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9 },
  us_common_core: { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 }, // Grade = Year
  aus_acara:      { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 },
  ib_pyp:         { 1:1, 2:2, 3:3, 4:4, 5:5 },
  ib_myp:         { 1:1, 2:2, 3:3, 4:4, 5:5 },
  ng_primary:     { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 },
  ng_jss:         { 1:1, 2:2, 3:3 },    // JSS 1-3, maps to UK Y7-9 difficulty
  ng_sss:         { 1:4, 2:5, 3:6 },    // SS 1-3, maps to UK Y10-12 equiv difficulty
  // Legacy aliases — resolve to canonical keys
  australian:     { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6 },
  waec:           { 1:1, 2:2, 3:3 },  // maps to ng_sss year_level convention
};

// Normalise any grade to a 1-6 UK-equivalent difficulty level
export const normaliseDifficulty = (grade, curriculum) => {
  const map = GRADE_MAP[curriculum] || GRADE_MAP.uk_11plus;
  return map[grade] || Math.min(6, Math.max(1, grade));
};

// ── SCIENCE GENERATOR ─────────────────────────────────────────────
const SCIENCE_TOPICS = {
  1: [
    { q:"What do plants need to grow?", opts:["Light, water and soil","Just water","Only sunlight","Just soil"], a:0, exp:"Plants need light for photosynthesis, water for nutrients, and soil to anchor roots and provide minerals." },
    { q:"Which of these is a living thing?", opts:["A flower","A rock","Water","A cloud"], a:0, exp:"Plants are living things — they grow, reproduce, and need food and water. Rocks, water, and clouds are non-living." },
    { q:"What do we use our eyes for?", opts:["To see","To hear","To smell","To taste"], a:0, exp:"Eyes are our sense organs for sight. Ears hear, noses smell, and tongues taste." },
    { q:"Which animal lays eggs?", opts:["A chicken","A dog","A cat","A rabbit"], a:0, exp:"Chickens (birds) lay eggs. Dogs, cats, and rabbits give birth to live young — they are mammals." },
  ],
  2: [
    { q:"What state of matter is ice?", opts:["Solid","Liquid","Gas","Plasma"], a:0, exp:"Ice is frozen water — a solid. When it melts it becomes liquid water; when it evaporates it becomes water vapour (gas)." },
    { q:"What happens when you heat water to 100°C?", opts:["It boils and turns to steam","It freezes","It stays the same","It turns to ice"], a:0, exp:"Water boils at 100°C, turning into steam (water vapour gas). This is evaporation at boiling point." },
    { q:"Which force pulls objects towards the Earth?", opts:["Gravity","Magnetism","Friction","Air resistance"], a:0, exp:"Gravity is the force of attraction between masses. Earth's gravity pulls objects downward." },
    { q:"Which material is a good electrical conductor?", opts:["Copper","Wood","Plastic","Rubber"], a:0, exp:"Copper is an excellent electrical conductor — used in wires. Wood, plastic, and rubber are insulators." },
  ],
  3: [
    { q:"What is the function of the lungs?", opts:["To take in oxygen and release carbon dioxide","To pump blood","To digest food","To filter waste"], a:0, exp:"Lungs exchange gases: oxygen from the air enters the blood; carbon dioxide from the blood is breathed out." },
    { q:"What type of rock is formed from cooled magma?", opts:["Igneous","Sedimentary","Metamorphic","Limestone"], a:0, exp:"Igneous rock forms when molten magma cools and solidifies. Examples include granite and basalt." },
    { q:"What is photosynthesis?", opts:["Plants making food using light, water and CO₂","Animals eating plants","Water evaporating","Rocks forming"], a:0, exp:"Photosynthesis: plants absorb sunlight, water, and carbon dioxide to make glucose (food) and oxygen." },
    { q:"Which part of the plant absorbs water from the soil?", opts:["Roots","Leaves","Stem","Flowers"], a:0, exp:"Roots anchor the plant and absorb water and dissolved minerals from the soil." },
  ],
  4: [
    { q:"What is the unit of electrical current?", opts:["Ampere (A)","Volt (V)","Watt (W)","Ohm (Ω)"], a:0, exp:"Electrical current is measured in Amperes (amps, A). Voltage is in volts, power in watts, resistance in ohms." },
    { q:"What is the process by which water vapour becomes liquid?", opts:["Condensation","Evaporation","Precipitation","Transpiration"], a:0, exp:"Condensation: water vapour cools and turns back into liquid water. This is how clouds and dew form." },
    { q:"Which planet is closest to the Sun?", opts:["Mercury","Venus","Earth","Mars"], a:0, exp:"Mercury is the first and smallest planet, orbiting closest to the Sun with a year of just 88 Earth days." },
    { q:"What is the chemical formula for water?", opts:["H₂O","CO₂","NaCl","O₂"], a:0, exp:"Water (H₂O) has two hydrogen atoms bonded to one oxygen atom. CO₂ is carbon dioxide, NaCl is salt." },
  ],
  5: [
    { q:"What is Newton's First Law of Motion?", opts:["An object stays at rest or in uniform motion unless acted on by a force","Every action has an equal and opposite reaction","Force equals mass times acceleration","Objects attract each other"], a:0, exp:"Newton's 1st Law (Law of Inertia): objects resist changes to their motion. A force is needed to start, stop, or change direction." },
    { q:"What carries oxygen around the body?", opts:["Red blood cells","White blood cells","Platelets","Plasma"], a:0, exp:"Red blood cells contain haemoglobin, which binds to oxygen in the lungs and carries it to cells around the body." },
    { q:"What is the speed of light?", opts:["300,000 km/s","150,000 km/s","3,000 km/s","30,000 km/s"], a:0, exp:"Light travels at approximately 299,792 km/s (often rounded to 300,000 km/s) in a vacuum — the fastest speed in the universe." },
    { q:"What type of energy does a moving object have?", opts:["Kinetic energy","Potential energy","Chemical energy","Thermal energy"], a:0, exp:"Moving objects have kinetic energy (KE = ½mv²). Stored energy due to position is potential energy." },
  ],
  6: [
    { q:"What is the charge of an electron?", opts:["Negative","Positive","Neutral","It varies"], a:0, exp:"Electrons have a negative charge. Protons are positive, neutrons are neutral. Opposite charges attract." },
    { q:"What is the process by which plants lose water through their leaves?", opts:["Transpiration","Photosynthesis","Respiration","Osmosis"], a:0, exp:"Transpiration: water evaporates through tiny pores (stomata) in leaves, pulling water up from the roots." },
    { q:"Which law states that pressure and volume of a gas are inversely proportional (at constant temperature)?", opts:["Boyle's Law","Newton's Law","Ohm's Law","Hooke's Law"], a:0, exp:"Boyle's Law: P×V = constant (at fixed temperature). Double the pressure → half the volume." },
    { q:"What is DNA?", opts:["A molecule that carries genetic information","A type of protein","A carbohydrate","A form of energy"], a:0, exp:"DNA (deoxyribonucleic acid) is the molecule in the nucleus of cells that carries genetic instructions for growth, function, and reproduction." },
  ],
};

const GEOGRAPHY_TOPICS = {
  1: [
    { q:"What is the capital city of England?", opts:["London","Manchester","Birmingham","Leeds"], a:0, exp:"London is the capital city and largest city of England and the United Kingdom, located on the River Thames." },
    { q:"What do we call the imaginary line around the middle of the Earth?", opts:["The Equator","The Prime Meridian","The Tropic of Cancer","The Arctic Circle"], a:0, exp:"The Equator is an imaginary circle at 0° latitude, dividing Earth into Northern and Southern hemispheres." },
    { q:"Which is the largest ocean?", opts:["Pacific","Atlantic","Indian","Arctic"], a:0, exp:"The Pacific Ocean is the world's largest and deepest ocean, covering about 46% of Earth's water surface." },
  ],
  4: [
    { q:"What causes the four seasons?", opts:["Earth's tilt on its axis as it orbits the Sun","The distance from the Sun changing","The Moon's position","Clouds blocking sunlight"], a:0, exp:"Earth is tilted at 23.5°. As it orbits the Sun, different hemispheres receive more direct sunlight — creating seasons." },
    { q:"What is a watershed?", opts:["An area of land where water drains into a single river","A place where rivers meet the sea","A type of dam","A water treatment facility"], a:0, exp:"A watershed (or catchment area) is a region of land where all rainfall drains into the same river system." },
    { q:"Which type of map shows elevation using colour?", opts:["Choropleth/Physical map","Political map","Road map","Climate map"], a:0, exp:"Physical maps use colour gradients to show elevation — greens for low land, browns/whites for mountains." },
  ],
  6: [
    { q:"What is the greenhouse effect?", opts:["Gases in the atmosphere trapping heat from the Sun","Plants producing oxygen","The effect of forests on local climate","Ocean currents warming land"], a:0, exp:"Greenhouse gases (CO₂, methane) trap outgoing infrared radiation, warming Earth's surface — like a greenhouse roof." },
    { q:"What is urbanisation?", opts:["The growth of towns and cities as people move from rural areas","Building more farms","Deforestation","Coastal erosion"], a:0, exp:"Urbanisation is the process of more people living in urban areas. It's driven by migration from rural areas for jobs, education, and services." },
    { q:"Which tectonic feature forms at a divergent plate boundary?", opts:["Mid-ocean ridge","Mountain range","Subduction zone","Volcanic arc"], a:0, exp:"At divergent boundaries, plates move apart. Under oceans, magma rises to form mid-ocean ridges (e.g. Mid-Atlantic Ridge)." },
  ],
};

const HISTORY_TOPICS = {
  1: [
    { q:"Who was the first man to walk on the Moon?", opts:["Neil Armstrong","Buzz Aldrin","Yuri Gagarin","John Glenn"], a:0, exp:"Neil Armstrong became the first human to walk on the Moon on 21 July 1969, during NASA's Apollo 11 mission." },
    { q:"What did Florence Nightingale become famous for?", opts:["Improving nursing standards in hospitals","Discovering penicillin","Building the first hospital","Inventing the stethoscope"], a:0, exp:"Florence Nightingale revolutionised nursing during the Crimean War and established modern nursing as a profession." },
  ],
  4: [
    { q:"In what year did World War II end?", opts:["1945","1918","1939","1950"], a:0, exp:"World War II ended in 1945: VE Day (Victory in Europe) was May 8; VJ Day (Victory over Japan) was August 15, 1945." },
    { q:"What was the main cause of the Black Death?", opts:["A bacterial infection (Yersinia pestis) spread by fleas on rats","A viral pandemic","Poor water quality","A famine that weakened the population"], a:0, exp:"The Black Death was caused by the bacterium Yersinia pestis, transmitted by fleas that lived on rats. It killed up to 60% of Europe's population in the 14th century." },
    { q:"Which empire built the Colosseum in Rome?", opts:["The Roman Empire","The Greek Empire","The Byzantine Empire","The Ottoman Empire"], a:0, exp:"The Colosseum was built by the Roman Empire, completed around 80 AD under Emperor Titus. It could hold 50,000–80,000 spectators." },
  ],
  6: [
    { q:"What was the Magna Carta (1215)?", opts:["A document limiting the power of the king and establishing basic rights","A treaty ending a war","A map of England","A religious text"], a:0, exp:"Magna Carta (Great Charter) was signed by King John in 1215, establishing that the king was not above the law and granting basic rights — a foundation of modern democracy." },
    { q:"What was the Industrial Revolution?", opts:["A period of rapid industrial and technological growth (1760–1840)","A political revolution","A religious movement","A war between nations"], a:0, exp:"The Industrial Revolution (c.1760–1840) transformed manufacturing through steam power, factories, and new technologies, starting in Britain and spreading globally." },
    { q:"Who was Nelson Mandela?", opts:["Anti-apartheid activist who became South Africa's first Black president","A Kenyan independence leader","Prime Minister of Nigeria","A British colonial governor"], a:0, exp:"Nelson Mandela led the anti-apartheid movement in South Africa, was imprisoned for 27 years, and became South Africa's first Black president in 1994." },
  ],
};

// ── Public generators ─────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const shuffleTemplate = (t) => {
  const correct = t.opts[t.a];
  const shuffled = shuffle([...t.opts]);
  return { ...t, opts: shuffled, a: shuffled.indexOf(correct) };
};

export const generateLocalScience = (year, curriculum = 'uk_11plus') => {
  const diff = normaliseDifficulty(year, curriculum);
  const level = Math.min(6, Math.max(1, diff));
  // Find nearest pool
  const keys = Object.keys(SCIENCE_TOPICS).map(Number).sort();
  const nearest = keys.reduce((a, b) => Math.abs(b - level) < Math.abs(a - level) ? b : a);
  const q = shuffleTemplate(pick(SCIENCE_TOPICS[nearest]));
  const localised = localise(q.q, curriculum);
  return { ...q, q: localised, subject: 'science', topic: 'science', hints: ['Think about what you know from the natural world.'] };
};

export const generateLocalGeography = (year, curriculum = 'uk_11plus') => {
  const diff = normaliseDifficulty(year, curriculum);
  const level = Math.min(6, Math.max(1, diff));
  const keys = Object.keys(GEOGRAPHY_TOPICS).map(Number).sort();
  const nearest = keys.reduce((a, b) => Math.abs(b - level) < Math.abs(a - level) ? b : a);
  const q = shuffleTemplate(pick(GEOGRAPHY_TOPICS[nearest]));
  return { ...q, q: localise(q.q, curriculum), subject: 'geography', topic: 'geography', hints: ['Think about the world around you.'] };
};

export const generateLocalHistory = (year, curriculum = 'uk_11plus') => {
  const diff = normaliseDifficulty(year, curriculum);
  const level = Math.min(6, Math.max(1, diff));
  const keys = Object.keys(HISTORY_TOPICS).map(Number).sort();
  const nearest = keys.reduce((a, b) => Math.abs(b - level) < Math.abs(a - level) ? b : a);
  const q = shuffleTemplate(pick(HISTORY_TOPICS[nearest]));
  return { ...q, q: localise(q.q, curriculum), subject: 'history', topic: 'history', hints: ['Think about what happened in the past.'] };
};

// US Common Core maths — additional topics
export const US_COMMON_CORE_EXTRAS = {
  3: [
    { q:"What is 4 × 7?", opts:["28","24","32","21"], a:0, exp:"4 × 7 = 28. This is a Grade 3 multiplication fact to memorise.", topic:"multiplication" },
    { q:"What fraction of the shape is shaded if 3 out of 8 parts are shaded?", opts:["3/8","5/8","3/5","1/3"], a:0, exp:"3 out of 8 equal parts = 3/8. Numerator = shaded parts; denominator = total parts.", topic:"fractions" },
  ],
  4: [
    { q:"What is 1/2 + 1/4?", opts:["3/4","2/6","1/3","2/4"], a:0, exp:"To add fractions: find common denominator. 1/2 = 2/4, so 2/4 + 1/4 = 3/4.", topic:"fractions" },
    { q:"Round 4,567 to the nearest thousand.", opts:["5,000","4,000","4,600","4,570"], a:0, exp:"The thousands digit is 4; look at hundreds digit: 5 ≥ 5, so round up. 4,567 → 5,000.", topic:"rounding" },
  ],
  5: [
    { q:"What is 2.5 × 4?", opts:["10","8","12","9"], a:0, exp:"2.5 × 4: multiply 25 × 4 = 100, then place decimal: 10.0 = 10.", topic:"decimals" },
    { q:"What is 3/4 of 20?", opts:["15","12","18","10"], a:0, exp:"3/4 of 20: divide by 4 (=5), then multiply by 3 (=15).", topic:"fractions" },
  ],
};