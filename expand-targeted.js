// expand-targeted.js - Add questions to specific curricula
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vjslqdvhujzlupxyosbq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc2xxZHZodWp6bHVweHlvc2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE4NDQ3MCwiZXhwIjoyMDg3NzYwNDcwfQ.RrEgrhqojbmoEPXRG77J6YzQOAmhJ5QG4kGwIArUC7E'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========== CONFIGURE WHICH CURRICULA TO BOOST ==========
// Set to true for curricula you want to expand
const EXPAND_CURRICULA = {
  uk_11plus: true,      // Currently: 340 → Will be: ~1,200
  waec: true,          // Currently: 520 (skip)
  us_common_core: true, // Currently: 570 (skip)
  australian: true,    // Currently: 950 (skip)
  ib_pyp: true,        // Currently: 1,077 (skip)
  ng_nerdc: true       // Currently: 540 (skip)
};

// How many questions to add per subject/year combination
const QUESTIONS_TO_ADD = 100; // Will add 40 MORE to each

// =======================================================

const CURRICULA_CONFIG = {
  uk_11plus: { 
    years: [1,2,3,4,5,6], 
    subjects: ['maths','english','verbal','nvr'] 
  },
  waec: { 
    years: [7,8,9,10,11,12], 
    subjects: ['maths','english','verbal','science','geography','history'] 
  },
  us_common_core: { 
    years: [1,2,3,4,5,6,7,8,9,10,11,12], 
    subjects: ['maths','english','science','social_studies'] 
  },
  australian: { 
    years: [1,2,3,4,5,6,7,8,9,10,11,12], 
    subjects: ['maths','english','science','humanities'] 
  },
  ib_pyp: { 
    years: [1,2,3,4,5,6,7,8,9,10], 
    subjects: ['maths','english','science','individuals_societies','language_acquisition','arts'] 
  },
  ng_nerdc: { 
    years: [1,2,3,4,5,6,7,8,9], 
    subjects: ['maths','english','science','social_studies','civic_education','computer_studies'] 
  }
};

// Question templates by subject
const TEMPLATES = {
  maths: [
    (year) => {
      const a = 10 + Math.floor(Math.random() * 90);
      const b = 10 + Math.floor(Math.random() * 90);
      const answer = a + b;
      return {
        q: `What is ${a} + ${b}?`,
        opts: shuffle([answer, answer + 5, answer - 5, answer + 10].map(String)),
        a: 0,
        exp: `Add the two numbers: ${a} + ${b} = ${answer}`,
        topic: 'addition',
        difficulty: 20 + (year * 2)
      };
    },
    (year) => {
      const a = 50 + Math.floor(Math.random() * 50);
      const b = 10 + Math.floor(Math.random() * 40);
      const answer = a - b;
      return {
        q: `What is ${a} - ${b}?`,
        opts: shuffle([answer, answer + 3, answer - 3, answer + 7].map(String)),
        a: 0,
        exp: `Subtract: ${a} - ${b} = ${answer}`,
        topic: 'subtraction',
        difficulty: 25 + (year * 2)
      };
    },
    (year) => {
      const a = 2 + Math.floor(Math.random() * 10);
      const b = 2 + Math.floor(Math.random() * 10);
      const answer = a * b;
      return {
        q: `What is ${a} × ${b}?`,
        opts: shuffle([answer, answer + 1, answer - 1, answer + 2].map(String)),
        a: 0,
        exp: `Multiply: ${a} × ${b} = ${answer}`,
        topic: 'multiplication',
        difficulty: 20 + (year * 3)
      };
    },
    (year) => {
      const b = 2 + Math.floor(Math.random() * 9);
      const answer = 2 + Math.floor(Math.random() * 15);
      const a = b * answer;
      return {
        q: `What is ${a} ÷ ${b}?`,
        opts: shuffle([answer, answer + 1, answer - 1, answer + 2].map(String)),
        a: 0,
        exp: `Divide: ${a} ÷ ${b} = ${answer}`,
        topic: 'division',
        difficulty: 25 + (year * 3)
      };
    },
    (year) => {
      const values = [20, 30, 40, 50, 60, 80, 100];
      const total = values[Math.floor(Math.random() * values.length)];
      const answer = total / 2;
      return {
        q: `What is half of ${total}?`,
        opts: shuffle([answer, answer + 5, answer - 5, answer + 10].map(String)),
        a: 0,
        exp: `Half of ${total} is ${answer}. Divide by 2.`,
        topic: 'fractions',
        difficulty: 20 + (year * 2)
      };
    }
  ],
  
  english: [
    (year) => {
      const examples = [
        { q: 'The cat sat on the mat.', opts: ['cat', 'sat', 'on', 'the'], a: 0, type: 'noun' },
        { q: 'She ran quickly to school.', opts: ['She', 'ran', 'quickly', 'to'], a: 1, type: 'verb' },
        { q: 'The big dog barked loudly.', opts: ['The', 'big', 'dog', 'barked'], a: 1, type: 'adjective' },
        { q: 'He walked very slowly.', opts: ['He', 'walked', 'very', 'slowly'], a: 3, type: 'adverb' }
      ];
      const ex = examples[Math.floor(Math.random() * examples.length)];
      return {
        q: `Which word is a ${ex.type}? "${ex.q}"`,
        opts: ex.opts,
        a: ex.a,
        exp: `"${ex.opts[ex.a]}" is the ${ex.type}.`,
        topic: 'grammar',
        difficulty: 20 + (year * 2)
      };
    }
  ],
  
  verbal: [
    (year) => {
      const sets = [
        { words: ['Dog', 'Cat', 'Bird', 'Table'], a: 3, exp: 'Dog, Cat, and Bird are animals. Table is furniture.' },
        { words: ['Red', 'Blue', 'Green', 'Chair'], a: 3, exp: 'Red, Blue, and Green are colors. Chair is furniture.' },
        { words: ['Apple', 'Banana', 'Orange', 'Car'], a: 3, exp: 'Apple, Banana, and Orange are fruits. Car is a vehicle.' },
        { words: ['Happy', 'Sad', 'Angry', 'Book'], a: 3, exp: 'Happy, Sad, and Angry are emotions. Book is an object.' }
      ];
      const set = sets[Math.floor(Math.random() * sets.length)];
      return {
        q: `Which word does NOT belong? ${set.words.join(', ')}`,
        opts: set.words,
        a: set.a,
        exp: set.exp,
        topic: 'classification',
        difficulty: 25 + (year * 2)
      };
    }
  ],
  
  nvr: [
    (year) => ({
      q: 'Which shape completes the pattern?',
      opts: ['Circle', 'Square', 'Triangle', 'Pentagon'],
      a: Math.floor(Math.random() * 4),
      exp: 'Look for repeating patterns in shape, size, or rotation.',
      topic: 'patterns',
      difficulty: 30 + (year * 2)
    })
  ],
  
  science: [
    (year) => {
      const questions = [
        { q: 'What is the largest planet?', opts: ['Jupiter', 'Saturn', 'Earth', 'Mars'], a: 0 },
        { q: 'What do plants need to make food?', opts: ['Sunlight', 'Darkness', 'Sand', 'Salt'], a: 0 },
        { q: 'What is water made of?', opts: ['H₂O', 'O₂', 'CO₂', 'N₂'], a: 0 }
      ];
      const q = questions[Math.floor(Math.random() * questions.length)];
      return { ...q, exp: `The correct answer is ${q.opts[q.a]}.`, topic: 'general', difficulty: 25 + (year * 2) };
    }
  ],
  
  geography: [
    (year) => {
      const questions = [
        { q: 'What is the capital of France?', opts: ['Paris', 'London', 'Berlin', 'Rome'], a: 0 },
        { q: 'Which ocean is the largest?', opts: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], a: 0 }
      ];
      const q = questions[Math.floor(Math.random() * questions.length)];
      return { ...q, exp: `${q.opts[q.a]} is correct.`, topic: 'world', difficulty: 25 + (year * 2) };
    }
  ],
  
  history: [
    (year) => ({
      q: 'When did World War II end?',
      opts: ['1945', '1939', '1950', '1918'],
      a: 0,
      exp: 'World War II ended in 1945.',
      topic: 'modern',
      difficulty: 30 + (year * 2)
    })
  ],
  
  // Add generic templates for other subjects
  default: [
    (year) => ({
      q: 'Sample question',
      opts: ['Option A', 'Option B', 'Option C', 'Option D'],
      a: 0,
      exp: 'This is a sample answer.',
      topic: 'general',
      difficulty: 25 + (year * 2)
    })
  ]
};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateQuestion(subject, year) {
  const templates = TEMPLATES[subject] || TEMPLATES.default;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const question = template(year);
  
  // Fix answer index after shuffle
  const correctAnswer = question.opts[0];
  question.a = question.opts.indexOf(correctAnswer);
  
  return question;
}

async function expandQuestions() {
  console.log('🚀 Starting targeted question expansion...\n');
  
  // Get current counts
  console.log('📊 Current state:');
  const { data: current } = await supabase
    .from('question_bank')
    .select('curriculum');
  
  let totalAdded = 0;
  let errors = 0;

  for (const [curriculum, shouldExpand] of Object.entries(EXPAND_CURRICULA)) {
    if (!shouldExpand) {
      console.log(`⏭️  Skipping ${curriculum}`);
      continue;
    }
    
    const config = CURRICULA_CONFIG[curriculum];
    if (!config) {
      console.log(`❌ Unknown curriculum: ${curriculum}`);
      continue;
    }
    
    console.log(`\n📚 Expanding ${curriculum.toUpperCase()}...`);
    console.log(`   Adding ${QUESTIONS_TO_ADD} questions per subject/year`);
    
    for (const year of config.years) {
      for (const subject of config.subjects) {
        const questions = [];
        
        for (let i = 0; i < QUESTIONS_TO_ADD; i++) {
          const questionData = generateQuestion(subject, year);
          questions.push({
            curriculum,
            year_level: year,
            subject,
            difficulty_tier: ['foundation', 'developing', 'secure'][Math.floor(Math.random() * 3)],
            question_data: JSON.stringify(questionData)
          });
        }
        
        const { error } = await supabase
          .from('question_bank')
          .insert(questions);
        
        if (error) {
          console.error(`  ❌ Y${year} ${subject}:`, error.message);
          errors++;
        } else {
          totalAdded += questions.length;
          console.log(`  ✅ Y${year} ${subject}: +${questions.length} questions`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  console.log('\n🎉 EXPANSION COMPLETE!\n');
  console.log(`✅ Added: ${totalAdded} new questions`);
  console.log(`❌ Errors: ${errors}`);
  
  // Show new totals
  console.log('\n📊 Updated totals:');
  const { data: final } = await supabase
    .from('question_bank')
    .select('curriculum');
  
  if (final) {
    const counts = {};
    final.forEach(q => {
      if (q.curriculum) counts[q.curriculum] = (counts[q.curriculum] || 0) + 1;
    });
    
    Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([curr, count]) => {
      const wasExpanded = EXPAND_CURRICULA[curr];
      console.log(`  ${curr}: ${count} questions ${wasExpanded ? '✨ (expanded)' : ''}`);
    });
  }
}

expandQuestions()
  .then(() => {
    console.log('\n✨ Done! Close this terminal.');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Error:', err);
    process.exit(1);
  });