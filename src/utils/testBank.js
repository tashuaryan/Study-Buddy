// Study levels and subjects (same as the AI Tutor setup)
export const LEVELS = [
  { id: 'c1-2', label: 'Class 1–2', age: 'Age 6–8' },
  { id: 'c3-5', label: 'Class 3–5', age: 'Age 8–11' },
  { id: 'c6-8', label: 'Class 6–8', age: 'Age 11–14' },
  { id: 'c9-10', label: 'Class 9–10', age: 'Age 14–16' },
  { id: 'c11-12', label: 'Class 11–12', age: 'Age 16–18' },
  { id: 'uni', label: 'University', age: 'Age 18+' },
]
export const SUBJECTS = ['All Subjects', 'Math', 'Science', 'History', 'English', 'Programming', 'Geography', 'Economics']

// To add a quiz: copy one line below. Question format: [question, [4 options], correctIndex, 'short explanation']
// mark = [marks for right answer, marks lost for wrong answer]
const T = (id, level, subject, chapter, minutes, qs, mark = [1, 0]) => ({
  id, level, subject, chapter, title: chapter, minutes, mark,
  qs: qs.map(([q, o, a, e]) => ({ q, o, a, e })),
})

export const BUILT_IN = [
  T('m12-count', 'c1-2', 'Math', 'Counting and Adding', 5, [
    ['5 + 3 = ?', ['6', '7', '8', '9'], 2, '5 and 3 more makes 8.'],
    ['Which number comes after 19?', ['18', '20', '21', '29'], 1],
    ['10 − 4 = ?', ['5', '6', '7', '14'], 1],
    ['How many sides does a triangle have?', ['2', '3', '4', '5'], 1],
    ['Which is the biggest number?', ['45', '54', '39', '51'], 1],
  ]),
  T('s35-plants', 'c3-5', 'Science', 'Plants and Animals', 8, [
    ['Which part of a plant takes in water from the soil?', ['Roots', 'Leaves', 'Flowers', 'Stem'], 0],
    ['Plants make their food by a process called:', ['Digestion', 'Photosynthesis', 'Respiration', 'Evaporation'], 1],
    ['Which of these is a mammal?', ['Frog', 'Snake', 'Whale', 'Eagle'], 2, 'Whales breathe air and feed milk to their young.'],
    ['Animals that eat only plants are called:', ['Carnivores', 'Herbivores', 'Omnivores', 'Decomposers'], 1],
    ['Which gas do we breathe in to stay alive?', ['Carbon dioxide', 'Nitrogen', 'Oxygen', 'Helium'], 2],
  ]),
  T('m68-frac', 'c6-8', 'Math', 'Fractions and Decimals', 8, [
    ['1/2 + 1/4 = ?', ['2/6', '3/4', '1/6', '2/4'], 1, '1/2 = 2/4, so 2/4 + 1/4 = 3/4.'],
    ['Decimal form of 3/4 is:', ['0.34', '0.75', '0.43', '0.25'], 1],
    ['Which fraction is the greatest?', ['1/2', '2/3', '3/5', '1/3'], 1, '2/3 ≈ 0.67, 3/5 = 0.6, 1/2 = 0.5.'],
    ['0.5 × 0.2 = ?', ['1.0', '0.1', '0.01', '0.7'], 1],
    ['3/5 as a percentage is:', ['30%', '35%', '60%', '53%'], 2],
  ]),
  T('g68-earth', 'c6-8', 'Geography', 'Our Earth', 8, [
    ['Which is the outermost layer of the Earth?', ['Mantle', 'Crust', 'Outer core', 'Inner core'], 1],
    ['Which is the largest continent by area?', ['Africa', 'Europe', 'Asia', 'Australia'], 2],
    ['Which imaginary line divides the Earth into Northern and Southern Hemispheres?', ['Prime Meridian', 'Equator', 'Tropic of Cancer', 'Tropic of Capricorn'], 1],
    ['The Earth takes about how long to revolve once around the Sun?', ['24 hours', '30 days', 'About 365 days', '7 days'], 2],
    ["The Earth's rotation causes:", ['Seasons', 'Day and night', 'Only tides', 'Eclipses'], 1],
  ]),
  T('m910-quad', 'c9-10', 'Math', 'Quadratic Equations', 10, [
    ['The standard form of a quadratic equation is:', ['ax + b = 0', 'ax² + bx + c = 0, a ≠ 0', 'ax³ + bx² + c = 0', 'a/x + b = 0'], 1],
    ['The roots of x² − 5x + 6 = 0 are:', ['2 and 3', '−2 and −3', '1 and 6', '−1 and −6'], 0, '(x − 2)(x − 3) = 0.'],
    ['The discriminant of ax² + bx + c = 0 is:', ['b² + 4ac', 'b² − 4ac', '4ac − b²', 'a² − 4bc'], 1],
    ['If the discriminant is zero, the roots are:', ['Not real', 'Real and equal', 'Real and distinct', 'Imaginary'], 1],
    ['The sum of the roots of x² − 7x + 12 = 0 is:', ['7', '−7', '12', '4'], 0, 'Sum of roots = −b/a = 7.'],
  ]),
  T('s910-chem', 'c9-10', 'Science', 'Chemical Reactions and Equations', 10, [
    ['Rusting of iron is:', ['A physical change', 'A chemical change', 'A nuclear change', 'No change'], 1],
    ['2Mg + O₂ → 2MgO is a:', ['Decomposition reaction', 'Combination reaction', 'Displacement reaction', 'Double displacement reaction'], 1],
    ['Why must a chemical equation be balanced?', ['To follow the law of conservation of mass', 'To make the reaction faster', 'To change the colour', 'To release heat'], 0],
    ['Which gas is released when zinc reacts with dilute HCl?', ['Oxygen', 'Hydrogen', 'Carbon dioxide', 'Chlorine'], 1],
    ['Which of these is an exothermic reaction?', ['Photosynthesis', 'Burning of natural gas', 'Thermal decomposition of CaCO₃', 'Melting of ice'], 1],
  ]),
  T('h910-french', 'c9-10', 'History', 'The French Revolution', 8, [
    ['The French Revolution began in the year:', ['1776', '1789', '1815', '1848'], 1],
    ['The storming of which prison on 14 July 1789 marked its start?', ['Louvre', 'Bastille', 'Versailles', 'Tuileries'], 1],
    ['The famous slogan of the French Revolution was:', ['Liberty, Equality, Fraternity', 'Peace, Land and Bread', 'Unity, Faith, Discipline', 'Truth, Justice, Honour'], 0],
    ['Which king was executed in 1793?', ['Louis XIV', 'Louis XV', 'Louis XVI', 'Charles X'], 2],
    ['Who took power in France in 1799?', ['Robespierre', 'Napoleon Bonaparte', 'Danton', 'Lafayette'], 1],
  ]),
  T('e910-tense', 'c9-10', 'English', 'Tenses', 6, [
    ['She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 1],
    ['They ___ playing football now.', ['is', 'are', 'was', 'be'], 1],
    ['The past tense of "begin" is:', ['began', 'begun', 'beginned', 'begining'], 0],
    ['I have ___ my homework.', ['do', 'did', 'done', 'doing'], 2],
    ['By next year, he ___ finished college.', ['has', 'had', 'will have', 'is'], 2],
  ]),
  T('s1112-motion', 'c11-12', 'Science', 'Physics: Laws of Motion (NEET style)', 10, [
    ['The SI unit of force is:', ['Joule', 'Newton', 'Watt', 'Pascal'], 1],
    ['A 2 kg body accelerates at 3 m/s². The net force on it is:', ['1.5 N', '5 N', '6 N', '9 N'], 2, 'F = ma = 2 × 3.'],
    ["Newton's first law is also known as the law of:", ['Action-reaction', 'Inertia', 'Gravitation', 'Energy'], 1],
    ['The rate of change of momentum of a body equals:', ['Force', 'Work', 'Power', 'Velocity'], 0],
    ['A 5 kg block on a frictionless surface is pushed with 10 N. Its acceleration is:', ['0.5 m/s²', '2 m/s²', '5 m/s²', '50 m/s²'], 1],
  ], [4, 1]),
  T('p1112-py', 'c11-12', 'Programming', 'Python Basics', 6, [
    ['What does print(2 ** 3) output?', ['6', '8', '9', '23'], 1],
    ['Which of these data types is mutable?', ['tuple', 'str', 'list', 'int'], 2],
    ['Which keyword defines a function in Python?', ['func', 'define', 'def', 'function'], 2],
    ['What is len("hello")?', ['4', '5', '6', 'Error'], 1],
    ['What is the type of 3.0 in Python?', ['int', 'float', 'str', 'double'], 1],
  ]),
  T('e-uni-ds', 'uni', 'Economics', 'Demand and Supply', 8, [
    ['The law of demand says that when price rises, quantity demanded:', ['Falls', 'Rises', 'Stays the same', 'Doubles'], 0, 'Other things being equal.'],
    ['Market equilibrium occurs where:', ['Demand exceeds supply', 'Supply exceeds demand', 'Quantity demanded equals quantity supplied', 'Price is zero'], 2],
    ['When consumer income rises, the demand curve for a normal good shifts:', ['Left', 'Right', 'Up along the same curve', 'It does not shift'], 1],
    ['A price ceiling set below the equilibrium price leads to:', ['A surplus', 'A shortage', 'Equilibrium', 'Higher quality'], 1],
    ['If price elasticity of demand is greater than 1, demand is:', ['Inelastic', 'Unit elastic', 'Elastic', 'Perfectly inelastic'], 2],
  ]),
]
