/**
 * Karel Programming Language - Built-in Examples Library
 * Complete with code and initial world states in both Czech and English.
 */

export const Examples = [
  {
    id: 'first_steps',
    title: { cs: '1. První kroky', en: '1. First Steps' },
    desc: {
      cs: 'Základní pohyby, pokládání a zvedání značek.',
      en: 'Basic movements, placing and picking beepers.',
    },
    world: {
      width: 8,
      height: 8,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `// ==========================================
// VÍTEJTE V JAZYCE ROBOT KAREL!
// ------------------------------------------
// Tento program ukazuje základní strukturu kódu:
// 1. Karel provádí příkazy popořadě shora dolů.
// 2. Položí 3 značky v řadě, otočí se a položí další.
//
// Stiskněte tlačítko [▶ Spustit] nebo [⏭ Krok].
// ==========================================

KROK          // Popojít o jedno pole vpřed
POLOZ         // Položit značku z kapsy
KROK
POLOZ
KROK
POLOZ

VLEVO-BOK     // Otočit se o 90 stupňů doleva (na Sever)
KROK
POLOZ
`,
      en: `// ==========================================
// WELCOME TO KAREL THE ROBOT!
// ------------------------------------------
// This program demonstrates basic code structure:
// 1. Karel executes commands in sequence top to bottom.
// 2. Places 3 beepers in a row, turns North, and puts one more.
//
// Click [▶ Run] or [⏭ Step] to execute.
// ==========================================

STEP          // Move forward one corner
PUT           // Put a beeper from the bag
STEP
PUT
STEP
PUT

TURN_LEFT     // Turn 90 degrees counter-clockwise (North)
STEP
PUT
`,
    },
  },

  {
    id: 'code_structure_tutorial',
    title: { cs: '2. Jak strukturovat program (Vzor)', en: '2. Code Structure Tutorial' },
    desc: {
      cs: 'Kompletní ukázka struktury: vlastní příkazy, cyklus OPAKUJ, cyklus DOKUD a podmínka KDYŽ.',
      en: 'Complete structural demonstration: custom procedures, REPEAT loops, WHILE loops, and IF conditions.',
    },
    world: {
      width: 10,
      height: 8,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [
        ['3,1', 1],
        ['5,1', 2],
      ],
    },
    code: {
      cs: `// ==========================================
// PŘÍRUČKA STRUKTURY KÓDU V ROBOTU KARLOVI
// ==========================================

// 1. DEFINICE VLASTNÍHO PŘÍKAZU (PROCEDURY)
// Každá definice začíná slovem PRIKAZ a končí KONEC.
PRIKAZ OBRAT-SE
  VLEVO-BOK
  VLEVO-BOK
KONEC

PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// 2. HLAVNÍ TĚLO PROGRAMU
// Příkazy se vykonávají shora dolů.

// Cyklus s pevným počtem opakování (OPAKUJ n KRAT ... KONEC):
OPAKUJ 2 KRAT
  KROK
  POLOZ
KONEC

// Podmíněný cyklus (DOKUD ... KONEC):
// Běží tak dlouho, dokud podmínka platí.
DOKUD NENI ZED
  // Podmínka s větvením (KDYZ ... JINAK ... KONEC):
  KDYZ JE CIP
    ZVEDNI       // Pokud je pod Karlem značka, zvedni ji
  JINAK
    POLOZ        // Jinak polož novou značku
  KONEC
  KROK
KONEC

// Použití našeho nového vlastního příkazu:
OBRAT-SE
`,
      en: `// ==========================================
// CODE STRUCTURE TUTORIAL IN KAREL
// ==========================================

// 1. DEFINING A CUSTOM PROCEDURE
// Every procedure begins with DEFINE and finishes with END.
DEFINE TURN_AROUND
  TURN_LEFT
  TURN_LEFT
END

DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// 2. MAIN PROGRAM BODY
// Commands are executed sequentially from top to bottom.

// Repeat loop (REPEAT n TIMES ... END):
REPEAT 2 TIMES
  STEP
  PUT
END

// Conditional loop (WHILE ... END):
// Runs as long as the condition evaluates to true.
WHILE FRONT_IS_CLEAR
  // Branching conditional (IF ... ELSE ... END):
  IF BEEPER
    PICK         // If beeper is present, pick it up
  ELSE
    PUT          // Otherwise place a new beeper
  END
  STEP
END

// Invoking our custom defined procedure:
TURN_AROUND
`,
    },
  },

  {
    id: 'square_patrol',
    title: { cs: '3. Obchůzka čtverce (Procedury & Cykly)', en: '3. Square Patrol (Procedures & Loops)' },
    desc: {
      cs: 'Definice vlastního příkazu VPRAVO-BOK a cyklus OPAKUJ.',
      en: 'Defining a custom TURN_RIGHT command and REPEAT loop.',
    },
    world: {
      width: 8,
      height: 8,
      karel: { x: 2, y: 2, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `// Vlastní příkaz pro otočení vpravo
PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// Obejdi čtverec a v každém rohu polož značku
OPAKUJ 4 KRAT
  OPAKUJ 3 KRAT
    KROK
  KONEC
  POLOZ
  VLEVO-BOK
KONEC
`,
      en: `// Define procedure to turn right
DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// Patrol a square and place a beeper at each corner
REPEAT 4 TIMES
  REPEAT 3 TIMES
    STEP
  END
  PUT
  TURN_LEFT
END
`,
    },
  },

  {
    id: 'harvest_row',
    title: { cs: '4. Sklizeň řádku (Podmínky a DOKUD)', en: '4. Harvest Row (While & Conditions)' },
    desc: {
      cs: 'Karel projde řadu až ke zdi a posbírá všechny značky, které najde.',
      en: 'Karel walks to the wall and collects all beepers in its path.',
    },
    world: {
      width: 10,
      height: 6,
      karel: { x: 1, y: 3, dir: 'EAST', bag: 0 },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [
        ['2,3', 1],
        ['4,3', 3],
        ['5,3', 1],
        ['7,3', 2],
        ['9,3', 1],
      ],
    },
    code: {
      cs: `// Posbírej všechny značky na aktuálním políčku
PRIKAZ SEBER-VSE
  DOKUD JE CIP
    ZVEDNI
  KONEC
KONEC

// Projdi celou ulici až ke zdi
SEBER-VSE
DOKUD NENI ZED
  KROK
  SEBER-VSE
KONEC
`,
      en: `// Collect all beepers at the current corner
DEFINE PICK_ALL
  WHILE BEEPER
    PICK
  END
END

// Walk the entire street to the wall and collect
PICK_ALL
WHILE FRONT_IS_CLEAR
  STEP
  PICK_ALL
END
`,
    },
  },

  {
    id: 'maze_runner',
    title: { cs: '5. Únik z bludiště (Pravidlo pravé ruky)', en: '5. Maze Runner (Right-Hand Rule)' },
    desc: {
      cs: 'Algoritmus sledování pravé zdi k nalezení cíle označeného značkou.',
      en: 'Right-hand wall following algorithm to reach the target beeper.',
    },
    world: {
      width: 9,
      height: 9,
      karel: { x: 1, y: 1, dir: 'NORTH', bag: 0 },
      verticalWalls: [
        'v:1:2', 'v:1:3', 'v:1:4', 'v:1:5', 'v:1:6', 'v:1:7',
        'v:2:2', 'v:2:4', 'v:2:7',
        'v:3:1', 'v:3:3', 'v:3:5', 'v:3:6',
        'v:4:2', 'v:4:4', 'v:4:7', 'v:4:8',
        'v:5:3', 'v:5:5', 'v:5:6',
        'v:6:1', 'v:6:2', 'v:6:4', 'v:6:7',
        'v:7:3', 'v:7:5', 'v:7:6', 'v:7:8',
      ],
      horizontalWalls: [
        'h:2:1', 'h:4:1', 'h:7:1', 'h:8:1',
        'h:1:2', 'h:3:2', 'h:5:2', 'h:7:2',
        'h:2:3', 'h:4:3', 'h:6:3', 'h:8:3',
        'h:3:4', 'h:5:4', 'h:7:4',
        'h:2:5', 'h:4:5', 'h:6:5', 'h:8:5',
        'h:1:6', 'h:3:6', 'h:5:6',
        'h:2:7', 'h:4:7', 'h:6:7', 'h:8:7',
      ],
      beepers: [
        ['5,5', 5], // Goal in the maze center!
      ],
    },
    code: {
      cs: `// Algoritmus sledování pravé ruky
PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// Hledej cíl (dokud nenarazíš na značku)
DOKUD NENI CIP
  VPRAVO-BOK
  KDYZ NENI ZED
    KROK
  JINAK
    VLEVO-BOK
    KDYZ NENI ZED
      KROK
    JINAK
      VLEVO-BOK
      KDYZ NENI ZED
        KROK
      JINAK
        VLEVO-BOK
      KONEC
    KONEC
  KONEC
KONEC
`,
      en: `// Right-hand rule maze solver
DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// Search until Karel reaches the beeper
WHILE NOT BEEPER
  TURN_RIGHT
  IF FRONT_IS_CLEAR
    STEP
  ELSE
    TURN_LEFT
    IF FRONT_IS_CLEAR
      STEP
    ELSE
      TURN_LEFT
      IF FRONT_IS_CLEAR
        STEP
      ELSE
        TURN_LEFT
      END
    END
  END
END
`,
    },
  },

  {
    id: 'pyramid_stairs',
    title: { cs: '6. Stavba schodiště (Pyramida)', en: '6. Staircase Builder (Pyramid)' },
    desc: {
      cs: 'Karel postaví stupňovité schodiště ze značek.',
      en: 'Karel constructs a step pyramid using beepers.',
    },
    world: {
      width: 9,
      height: 7,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

PRIKAZ JEDEN-SCHOD
  POLOZ
  VLEVO-BOK
  KROK
  VPRAVO-BOK
  KROK
KONEC

// Postav 5 schodů nahoru
OPAKUJ 5 KRAT
  JEDEN-SCHOD
KONEC
POLOZ
`,
      en: `DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

DEFINE ONE_STEP
  PUT
  TURN_LEFT
  STEP
  TURN_RIGHT
  STEP
END

// Build 5 steps upward
REPEAT 5 TIMES
  ONE_STEP
END
PUT
`,
    },
  },

  {
    id: 'letter_k',
    title: { cs: '7. Nápis písmene "K"', en: '7. Draw Letter "K"' },
    desc: {
      cs: 'Karel vykreslí své začáteční písmeno K ze značek.',
      en: 'Karel draws its initial letter "K" using beepers.',
    },
    world: {
      width: 9,
      height: 9,
      karel: { x: 2, y: 2, dir: 'NORTH', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

PRIKAZ CELEM-VZAD
  VLEVO-BOK
  VLEVO-BOK
KONEC

// 1. Svislá čára písmene K (5 značek)
OPAKUJ 4 KRAT
  POLOZ
  KROK
KONEC
POLOZ

// 2. Návrat do středu (3. pozice)
CELEM-VZAD
KROK
KROK
VLEVO-BOK

// 3. Horní šikmé rameno
KROK
VLEVO-BOK
KROK
POLOZ
VPRAVO-BOK
KROK
VLEVO-BOK
KROK
POLOZ

// 4. Dolní rameno
CELEM-VZAD
KROK
VPRAVO-BOK
KROK
KROK
VPRAVO-BOK
KROK
POLOZ
VLEVO-BOK
KROK
VPRAVO-BOK
KROK
POLOZ
`,
      en: `DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

DEFINE TURN_AROUND
  TURN_LEFT
  TURN_LEFT
END

// 1. Vertical backbone of letter K
REPEAT 4 TIMES
  PUT
  STEP
END
PUT

// 2. Return to center
TURN_AROUND
STEP
STEP
TURN_LEFT

// 3. Upper diagonal
STEP
TURN_LEFT
STEP
PUT
TURN_RIGHT
STEP
TURN_LEFT
STEP
PUT

// 4. Lower diagonal
TURN_AROUND
STEP
TURN_RIGHT
STEP
STEP
TURN_RIGHT
STEP
PUT
TURN_LEFT
STEP
TURN_RIGHT
STEP
PUT
`,
    },
  },

  {
    id: 'checkerboard_modulo',
    title: { cs: '8. Šachovnice (Proměnné & Modulo)', en: '8. Checkerboard (Variables & Modulo)' },
    desc: {
      cs: 'Použití proměnných (LET idx idx + 1) a operátoru modulo % pro střídavé kladení značek.',
      en: 'Using variables (LET idx idx + 1) and modulo operator % for alternating beepers.',
    },
    world: {
      width: 8,
      height: 4,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `// ==========================================
// ŠACHOVNICE S VYUŽITÍM PROMĚNNÝCH A MODULO
// Demonstrace: LET idx idx + 1, modulo %
// ==========================================

LET idx 0

DOKUD NENI ZED
  // Podmínka s modulo: sudé pole má idx % 2 == 0
  KDYZ idx % 2 == 0
    POLOZ
  KONEC
  KROK
  LET idx idx + 1
KONEC

// Ošetření posledního políčka u zdi
KDYZ idx % 2 == 0
  POLOZ
KONEC
`,
      en: `// ==========================================
// CHECKERBOARD USING VARIABLES & MODULO
// Demonstrating: LET idx idx + 1, modulo %
// ==========================================

LET idx 0

WHILE FRONT_IS_CLEAR
  // Modulo condition: even tiles have idx % 2 == 0
  IF idx % 2 == 0
    PUT
  END
  STEP
  LET idx idx + 1
END

// Handle the final tile at the wall
IF idx % 2 == 0
  PUT
END
`,
    },
  },

  {
    id: 'sine_wave_20x20',
    title: {
      cs: '9. Sinusovka na mřížce 20×20 (Funkce, kdeX/kdeY, sin)',
      en: '9. Sine Wave on 20×20 Grid (Functions, whereX/whereY, sin)',
    },
    desc: {
      cs: 'Karel vykreslí sinusovku v mřížce 20×20 pomocí vlastní funkce, parametrů, souřadnic kdeX/kdeY a goniometrické funkce sin/round.',
      en: 'Karel plots a sine wave on a 20×20 grid using custom functions, parameters, whereX/whereY coordinates, and sin/round.',
    },
    world: {
      width: 20,
      height: 20,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `// ==========================================
// SINUSOVKA NA MŘÍŽCE 20×20
// Demonstrace: FUNKCE, parametry, kdeX/kdeY, sin(), round()
// ==========================================

PRIKAZ JDI(kroky)
  OPAKUJ kroky KRAT
    KROK
  KONEC
KONEC

// Funkce spočítá cílovou souřadnici Y pro dané X (1..20)
FUNKCE CILOVE-Y(x)
  VRAT 10 + round(8 * sin((x - 1) * PI / 9.5))
KONEC

// Přesune Karla vertikálně na požadované Y a položí značku
PRIKAZ VYKRESLI-BOD(cilY)
  VLEVO-BOK
  KDYZ cilY > kdeY
    JDI(cilY - kdeY)
  JINAK
    VLEVO-BOK
    VLEVO-BOK
    JDI(kdeY - cilY)
    VLEVO-BOK
    VLEVO-BOK
  KONEC
  POLOZ
  // Otoč zpět na východ
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// Projdeme všech 20 sloupců zleva doprava
OPAKUJ 19 KRAT
  VYKRESLI-BOD(CILOVE-Y(kdeX))
  KROK
KONEC
VYKRESLI-BOD(CILOVE-Y(kdeX))
`,
      en: `// ==========================================
// SINE WAVE ON 20×20 GRID
// Demonstrating: FUNCTION, arguments, whereX/whereY, sin(), round()
// ==========================================

DEFINE WALK(steps)
  REPEAT steps TIMES
    STEP
  END
END

// Function computing target Y coordinate for given X (1..20)
FUNCTION TARGET_Y(x)
  RETURN 10 + round(8 * sin((x - 1) * PI / 9.5))
END

// Moves Karel vertically to targetY and places a beeper
DEFINE PLOT_POINT(targetY)
  TURN_LEFT
  IF targetY > whereY
    WALK(targetY - whereY)
  ELSE
    TURN_LEFT
    TURN_LEFT
    WALK(whereY - targetY)
    TURN_LEFT
    TURN_LEFT
  END
  PUT
  // Face East again
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// Traverse all 20 columns from left to right
REPEAT 19 TIMES
  PLOT_POINT(TARGET_Y(whereX))
  STEP
END
PLOT_POINT(TARGET_Y(whereX))
`,
    },
  },
];
