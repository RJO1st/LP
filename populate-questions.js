const { createClient } = require('@supabase/supabase-js');

// Get these from your Supabase project settings
const SUPABASE_URL = 'https://vjslqdvhujzlupxyosbq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc2xxZHZodWp6bHVweHlvc2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE4NDQ3MCwiZXhwIjoyMDg3NzYwNDcwfQ.RrEgrhqojbmoEPXRG77J6YzQOAmhJ5QG4kGwIArUC7E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Curriculum configurations
const CURRICULA = {
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
    {
      generate: () => {
        const a = 10 + Math.floor(Math.random() * 90);
        const b = 10 + Math.floor(Math.random() * 90);
        const answer = a + b;
        return {
          q: `What is ${a} + ${b}?`,
          opts: shuffle([answer, answer + 5, answer - 5, answer + 10].map(String)),
          a: 0, // Will be adjusted after shuffle
          exp: `Add the two numbers: ${a} + ${b} = ${answer}`,
          topic: 'addition',
          difficulty: 20
        };
      }
    },
    {
      generate: () => {
        const a = 20 + Math.floor(Math.random() * 80);
        const b = 5 + Math.floor(Math.random() * 40);
        const answer = a - b;
        return {
          q: `What is ${a} - ${b}?`,
          opts: shuffle([answer, answer + 3, answer - 3, answer + 7].map(String)),
          a: 0,
          exp: `Subtract: ${a} - ${b} = ${answer}`,
          topic: 'subtraction',
          difficulty: 25
        };
      }
    },
    {
      generate: () => {
        const a = 2 + Math.floor(Math.random() * 10);
        const b = 2 + Math.floor(Math.random() * 10);
        const answer = a * b;
        return {
          q: `What is ${a} × ${b}?`,
          opts: shuffle([answer, answer + 1, answer - 1, answer + 2].map(String)),
          a: 0,
          exp: `Multiply: ${a} × ${b} = ${answer}`,
          topic: 'multiplication',
          difficulty: 20
        };
      }
    },
    {
      generate: () => {
        const b = 2 + Math.floor(Math.random() * 9);
        const answer = 2 + Math.floor(Math.random() * 15);
        const a = b * answer;
        return {
          q: `What is ${a} ÷ ${b}?`,
          opts: shuffle([answer, answer + 1, answer - 1, answer + 2].map(String)),
          a: 0,
          exp: `Divide: ${a} ÷ ${b} = ${answer}`,
          topic: 'division',
          difficulty: 25
        };
      }
    },
    {
      generate: () => {
        const total = [20, 30, 40, 50, 60, 80, 100][Math.floor(Math.random() * 7)];
        const answer = total / 2;
        return {
          q: `What is half of ${total}?`,
          opts: shuffle([answer, answer + 5, answer - 5, answer + 10].map(String)),
          a: 0,
          exp: `Half of ${total} is ${answer}. Divide by 2.`,
          topic: 'fractions',
          difficulty: 20
        };
      }
    }
  ],
  
  english: [
    {
      generate: () => {
        const sentences = [
          { q: 'The cat sat on the mat.', opts: ['cat', 'sat', 'on', 'the'], a: 0, word: 'noun' },
          { q: 'She ran quickly home.', opts: ['She', 'ran', 'quickly', 'home'], a: 1, word: 'verb' },
          { q: 'The big dog barked.', opts: ['The', 'big', 'dog', 'barked'], a: 1, word: 'adjective' },
        ];
        const s = sentences[Math.floor(Math.random() * sentences.length)];
        return {
          q: `Which word is a ${s.word}? "${s.q}"`,
          opts: s.opts,
          a: s.a,
          exp: `"${s.opts[s.a]}" is the ${s.word} in this sentence.`,
          topic: 'grammar',
          difficulty: 20
        };
      }
    }
  ],
  
  verbal: [
    {
      generate: () => {
        const sets = [
          { q: 'Dog, Cat, Bird, Table', a: 3, exp: 'Dog, Cat, and Bird are animals. Table is furniture.' },
          { q: 'Red, Blue, Green, Chair', a: 3, exp: 'Red, Blue, and Green are colors. Chair is furniture.' },
          { q: 'Apple, Banana, Orange, Car', a: 3, exp: 'Apple, Banana, and Orange are fruits. Car is a vehicle.' },
        ];
        const s = sets[Math.floor(Math.random() * sets.length)];
        const opts = s.q.split(', ');
        return {
          q: `Which word does NOT belong? ${s.q}`,
          opts,
          a: s.a,
          exp: s.exp,
          topic: 'classification',
          difficulty: 25
        };
      }
    }
  ],
  
  // Default template for other subjects
  default: [
    {
      generate: () => ({
        q: 'Sample question',
        opts: ['Option A', 'Option B', 'Option C', 'Option D'],
        a: 0,
        exp: 'This is a placeholder question.',
        topic: 'general',
        difficulty: 25
      })
    }
  ]
};

// Utility functions
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
  const question = template.generate();
  
  // Adjust difficulty based on year level
  question.difficulty = Math.min(100, question.difficulty + (year * 3));
  
  // Find correct answer after shuffle
  const correctAnswer = question.opts[0];
  question.a = question.opts.indexOf(correctAnswer);
  
  return question;
}

// Main population function
async function populateQuestions() {
  console.log('🚀 Starting question bank population...\n');
  
  let totalInserted = 0;
  let errors = 0;

  for (const [curriculum, config] of Object.entries(CURRICULA)) {
    console.log(`📚 Populating ${curriculum.toUpperCase()}...`);
    
    for (const year of config.years) {
      for (const subject of config.subjects) {
        const questions = [];
        
        // Generate 10 questions per subject/year
        for (let i = 0; i < 10; i++) {
          const questionData = generateQuestion(subject, year);
          questions.push({
            curriculum,
            year_level: year,
            subject,
            difficulty_tier: ['foundation', 'developing', 'secure'][Math.floor(Math.random() * 3)],
            question_data: JSON.stringify(questionData)
          });
        }
        
        // Insert in batches
        const { error } = await supabase
          .from('question_bank')
          .insert(questions);
        
        if (error) {
          console.error(`  ❌ ${curriculum} Y${year} ${subject}:`, error.message);
          errors++;
        } else {
          totalInserted += questions.length;
          console.log(`  ✅ ${curriculum} Y${year} ${subject}: ${questions.length} questions`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log('');
  }

  console.log('\n🎉 POPULATION COMPLETE!\n');
  console.log(`✅ Total inserted: ${totalInserted} questions`);
  console.log(`❌ Errors: ${errors}`);
  
  // Verify final counts
  const { data: counts } = await supabase
    .from('question_bank')
    .select('curriculum, year_level, subject');
  
  if (counts) {
    const grouped = {};
    counts.forEach(row => {
      grouped[row.curriculum] = (grouped[row.curriculum] || 0) + 1;
    });
    
    console.log('\n📊 Final counts by curriculum:');
    Object.entries(grouped).forEach(([curr, count]) => {
      console.log(`  ${curr}: ${count} questions`);
    });
  }
}

// Run it
populateQuestions()
  .then(() => {
    console.log('\n✨ Done! You can now close this terminal.');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });