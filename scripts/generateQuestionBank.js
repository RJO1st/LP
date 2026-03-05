// ═══════════════════════════════════════════════════════════════════════════
// QUESTION BANK GENERATOR - All Curricula
// ═══════════════════════════════════════════════════════════════════════════
// Run this script to generate questions for all 10 curricula
// node scripts/generateQuestionBank.js
// ═══════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for batch inserts
);

// ═══════════════════════════════════════════════════════════════════════════
// CURRICULUM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const CURRICULA = {
  uk_national: { 
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    subjects: ['maths', 'english', 'science']
  },
  uk_11plus: { 
    grades: [3, 4, 5, 6],
    subjects: ['maths', 'english', 'verbal', 'nvr']
  },
  us_common_core: { 
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    subjects: ['maths', 'english', 'science']
  },
  aus_acara: { 
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    subjects: ['maths', 'english', 'science']
  },
  ib_pyp: { 
    grades: [1, 2, 3, 4, 5, 6],
    subjects: ['maths', 'english', 'science']
  },
  ib_myp: { 
    grades: [1, 2, 3, 4, 5],
    subjects: ['maths', 'english', 'science']
  },
  ng_primary: { 
    grades: [1, 2, 3, 4, 5, 6],
    subjects: ['maths', 'english', 'science']
  },
  ng_jss: { 
    grades: [1, 2, 3],
    subjects: ['maths', 'english', 'science']
  },
  ng_sss: { 
    grades: [1, 2, 3],
    subjects: ['maths', 'english', 'physics', 'chemistry', 'biology']
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION TEMPLATES BY SUBJECT
// ═══════════════════════════════════════════════════════════════════════════

// MATHS QUESTIONS
function generateMathsQuestions(curriculum, year) {
  const level = year <= 2 ? 'basic' : year <= 5 ? 'intermediate' : 'advanced';
  
  const questions = [];
  
  if (level === 'basic') {
    // Years 1-2
    questions.push(
      {
        q: 'What is 5 + 3?',
        opts: ['8', '7', '9', '6'],
        a: 0,
        exp: '5 + 3 = 8. Count: 5, 6, 7, 8.',
        topic: 'addition',
        difficulty_tier: 'foundation'
      },
      {
        q: 'What is 10 - 4?',
        opts: ['6', '5', '7', '14'],
        a: 0,
        exp: '10 - 4 = 6. Count backwards from 10: 9, 8, 7, 6.',
        topic: 'subtraction',
        difficulty_tier: 'foundation'
      },
      {
        q: 'Which number comes after 15?',
        opts: ['16', '14', '17', '15'],
        a: 0,
        exp: 'Counting: 14, 15, 16. The number after 15 is 16.',
        topic: 'number_sequence',
        difficulty_tier: 'foundation'
      }
    );
  } else if (level === 'intermediate') {
    // Years 3-5
    questions.push(
      {
        q: 'What is 12 × 4?',
        opts: ['48', '44', '52', '40'],
        a: 0,
        exp: '12 × 4 = 48. Think: 12 × 4 = (10 × 4) + (2 × 4) = 40 + 8 = 48.',
        topic: 'multiplication',
        difficulty_tier: 'intermediate'
      },
      {
        q: 'What is 56 ÷ 8?',
        opts: ['7', '6', '8', '9'],
        a: 0,
        exp: '56 ÷ 8 = 7. Ask: 8 times what equals 56? 8 × 7 = 56.',
        topic: 'division',
        difficulty_tier: 'intermediate'
      },
      {
        q: 'What is 3/4 + 1/4?',
        opts: ['1', '4/8', '2/4', '4/4'],
        a: 0,
        exp: '3/4 + 1/4 = 4/4 = 1. Add the numerators: 3 + 1 = 4.',
        topic: 'fractions',
        difficulty_tier: 'intermediate'
      }
    );
  } else {
    // Years 6+
    questions.push(
      {
        q: 'What is 15% of 200?',
        opts: ['30', '25', '35', '20'],
        a: 0,
        exp: '15% of 200 = (15/100) × 200 = 0.15 × 200 = 30.',
        topic: 'percentages',
        difficulty_tier: 'advanced'
      },
      {
        q: 'If x + 7 = 15, what is x?',
        opts: ['8', '7', '9', '22'],
        a: 0,
        exp: 'x + 7 = 15, so x = 15 - 7 = 8.',
        topic: 'algebra',
        difficulty_tier: 'advanced'
      },
      {
        q: 'What is the area of a rectangle with length 8cm and width 5cm?',
        opts: ['40 cm²', '13 cm²', '26 cm²', '45 cm²'],
        a: 0,
        exp: 'Area = length × width = 8 × 5 = 40 cm².',
        topic: 'geometry',
        difficulty_tier: 'advanced'
      }
    );
  }
  
  return questions;
}

// ENGLISH QUESTIONS
function generateEnglishQuestions(curriculum, year) {
  const level = year <= 2 ? 'basic' : year <= 5 ? 'intermediate' : 'advanced';
  
  const questions = [];
  
  if (level === 'basic') {
    questions.push(
      {
        q: 'Which word rhymes with "cat"?',
        opts: ['hat', 'dog', 'run', 'sun'],
        a: 0,
        exp: '"Cat" and "hat" both end with "-at" sound, so they rhyme.',
        topic: 'phonics',
        difficulty_tier: 'foundation'
      },
      {
        q: 'What is the opposite of "hot"?',
        opts: ['cold', 'warm', 'cool', 'heat'],
        a: 0,
        exp: 'The opposite of hot is cold. They are antonyms.',
        topic: 'vocabulary',
        difficulty_tier: 'foundation'
      }
    );
  } else if (level === 'intermediate') {
    questions.push(
      {
        q: 'Which word is a noun?',
        opts: ['table', 'run', 'quickly', 'happy'],
        a: 0,
        exp: 'A noun is a person, place, or thing. "Table" is a thing, so it\'s a noun.',
        topic: 'grammar',
        difficulty_tier: 'intermediate'
      },
      {
        q: 'Choose the correct spelling:',
        opts: ['receive', 'recieve', 'recive', 'receeve'],
        a: 0,
        exp: 'The correct spelling is "receive". Remember: i before e except after c.',
        topic: 'spelling',
        difficulty_tier: 'intermediate'
      }
    );
  } else {
    questions.push(
      {
        q: 'What is the main theme of a story about friendship?',
        opts: ['relationships', 'adventure', 'mystery', 'sports'],
        a: 0,
        exp: 'A story about friendship focuses on relationships between people.',
        topic: 'comprehension',
        difficulty_tier: 'advanced'
      },
      {
        q: 'Which sentence uses correct punctuation?',
        opts: ["I'm going to the store.", "Im going to the store", "I'm going to the store", "Im going to the store."],
        a: 0,
        exp: 'The apostrophe in "I\'m" replaces the missing letter, and sentences end with a period.',
        topic: 'punctuation',
        difficulty_tier: 'advanced'
      }
    );
  }
  
  return questions;
}

// SCIENCE QUESTIONS
function generateScienceQuestions(curriculum, year) {
  const level = year <= 2 ? 'basic' : year <= 5 ? 'intermediate' : 'advanced';
  
  const questions = [];
  
  if (level === 'basic') {
    questions.push(
      {
        q: 'What do plants need to grow?',
        opts: ['Water and sunlight', 'Only water', 'Only soil', 'Only air'],
        a: 0,
        exp: 'Plants need water, sunlight, air, and nutrients from soil to grow.',
        topic: 'life_science',
        difficulty_tier: 'foundation'
      },
      {
        q: 'Which is a mammal?',
        opts: ['Dog', 'Fish', 'Bird', 'Snake'],
        a: 0,
        exp: 'Mammals have fur/hair and feed milk to their babies. Dogs are mammals.',
        topic: 'animals',
        difficulty_tier: 'foundation'
      }
    );
  } else if (level === 'intermediate') {
    questions.push(
      {
        q: 'What is the process by which plants make food?',
        opts: ['Photosynthesis', 'Respiration', 'Digestion', 'Evaporation'],
        a: 0,
        exp: 'Photosynthesis is how plants use sunlight to convert CO₂ and water into food.',
        topic: 'plant_biology',
        difficulty_tier: 'intermediate'
      },
      {
        q: 'What are the three states of matter?',
        opts: ['Solid, liquid, gas', 'Hot, cold, warm', 'Big, small, tiny', 'Fast, slow, still'],
        a: 0,
        exp: 'Matter exists in three main states: solid, liquid, and gas.',
        topic: 'physical_science',
        difficulty_tier: 'intermediate'
      }
    );
  } else {
    questions.push(
      {
        q: 'What is the function of the mitochondria?',
        opts: ['Produces energy', 'Stores DNA', 'Makes proteins', 'Controls cell'],
        a: 0,
        exp: 'Mitochondria are the powerhouse of the cell, producing ATP energy.',
        topic: 'cell_biology',
        difficulty_tier: 'advanced'
      },
      {
        q: 'What type of rock is formed from cooled lava?',
        opts: ['Igneous', 'Sedimentary', 'Metamorphic', 'Limestone'],
        a: 0,
        exp: 'Igneous rocks form when molten rock (lava or magma) cools and solidifies.',
        topic: 'earth_science',
        difficulty_tier: 'advanced'
      }
    );
  }
  
  return questions;
}

// PHYSICS QUESTIONS (Nigerian SSS)
function generatePhysicsQuestions(curriculum, year) {
  return [
    {
      q: 'What is the SI unit of force?',
      opts: ['Newton (N)', 'Joule (J)', 'Watt (W)', 'Pascal (Pa)'],
      a: 0,
      exp: 'The Newton (N) is the SI unit of force, named after Isaac Newton.',
      topic: 'mechanics',
      difficulty_tier: year === 1 ? 'foundation' : year === 2 ? 'intermediate' : 'advanced'
    },
    {
      q: 'What force pulls objects towards Earth?',
      opts: ['Gravity', 'Magnetism', 'Friction', 'Tension'],
      a: 0,
      exp: 'Gravity is the force that attracts objects with mass towards each other.',
      topic: 'forces',
      difficulty_tier: 'foundation'
    },
    {
      q: 'What is the formula for calculating speed?',
      opts: ['Distance ÷ Time', 'Force × Distance', 'Mass × Velocity', 'Time × Distance'],
      a: 0,
      exp: 'Speed = Distance ÷ Time. It measures how fast something moves.',
      topic: 'motion',
      difficulty_tier: 'intermediate'
    }
  ];
}

// CHEMISTRY QUESTIONS (Nigerian SSS)
function generateChemistryQuestions(curriculum, year) {
  return [
    {
      q: 'What is the chemical symbol for water?',
      opts: ['H₂O', 'CO₂', 'O₂', 'N₂'],
      a: 0,
      exp: 'Water is composed of two hydrogen atoms and one oxygen atom (H₂O).',
      topic: 'compounds',
      difficulty_tier: 'foundation'
    },
    {
      q: 'What is the pH of pure water?',
      opts: ['7', '0', '14', '3'],
      a: 0,
      exp: 'Pure water has a neutral pH of 7, meaning it is neither acidic nor basic.',
      topic: 'acids_bases',
      difficulty_tier: 'foundation'
    },
    {
      q: 'Which element has the chemical symbol "O"?',
      opts: ['Oxygen', 'Gold', 'Silver', 'Iron'],
      a: 0,
      exp: 'O is the chemical symbol for Oxygen, essential for respiration.',
      topic: 'elements',
      difficulty_tier: 'foundation'
    }
  ];
}

// BIOLOGY QUESTIONS (Nigerian SSS)
function generateBiologyQuestions(curriculum, year) {
  return [
    {
      q: 'What is the powerhouse of the cell?',
      opts: ['Mitochondria', 'Nucleus', 'Ribosome', 'Vacuole'],
      a: 0,
      exp: 'Mitochondria produce energy (ATP) for the cell through cellular respiration.',
      topic: 'cell_structure',
      difficulty_tier: 'foundation'
    },
    {
      q: 'What process do plants use to make food?',
      opts: ['Photosynthesis', 'Respiration', 'Transpiration', 'Digestion'],
      a: 0,
      exp: 'Photosynthesis is how plants use sunlight to convert CO₂ and water into glucose.',
      topic: 'plant_biology',
      difficulty_tier: 'foundation'
    },
    {
      q: 'How many chambers does the human heart have?',
      opts: ['Four', 'Two', 'Three', 'Five'],
      a: 0,
      exp: 'The human heart has four chambers: two atria and two ventricles.',
      topic: 'human_body',
      difficulty_tier: 'intermediate'
    }
  ];
}

// VERBAL REASONING (UK 11+)
function generateVerbalQuestions(curriculum, year) {
  return [
    {
      q: 'Find the word that means the opposite of HAPPY:',
      opts: ['Sad', 'Joyful', 'Cheerful', 'Glad'],
      a: 0,
      exp: 'The opposite (antonym) of happy is sad.',
      topic: 'antonyms',
      difficulty_tier: 'intermediate'
    },
    {
      q: 'Complete the analogy: Dog is to puppy as cat is to...',
      opts: ['Kitten', 'Cub', 'Foal', 'Calf'],
      a: 0,
      exp: 'A young dog is a puppy, and a young cat is a kitten.',
      topic: 'analogies',
      difficulty_tier: 'intermediate'
    }
  ];
}

// NVR (UK 11+)
function generateNVRQuestions(curriculum, year) {
  return [
    {
      q: 'Which shape comes next in the sequence: ○ △ ○ △ ○ ?',
      opts: ['△', '○', '□', '◇'],
      a: 0,
      exp: 'The pattern alternates between circle and triangle, so triangle comes next.',
      topic: 'patterns',
      difficulty_tier: 'intermediate'
    },
    {
      q: 'Which shape is the odd one out?',
      opts: ['Pentagon (5 sides)', 'Square', 'Triangle', 'Rectangle'],
      a: 0,
      exp: 'Pentagon has 5 sides while others have 3 or 4 sides.',
      topic: 'odd_one_out',
      difficulty_tier: 'intermediate'
    }
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION GENERATOR ROUTER
// ═══════════════════════════════════════════════════════════════════════════

function generateQuestionsForSubject(curriculum, subject, year) {
  switch(subject) {
    case 'maths':
      return generateMathsQuestions(curriculum, year);
    case 'english':
      return generateEnglishQuestions(curriculum, year);
    case 'science':
      return generateScienceQuestions(curriculum, year);
    case 'physics':
      return generatePhysicsQuestions(curriculum, year);
    case 'chemistry':
      return generateChemistryQuestions(curriculum, year);
    case 'biology':
      return generateBiologyQuestions(curriculum, year);
    case 'verbal':
      return generateVerbalQuestions(curriculum, year);
    case 'nvr':
      return generateNVRQuestions(curriculum, year);
    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function generateAllQuestions() {
  console.log('🚀 Starting question bank generation...\n');
  
  let totalQuestions = 0;
  const insertBatch = [];
  
  for (const [curriculum, config] of Object.entries(CURRICULA)) {
    console.log(`📚 Generating for ${curriculum}...`);
    
    for (const year of config.grades) {
      for (const subject of config.subjects) {
        const questions = generateQuestionsForSubject(curriculum, subject, year);
        
        for (const q of questions) {
          insertBatch.push({
            curriculum,
            subject,
            year_level: year,
            difficulty_tier: q.difficulty_tier,
            question_data: {
              q: q.q,
              opts: q.opts,
              a: q.a,
              exp: q.exp,
              topic: q.topic
            }
          });
          totalQuestions++;
        }
        
        console.log(`  ✓ ${subject} Year ${year}: ${questions.length} questions`);
      }
    }
    console.log('');
  }
  
  console.log(`\n📊 Total questions generated: ${totalQuestions}`);
  console.log(`\n💾 Inserting into database...`);
  
  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < insertBatch.length; i += batchSize) {
    const batch = insertBatch.slice(i, i + batchSize);
    const { error } = await supabase
      .from('question_bank')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
    } else {
      console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)`);
    }
  }
  
  console.log(`\n✅ Question bank generation complete!`);
  console.log(`\n📈 Summary:`);
  console.log(`   - Curricula: ${Object.keys(CURRICULA).length}`);
  console.log(`   - Total Questions: ${totalQuestions}`);
  console.log(`   - Questions per curriculum: ~${Math.round(totalQuestions / Object.keys(CURRICULA).length)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════

generateAllQuestions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });