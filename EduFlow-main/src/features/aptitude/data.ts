// Static aptitude question bank + deterministic set generator.
// 100 sets total: 1-33 Easy, 34-66 Medium, 67-100 Hard. 20 questions per set.

export type AptitudeCategory =
  | "Quantitative Aptitude"
  | "Logical Reasoning"
  | "Verbal Ability"
  | "Data Interpretation";

export type AptitudeDifficulty = "easy" | "medium" | "hard";

export type AptitudeQuestion = {
  id: string;
  category: AptitudeCategory;
  difficulty: AptitudeDifficulty;
  question: string;
  options: [string, string, string, string];
  answerIndex: number; // 0..3
};

export type AptitudeSet = {
  setNumber: number;
  difficulty: AptitudeDifficulty;
  category: AptitudeCategory;
  questions: AptitudeQuestion[];
};

export const TOTAL_SETS = 100;
export const QUESTIONS_PER_SET = 20;
export const EASY_COUNT = 33;
export const MEDIUM_COUNT = 33;
export const HARD_COUNT = TOTAL_SETS - EASY_COUNT - MEDIUM_COUNT; // 34

// ---------- Question bank ----------
// Compact, curated pool. Sets are formed by rotating through the pool per difficulty.

const QUANT_EASY: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "What is 15% of 200?", options: ["25", "30", "35", "40"], answerIndex: 1 },
  { question: "If a pen costs ₹12, how much do 8 pens cost?", options: ["₹86", "₹96", "₹104", "₹108"], answerIndex: 1 },
  { question: "The average of 10, 20, 30 is:", options: ["15", "20", "25", "30"], answerIndex: 1 },
  { question: "What is 3/4 as a decimal?", options: ["0.25", "0.5", "0.75", "0.8"], answerIndex: 2 },
  { question: "Solve: 24 ÷ 6 + 2 × 3", options: ["10", "12", "14", "18"], answerIndex: 0 },
  { question: "A train travels 60 km in 1.5 hours. Its speed is:", options: ["30 km/h", "40 km/h", "45 km/h", "50 km/h"], answerIndex: 1 },
  { question: "Simple interest on ₹1000 at 5% for 2 years:", options: ["₹50", "₹100", "₹150", "₹200"], answerIndex: 1 },
  { question: "The square root of 144 is:", options: ["10", "11", "12", "14"], answerIndex: 2 },
  { question: "What comes next: 2, 4, 8, 16, ?", options: ["18", "24", "32", "36"], answerIndex: 2 },
  { question: "Ratio 4:8 in simplest form is:", options: ["1:2", "2:3", "1:4", "2:4"], answerIndex: 0 },
];

const QUANT_MEDIUM: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "A shopkeeper marks up an item by 40% and gives 20% discount. Profit %?", options: ["8%", "12%", "16%", "20%"], answerIndex: 1 },
  { question: "The compound interest on ₹8000 at 10% p.a. for 2 years is:", options: ["₹1600", "₹1680", "₹1720", "₹1760"], answerIndex: 1 },
  { question: "If x + 1/x = 3, then x² + 1/x² = ?", options: ["5", "7", "9", "11"], answerIndex: 1 },
  { question: "A can do a job in 12 days, B in 18 days. Together?", options: ["6 days", "7.2 days", "8 days", "9 days"], answerIndex: 1 },
  { question: "Ratio of ages of A and B is 5:7. After 6 years it will be 3:4. A's age now:", options: ["24", "30", "35", "42"], answerIndex: 1 },
  { question: "A boat covers 24 km downstream in 3 hours and upstream in 4 hours. Speed of boat in still water:", options: ["6 km/h", "7 km/h", "8 km/h", "9 km/h"], answerIndex: 1 },
  { question: "Mean of 5 numbers is 20. If one is removed, mean becomes 18. Removed number:", options: ["25", "26", "28", "30"], answerIndex: 2 },
  { question: "How many 3-digit numbers can be formed using 1-9 without repetition?", options: ["504", "648", "729", "784"], answerIndex: 0 },
  { question: "The LCM of 12, 15, 20 is:", options: ["30", "45", "60", "120"], answerIndex: 2 },
  { question: "Area of a circle with radius 7 cm (π=22/7):", options: ["144 cm²", "154 cm²", "168 cm²", "196 cm²"], answerIndex: 1 },
];

const QUANT_HARD: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "A sum doubles in 8 years at simple interest. In how many years will it triple?", options: ["12", "14", "16", "18"], answerIndex: 2 },
  { question: "The value of (1.5)³ − (0.5)³ − 3 × 1.5 × 0.5 × (1.5 − 0.5) is:", options: ["0", "1", "1.5", "2"], answerIndex: 0 },
  { question: "A mixture has milk and water in ratio 5:3. Adding 8 L water makes it 5:5. Original mixture:", options: ["24 L", "32 L", "40 L", "48 L"], answerIndex: 1 },
  { question: "If log₂(x) = 5, then x = ?", options: ["10", "16", "25", "32"], answerIndex: 3 },
  { question: "The probability of drawing an ace from a standard deck:", options: ["1/13", "1/26", "1/52", "4/13"], answerIndex: 0 },
  { question: "Two pipes fill a tank in 12 and 18 min. A drain empties it in 36 min. Time to fill together:", options: ["8 min", "9 min", "10 min", "12 min"], answerIndex: 1 },
  { question: "If a² + b² = 29 and ab = 10, then (a + b)² = ?", options: ["39", "49", "59", "69"], answerIndex: 1 },
  { question: "Number of ways to arrange the word 'LEVEL':", options: ["30", "60", "90", "120"], answerIndex: 0 },
  { question: "Sum of first 20 natural numbers is:", options: ["190", "200", "210", "220"], answerIndex: 2 },
  { question: "A cone and cylinder have same base and height. Ratio of volumes:", options: ["1:2", "1:3", "2:3", "3:1"], answerIndex: 1 },
];

const LOGIC_EASY: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "Find the odd one out: Apple, Mango, Carrot, Banana", options: ["Apple", "Mango", "Carrot", "Banana"], answerIndex: 2 },
  { question: "If MONDAY is coded as NPOEBZ, TUESDAY is coded as:", options: ["UVFTEBZ", "UVFTFBZ", "UVFTEBY", "UVFTEBZ"], answerIndex: 0 },
  { question: "Series: A, C, E, G, ?", options: ["H", "I", "J", "K"], answerIndex: 1 },
  { question: "If South-East becomes North, then North-East becomes:", options: ["East", "West", "South", "North-West"], answerIndex: 1 },
  { question: "Pointing to a photo, Ram says 'She is my mother's daughter'. Who is she?", options: ["Mother", "Sister", "Aunt", "Cousin"], answerIndex: 1 },
  { question: "Which day is 3 days after Sunday?", options: ["Tuesday", "Wednesday", "Thursday", "Friday"], answerIndex: 1 },
  { question: "Odd one out: 3, 5, 7, 9, 11", options: ["3", "5", "9", "11"], answerIndex: 2 },
  { question: "If A=1, B=2, ... then CAB = ?", options: ["6", "9", "12", "18"], answerIndex: 0 },
  { question: "Series: 1, 4, 9, 16, ?", options: ["20", "24", "25", "36"], answerIndex: 2 },
  { question: "Which one is different: Dog, Cat, Cow, Lion, Tiger", options: ["Dog", "Cat", "Cow", "Lion"], answerIndex: 2 },
];

const LOGIC_MEDIUM: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "In a certain code, TREND is written as UQFMC. RESULT will be:", options: ["SDTTKS", "SFTVMU", "SDTTMS", "SFSTMU"], answerIndex: 0 },
  { question: "Statements: All roses are flowers. Some flowers fade quickly. Conclusion?", options: ["All roses fade", "Some roses fade", "No roses fade", "Cannot determine"], answerIndex: 3 },
  { question: "If '+' means '-', '-' means '×', '×' means '÷': 6 + 3 × 2 - 1 = ?", options: ["3.5", "4.5", "5", "6"], answerIndex: 0 },
  { question: "Series: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "48"], answerIndex: 2 },
  { question: "A is B's father. C is A's sister. D is C's mother. D is B's ?", options: ["Mother", "Grandmother", "Aunt", "Sister"], answerIndex: 1 },
  { question: "Find missing: AZ, BY, CX, ?", options: ["DV", "DW", "EW", "DU"], answerIndex: 1 },
  { question: "If TALK = 41, then WORK = ?", options: ["55", "58", "60", "62"], answerIndex: 2 },
  { question: "Which number replaces '?': 8, 24, 12, 36, 18, ?", options: ["44", "48", "54", "60"], answerIndex: 2 },
  { question: "A man walks 5 km north, 3 km east, 5 km south. Distance from start:", options: ["3 km", "5 km", "8 km", "13 km"], answerIndex: 0 },
  { question: "If BOOK = 41, then COOL = ?", options: ["41", "42", "43", "44"], answerIndex: 1 },
];

const LOGIC_HARD: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "Six friends sit in a row. A is between B and C. D is at one end. E is next to B but not A. Who is at the other end?", options: ["C", "E", "F", "Cannot say"], answerIndex: 3 },
  { question: "Statement: Some pens are pencils. All pencils are erasers. Conclusion?", options: ["Some pens are erasers", "All pens are erasers", "No pens are erasers", "None"], answerIndex: 0 },
  { question: "If in a code SUN=54, MOON=57, then STAR = ?", options: ["58", "60", "62", "65"], answerIndex: 3 },
  { question: "Series: 3, 8, 15, 24, 35, ?", options: ["46", "48", "50", "52"], answerIndex: 1 },
  { question: "5 people in a queue. A is 2nd from front. B is behind A. C is 4th from back. D is behind C. Position of E?", options: ["1st", "3rd", "5th", "Cannot determine"], answerIndex: 3 },
  { question: "Complete: 1, 1, 2, 3, 5, 8, 13, ?", options: ["18", "20", "21", "24"], answerIndex: 2 },
  { question: "If 8 × 6 = 42, 5 × 7 = 30, then 9 × 4 = ?", options: ["30", "32", "34", "36"], answerIndex: 0 },
  { question: "Deduction: No student is lazy. Some lazy people are talented. So:", options: ["No student is talented", "Some talented are not students", "All students are talented", "Cannot infer"], answerIndex: 1 },
  { question: "Coded: FRIEND → HTKGPF. ENEMY → ?", options: ["GPGOA", "GPGOB", "HRGOA", "GQGOA"], answerIndex: 0 },
  { question: "Missing: 7, 14, 28, 56, ?", options: ["84", "96", "108", "112"], answerIndex: 3 },
];

const VERBAL_EASY: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "Antonym of 'HAPPY':", options: ["Joyful", "Sad", "Cheerful", "Elated"], answerIndex: 1 },
  { question: "Synonym of 'BRAVE':", options: ["Cowardly", "Courageous", "Weak", "Timid"], answerIndex: 1 },
  { question: "Choose the correctly spelled word:", options: ["Recieve", "Receive", "Receeve", "Receve"], answerIndex: 1 },
  { question: "Fill in: She ___ to school every day.", options: ["go", "goes", "gone", "going"], answerIndex: 1 },
  { question: "Plural of 'child':", options: ["childs", "children", "childes", "childrens"], answerIndex: 1 },
  { question: "Meaning of 'FAST':", options: ["Slow", "Quick", "Late", "Idle"], answerIndex: 1 },
  { question: "Opposite of 'BEGIN':", options: ["Start", "End", "Open", "Continue"], answerIndex: 1 },
  { question: "Choose article: ___ apple a day keeps the doctor away.", options: ["A", "An", "The", "None"], answerIndex: 1 },
  { question: "Past tense of 'GO':", options: ["Goed", "Gone", "Went", "Going"], answerIndex: 2 },
  { question: "Synonym of 'BIG':", options: ["Small", "Large", "Tiny", "Little"], answerIndex: 1 },
];

const VERBAL_MEDIUM: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "Choose the correct sentence:", options: ["He don't like it", "He doesn't likes it", "He doesn't like it", "He not like it"], answerIndex: 2 },
  { question: "Antonym of 'ABUNDANT':", options: ["Plentiful", "Scarce", "Rich", "Ample"], answerIndex: 1 },
  { question: "Meaning of idiom 'Break the ice':", options: ["Start a conversation", "Freeze water", "Cool down", "End a fight"], answerIndex: 0 },
  { question: "Fill in: If I ___ rich, I would travel.", options: ["am", "was", "were", "be"], answerIndex: 2 },
  { question: "Synonym of 'MITIGATE':", options: ["Worsen", "Alleviate", "Enrage", "Ignite"], answerIndex: 1 },
  { question: "Choose correct: The team ___ playing well.", options: ["is", "are", "be", "were"], answerIndex: 0 },
  { question: "Antonym of 'TRANSPARENT':", options: ["Clear", "Opaque", "Bright", "Open"], answerIndex: 1 },
  { question: "Correctly punctuated:", options: ["Where are you?", "Where are you.", "Where are you!", "Where, are you?"], answerIndex: 0 },
  { question: "Meaning of 'PROCRASTINATE':", options: ["Hurry", "Delay", "Finish", "Cancel"], answerIndex: 1 },
  { question: "Change to passive: She writes a letter.", options: ["A letter is written by her", "A letter was written by her", "A letter written by her", "A letter is being wrote by her"], answerIndex: 0 },
];

const VERBAL_HARD: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "Meaning of 'UBIQUITOUS':", options: ["Rare", "Everywhere", "Hidden", "Ancient"], answerIndex: 1 },
  { question: "Antonym of 'EPHEMERAL':", options: ["Lasting", "Brief", "Fleeting", "Momentary"], answerIndex: 0 },
  { question: "Idiom 'Bite the bullet' means:", options: ["Give up", "Endure hardship", "Attack", "Chew slowly"], answerIndex: 1 },
  { question: "Correct sentence:", options: ["Neither of them are correct", "Neither of them is correct", "Neither of them were correct", "Neither of them be correct"], answerIndex: 1 },
  { question: "Synonym of 'PERFUNCTORY':", options: ["Thorough", "Careless", "Detailed", "Passionate"], answerIndex: 1 },
  { question: "Analogy: BOOK : READER :: FILM : ?", options: ["Director", "Camera", "Viewer", "Cinema"], answerIndex: 2 },
  { question: "Meaning of 'PARADIGM':", options: ["Paradox", "Model", "Puzzle", "Parallel"], answerIndex: 1 },
  { question: "Antonym of 'BENEVOLENT':", options: ["Kind", "Malevolent", "Generous", "Charitable"], answerIndex: 1 },
  { question: "Correct: The number of students ___ increasing.", options: ["are", "is", "were", "have"], answerIndex: 1 },
  { question: "Idiom 'Hit the nail on the head' means:", options: ["Miss the point", "Be exactly right", "Injure oneself", "Repair something"], answerIndex: 1 },
];

const DI_EASY: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "A bar chart shows sales: Jan 100, Feb 150, Mar 200. Total sales:", options: ["350", "400", "450", "500"], answerIndex: 2 },
  { question: "If a class has 40 boys and 60 girls, % of girls:", options: ["40%", "50%", "55%", "60%"], answerIndex: 3 },
  { question: "In a pie chart, 25% represents how many degrees?", options: ["60°", "72°", "90°", "120°"], answerIndex: 2 },
  { question: "Average of sales 100, 200, 300, 400 is:", options: ["200", "250", "300", "350"], answerIndex: 1 },
  { question: "If ratio of A:B:C is 2:3:5 and total is 100, C = ?", options: ["30", "40", "50", "60"], answerIndex: 2 },
  { question: "A survey: 60% like tea. If 300 surveyed, tea lovers:", options: ["120", "150", "180", "200"], answerIndex: 2 },
  { question: "Chart: Product X profit went from ₹500 to ₹700. % increase:", options: ["20%", "30%", "40%", "50%"], answerIndex: 2 },
  { question: "In 4 quarters, sales were 25, 35, 40, 50. Best quarter:", options: ["Q1", "Q2", "Q3", "Q4"], answerIndex: 3 },
  { question: "If 20 out of 50 pass, pass %:", options: ["30%", "40%", "50%", "60%"], answerIndex: 1 },
  { question: "Sum of angles in a pie chart:", options: ["180°", "270°", "360°", "720°"], answerIndex: 2 },
];

const DI_MEDIUM: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "Sales of A: 200, 250, 300. Sales of B: 150, 200, 350. Total B sales exceed A by:", options: ["0", "50", "100", "150"], answerIndex: 0 },
  { question: "In a pie chart, expenses on Food = 108°. If total is ₹36000, food expense:", options: ["₹9000", "₹10800", "₹12000", "₹14400"], answerIndex: 1 },
  { question: "Profit % if CP=₹400 and SP=₹500:", options: ["20%", "25%", "30%", "40%"], answerIndex: 1 },
  { question: "Average speed if 60 km at 30 km/h and 60 km at 60 km/h:", options: ["40 km/h", "45 km/h", "50 km/h", "55 km/h"], answerIndex: 0 },
  { question: "If population increases from 8000 to 10000 in 2 years, avg annual growth:", options: ["10%", "12.5%", "15%", "20%"], answerIndex: 1 },
  { question: "A table: Runs by 4 players: 30, 45, 60, 25. Median:", options: ["30", "37.5", "45", "60"], answerIndex: 1 },
  { question: "If a chart shows revenue rose by 20% then fell by 20%, net change:", options: ["+4%", "0%", "-4%", "-8%"], answerIndex: 2 },
  { question: "Two products A and B: A sold 1200, B sold 800 units. Ratio A:B:", options: ["2:1", "3:1", "3:2", "4:3"], answerIndex: 2 },
  { question: "If 45% students pass in math and 60% in science, and 30% pass both, % pass in at least one:", options: ["60%", "70%", "75%", "85%"], answerIndex: 2 },
  { question: "Line graph: values 5, 10, 20, 40. Common ratio:", options: ["1.5", "2", "2.5", "3"], answerIndex: 1 },
];

const DI_HARD: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[] = [
  { question: "A pie chart shows 4 departments totaling ₹80L. If Sales is 45%, Sales revenue:", options: ["₹28L", "₹32L", "₹36L", "₹40L"], answerIndex: 2 },
  { question: "Revenue: Y1=₹200, Y2=₹250, Y3=₹350, Y4=₹500. CAGR (approx):", options: ["18%", "22%", "26%", "35%"], answerIndex: 3 },
  { question: "If a table shows 5 items each with prices, and average is 40, total is:", options: ["160", "180", "200", "220"], answerIndex: 2 },
  { question: "In a bar chart of exports (in ₹Cr): A=120, B=150, C=180, D=90. % share of C:", options: ["25%", "30%", "33.3%", "40%"], answerIndex: 2 },
  { question: "If a graph shows 60% of ₹5000 spent, remaining:", options: ["₹1500", "₹2000", "₹2500", "₹3000"], answerIndex: 1 },
  { question: "A company revenue grew from 50L to 200L in 4 years. Total growth %:", options: ["150%", "200%", "250%", "300%"], answerIndex: 3 },
  { question: "If ratio of expenditures A:B:C = 3:4:5 with total ₹1200, B spends:", options: ["₹300", "₹400", "₹500", "₹600"], answerIndex: 1 },
  { question: "Table: Quarterly profits 10, 25, 30, 45. Q4 as % of total:", options: ["25%", "30%", "40%", "50%"], answerIndex: 2 },
  { question: "A pie chart of 720 students: Science 40%, Commerce 35%, Arts 25%. Science students:", options: ["252", "270", "288", "300"], answerIndex: 2 },
  { question: "If A:B = 2:3 and B:C = 4:5, then A:B:C =", options: ["8:12:15", "2:3:5", "4:6:9", "8:15:20"], answerIndex: 0 },
];

function build(
  pool: Omit<AptitudeQuestion, "id" | "difficulty" | "category">[],
  category: AptitudeCategory,
  difficulty: AptitudeDifficulty,
): AptitudeQuestion[] {
  return pool.map((q, i) => ({
    ...q,
    id: `${category}-${difficulty}-${i}`,
    category,
    difficulty,
  }));
}

const POOLS: Record<AptitudeDifficulty, Record<AptitudeCategory, AptitudeQuestion[]>> = {
  easy: {
    "Quantitative Aptitude": build(QUANT_EASY, "Quantitative Aptitude", "easy"),
    "Logical Reasoning": build(LOGIC_EASY, "Logical Reasoning", "easy"),
    "Verbal Ability": build(VERBAL_EASY, "Verbal Ability", "easy"),
    "Data Interpretation": build(DI_EASY, "Data Interpretation", "easy"),
  },
  medium: {
    "Quantitative Aptitude": build(QUANT_MEDIUM, "Quantitative Aptitude", "medium"),
    "Logical Reasoning": build(LOGIC_MEDIUM, "Logical Reasoning", "medium"),
    "Verbal Ability": build(VERBAL_MEDIUM, "Verbal Ability", "medium"),
    "Data Interpretation": build(DI_MEDIUM, "Data Interpretation", "medium"),
  },
  hard: {
    "Quantitative Aptitude": build(QUANT_HARD, "Quantitative Aptitude", "hard"),
    "Logical Reasoning": build(LOGIC_HARD, "Logical Reasoning", "hard"),
    "Verbal Ability": build(VERBAL_HARD, "Verbal Ability", "hard"),
    "Data Interpretation": build(DI_HARD, "Data Interpretation", "hard"),
  },
};

const CATEGORY_CYCLE: AptitudeCategory[] = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Data Interpretation",
];

export function difficultyOfSet(setNumber: number): AptitudeDifficulty {
  if (setNumber <= EASY_COUNT) return "easy";
  if (setNumber <= EASY_COUNT + MEDIUM_COUNT) return "medium";
  return "hard";
}

export function categoryOfSet(setNumber: number): AptitudeCategory {
  return CATEGORY_CYCLE[(setNumber - 1) % CATEGORY_CYCLE.length];
}

// Deterministic Fisher-Yates using seeded RNG
function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function getSet(setNumber: number): AptitudeSet {
  const difficulty = difficultyOfSet(setNumber);
  const category = categoryOfSet(setNumber);
  const primary = POOLS[difficulty][category];
  // Blend in extra questions from other categories at same difficulty to reach 20
  const others = CATEGORY_CYCLE.filter((c) => c !== category).flatMap((c) => POOLS[difficulty][c]);
  const combined = [...primary, ...others];

  const rng = seededRng(setNumber * 9973 + 17);
  const arr = combined.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const questions = arr.slice(0, QUESTIONS_PER_SET).map((q, i) => ({
    ...q,
    id: `set${setNumber}-q${i + 1}`,
  }));
  return { setNumber, difficulty, category, questions };
}

export function listSets(): { setNumber: number; difficulty: AptitudeDifficulty; category: AptitudeCategory }[] {
  return Array.from({ length: TOTAL_SETS }, (_, i) => {
    const n = i + 1;
    return { setNumber: n, difficulty: difficultyOfSet(n), category: categoryOfSet(n) };
  });
}

export function chunkSets(size = 10) {
  const all = listSets();
  const chunks: { label: string; start: number; end: number; sets: typeof all }[] = [];
  for (let i = 0; i < all.length; i += size) {
    chunks.push({
      label: `Sets ${i + 1}–${Math.min(i + size, all.length)}`,
      start: i + 1,
      end: Math.min(i + size, all.length),
      sets: all.slice(i, i + size),
    });
  }
  return chunks;
}
