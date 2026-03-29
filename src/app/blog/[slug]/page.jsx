import Link from "next/link";
import Image from "next/image";
import DarkModeToggle from "@/components/theme/DarkModeToggle";
import BlogHeroVisual from "@/components/blog/BlogHeroVisual";
import { notFound } from "next/navigation";

/* ─── Article data ─────────────────────────────────────────────────────────── */

const articles = {
  "personalised-learning-paths": {
    title: "Why Personalised Learning Paths Actually Work",
    category: "Learning Science",
    categoryColor: "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30",
    date: "1 March 2026",
    readTime: "5 min read",
    metaDesc: "The science behind adaptive learning and why one-size-fits-all education holds your child back.",
    paragraphs: [
      "Your child's maths class has 28 students. The teacher just finished explaining long division. Half the class gets it immediately. A quarter needs another five minutes of worked examples. The remaining seven students are completely lost but don't want to raise their hand. By tomorrow, the whole class moves on anyway.",
      "This is the reality of one-size-fits-all teaching. Not because teachers aren't skilled, but because teaching 28 different learners as a single group is structurally impossible. Kids progress at different speeds. They have different gaps from earlier years. They learn through different approaches. A classroom can't accommodate all of that.",
      "Personalised learning paths solve this problem by flipping the model. Instead of everyone moving through the same content on the same schedule, each child gets a customised sequence based on what they actually know and what they actually need to work on next.",
      "The research backing this is solid. Decades of cognitive science shows us that learning sticks when three things happen together: spacing, difficulty, and mastery.",
      "Spacing means revisiting material over time instead of cramming it all at once. A child who learns fractions on Monday, then sees fraction problems again on Wednesday, Friday, and next Tuesday, retains them far better than someone who does ten fraction worksheets in one sitting. Their brain has to retrieve the knowledge from memory each time, which strengthens the memory trace. This is why platforms that adapt in real time outperform static worksheets. They can automatically space out topics across weeks and months, bringing them back precisely when forgetting is about to happen.",
      "Mastery-based learning means a child doesn't move forward until they've understood something properly. Not \"got it right once\" but \"got it right consistently, even when the problem is slightly different.\" Traditional classrooms often push children forward on a schedule regardless of whether they've mastered the previous concept. This creates gaps that pile up. A child might \"pass\" Year 4 maths but not actually understand place value properly, which makes Year 5 decimals impossible. Personalised systems catch this. They keep practising fractions until the child shows real understanding, then move on.",
      "Difficulty matters too. Psychologists call this the zone of proximal development, or ZPD. It's the band between \"too easy\" and \"too hard\" where real learning happens. Too easy and the brain isn't challenged, so nothing new forms. Too hard and the child gets frustrated, gives up, or just memorises without understanding. The sweet spot is consistently slightly hard. Adaptive platforms adjust difficulty in real time. If a child answers five geometry questions correctly in a row, the next one gets harder. If they struggle, the next one scales back a bit. This keeps them in their ZPD throughout a whole practice session.",
      "Here's a concrete example. A Year 4 child, let's call her Sophie, is naturally good with multiplication. She flies through times tables and can multiply two-digit numbers accurately. But fractions confuse her. She keeps mixing up the numerator and denominator, and she doesn't see why one-half is the same as two-fourths.",
      "In a traditional classroom, Sophie sits through the same fraction lessons as everyone else, at the same pace. The teacher can't give her extra help without holding back the class. So Sophie might get a B on the fraction test, then move on to the next topic. The gap stays there.",
      "In a personalised system, Sophie's results are flagged immediately. The platform sees that her fraction accuracy is 45 percent while her multiplication accuracy is 92 percent. It automatically generates more fraction practice for her. Not busywork, but structured practice that starts simpler, uses visuals and manipulatives to build intuition, then gradually increases in complexity. Meanwhile, the platform doesn't waste her time drilling multiplication. She spends that time where she actually needs help. Within two weeks, her fraction accuracy climbs to 78 percent. By week four, she's at 88 percent. She actually understands it now, not just memorised a rule.",
      "So what should parents actually look for when choosing a learning platform?",
      "First, real adaptivity, not marketing. Many platforms claim to be \"adaptive\" but they're just moving kids through fixed content banks based on right-and-wrong answers. True adaptivity means the difficulty, format, and sequencing of practice changes based on the learner's pattern of understanding. It means the platform can spot when a child has a specific misconception, not just a wrong answer.",
      "Second, coverage depth. A platform should go beyond multiple choice. Can it present questions in different formats? Can it show visuals and manipulatives for maths? Can it give feedback that explains why an answer is wrong, not just that it is? The more ways a platform can present the same concept, the better the chance it will click.",
      "Third, transparency. Can you see what your child is working on and how they're progressing? A good platform shows you which topics they've mastered, which ones they're struggling with, and what's coming next. You shouldn't have to guess.",
      "Fourth, pacing control. Adaptivity is powerful, but parents and children should still have a say in pace. Is the platform pushing too fast? Too slow? Can you adjust it?",
      "The most important thing to remember: personalised learning isn't about replacing human teachers or parents. It's about freeing up their time to do what humans do best. Teachers can focus on discussion, creativity, and one-on-one mentoring instead of delivering the same explanation 28 times. Parents can see exactly where their child needs support and can have more meaningful conversations about learning.",
      "Sophie's maths confidence didn't just improve because she got more fraction practice. It improved because someone finally saw her specific gap, addressed it directly, and gave her time to close it. That's what personalised paths do. They see the child as an individual learner, not one of 28.",
    ],
  },

  "child-falling-behind": {
    title: "How to Know If Your Child Is Falling Behind (And What to Do About It)",
    category: "Parenting",
    categoryColor: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30",
    date: "15 March 2026",
    readTime: "4 min read",
    metaDesc: "The early warning signs that your child might be struggling academically, and practical steps you can take at home.",
    paragraphs: [
      "Your child comes home with their maths homework and suddenly says, \"I hate maths.\" Last week they were fine. This week they're asking you to do it for them. You tell yourself it's just a bad day, maybe they're tired. But then it happens again. And again.",
      "That's the moment most parents start wondering: is this normal frustration, or is my kid actually falling behind?",
      "Falling behind doesn't announce itself. It doesn't start with a bad report card. It starts with small signals that are easy to miss if you don't know what you're looking for.",
      "The first signal is homework avoidance. Not the normal \"can we do this later?\" kind. I mean the sudden resistance. The child who used to sit down and work now finds excuses. They need to use the bathroom. They're hungry. They'd rather do literally anything else. When they do start, they rush through answers without really thinking, or they stare at the page waiting for help. That's different from laziness. That's confusion masquerading as resistance.",
      "The second signal is the confidence collapse. Your normally chatty kid stops volunteering in class. They get quieter about school. When you ask them how they did on a test, they shrug instead of sharing. You might catch them guessing on homework instead of showing their work, or just leaving answers blank. Guessing is especially telling because it means they've already decided they don't know the answer, so why try.",
      "Then there's the complaint that sounds like drama but isn't. \"I'm stupid at maths\" or \"I'm just not a maths person.\" These statements usually mean your child has hit a specific wall and decided it's a permanent one. The brain does this as a self-protection thing: if I'm just not good at this, it's not my fault that I'm struggling. It hurts less.",
      "Here's where most parents get stuck: these signals are subtle. A teacher with 30 kids can't always catch them fast enough. Teachers are doing their best, but they see your child for maybe five hours a week in a group setting. They're watching for kids who are completely off the rails, not the ones who are quietly confusing subtraction with addition, or who don't understand what a fraction actually means. By the time a teacher flags it, your child might be several weeks behind.",
      "This is why you can't rely on school alone to catch it.",
      "The next question is: does one bad week mean a gap is forming, or is it just a bad week?",
      "A bad week looks like a temporary drop. Your child struggles on a quiz, feels frustrated, then bounces back. A gap is different. A gap shows up consistently across different contexts. They struggle on homework about the topic, they struggle when you try to help them, they're confused when the teacher moves to the next topic because the previous one didn't stick. A gap is when the struggle doesn't disappear after a few days of sleep and a fresh week.",
      "So what do you actually do?",
      "Start by talking to the teacher, but be specific. Don't just say \"I think they're falling behind in maths.\" Instead, say something like \"They're really confident with basic addition, but when we do subtraction with borrowing, they get stuck and seem to shut down. Have you noticed this?\" Teachers respond much better to specific observations than vague concerns. You're giving them something concrete to look for and giving them a chance to confirm your observation.",
      "Next, identify the actual topic, not just the subject. This matters way more than you'd think. A child who is fine with maths up until fractions isn't \"bad at maths.\" They're stuck on fractions. That's a completely different problem with a concrete solution. If you don't know which specific topic is the issue, ask your child what part of the lesson made them confused, look at their homework, or ask the teacher which topic gave them trouble.",
      "Once you know the weak spot, targeted practice on that one thing is what closes gaps fastest. Not more homework in general. Not drilling everything. Just focused practice on column subtraction, or fractions, or whatever the gap is. Ten minutes a day on the exact thing they're stuck on works better than an hour of mixed review.",
      "There are also diagnostic tools now that can pinpoint exactly where the gap is without you having to guess. This saves time and frustration. Instead of wondering whether your child doesn't understand the concept or just doesn't remember a procedure, a good diagnostic tool shows you exactly where the breakdown is happening.",
      "When should you worry, and when should you wait? If the struggle is recent and focused on one topic, wait a week or two while you're doing the targeted practice. If it's been ongoing for more than two or three weeks, if it's spreading to other topics, or if your child's confidence is taking a real hit, don't wait. Talk to the teacher and get support.",
      "Falling behind is fixable, but it's easiest to fix early. The longer a gap sits there, the more it builds on itself. But the good news is that your child doesn't need to be \"good at maths\" to catch up. They just need to understand the one specific thing they're stuck on. Once that clicks, everything shifts.",
    ],
  },

  "11-plus-preparation": {
    title: "11+ Preparation: A No-Panic Guide for Parents",
    category: "Exam Prep",
    categoryColor: "bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-500/30",
    date: "10 February 2026",
    readTime: "7 min read",
    metaDesc: "What the 11+ actually tests, when to start preparing, and how to keep your child confident through the process.",
    paragraphs: [
      "The 11+ examination can feel like a rite of passage in the UK education system, but it doesn't have to be wrapped in panic. Whether your child is sitting the exam for grammar school entry or scholarship assessment, understanding what's actually being tested, when to prepare, and how much is enough will help you both get through it with sanity intact.",
      "The 11+ tests different things depending on where you live and which exam board your local authority uses. Most commonly, you're looking at four main areas: verbal reasoning, non-verbal reasoning, English, and mathematics. Verbal reasoning assesses your child's ability to understand and work with words and language patterns. Non-verbal reasoning tests logical thinking through shapes, sequences, and spatial problems. English typically covers comprehension, grammar, punctuation, and sometimes creative writing. Maths covers the standard curriculum but often at a faster pace and with trickier problem-solving elements. Not every school uses every component, so find out exactly what your child's target schools are assessing.",
      "The two biggest exam boards are CEM and GL Assessment. CEM exams tend to have a reputation for being slightly less predictable and placing more emphasis on reasoning skills and problem-solving than on pure curriculum knowledge. GL Assessment papers are often seen as more formula-driven and easier to prepare for systematically. Neither is harder in absolute terms, but they reward different approaches to learning. CEM rewards analytical thinking; GL rewards practice with specific question types and strategies. Check your school's website to see which board is used.",
      "So when should you actually start? Year 4 summer is when many parents begin, and that's reasonable. Your child has finished Year 4, they're settled at school, and you have a full year before the autumn of Year 6 when most exams happen. Starting any earlier than this often feels premature. Children change a lot between 8 and 10, and drilling them at 7 rarely produces better outcomes. Starting later, say autumn of Year 5, is absolutely doable if you're willing to be focused and consistent. The key isn't starting early; it's starting at a point where your child can engage with the material and sustain effort.",
      "Here's the honest truth about practice: it helps, but too much becomes counterproductive. Your child needs enough practice to become familiar with question types, timing, and the specific thinking patterns each section demands. Two to three sessions per week, each lasting 30 to 45 minutes, is generally more effective than cramming five days a week for two hours. If your child is doing the latter, they'll likely burn out and start resenting the whole process. Quality and consistency beat volume every time. During Year 4, one or two sessions weekly is fine. Increase to two or three sessions during Year 5. By autumn of Year 6, you might go to three or four weekly sessions if the child is still engaged.",
      "Use online resources, books, or tutors depending on your family's circumstances, but avoid the trap of thinking that the most expensive tutor or the thickest workbook is what your child needs. Many successful 11+ passers used combinations of Elevplus, Bond Books, and free resources like CEM practice papers. What matters is that your child understands why answers are right or wrong, not just how many questions they've done.",
      "Mock exams matter, but not in the way you might think. Don't use them as pass-fail indicators or stressors. Instead, use them diagnostically. A mock shows you which areas your child actually struggles with and which ones they've mastered. The first mock, perhaps in autumn of Year 5, should feel relatively informal. Your child is seeing the question types and timing for the first time. By summer of Year 5, you can do a more structured mock. In the autumn of Year 6, do two or three formal mocks under timed conditions. This helps your child learn to pace themselves and builds confidence. After every mock, review where the errors came from, not just the score.",
      "One of the biggest saboteurs of 11+ prep is parental anxiety. Children absorb stress like sponges. If you're visibly tense about the exam, framing it as make-or-break, or asking daily about progress, your child will feel that weight. They'll either panic or become resistant. Instead, frame it as \"we're preparing for this challenge\" rather than \"this determines your whole future\". Because it doesn't. The 11+ is a single exam on a single day. It matters, but it isn't everything.",
      "Keep prep in perspective. Your child should still have friends round, still do sport, still read for pleasure, still have free time. If the 11+ prep is consuming your family's life, you're overdoing it. A balanced Year 5 and autumn of Year 6 means schoolwork, some 11+ practice, sports, hobbies, and actual childhood.",
      "What if your child doesn't get in? This is worth confronting now, before results day. Grammar schools are selective, and many high-achieving, clever children don't pass the 11+. Sometimes it's because they had a bad day. Sometimes it's because the cohort was particularly strong that year. Sometimes it's because their strengths don't align with what the test measures. None of these things mean your child isn't clever or capable. Secondary schools have been educating children brilliantly for decades without being grammar schools. Your child will do fine elsewhere. Results day will feel disappointing, but it's not a life sentence.",
      "Here's a practical timeline to ground all this. In summer of Year 4, introduce the idea casually. Do a single practice test together so you both understand the format. For most of Year 4 and into Year 5, keep prep light: one or two sessions weekly, exploring different question types without pressure. By summer of Year 5, ramp up slightly. Do a mock exam to see where things stand. Autumn of Year 6 is your intensive period: three to four weekly sessions, two or three mocks, and focus on weak areas. December of Year 6, reduce sessions and focus on confidence rather than new material. By January, your child should be familiar with everything; practice becomes about maintaining speed and managing nerves.",
      "The 11+ isn't a sprint. It's a steady process that takes about a year of consistent, moderate effort. It's not something that requires your child to sacrifice their childhood. Many children pass and many don't, and either way, they'll be fine. Your job as a parent is to provide reasonable preparation, keep things in perspective, and make sure your child knows you're proud of them regardless of the outcome. That's the real guide for getting through it without panic.",
    ],
  },

  "screen-time-that-counts": {
    title: "Screen Time That Actually Counts: When Digital Learning Works",
    category: "Digital Parenting",
    categoryColor: "bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-500/30",
    date: "15 January 2026",
    readTime: "3 min read",
    metaDesc: "Not all screen time is equal. Some of it builds skills. Here is how to tell the difference.",
    paragraphs: [
      "Your kid is glued to a screen. You feel guilty. So you ask yourself: is this learning, or am I just buying peace and quiet?",
      "The honest answer is that most screen time is both. But there's a real difference between types of screen use, and understanding it can help you make better choices without the constant guilt.",
      "Passive screen time is exactly what it sounds like. Your child watches a YouTube video, scrolls through social media, or sits through an ad-filled game where they tap to get rewards. Their brain is receiving information, but they're not doing much with it. Research on learning shows that passively consuming content doesn't stick. You watch a tutorial and forget it by tomorrow. You need to do something with that information to learn it.",
      "Active screen time is different. Your kid is solving a math problem, testing a hypothesis in a simulation, or writing code. They're getting immediate feedback, they're failing and trying again, and they're building something. That's when digital learning actually works. The screen is a tool for thinking, not a substitute for it.",
      "So what makes digital learning effective? Three things show up consistently in the research. First, immediate feedback. When your child answers a question and gets told right away whether they're correct, their brain connects the action to the result. That's how learning sticks. Second, active recall. The app asks them to retrieve information from memory, not just recognize it in a list. Fill-in-the-blank is better than multiple choice. Third, progression. The difficulty scales with their ability. Too easy and they zone out. Too hard and they give up. Just right and they're engaged.",
      "Here's a practical test for evaluating any educational app: the broccoli test. Imagine the same content, but without the cartoon characters, sound effects, and flashy rewards. Would your child still engage with it? If the answer is no, you've found a screen time trap. The fun wrapper is doing the heavy lifting, not the content. Your kid will forget everything the moment they close the app.",
      "This matters because your brain doesn't distinguish between \"learning\" and \"being entertained\" based on how much fun you're having. It distinguishes based on whether you're actually thinking. A boring math worksheet can be learning if you're struggling with it. A colorful game can be entertainment if you're just tapping buttons.",
      "The boundary-setting question changes once you understand this. Time limits on passive screen time make sense. An hour of YouTube is an hour you're not building anything. But active learning tools deserve more flexibility. If your daughter is working through geometry problems and losing track of time, that's usually fine. If your son is playing a coding game and suddenly it's bedtime, let it run another ten minutes.",
      "How do you tell if digital learning is actually working? Watch for these signs. Your child is frustrated by problems that are slightly too hard, not because they're giving up, but because they want to solve them. They're talking about what they learned, not what they watched. They ask to go back to the app, not because it's shiny, but because they want to finish something. They're making progress on actual skills, whether that's reading comprehension, multiplication, or problem-solving.",
      "The inverse signs matter too. Your child zones out within five minutes. They're making no progress after weeks of use. They only engage when you're watching. The app is full of ads and in-app purchases. These are signs the tool isn't working, no matter how educational it claims to be.",
      "Screen time isn't the enemy. Mindless screen time is. The goal isn't to eliminate digital learning but to be deliberate about it. Pick tools that make your child think, not just sit. Set boundaries that protect their time for other things, but don't punish active learning just because it's on a screen. And if you're still not sure whether something is worth their time, watch them use it for ten minutes. If they're thinking hard, it counts.",
    ],
  },

  "waec-vs-gcse": {
    title: "WAEC vs GCSE: Understanding Your Child's Exam Path",
    category: "Curricula",
    categoryColor: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30",
    date: "5 December 2025",
    readTime: "6 min read",
    metaDesc: "If your family spans Nigeria and the UK, this is what you need to know about each exam system and how they compare.",
    paragraphs: [
      "If your child attends school in Nigeria, they will likely take the West African Examinations Council (WAEC) exams. If they study in the UK, they will sit GCSEs. Both are serious qualifications, but they work quite differently. Understanding these differences matters if you have children in both systems, or if your family is considering a move between Nigeria and the UK.",
      "WAEC exams are taken by students in their final year of secondary school, typically when they turn 17 or 18. In Nigeria, this is usually in SS3 (Senior Secondary 3). The exam covers subjects like Mathematics, English Language, Biology, Chemistry, Physics, and others. Students take all their exams in a single sitting, usually spread over a few weeks. Results come back with grades ranging from A1 (highest) to F9 (lowest). This is the qualification students need to progress to university in Nigeria and most West African countries.",
      "GCSEs, by contrast, are taken by students in Year 11, which is typically age 15 or 16 in the UK. They are General Certificates of Secondary Education, and they represent the end of compulsory secondary schooling. Students take GCSEs across a range of subjects, graded on a scale of 9 (highest) to 1 (lowest), with students who don't meet the standard for a grade 1 receiving a U (ungraded). Typically, students sit around 8 to 10 GCSEs, depending on school policies and subject choices.",
      "The structure of these exams differs significantly. WAEC is assessment-heavy, with a single exam sitting defining your grade. For most subjects, your final mark comes down to that one examination. Some subjects include a practical component, but coursework is not typically part of WAEC. GCSEs, on the other hand, have evolved over the years. Different exam boards weight their GCSEs differently, but many include both written exams and controlled assessments. For example, in GCSE English Literature, students may have a final exam plus a response to unseen poetry, while in GCSE Science, there are often practical assessments that contribute to the final grade. This means GCSE success depends on performance spread across the whole course, not just a single exam day.",
      "Grading systems are completely different, and this can confuse families dealing with both. WAEC uses a 9-grade scale: A1, A2, B2, B3, C4, C5, D6, D7, E8, F9. The lower the number, the better the grade. A1 is excellent; F9 means you did not pass. GCSE uses a 9-to-1 scale where 9 is the highest and 1 is the lowest. A grade 4 is considered a \"standard pass\" and equivalent to the old C grade. Grade 5 is a \"strong pass.\" Universities and employers are increasingly looking for grade 5 or above in key subjects like Maths and English. There is no direct conversion between WAEC and GCSE grades, so it is difficult to say that an A1 in WAEC Mathematics is equivalent to a grade 9 in GCSE Mathematics, although both are top grades in their respective systems.",
      "Many subjects overlap between WAEC and GCSE. Mathematics and English Language are universal. Both systems test similar content at their core: arithmetic, algebra, geometry, and calculus in Maths; reading, writing, speaking, and listening in English. However, the emphasis and depth can differ. GCSE emphasizes functional mathematics and real-world application, while WAEC tends to be more traditional and formal. English teaching in UK schools emphasises critical analysis of texts and developing a personal voice, whereas WAEC English focuses more on comprehension and formal essay structure.",
      "Science subjects diverge more noticeably. In the UK, students typically take GCSE Biology, Chemistry, and Physics as separate subjects, or they take GCSE Science (double award), which covers all three. In Nigeria, WAEC also offers Biology, Chemistry, and Physics as separate subjects, but the curriculum structure is different. For example, WAEC Physics includes more traditional mechanics, while GCSE Physics has been updated to include contemporary topics like energy security and space exploration. The breadth is comparable, but the angle of approach differs.",
      "For families with children in both systems, the key is knowing that these are parallel qualifications, not directly comparable. A student earning an A1 in WAEC English and another earning a grade 9 in GCSE English have both achieved the highest standard in their respective system, but they may have been examined on slightly different content and skills. Universities in Nigeria recognise WAEC; universities in the UK recognise GCSE. If a child moves between countries after their exams, the qualification carries weight but is not automatically converted.",
      "Preparation strategies differ too. GCSE students in the UK have access to thousands of past papers. Every major exam board publishes papers going back many years, and teachers build entire revision programmes around these. Textbooks are widely available, and there is a large ecosystem of tutors, apps, and online resources designed specifically for GCSE. WAEC students have fewer published past papers in circulation. Past papers are available, but not to the same extent. Many Nigerian students rely more heavily on textbooks, class notes, and private tutoring. This can make GCSE preparation feel more structured and data-driven, while WAEC preparation often relies more on deep understanding of textbooks.",
      "If your family is moving from Nigeria to the UK mid-secondary school, be aware that a child partway through the Nigerian curriculum will likely need to catch up on GCSE-specific content and exam technique. The foundations in Maths and English are similar, but the way material is organised and examined is different. A child moving from the UK to Nigeria will have stronger fundamentals in some areas but may need to adjust to WAEC's more traditional style. It is not a matter of one system being harder than the other. They test similar knowledge through different lenses.",
      "The biggest practical difference for parents is this: GCSE is a standardised qualification recognised worldwide, especially valuable if your child might study abroad or work internationally. WAEC is the standard in West Africa and is respected in many Commonwealth countries and by international universities. Both open doors. The choice often comes down to geography, educational philosophy, and long-term plans. Many successful families use both systems, and children thrive in either with good support and preparation.",
    ],
  },

  "homework-battle-is-over": {
    title: "The Homework Battle Is Over: Why Gamified Learning Changes Everything",
    category: "Engagement",
    categoryColor: "bg-pink-100 dark:bg-pink-500/20 text-pink-900 dark:text-pink-300 border-pink-300 dark:border-pink-500/30",
    date: "10 November 2025",
    readTime: "4 min read",
    metaDesc: "What happens when homework stops feeling like homework? Children ask to do more. Here is what is behind it.",
    paragraphs: [
      "It's 7 PM on a Tuesday. Your child's homework sits on the kitchen table, untouched. You've asked twice. Then again. Now you're bribing, threatening, negotiating. By 8 PM, you're both exhausted and frustrated. Sound familiar?",
      "Most parents know this battle. The worksheets feel pointless. Your kid feels bored. Nothing gets better, yet somehow there's always more homework. You wonder if there's a better way, and there is. It's called gamified learning, and it's not what you probably think it is.",
      "The homework model we grew up with is broken for many kids. A worksheet arrives with no context, no immediate feedback, and no sense of progress. Your child solves five maths problems, but if they get three wrong, they don't know why until you check it hours later. By then, the learning moment has passed. There's no motivation built in, no reason to care. And every problem has the same difficulty, whether your child mastered this concept last week or is still struggling.",
      "This is where gamification enters, and it's worth understanding what that actually means. Nobody is talking about slapping stickers on worksheets or turning everything into a race. Real gamification in education means building systems that give immediate feedback, adapt to your child's level, and show progress in ways that matter to them. When your child answers a question correctly, they know instantly. When they get it wrong, they see the explanation right away, not the next evening. The difficulty adjusts up or down based on whether they're getting answers right. And instead of a vague \"good job,\" they see their score increase, a progress bar fill, or a skill level rise.",
      "The psychology here is worth understanding. Your child's brain releases dopamine when they solve a problem at the right difficulty level. Not too easy, not too hard. Just challenging enough to feel earned. Worksheets don't do this. But a system that adapts to your child's ability does it constantly. Add in a visible progress bar, a ranking system, or a digital pet that improves as they play, and you've created a reason to keep going that has nothing to do with you standing over them with a pencil.",
      "Here's a real example. I know a parent whose eight-year-old refused anything that looked like a worksheet. Maths homework was a nightmare. Then they tried an adaptive learning platform with missions, leaderboards, and a digital avatar that could be customized. Within a week, this child was asking to do maths practice. Not because they suddenly loved maths. But because they wanted to complete the next mission, move up the leaderboard, and earn a new hat for their avatar. The parent watched the maths skills improve too. This wasn't a kid playing a game instead of learning. This was a kid learning through a game because the game was built right.",
      "But here's the warning: not all gamified learning is created equal. Some apps are all game and almost no substance. Your child might get very good at tapping the screen and very little else. The rewards become the point instead of the learning. So how do you tell the difference?",
      "Watch what's actually happening. Is your child getting better at the subject matter itself? Can they solve similar problems in different contexts? If you ask them to explain what they've learned, do they understand it, or just know the game mechanics? This is the real test. A good gamified learning system makes the learning visible. You should be able to see that your child has mastered addition facts, then moved to addition with larger numbers, then learned two-digit addition. Each step builds on the last. The game elements make practice engaging, but the learning progression is real.",
      "Another thing to watch: effort versus results. The best systems reward effort and correct understanding, not just correctness. If your child gets an answer wrong but tries different approaches, that effort matters. If they get an answer right by guessing, that's less valuable. A well-designed system knows the difference. Cheap gamification just rewards right answers, which means your child might learn to rush through or pattern-match instead of actually thinking.",
      "The shift from homework battles to engaging practice happens when three things align: your child gets feedback instantly, the difficulty matches their level, and they can see themselves getting better. Stickers and leaderboards are nice, but they're the decoration around something more fundamental. The decoration just makes your child want to come back tomorrow.",
      "After years of the Tuesday night homework battle, many parents find that gamified learning isn't a replacement for all practice, but it changes the relationship with it entirely. Your child might still need traditional homework sometimes. But when you can hand them a tablet or computer and have them voluntarily practice for thirty minutes, knowing they're actually learning something real, the whole evening gets better.",
    ],
  },
};

/* ─── Metadata generation ──────────────────────────────────────────────────── */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: "Post Not Found — LaunchPard" };
  return {
    title: `${article.title} — LaunchPard Blog`,
    description: article.metaDesc,
  };
}

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

/* ─── Page component ───────────────────────────────────────────────────────── */

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#080c15] font-sans overflow-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo.svg" alt="LaunchPard" width={34} height={34} style={{ objectFit: "contain" }} />
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">LaunchPard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</Link>
            <Link href="/blog" className="text-indigo-600 dark:text-indigo-400">Blog</Link>
            <Link href="/subscribe" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <DarkModeToggle />
            <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap">Sign In</Link>
            <Link href="/signup" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ ARTICLE ═══ */}
      <article className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-8 transition-colors">
          <span>&larr;</span> Back to Blog
        </Link>

        {/* Hero Visual */}
        <div className="mb-8 rounded-2xl overflow-hidden">
          <BlogHeroVisual slug={slug} size="md" />
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${article.categoryColor}`}>
              {article.category}
            </span>
            <span className="text-slate-500 dark:text-slate-500 text-sm">{article.date}</span>
            <span className="text-slate-500 dark:text-slate-500 text-sm">{article.readTime}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
            {article.title}
          </h1>
        </div>

        {/* Body */}
        <div className="space-y-6">
          {article.paragraphs.map((p, i) => (
            <p key={i} className="text-[17px] leading-relaxed text-slate-700 dark:text-slate-300">
              {p}
            </p>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-[20px] p-8 sm:p-10 text-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
            Ready to see the difference?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            LaunchPard adapts to your child's level across Maths, English, and Science. Try it free for 30 days.
          </p>
          <Link href="/signup" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
            Start Your Child's Free Trial
          </Link>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-3">No credit card required</p>
        </div>
      </article>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 backdrop-blur">
        <div className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/40 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-5 text-center">Legal &amp; Resources</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
              {[
                { icon: "\ud83d\udccb", title: "Terms & Conditions", desc: "Your rights and obligations", href: "/terms" },
                { icon: "\ud83d\udd12", title: "Privacy Policy", desc: "How we protect your data", href: "/privacy-policy" },
                { icon: "\ud83c\udf6a", title: "Cookie Policy", desc: "What cookies we use", href: "/cookie-policy" },
                { icon: "\ud83d\udee1\ufe0f", title: "Safeguarding Policy", desc: "How we protect children", href: "/safeguarding" },
                { icon: "\ud83d\udcdd", title: "Blog", desc: "Learning insights & tips", href: "/blog" },
              ].map((d, i) => (
                <Link key={i} href={d.href} className="group flex items-start gap-3 bg-white dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 rounded-xl p-4 transition-all hover:shadow-sm backdrop-blur-xl">
                  <span className="text-xl flex-shrink-0 mt-0.5">{d.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight mb-1">{d.title}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{d.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-700 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="LaunchPard" width={24} height={24} style={{ objectFit: "contain" }} />
              <span className="font-bold text-slate-900 dark:text-slate-100">LaunchPard</span>
            </div>
            <p className="text-xs text-center">© 2026 LaunchPard Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
              <Link href="/cookie-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cookies</Link>
              <Link href="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</Link>
              <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.metaDesc,
            author: { "@type": "Organization", name: "LaunchPard" },
            publisher: { "@type": "Organization", name: "LaunchPard", url: "https://launchpard.com" },
          }),
        }}
      />
    </div>
  );
}
