/**
 * Karel the Robot - Main Application Controller
 * Wires the Code Editor, Interpreter, World, Renderer, Audio, and UI.
 */

import { KarelWorld, Direction } from './world.js';
import { KarelRenderer } from './renderer.js';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Interpreter, InterpreterState } from './interpreter.js';
import { KarelAudio } from './audio.js';
import { Examples } from './examples.js';

class KarelApp {
  constructor() {
    this.lang = localStorage.getItem('karel_lang') || 'cs';
    this.currentTool = 'beeper'; // 'beeper', 'wall', 'karel'

    // Core components
    this.world = new KarelWorld(10, 10);
    this.canvas = document.getElementById('karel-canvas');
    this.renderer = new KarelRenderer(this.canvas, this.world);
    this.interpreter = new Interpreter(this.world);
    this.audio = new KarelAudio();

    // DOM Elements
    this.dom = {
      langSelect: document.getElementById('lang-select'),
      soundBtn: document.getElementById('sound-btn'),
      helpBtn: document.getElementById('help-btn'),
      modal: document.getElementById('cheatsheet-modal'),
      modalCloseBtn: document.getElementById('modal-close-btn'),

      exampleSelect: document.getElementById('example-select'),
      newCodeBtn: document.getElementById('new-code-btn'),
      codeEditor: document.getElementById('code-editor'),
      lineNumbers: document.getElementById('line-numbers'),
      activeLineMarker: document.getElementById('active-line-marker'),

      runBtn: document.getElementById('run-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      stepBtn: document.getElementById('step-btn'),
      stopBtn: document.getElementById('stop-btn'),
      speedSlider: document.getElementById('speed-slider'),

      toolBeeper: document.getElementById('tool-beeper'),
      toolWall: document.getElementById('tool-wall'),
      toolKarel: document.getElementById('tool-karel'),
      worldW: document.getElementById('world-w'),
      worldH: document.getElementById('world-h'),
      resizeBtn: document.getElementById('resize-btn'),
      mazeBtn: document.getElementById('maze-btn'),
      clearWorldBtn: document.getElementById('clear-world-btn'),

      hudPos: document.getElementById('hud-pos'),
      hudDir: document.getElementById('hud-dir'),
      hudBag: document.getElementById('hud-bag'),
      hudCellBeepers: document.getElementById('hud-cell-beepers'),
      statusBadge: document.getElementById('status-badge'),

      consoleOutput: document.getElementById('console-output'),
      clearConsoleBtn: document.getElementById('clear-console-btn'),
      filterAllBtn: document.getElementById('filter-all-btn'),
      filterPrintBtn: document.getElementById('filter-print-btn'),
      debugVars: document.getElementById('debug-vars'),

      // Left pane tabs and views
      tabEditor: document.getElementById('tab-editor'),
      tabGuide: document.getElementById('tab-guide'),
      editorView: document.getElementById('editor-view'),
      guideView: document.getElementById('guide-view'),

      // Manual buttons
      mStep: document.getElementById('m-step'),
      mLeft: document.getElementById('m-left'),
      mRight: document.getElementById('m-right'),
      mAround: document.getElementById('m-around'),
      mPut: document.getElementById('m-put'),
      mPick: document.getElementById('m-pick'),
    };

    this.initTranslations();
    this.initEvents();
    this.initExamples();
    this.updateHUD();
    this.updateAudioButton();
    this.applyLanguage();

    // Load first example by default
    if (Examples.length > 0) {
      this.loadExample(Examples[0]);
    }
  }

  initTranslations() {
    this.i18n = {
      cs: {
        cheatsheet: 'Příkazy',
        exampleLabel: 'Příklad:',
        selectExample: 'Vyberte úlohu...',
        newBtn: 'Nový',
        runBtn: 'Spustit',
        pauseBtn: 'Pauza',
        stepBtn: 'Krok',
        resetBtn: 'Reset',
        manualTitle: 'Ruční řízení:',
        toolBeeper: 'Značka',
        toolWall: 'Zeď',
        toolKarel: 'Karel',
        gridSize: 'Mřížka:',
        resizeBtn: 'OK',
        mazeBtn: '🎲 Bludiště',
        clearBtn: 'Vyčistit',
        consoleTitle: 'Debug Konzole:',
        filterAll: 'Vše',
        filterPrint: 'Výpisy (NAPIS/PRINT)',
        clearConsole: 'Smazat',
        statusIdle: 'PŘIPRAVEN',
        statusRunning: 'BĚŽÍ',
        statusPaused: 'POZASTAVEN',
        statusFinished: 'DOKONČENO',
        statusError: 'CHYBA',
        editorPlaceholder: '// Zde napište program pro Karla...',
        dirNorth: 'SEVER',
        dirEast: 'VÝCHOD',
        dirSouth: 'JIH',
        dirWest: 'ZÁPAD',
        tabEditor: 'Editor',
        tabGuide: 'Příručka & Struktura kódu',
        insertTitle: 'Vložit vzor:',
        insertSample: 'Vložit do editoru',
        guideIntroTitle: '1. Jak funguje Robot Karel',
        guideIntroP1: 'Karel je robot, který žije ve čtvercovém světě ulic a tříd. Vykonává příkazy přesně tak, jak jste je napsali shora dolů.',
        guideIntroP2: 'Základní příkazy: KROK (pohyb o 1 pole), VLEVO-BOK (otočení o 90° vlevo), POLOZ (položení značky z kapsy) a ZVEDNI (sebrání značky do kapsy).',
        guideStructTitle: '2. Struktura programu (Pravidla syntaxe)',
        guideStructP1: 'Každý příkaz se píše na samostatný řádek. Řádky začínající // jsou komentáře, které Karel ignoruje.',
        guideStructP2: 'Všechny složené konstrukce (cyklus OPAKUJ, cyklus DOKUD, podmínka KDYZ a procedura PRIKAZ) musí vždy končit slovem KONEC.',
        guideRepeatTitle: '3. Cyklus s pevným počtem opakování (OPAKUJ)',
        guideRepeatP1: 'Pokud chcete sekvenci příkazů zopakovat několikrát (např. 4×):',
        guideWhileTitle: '4. Podmíněný cyklus (DOKUD)',
        guideWhileP1: 'Opakuje příkazy tak dlouho, dokud platí daná podmínka (např. dokud před Karlem není zeď):',
        guideIfTitle: '5. Podmínky a rozhodování (KDYŽ / JINAK)',
        guideIfP1: 'Umožňuje Karlovi rozhodnout se na základě toho, co vidí pod sebou nebo před sebou:',
        guideProcTitle: '6. Vlastní příkazy a funkce (s parametry)',
        guideProcP1: 'Naučte Karla nový povel nebo funkci! Definice začíná PRIKAZ <nazev>(param1, param2) nebo FUNKCE <nazev>(x) (návratová hodnota přes VRAT <výraz>) a končí KONEC:',
        guideSensorsTitle: '7. Dostupné podmínky a senzory',
        guideVarTitle: '8. Proměnné, kdeX/kdeY a matematické funkce',
        guideVarP1: 'Používejte proměnné s LET, pozici Karla kdeX / kdeY (EN: whereX / whereY) a vestavěné matematické funkce: sin, cos, tan, sind, cosd, round, floor, ceil, abs, sqrt, pow(a, b), min(a, b), max(a, b), hypot(dx, dy), PI:',
        guidePrintTitle: '9. Debug konzole a výpis (NAPIS / PRINT + Python f"...")',
        guidePrintP1: 'Pro ladění programu použijte příkaz NAPIS (nebo VYPIS / PRINT). Podporuje Python f-string interpolaci f"Pozice: [{kdeX}, {kdeY}], sin={sin(PI/4):.2f}, {idx=}":',
      },
      en: {
        cheatsheet: 'Cheatsheet',
        exampleLabel: 'Example:',
        selectExample: 'Select challenge...',
        newBtn: 'New',
        runBtn: 'Run',
        pauseBtn: 'Pause',
        stepBtn: 'Step',
        resetBtn: 'Reset',
        manualTitle: 'Manual Pad:',
        toolBeeper: 'Beeper',
        toolWall: 'Wall',
        toolKarel: 'Karel',
        gridSize: 'Grid:',
        resizeBtn: 'OK',
        mazeBtn: '🎲 Maze',
        clearBtn: 'Clear',
        consoleTitle: 'Debug Console:',
        filterAll: 'All',
        filterPrint: 'Prints (PRINT/NAPIS)',
        clearConsole: 'Clear',
        statusIdle: 'READY',
        statusRunning: 'RUNNING',
        statusPaused: 'PAUSED',
        statusFinished: 'FINISHED',
        statusError: 'ERROR',
        editorPlaceholder: '// Write Karel code here...',
        dirNorth: 'NORTH',
        dirEast: 'EAST',
        dirSouth: 'SOUTH',
        dirWest: 'WEST',
        tabEditor: 'Editor',
        tabGuide: 'Guide & Code Structure',
        insertTitle: 'Insert Template:',
        insertSample: 'Insert into editor',
        guideIntroTitle: '1. How Karel the Robot Works',
        guideIntroP1: 'Karel is a robot living in a grid world of streets and avenues. Karel executes commands sequentially from top to bottom.',
        guideIntroP2: 'Primitive commands: STEP (move forward 1 corner), TURN_LEFT (rotate 90° counter-clockwise), PUT (place a beeper from bag), and PICK (pick up a beeper into bag).',
        guideStructTitle: '2. Program Structure (Syntax Rules)',
        guideStructP1: 'Commands are written on separate lines. Lines beginning with // are comments that Karel ignores.',
        guideStructP2: 'All compound statements (REPEAT, WHILE, IF, DEFINE, and FUNCTION) must always end with the keyword END.',
        guideRepeatTitle: '3. Fixed Repeat Loop (REPEAT)',
        guideRepeatP1: 'When you want to repeat a sequence of commands a specific number of times (e.g. 4 times):',
        guideWhileTitle: '4. Conditional Loop (WHILE)',
        guideWhileP1: 'Repeats commands as long as the condition evaluates to true (e.g. while front is clear):',
        guideIfTitle: '5. Branching & Conditions (IF / ELSE)',
        guideIfP1: 'Allows Karel to make decisions based on what is in front or beneath:',
        guideProcTitle: '6. Custom Procedures & Functions (with arguments)',
        guideProcP1: 'Teach Karel a new command or function! Begins with DEFINE <name>(a, b) or FUNCTION <name>(x) (return value via RETURN <expr>) and ends with END:',
        guideSensorsTitle: '7. Available Conditions & Sensors',
        guideVarTitle: '8. Variables, whereX/whereY & Math Functions',
        guideVarP1: 'Use variables with LET, Karel coordinates whereX / whereY (CS: kdeX / kdeY), and built-in math functions: sin, cos, tan, sind, cosd, round, floor, ceil, abs, sqrt, pow(a, b), min(a, b), max(a, b), hypot(dx, dy), PI:',
        guidePrintTitle: '9. Debug Console & Printing (PRINT / NAPIS + Python f"...")',
        guidePrintP1: 'Use PRINT (or NAPIS) to output debug messages to the console. Supports Python f-string interpolation f"Pos: [{whereX}, {whereY}], sin={sin(PI/4):.2f}, {idx=}":',
      },
    };
  }

  switchTab(tab) {
    if (tab === 'editor') {
      this.dom.tabEditor.classList.add('active');
      this.dom.tabGuide.classList.remove('active');
      this.dom.editorView.style.display = 'flex';
      this.dom.guideView.classList.remove('active');
    } else {
      this.dom.tabGuide.classList.add('active');
      this.dom.tabEditor.classList.remove('active');
      this.dom.editorView.style.display = 'none';
      this.dom.guideView.classList.add('active');
    }
  }

  insertSnippet(key) {
    const isCs = this.lang === 'cs';
    let snippet = '';
    switch (key) {
      case 'step': snippet = isCs ? 'KROK\n' : 'STEP\n'; break;
      case 'left': snippet = isCs ? 'VLEVO-BOK\n' : 'TURN_LEFT\n'; break;
      case 'right': snippet = isCs ? 'VPRAVO-BOK\n' : 'TURN_RIGHT\n'; break;
      case 'put': snippet = isCs ? 'POLOZ\n' : 'PUT\n'; break;
      case 'pick': snippet = isCs ? 'ZVEDNI\n' : 'PICK\n'; break;
      case 'repeat':
        snippet = isCs
          ? 'OPAKUJ 4 KRAT\n  KROK\nKONEC\n'
          : 'REPEAT 4 TIMES\n  STEP\nEND\n';
        break;
      case 'while':
        snippet = isCs
          ? 'DOKUD NENI ZED\n  KROK\nKONEC\n'
          : 'WHILE FRONT_IS_CLEAR\n  STEP\nEND\n';
        break;
      case 'if':
        snippet = isCs
          ? 'KDYZ JE CIP\n  ZVEDNI\nJINAK\n  POLOZ\nKONEC\n'
          : 'IF BEEPER\n  PICK\nELSE\n  PUT\nEND\n';
        break;
      case 'proc':
        snippet = isCs
          ? 'PRIKAZ MOJE-PROCEDURA(n)\n  OPAKUJ n KRAT\n    KROK\n  KONEC\nKONEC\n'
          : 'DEFINE MY_PROCEDURE(n)\n  REPEAT n TIMES\n    STEP\n  END\nEND\n';
        break;
      case 'let':
        snippet = isCs
          ? 'LET idx = 0\n'
          : 'LET idx = 0\n';
        break;
      case 'print':
        snippet = isCs
          ? 'NAPIS f"Karel je na [{kdeX}, {kdeY}]"\n'
          : 'PRINT f"Karel is at [{whereX}, {whereY}]"\n';
        break;
    }

    this.switchTab('editor');
    const editor = this.dom.codeEditor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;
    editor.value = val.substring(0, start) + snippet + val.substring(end);
    editor.selectionStart = editor.selectionEnd = start + snippet.length;
    editor.focus();
    this.updateLineNumbers();
  }

  insertGuideSample(key) {
    const isCs = this.lang === 'cs';
    let sample = '';
    switch (key) {
      case 'repeat':
        sample = isCs
          ? '// Obejdi čtverec a v každém rohu polož značku:\nOPAKUJ 4 KRAT\n  KROK\n  POLOZ\n  VLEVO-BOK\nKONEC\n'
          : '// Patrol square and place a beeper at each corner:\nREPEAT 4 TIMES\n  STEP\n  PUT\n  TURN_LEFT\nEND\n';
        break;
      case 'while':
        sample = isCs
          ? '// Jdi dopředu až ke zdi:\nDOKUD NENI ZED\n  KROK\nKONEC\n'
          : '// Walk forward until the wall:\nWHILE FRONT_IS_CLEAR\n  STEP\nEND\n';
        break;
      case 'if':
        sample = isCs
          ? '// Pokud je pod Karlem značka, seber ji, jinak polož novou:\nKDYZ JE CIP\n  ZVEDNI\nJINAK\n  POLOZ\nKONEC\n'
          : '// If beeper is present, pick it up, otherwise put one:\nIF BEEPER\n  PICK\nELSE\n  PUT\nEND\n';
        break;
      case 'proc':
        sample = isCs
          ? 'PRIKAZ JDI(kroky)\n  OPAKUJ kroky KRAT\n    KROK\n  KONEC\nKONEC\n\nFUNKCE VZDALENOST(cilX, cilY)\n  VRAT round(hypot(cilX - kdeX, cilY - kdeY))\nKONEC\n\n// Použití:\nJDI(3)\nLET d = VZDALENOST(10, 10)\n'
          : 'DEFINE WALK(steps)\n  REPEAT steps TIMES\n    STEP\n  END\nEND\n\nFUNCTION DISTANCE(targetX, targetY)\n  RETURN round(hypot(targetX - whereX, targetY - whereY))\nEND\n\n// Usage:\nWALK(3)\nLET d = DISTANCE(10, 10)\n';
        break;
      case 'var':
        sample = isCs
          ? '// Kladení značek na každé sudé políčko:\nLET idx 0\n\nDOKUD NENI ZED\n  KDYZ idx % 2 == 0\n    POLOZ\n  KONEC\n  KROK\n  LET idx idx + 1\nKONEC\n\nKDYZ idx % 2 == 0\n  POLOZ\nKONEC\n'
          : '// Placing beepers on alternating tiles:\nLET idx 0\n\nWHILE FRONT_IS_CLEAR\n  IF idx % 2 == 0\n    PUT\n  END\n  STEP\n  LET idx idx + 1\nEND\n\nIF idx % 2 == 0\n  PUT\nEND\n';
        break;
      case 'print':
        sample = isCs
          ? 'LET krokCislo = 0\nOPAKUJ 4 KRAT\n  KROK\n  LET krokCislo = krokCislo + 1\n  NAPIS f"Krok {krokCislo}: Karel je na [{kdeX}, {kdeY}], vzdálenost={hypot(kdeX, kdeY):.2f}"\nKONEC\n'
          : 'LET stepNum = 0\nREPEAT 4 TIMES\n  STEP\n  LET stepNum = stepNum + 1\n  PRINT f"Step {stepNum}: Karel is at [{whereX}, {whereY}], dist={hypot(whereX, whereY):.2f}"\nEND\n';
        break;
    }

    this.switchTab('editor');
    this.dom.codeEditor.value = sample;
    this.updateLineNumbers();
    this.log('Vložen vzorový kód do editoru / Inserted sample into editor', 'info');
  }

  applyLanguage() {
    const t = this.i18n[this.lang];
    this.dom.langSelect.value = this.lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    this.dom.codeEditor.placeholder = t.editorPlaceholder;

    // Update manual buttons text
    if (this.lang === 'cs') {
      this.dom.mStep.textContent = 'KROK';
      this.dom.mLeft.textContent = 'VLEVO';
      this.dom.mRight.textContent = 'VPRAVO';
      this.dom.mAround.textContent = 'VZAD';
      this.dom.mPut.textContent = 'POLOŽ';
      this.dom.mPick.textContent = 'ZVEDNI';
    } else {
      this.dom.mStep.textContent = 'STEP';
      this.dom.mLeft.textContent = 'LEFT';
      this.dom.mRight.textContent = 'RIGHT';
      this.dom.mAround.textContent = 'AROUND';
      this.dom.mPut.textContent = 'PUT';
      this.dom.mPick.textContent = 'PICK';
    }

    // Update snippet button labels
    document.querySelectorAll('.btn-snippet').forEach((btn) => {
      const ins = btn.getAttribute('data-insert');
      if (this.lang === 'cs') {
        const labels = {
          step: '+ KROK', left: '+ VLEVO', right: '+ VPRAVO',
          put: '+ POLOŽ', pick: '+ ZVEDNI', repeat: '+ OPAKUJ',
          while: '+ DOKUD', if: '+ KDYŽ', proc: '+ PŘÍKAZ',
          let: '+ LET', print: '+ NAPIŠ'
        };
        if (labels[ins]) btn.textContent = labels[ins];
      } else {
        const labels = {
          step: '+ STEP', left: '+ LEFT', right: '+ RIGHT',
          put: '+ PUT', pick: '+ PICK', repeat: '+ REPEAT',
          while: '+ WHILE', if: '+ IF', proc: '+ DEFINE',
          let: '+ LET', print: '+ PRINT'
        };
        if (labels[ins]) btn.textContent = labels[ins];
      }
    });

    // Refresh example names in dropdown
    const selectedId = this.dom.exampleSelect.value;
    this.initExamples();
    this.dom.exampleSelect.value = selectedId;

    this.updateHUD();
  }

  initExamples() {
    const select = this.dom.exampleSelect;
    select.innerHTML = `<option value="" disabled ${!select.value ? 'selected' : ''}>${this.i18n[this.lang].selectExample}</option>`;

    Examples.forEach((ex) => {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.title[this.lang] || ex.title.cs;
      select.appendChild(opt);
    });
  }

  loadExample(ex) {
    if (!ex) return;
    this.interpreter.stop();

    // Load world
    this.world.deserialize(JSON.parse(JSON.stringify(ex.world)));
    this.world.saveInitialSnapshot();
    this.dom.worldW.value = this.world.width;
    this.dom.worldH.value = this.world.height;
    this.dom.exampleSelect.value = ex.id;

    // Load code
    this.dom.codeEditor.value = ex.code[this.lang] || ex.code.cs;
    this.updateLineNumbers();

    // Render & Sync
    this.renderer.syncRobotImmediate();
    this.updateHUD();
    this.log(`Načten příklad: ${ex.title[this.lang]} / Loaded example`, 'info');
  }

  initEvents() {
    // Tabs switching
    this.dom.tabEditor.addEventListener('click', () => this.switchTab('editor'));
    this.dom.tabGuide.addEventListener('click', () => this.switchTab('guide'));

    // Snippet buttons insertion
    document.querySelectorAll('.btn-snippet').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ins = btn.getAttribute('data-insert');
        if (ins) this.insertSnippet(ins);
      });
    });

    // Sample buttons in guide
    document.querySelectorAll('.btn-insert-sample').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sample = btn.getAttribute('data-sample');
        if (sample) this.insertGuideSample(sample);
      });
    });

    // Language change
    this.dom.langSelect.addEventListener('change', (e) => {
      this.lang = e.target.value;
      localStorage.setItem('karel_lang', this.lang);
      this.applyLanguage();

      // If current code matches previous example, update it to new language code
      const currentEx = Examples.find((ex) => ex.id === this.dom.exampleSelect.value);
      if (currentEx) {
        this.dom.codeEditor.value = currentEx.code[this.lang];
        this.updateLineNumbers();
      }
    });

    // Sound toggle
    this.dom.soundBtn.addEventListener('click', () => {
      this.audio.toggleMute();
      this.updateAudioButton();
    });

    // Help modal
    this.dom.helpBtn.addEventListener('click', () => {
      this.dom.modal.classList.add('open');
    });
    this.dom.modalCloseBtn.addEventListener('click', () => {
      this.dom.modal.classList.remove('open');
    });
    this.dom.modal.addEventListener('click', (e) => {
      if (e.target === this.dom.modal) {
        this.dom.modal.classList.remove('open');
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.dom.modal.classList.contains('open')) {
        this.dom.modal.classList.remove('open');
      }
      // F5 to run, F10 to step
      if (e.key === 'F5') {
        e.preventDefault();
        this.handleRun();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        this.handleStep();
      }
    });

    // Editor events
    this.dom.codeEditor.addEventListener('input', () => this.updateLineNumbers());
    this.dom.codeEditor.addEventListener('scroll', () => {
      this.dom.lineNumbers.scrollTop = this.dom.codeEditor.scrollTop;
    });

    // Tab key in editor
    this.dom.codeEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.dom.codeEditor.selectionStart;
        const end = this.dom.codeEditor.selectionEnd;
        this.dom.codeEditor.value =
          this.dom.codeEditor.value.substring(0, start) +
          '  ' +
          this.dom.codeEditor.value.substring(end);
        this.dom.codeEditor.selectionStart = this.dom.codeEditor.selectionEnd = start + 2;
        this.updateLineNumbers();
      }
    });

    // Example selection
    this.dom.exampleSelect.addEventListener('change', (e) => {
      const ex = Examples.find((item) => item.id === e.target.value);
      if (ex) this.loadExample(ex);
    });

    // New code button
    this.dom.newCodeBtn.addEventListener('click', () => {
      this.dom.exampleSelect.value = '';
      this.dom.codeEditor.value = '';
      this.updateLineNumbers();
      this.interpreter.stop();
      this.hideActiveLine();
      this.log('Editor byl vyčištěn / Editor cleared', 'info');
    });

    // Execution buttons
    this.dom.runBtn.addEventListener('click', () => this.handleRun());
    this.dom.pauseBtn.addEventListener('click', () => this.interpreter.pause());
    this.dom.stepBtn.addEventListener('click', () => this.handleStep());
    this.dom.stopBtn.addEventListener('click', () => this.handleStop());

    // Speed slider
    this.dom.speedSlider.addEventListener('input', (e) => {
      // Invert slider: 0 is slow (600ms), 600 is fastest (0ms)
      const val = parseInt(e.target.value, 10);
      const ms = 600 - val;
      this.interpreter.setSpeed(ms);
    });
    // Set initial speed
    this.interpreter.setSpeed(600 - parseInt(this.dom.speedSlider.value, 10));

    // Manual Pad Buttons
    this.dom.mStep.addEventListener('click', () => this.handleManualAction('STEP'));
    this.dom.mLeft.addEventListener('click', () => this.handleManualAction('LEFT'));
    this.dom.mRight.addEventListener('click', () => this.handleManualAction('RIGHT'));
    this.dom.mAround.addEventListener('click', () => this.handleManualAction('TURN_AROUND'));
    this.dom.mPut.addEventListener('click', () => this.handleManualAction('PUT'));
    this.dom.mPick.addEventListener('click', () => this.handleManualAction('PICK'));

    // World tool switching
    const tools = [
      { btn: this.dom.toolBeeper, mode: 'beeper' },
      { btn: this.dom.toolWall, mode: 'wall' },
      { btn: this.dom.toolKarel, mode: 'karel' },
    ];
    tools.forEach(({ btn, mode }) => {
      btn.addEventListener('click', () => {
        tools.forEach((t) => t.btn.classList.remove('btn-active'));
        btn.classList.add('btn-active');
        this.currentTool = mode;
      });
    });

    // World resize
    this.dom.resizeBtn.addEventListener('click', () => this.applyWorldResize(true));
    this.dom.worldW.addEventListener('change', () => this.applyWorldResize(true));
    this.dom.worldH.addEventListener('change', () => this.applyWorldResize(true));
    const onResizeKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.applyWorldResize(true);
      }
    };
    this.dom.worldW.addEventListener('keydown', onResizeKey);
    this.dom.worldH.addEventListener('keydown', onResizeKey);

    // Clear world
    this.dom.clearWorldBtn.addEventListener('click', () => {
      this.interpreter.stop();
      this.applyWorldResize(false);
      this.world.clear();
      this.renderer.syncRobotImmediate();
      this.updateHUD();
      this.log('Svět byl vyčištěn / World cleared', 'info');
    });

    // Random maze generator
    this.dom.mazeBtn.addEventListener('click', () => {
      this.interpreter.stop();
      this.applyWorldResize(false);
      this.generateMaze();
      this.renderer.syncRobotImmediate();
      this.updateHUD();
      this.log('Vygenerováno náhodné bludiště / Generated random maze', 'info');
    });

    // Clear console & Console filter buttons
    this.dom.clearConsoleBtn.addEventListener('click', () => {
      this.dom.consoleOutput.innerHTML = '';
    });
    if (this.dom.filterAllBtn && this.dom.filterPrintBtn) {
      this.dom.filterAllBtn.addEventListener('click', () => {
        this.dom.filterAllBtn.classList.add('active');
        this.dom.filterPrintBtn.classList.remove('active');
        this.dom.consoleOutput.classList.remove('filter-print-only');
      });
      this.dom.filterPrintBtn.addEventListener('click', () => {
        this.dom.filterPrintBtn.classList.add('active');
        this.dom.filterAllBtn.classList.remove('active');
        this.dom.consoleOutput.classList.add('filter-print-only');
      });
    }

    // Canvas click interaction for world editing
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleCanvasClick(e, true);
    });

    // Interpreter Event Listeners
    this.interpreter.on('stateChange', (state) => this.handleStateChange(state));
    this.interpreter.on('highlightLine', (line) => this.highlightLine(line));
    this.interpreter.on('action', (action, karel) => this.handleInterpreterAction(action, karel));
    this.interpreter.on('log', (msg, loc) => this.logPrint(msg, loc));
    this.interpreter.on('variableChange', () => this.updateDebugVars());
    this.interpreter.on('error', (err) => this.handleInterpreterError(err));
    this.interpreter.on('finish', (stats) => this.handleInterpreterFinish(stats));
  }

  applyWorldResize(logChange = true) {
    const rawW = parseInt(this.dom.worldW.value, 10);
    const rawH = parseInt(this.dom.worldH.value, 10);
    const w = Number.isFinite(rawW) ? rawW : this.world.width;
    const h = Number.isFinite(rawH) ? rawH : this.world.height;
    if (w !== this.world.width || h !== this.world.height) {
      this.interpreter.stop();
      this.hideActiveLine();
      this.world.resize(w, h);
      this.dom.worldW.value = this.world.width;
      this.dom.worldH.value = this.world.height;
      this.renderer.syncRobotImmediate();
      this.updateHUD();
      if (logChange) {
        this.log(`Rozměry světa změněny na ${this.world.width} × ${this.world.height}`, 'info');
      }
    } else {
      this.dom.worldW.value = this.world.width;
      this.dom.worldH.value = this.world.height;
    }
  }

  updateAudioButton() {
    this.dom.soundBtn.textContent = this.audio.isMuted() ? '🔇' : '🔊';
  }

  updateLineNumbers() {
    const text = this.dom.codeEditor.value;
    const lines = text.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += i + '\n';
    }
    this.dom.lineNumbers.textContent = numbers;
  }

  highlightLine(line) {
    if (!line) {
      this.hideActiveLine();
      return;
    }
    const marker = this.dom.activeLineMarker;
    const lineHeight = 21.6; // matching 13.5px * 1.6
    const top = 12 + (line - 1) * lineHeight - this.dom.codeEditor.scrollTop;
    marker.style.top = `${top}px`;
    marker.style.display = 'block';

    // Scroll line into view if out of editor bounds
    const editor = this.dom.codeEditor;
    const lineTop = (line - 1) * lineHeight;
    if (lineTop < editor.scrollTop || lineTop > editor.scrollTop + editor.clientHeight - 40) {
      editor.scrollTop = Math.max(0, lineTop - editor.clientHeight / 2);
    }
  }

  hideActiveLine() {
    this.dom.activeLineMarker.style.display = 'none';
  }

  handleStateChange(state) {
    const badge = this.dom.statusBadge;
    badge.className = 'status-badge';

    const t = this.i18n[this.lang];

    switch (state) {
      case InterpreterState.IDLE:
        badge.classList.add('status-idle');
        badge.textContent = t.statusIdle;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;

      case InterpreterState.RUNNING:
        badge.classList.add('status-running');
        badge.textContent = t.statusRunning;
        this.dom.runBtn.disabled = true;
        this.dom.pauseBtn.disabled = false;
        this.dom.stepBtn.disabled = true;
        break;

      case InterpreterState.PAUSED:
        badge.classList.add('status-paused');
        badge.textContent = t.statusPaused;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;

      case InterpreterState.FINISHED:
        badge.classList.add('status-finished');
        badge.textContent = t.statusFinished;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;

      case InterpreterState.ERROR:
        badge.classList.add('status-error');
        badge.textContent = t.statusError;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;
    }
  }

  compile() {
    const code = this.dom.codeEditor.value;
    if (!code.trim()) {
      throw new Error('Program je prázdný / Program is empty');
    }
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  handleRun() {
    if (this.interpreter.state === InterpreterState.PAUSED) {
      this.interpreter.run();
      return;
    }

    this.applyWorldResize(false);

    try {
      const ast = this.compile();
      this.interpreter.loadProgram(ast);
      this.log('Spouštím program... / Running program...', 'info');
      this.interpreter.run();
    } catch (err) {
      this.log(`Chyba syntaxe: ${err.message}`, 'error');
      this.audio.playCrash();
    }
  }

  handleStep() {
    if (
      this.interpreter.state === InterpreterState.IDLE ||
      this.interpreter.state === InterpreterState.FINISHED ||
      this.interpreter.state === InterpreterState.ERROR
    ) {
      this.applyWorldResize(false);
      try {
        const ast = this.compile();
        this.interpreter.loadProgram(ast);
      } catch (err) {
        this.log(`Chyba syntaxe: ${err.message}`, 'error');
        this.audio.playCrash();
        return;
      }
    }
    this.interpreter.step();
  }

  handleStop() {
    this.interpreter.stop();
    this.world.restoreInitialSnapshot();
    this.renderer.syncRobotImmediate();
    this.updateHUD();
    this.hideActiveLine();
    this.log('Program zastaven a svět resetován / Program stopped & reset', 'info');
  }

  handleInterpreterAction(action, karel) {
    this.renderer.animateToKarel();
    this.updateHUD();

    switch (action) {
      case 'STEP':
        this.audio.playStep();
        break;
      case 'LEFT':
      case 'RIGHT':
      case 'TURN_AROUND':
        this.audio.playTurn();
        break;
      case 'PUT':
        this.audio.playPut();
        break;
      case 'PICK':
        this.audio.playPick();
        break;
    }
  }

  handleInterpreterError(errorMsg) {
    this.audio.playCrash();
    this.log(`Chyba běhu: ${errorMsg}`, 'error');
  }

  handleInterpreterFinish(stats) {
    this.audio.playVictory();
    this.log(
      `Program úspěšně dokončen! (${stats.actionCount} akcí, ${stats.operationCount} operací)`,
      'success'
    );
  }

  handleManualAction(action) {
    if (this.interpreter.state === InterpreterState.RUNNING) {
      this.interpreter.pause();
    }

    try {
      switch (action) {
        case 'STEP':
          this.world.step();
          this.audio.playStep();
          this.log('Ručně: KROK / STEP', 'info');
          break;
        case 'LEFT':
          this.world.turnLeft();
          this.audio.playTurn();
          this.log('Ručně: VLEVO-BOK / TURN_LEFT', 'info');
          break;
        case 'RIGHT':
          this.world.turnRight();
          this.audio.playTurn();
          this.log('Ručně: VPRAVO-BOK / TURN_RIGHT', 'info');
          break;
        case 'TURN_AROUND':
          this.world.turnAround();
          this.audio.playTurn();
          this.log('Ručně: CELEM-VZAD / TURN_AROUND', 'info');
          break;
        case 'PUT':
          this.world.putBeeper();
          this.audio.playPut();
          this.log('Ručně: POLOŽ / PUT', 'info');
          break;
        case 'PICK':
          this.world.pickBeeper();
          this.audio.playPick();
          this.log('Ručně: ZVEDNI / PICK', 'info');
          break;
      }
      this.renderer.animateToKarel();
      this.updateHUD();
    } catch (err) {
      this.audio.playCrash();
      this.log(`Chyba: ${err.message}`, 'error');
    }
  }

  handleCanvasClick(e, isRightClick = false) {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Ensure layout metrics are up to date before hit-testing
    this.renderer.computeLayout();
    const hit = this.renderer.hitTest(px, py, this.currentTool);
    if (!hit) return;

    if (this.interpreter.state !== InterpreterState.IDLE) {
      this.interpreter.stop();
      this.hideActiveLine();
    }

    if (this.currentTool === 'beeper') {
      if (hit.type === 'CELL') {
        const delta = isRightClick || e.shiftKey ? -1 : 1;
        this.world.addBeeper(hit.x, hit.y, delta);
        if (delta > 0) this.audio.playPut();
        else this.audio.playPick();
        this.renderer.render();
        this.updateHUD();
      }
    } else if (this.currentTool === 'wall') {
      if (hit.type === 'WALL_V') {
        this.world.toggleVerticalWall(hit.x, hit.y);
        this.audio.playStep();
        this.renderer.render();
      } else if (hit.type === 'WALL_H') {
        this.world.toggleHorizontalWall(hit.x, hit.y);
        this.audio.playStep();
        this.renderer.render();
      }
    } else if (this.currentTool === 'karel') {
      if (hit.type === 'CELL') {
        if (this.world.karel.x === hit.x && this.world.karel.y === hit.y) {
          // Rotate Karel on same cell click
          this.world.turnRight();
          this.audio.playTurn();
        } else {
          // Move Karel to new cell
          this.world.karel.x = hit.x;
          this.world.karel.y = hit.y;
          this.audio.playStep();
        }
        this.renderer.syncRobotImmediate();
        this.updateHUD();
      }
    }

    // Save as new initial world configuration
    this.world.saveInitialSnapshot();
  }

  generateMaze() {
    this.world.clear();
    const w = this.world.width;
    const h = this.world.height;

    // Place all walls initially
    for (let x = 1; x < w; x++) {
      for (let y = 1; y <= h; y++) {
        this.world.toggleVerticalWall(x, y);
      }
    }
    for (let x = 1; x <= w; x++) {
      for (let y = 1; y < h; y++) {
        this.world.toggleHorizontalWall(x, y);
      }
    }

    // Randomized Kruskal / DFS maze generation
    const visited = new Set();
    const stack = [];

    const cellKey = (x, y) => `${x},${y}`;
    const startX = 1;
    const startY = 1;
    visited.add(cellKey(startX, startY));
    stack.push({ x: startX, y: startY });

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];

      const dirs = [
        { dx: 0, dy: 1, dir: Direction.NORTH },
        { dx: 1, dy: 0, dir: Direction.EAST },
        { dx: 0, dy: -1, dir: Direction.SOUTH },
        { dx: -1, dy: 0, dir: Direction.WEST },
      ];

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        if (nx >= 1 && nx <= w && ny >= 1 && ny <= h && !visited.has(cellKey(nx, ny))) {
          neighbors.push({ x: nx, y: ny, dir: d.dir });
        }
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Knock down wall between current and next
        if (next.dir === Direction.NORTH) {
          this.world.horizontalWalls.delete(`h:${current.x}:${current.y}`);
        } else if (next.dir === Direction.SOUTH) {
          this.world.horizontalWalls.delete(`h:${current.x}:${current.y - 1}`);
        } else if (next.dir === Direction.EAST) {
          this.world.verticalWalls.delete(`v:${current.x}:${current.y}`);
        } else if (next.dir === Direction.WEST) {
          this.world.verticalWalls.delete(`v:${current.x - 1}:${current.y}`);
        }

        visited.add(cellKey(next.x, next.y));
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Place a goal beeper at opposite corner
    this.world.setBeepers(w, h, 1);
    this.world.karel.x = 1;
    this.world.karel.y = 1;
    this.world.karel.dir = Direction.EAST;
    this.world.saveInitialSnapshot();
  }

  updateHUD() {
    const k = this.world.karel;
    this.dom.hudPos.textContent = `[${k.x}, ${k.y}]`;

    const t = this.i18n[this.lang];
    const dirMap = {
      [Direction.NORTH]: t.dirNorth,
      [Direction.EAST]: t.dirEast,
      [Direction.SOUTH]: t.dirSouth,
      [Direction.WEST]: t.dirWest,
    };
    this.dom.hudDir.textContent = dirMap[k.dir] || k.dir;

    this.dom.hudBag.textContent = k.bag === Infinity ? '∞' : String(k.bag);
    this.dom.hudCellBeepers.textContent = String(this.world.getBeepers(k.x, k.y));
    this.updateDebugVars();
  }

  updateDebugVars() {
    if (!this.dom.debugVars) return;
    this.dom.debugVars.innerHTML = '';
    const entries = [];
    for (const [k, v] of this.interpreter.variables.entries()) {
      entries.push([k, v]);
    }
    if (this.interpreter.callStack && this.interpreter.callStack.length > 0) {
      const top = this.interpreter.callStack[this.interpreter.callStack.length - 1];
      for (const [k, v] of top.locals.entries()) {
        entries.push([`${top.name}.${k}`, v]);
      }
    }
    for (const [name, val] of entries) {
      const badge = document.createElement('span');
      badge.className = 'debug-var-badge';
      const formatted =
        typeof val === 'number' && !Number.isInteger(val)
          ? Number(val.toPrecision(6))
          : val;
      badge.textContent = `${name}=${formatted}`;
      this.dom.debugVars.appendChild(badge);
    }
  }

  logPrint(message, loc) {
    const entry = document.createElement('div');
    entry.className = 'log-entry log-print';

    const time = new Date().toLocaleTimeString();
    if (loc && loc.line) {
      const lineTag = document.createElement('span');
      lineTag.className = 'log-line-tag';
      lineTag.textContent = `[${time} | ř.${loc.line}]`;
      entry.appendChild(lineTag);
    } else {
      const lineTag = document.createElement('span');
      lineTag.className = 'log-line-tag';
      lineTag.textContent = `[${time}]`;
      entry.appendChild(lineTag);
    }

    const msgSpan = document.createElement('span');
    msgSpan.textContent = `🖨️ ${message}`;
    entry.appendChild(msgSpan);

    this.dom.consoleOutput.appendChild(entry);
    this.dom.consoleOutput.scrollTop = this.dom.consoleOutput.scrollHeight;
  }

  log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;

    this.dom.consoleOutput.appendChild(entry);
    this.dom.consoleOutput.scrollTop = this.dom.consoleOutput.scrollHeight;
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.karelApp = new KarelApp();
});
