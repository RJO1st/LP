// ═══════════════════════════════════════════════════════════════════════════
// NIGERIAN SSS TARGETED QUESTION GENERATOR
// Generates 500+ questions per subject per year
// Run: node scripts/generateNigerianSSS.js
// ═══════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ═══════════════════════════════════════════════════════════════════════════
// MATHS QUESTIONS (500 per year)
// ═══════════════════════════════════════════════════════════════════════════

function generateMathsQuestions(year, count = 500) {
  const questions = [];
  const topics = ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics'];
  
  for (let i = 0; i < count; i++) {
    const topic = pick(topics);
    
    if (topic === 'algebra') {
      // Linear equations
      const a = rand(2, 20);
      const b = rand(1, 30);
      const c = rand(1, 50);
      questions.push({
        q: `Solve for x: ${a}x + ${b} = ${c}`,
        opts: shuffle([`${(c - b) / a}`, `${(c + b) / a}`, `${c - b}`, `${a + b}`]),
        a: 0,
        exp: `${a}x = ${c} - ${b} = ${c - b}, so x = ${(c - b) / a}`,
        topic: 'linear_equations',
        difficulty_tier: year === 1 ? 'foundation' : year === 2 ? 'intermediate' : 'advanced'
      });
      
      // Quadratic
      const coef = rand(1, 5);
      const root1 = rand(-10, 10);
      const root2 = rand(-10, 10);
      questions.push({
        q: `What are the roots of x² + ${root1 + root2}x + ${root1 * root2} = 0?`,
        opts: shuffle([`x = ${root1} or ${root2}`, `x = ${root1}`, `x = ${root2}`, `x = ${root1 * root2}`]),
        a: 0,
        exp: `Factor to (x - ${root1})(x - ${root2}) = 0`,
        topic: 'quadratic_equations',
        difficulty_tier: year >= 2 ? 'intermediate' : 'advanced'
      });
      
    } else if (topic === 'geometry') {
      const length = rand(5, 20);
      const width = rand(3, 15);
      questions.push({
        q: `Area of rectangle with length ${length}cm and width ${width}cm?`,
        opts: shuffle([`${length * width} cm²`, `${length + width} cm²`, `${length * 2} cm²`, `${width * 2} cm²`]),
        a: 0,
        exp: `Area = length × width = ${length} × ${width} = ${length * width} cm²`,
        topic: 'area',
        difficulty_tier: 'foundation'
      });
      
      const radius = rand(3, 15);
      const pi = 3.14159;
      const area = Math.round(pi * radius * radius * 100) / 100;
      questions.push({
        q: `Area of circle with radius ${radius}cm? (Use π ≈ 3.14)`,
        opts: shuffle([`${area} cm²`, `${radius * 2 * pi} cm²`, `${radius * radius} cm²`, `${pi * radius} cm²`]),
        a: 0,
        exp: `Area = πr² = 3.14 × ${radius}² = ${area} cm²`,
        topic: 'circles',
        difficulty_tier: 'intermediate'
      });
      
    } else if (topic === 'trigonometry') {
      const angle = pick([30, 45, 60, 90]);
      const sinValues = { 30: '0.5', 45: '0.707', 60: '0.866', 90: '1' };
      questions.push({
        q: `What is sin(${angle}°)?`,
        opts: shuffle([sinValues[angle], '0', '1', '0.5']),
        a: 0,
        exp: `sin(${angle}°) = ${sinValues[angle]}`,
        topic: 'trigonometry',
        difficulty_tier: year >= 2 ? 'intermediate' : 'advanced'
      });
      
    } else if (topic === 'statistics') {
      const numbers = [rand(10, 30), rand(10, 30), rand(10, 30), rand(10, 30), rand(10, 30)];
      const mean = Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
      questions.push({
        q: `Find the mean of: ${numbers.join(', ')}`,
        opts: shuffle([`${mean}`, `${mean + 5}`, `${mean - 5}`, `${numbers[0]}`]),
        a: 0,
        exp: `Mean = (${numbers.join(' + ')}) ÷ ${numbers.length} = ${mean}`,
        topic: 'mean',
        difficulty_tier: 'foundation'
      });
    }
  }
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGLISH QUESTIONS (300 per year)
// ═══════════════════════════════════════════════════════════════════════════

function generateEnglishQuestions(year, count = 300) {
  const questions = [];
  
  const passages = [
    { text: "The sun rises in the east and sets in the west.", theme: "nature" },
    { text: "Education is the key to success in life.", theme: "education" },
    { text: "Hard work and dedication lead to achievement.", theme: "motivation" }
  ];
  
  const grammar = [
    { rule: "past_tense", example: "walked", incorrect: ["walk", "walking", "walks"] },
    { rule: "plural", example: "children", incorrect: ["childs", "childrens", "child"] },
    { rule: "pronoun", example: "their", incorrect: ["there", "they're", "thier"] }
  ];
  
  for (let i = 0; i < count; i++) {
    const type = pick(['comprehension', 'grammar', 'vocabulary', 'essay']);
    
    if (type === 'comprehension') {
      const passage = pick(passages);
      questions.push({
        q: `Read: "${passage.text}" What is the main theme?`,
        opts: shuffle([passage.theme, 'history', 'science', 'mathematics']),
        a: 0,
        exp: `The passage discusses ${passage.theme}.`,
        topic: 'comprehension',
        difficulty_tier: year === 1 ? 'foundation' : 'intermediate'
      });
      
    } else if (type === 'grammar') {
      const rule = pick(grammar);
      questions.push({
        q: `Choose the correct form:`,
        opts: shuffle([rule.example, ...rule.incorrect]),
        a: 0,
        exp: `The correct form is "${rule.example}".`,
        topic: 'grammar',
        difficulty_tier: 'intermediate'
      });
      
    } else if (type === 'vocabulary') {
      const words = [
        { word: 'benevolent', meaning: 'kind and generous', wrong: ['cruel', 'angry', 'sad'] },
        { word: 'eloquent', meaning: 'fluent and persuasive', wrong: ['quiet', 'rude', 'silent'] },
        { word: 'diligent', meaning: 'hard-working', wrong: ['lazy', 'careless', 'slow'] }
      ];
      const w = pick(words);
      questions.push({
        q: `What does "${w.word}" mean?`,
        opts: shuffle([w.meaning, ...w.wrong]),
        a: 0,
        exp: `"${w.word}" means ${w.meaning}.`,
        topic: 'vocabulary',
        difficulty_tier: year >= 2 ? 'intermediate' : 'advanced'
      });
    }
  }
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICS QUESTIONS (500 per year)
// ═══════════════════════════════════════════════════════════════════════════

function generatePhysicsQuestions(year, count = 500) {
  const questions = [];
  
  for (let i = 0; i < count; i++) {
    const mass = rand(5, 100);
    const velocity = rand(2, 50);
    const force = rand(10, 200);
    const distance = rand(10, 1000);
    const time = rand(2, 60);
    
    // Forces and Motion
    questions.push(
      {
        q: 'What is the SI unit of force?',
        opts: shuffle(['Newton (N)', 'Joule (J)', 'Watt (W)', 'Pascal (Pa)']),
        a: 0,
        exp: 'The SI unit of force is the Newton (N).',
        topic: 'units',
        difficulty_tier: 'foundation'
      },
      {
        q: `Calculate momentum: mass ${mass}kg, velocity ${velocity}m/s`,
        opts: shuffle([`${mass * velocity} kg⋅m/s`, `${mass + velocity}`, `${mass / velocity}`, `${velocity - mass}`]),
        a: 0,
        exp: `p = mv = ${mass} × ${velocity} = ${mass * velocity} kg⋅m/s`,
        topic: 'momentum',
        difficulty_tier: 'intermediate'
      },
      {
        q: `Speed = distance ÷ time. Distance ${distance}m, time ${time}s. Speed?`,
        opts: shuffle([`${Math.round(distance / time)} m/s`, `${distance * time} m/s`, `${distance + time} m/s`, `${time - distance} m/s`]),
        a: 0,
        exp: `v = d/t = ${distance}/${time} = ${Math.round(distance / time)} m/s`,
        topic: 'speed',
        difficulty_tier: 'foundation'
      },
      {
        q: `Work = Force × Distance. Force ${force}N, distance ${distance}m. Work?`,
        opts: shuffle([`${force * distance} J`, `${force + distance} J`, `${force / distance} J`, `${distance - force} J`]),
        a: 0,
        exp: `W = Fd = ${force} × ${distance} = ${force * distance} J`,
        topic: 'work_energy',
        difficulty_tier: 'intermediate'
      },
      {
        q: 'Which Newton\'s law: "For every action, there is an equal and opposite reaction"?',
        opts: ['Third Law', 'First Law', 'Second Law', 'Fourth Law'],
        a: 0,
        exp: 'Newton\'s Third Law states action-reaction pairs.',
        topic: 'newton_laws',
        difficulty_tier: year >= 2 ? 'intermediate' : 'advanced'
      }
    );
  }
  
  return questions.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHEMISTRY QUESTIONS (500 per year)
// ═══════════════════════════════════════════════════════════════════════════

function generateChemistryQuestions(year, count = 500) {
  const questions = [];
  
  const elements = [
    ['H', 'Hydrogen', 1], ['C', 'Carbon', 6], ['N', 'Nitrogen', 7], ['O', 'Oxygen', 8],
    ['Na', 'Sodium', 11], ['Mg', 'Magnesium', 12], ['Al', 'Aluminium', 13], ['S', 'Sulfur', 16],
    ['Cl', 'Chlorine', 17], ['K', 'Potassium', 19], ['Ca', 'Calcium', 20], ['Fe', 'Iron', 26]
  ];
  
  for (let i = 0; i < count; i++) {
    const element = pick(elements);
    const pH = rand(0, 14);
    const moles = rand(1, 10);
    const molarMass = rand(20, 200);
    
    questions.push(
      {
        q: 'What is the chemical formula for water?',
        opts: ['H₂O', 'CO₂', 'H₂SO₄', 'NaCl'],
        a: 0,
        exp: 'Water is H₂O: 2 hydrogen atoms, 1 oxygen atom.',
        topic: 'compounds',
        difficulty_tier: 'foundation'
      },
      {
        q: `Element with symbol "${element[0]}"?`,
        opts: shuffle([element[1], pick(elements)[1], pick(elements)[1], pick(elements)[1]]),
        a: 0,
        exp: `${element[0]} is the symbol for ${element[1]}.`,
        topic: 'periodic_table',
        difficulty_tier: 'foundation'
      },
      {
        q: `Atomic number of ${element[1]}?`,
        opts: shuffle([`${element[2]}`, `${element[2] + 1}`, `${element[2] - 1}`, `${element[2] * 2}`]),
        a: 0,
        exp: `${element[1]} has atomic number ${element[2]}.`,
        topic: 'atomic_structure',
        difficulty_tier: 'intermediate'
      },
      {
        q: `pH ${pH}: acidic, neutral, or basic?`,
        opts: shuffle([
          pH < 7 ? 'Acidic' : pH === 7 ? 'Neutral' : 'Basic',
          'Unknown',
          pH < 7 ? 'Basic' : 'Acidic',
          'Neutral'
        ]),
        a: 0,
        exp: `pH < 7 = acidic, pH 7 = neutral, pH > 7 = basic. pH ${pH} is ${pH < 7 ? 'acidic' : pH === 7 ? 'neutral' : 'basic'}.`,
        topic: 'acids_bases',
        difficulty_tier: 'intermediate'
      },
      {
        q: `Mass = moles × molar mass. ${moles} moles, molar mass ${molarMass}g/mol. Mass?`,
        opts: shuffle([`${moles * molarMass}g`, `${moles + molarMass}g`, `${molarMass / moles}g`, `${moles}g`]),
        a: 0,
        exp: `m = n × M = ${moles} × ${molarMass} = ${moles * molarMass}g`,
        topic: 'mole_concept',
        difficulty_tier: year >= 2 ? 'intermediate' : 'advanced'
      }
    );
  }
  
  return questions.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOLOGY QUESTIONS (500 per year)
// ═══════════════════════════════════════════════════════════════════════════

function generateBiologyQuestions(year, count = 500) {
  const questions = [];
  
  const organelles = ['Mitochondria', 'Nucleus', 'Ribosome', 'Chloroplast', 'Golgi apparatus'];
  const systems = ['Digestive', 'Respiratory', 'Circulatory', 'Nervous', 'Skeletal', 'Muscular'];
  
  for (let i = 0; i < count; i++) {
    questions.push(
      {
        q: 'What is the powerhouse of the cell?',
        opts: shuffle(['Mitochondria', 'Nucleus', 'Ribosome', 'Vacuole']),
        a: 0,
        exp: 'Mitochondria produce ATP energy for the cell.',
        topic: 'cell_biology',
        difficulty_tier: 'foundation'
      },
      {
        q: 'Process plants use to make food?',
        opts: ['Photosynthesis', 'Respiration', 'Transpiration', 'Digestion'],
        a: 0,
        exp: 'Photosynthesis converts light energy into glucose.',
        topic: 'plant_biology',
        difficulty_tier: 'foundation'
      },
      {
        q: 'How many chambers in the human heart?',
        opts: ['4', '2', '3', '5'],
        a: 0,
        exp: 'The heart has 4 chambers: 2 atria and 2 ventricles.',
        topic: 'circulatory_system',
        difficulty_tier: 'intermediate'
      },
      {
        q: `Which organelle controls the cell?`,
        opts: shuffle(['Nucleus', ...organelles.filter(o => o !== 'Nucleus').slice(0, 3)]),
        a: 0,
        exp: 'The nucleus controls cellular activities and contains DNA.',
        topic: 'cell_structure',
        difficulty_tier: 'foundation'
      },
      {
        q: 'What is DNA?',
        opts: shuffle(['Genetic material', 'Protein', 'Carbohydrate', 'Lipid']),
        a: 0,
        exp: 'DNA (deoxyribonucleic acid) is the genetic material.',
        topic: 'genetics',
        difficulty_tier: 'intermediate'
      },
      {
        q: `The ${pick(systems)} system is responsible for?`,
        opts: shuffle(['Body function', 'Movement', 'Breathing', 'Digestion']),
        a: 0,
        exp: `The ${pick(systems)} system performs essential body functions.`,
        topic: 'body_systems',
        difficulty_tier: year >= 2 ? 'intermediate' : 'advanced'
      }
    );
  }
  
  return questions.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

async function generateNigerianSSS() {
  console.log('🇳🇬 Generating Nigerian SSS questions...\n');
  
  const subjects = {
    maths: { generator: generateMathsQuestions, count: 500 },
    english: { generator: generateEnglishQuestions, count: 300 },
    physics: { generator: generatePhysicsQuestions, count: 500 },
    chemistry: { generator: generateChemistryQuestions, count: 500 },
    biology: { generator: generateBiologyQuestions, count: 500 }
  };
  
  let totalGenerated = 0;
  const insertBatch = [];
  
  for (let year = 1; year <= 3; year++) {
    console.log(`📚 SS ${year}...`);
    
    for (const [subject, config] of Object.entries(subjects)) {
      const questions = config.generator(year, config.count);
      
      for (const q of questions) {
        insertBatch.push({
          curriculum: 'ng_sss',
          subject,
          year_level: year,
          difficulty_tier: q.difficulty_tier,
          question_data: {
            q: q.q,
            opts: q.opts.slice(0, 4),
            a: 0,
            exp: q.exp,
            topic: q.topic
          }
        });
        totalGenerated++;
      }
      
      console.log(`  ✓ ${subject}: ${questions.length} questions`);
    }
    console.log('');
  }
  
  console.log(`📊 Total generated: ${totalGenerated}`);
  console.log(`💾 Inserting into database...\n`);
  
  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < insertBatch.length; i += batchSize) {
    const batch = insertBatch.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase.from('question_bank').insert(batch);
      
      if (error) {
        // If duplicate, skip
        if (error.code === '23505') {
          console.log(`⚠ Batch ${Math.floor(i / batchSize) + 1}: Skipped duplicates`);
        } else {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        }
      } else {
        console.log(`✓ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(insertBatch.length / batchSize)}`);
      }
    } catch (err) {
      console.error('Insert error:', err.message);
    }
  }
  
  console.log(`\n✅ Complete!`);
  console.log(`📈 Added ~${totalGenerated} Nigerian SSS questions`);
  console.log(`📊 Per year: ~${Math.round(totalGenerated / 3)} questions`);
}

generateNigerianSSS()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });