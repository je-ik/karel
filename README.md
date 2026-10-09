# Robot Karel - Web IDE (Pure JavaScript)

Kompletní webová implementace programovacího jazyka **Robot Karel** v čistém JavaScriptu (bez externích knihoven, funguje offline přímo v prohlížeči).

Podporuje jak tradiční **českou syntaxi** (`KROK`, `VLEVO-BOK`, `POLOZ`, `ZVEDNI`, `OPAKUJ`, `DOKUD`, `KDYZ`, `PRIKAZ`), tak mezinárodní **anglickou syntaxi** (`STEP`, `TURN_LEFT`, `PUT`, `PICK`, `REPEAT`, `WHILE`, `IF`, `DEFINE`).

---

## 🚀 Jak spustit

Aplikace nevyžaduje žádný build ani instalaci závislostí. Stačí otevřít soubor `index.html` v libovolném moderním webovém prohlížeči (Chrome, Firefox, Safari, Edge):

```bash
# Otevření v prohlížeči přímo nebo pomocí libovolného lokálního serveru:
python3 -m http.server 8000
# Poté otevřete http://localhost:8000
```

Nebo jednoduše poklepejte na `index.html`.

---

## ✨ Klíčové funkce

- **Dual-language syntax:** Plná podpora češtiny (s diakritikou i bez) i angličtiny.
- **Krokovací interpret:** Generator-based virtuální stroj umožňující krokování po jednotlivých instrukcích (`F10`) nebo plynulý běh (`F5`) s nastavitelnou rychlostí od pomalé animace až po bleskový režim (0 ms).
- **Zvýrazňování řádku za běhu:** Editor v reálném čase ukazuje ukazatelem přesný řádek, který Karel právě vykonává.
- **Interaktivní editor světa:**
  - Kliknutí do středu pole: přidání / odebrání značky (čipu).
  - Kliknutí na hranu mřížky: postavení / zbourání zdi.
  - Kliknutí na Karla: přemístění Karla nebo otočení do jiného směru.
  - Generátor náhodného bludiště (tlačítko 🎲).
- **Přímé ruční ovládání:** Tlačítka pro ruční krok, otočení a manipulaci se značkami pro rychlé testování.
- **Retro 8-bitové zvukové efekty:** Syntetizované zvuky pro kroky, otáčení, sběr/pokládání značek, náraz do zdi a fanfára při úspěšném dokončení (pomocí Web Audio API, bez externích souborů, možnost vypnutí zvuku).
- **Vestavěná knihovna úloh a příkladů:**
  1. *První kroky* (základy pohybu a pokládání)
  2. *Obchůzka čtverce* (vlastní procedury a cyklus OPAKUJ)
  3. *Sklizeň řádku* (podmínky a cyklus DOKUD)
  4. *Únik z bludiště* (algoritmus pravé ruky)
  5. *Stavba schodiště* (pyramida)
  6. *Nápis KAREL* (kreslení písmene K)

---

## 📖 Přehled příkazů

### Základní příkazy
| Čeština | English | Význam |
|---|---|---|
| `KROK` | `STEP` / `MOVE` | Karel udělá jeden krok vpřed ve svém směru |
| `VLEVO-BOK` | `TURN_LEFT` / `LEFT` | Otočení o 90° vlevo |
| `VPRAVO-BOK` | `TURN_RIGHT` / `RIGHT` | Otočení o 90° vpravo |
| `CELEM-VZAD` | `TURN_AROUND` | Otočení o 180° |
| `POLOZ` | `PUT` / `PUT_BEEPER` | Položí 1 značku z kapsy na aktuální políčko |
| `ZVEDNI` | `PICK` / `PICK_BEEPER` | Zvedne 1 značku z aktuálního políčka do kapsy |

### Řídicí struktury

#### Cyklus s pevným počtem opakování:
```karel
OPAKUJ 4 KRAT
  KROK
  POLOZ
KONEC
```
*(Anglicky: `REPEAT 4 TIMES ... END`)*

#### Podmíněný cyklus (DOKUD):
```karel
DOKUD NENI ZED
  KROK
KONEC
```
*(Anglicky: `WHILE FRONT_IS_CLEAR ... END`)*

#### Větvení (KDYŽ / JINAK):
```karel
KDYZ JE CIP
  ZVEDNI
JINAK
  POLOZ
KONEC
```
*(Anglicky: `IF BEEPER ... ELSE ... END`)*

#### Definice vlastního příkazu:
```karel
PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC
```
*(Anglicky: `DEFINE TURN_RIGHT ... END`)*

### Podmínky a senzory
- `ZED` / `WALL_AHEAD` – je před Karlem zeď nebo okraj světa?
- `VOLNO` / `FRONT_IS_CLEAR` – je před Karlem volná cesta?
- `CIP` / `BEEPER` – je na aktuálním políčku alespoň jedna značka?
- `KAPSA` / `BEEPER_IN_BAG` – má Karel v kapse značku?
- `SEVER`, `JIH`, `VYCHOD`, `ZAPAD` / `FACING_NORTH`, `SOUTH`, `EAST`, `WEST` – směr otočení Karla.
- Negace podmínky: `NENI <podminka>` nebo `NOT <condition>` (např. `NENI ZED`, `NOT BEEPER`).

---

## 🧪 Testy

Aplikace obsahuje sadu unit testů pro lexer, parser, virtuální stroj i model světa:

```bash
node test/test_karel.js
```

---

## 📁 Struktura projektu

```
├── index.html          # Hlavní HTML5 webové rozhraní
├── css/
│   └── style.css       # Stylování (moderní dark theme, responzivní layout)
├── js/
│   ├── app.js          # Koordinátor aplikace a obsluha událostí
│   ├── ast.js          # Definice uzlů abstraktního syntaktického stromu (AST)
│   ├── audio.js        # Web Audio API 8-bitový zvukový syntezátor
│   ├── examples.js     # Knihovna předpřipravených úloh a map
│   ├── interpreter.js  # Virtuální stroj pro krokování a provádění programu
│   ├── lexer.js        # Lexikální analyzátor (česká i anglická klíčová slova)
│   ├── parser.js       # Syntaktický analyzátor (rekurzivní sestup)
│   ├── renderer.js     # Vykreslování na Canvas 2D (Retina/HiDPI, animace robota)
│   └── world.js        # Stavový model světa (mřížka, stěny, značky, Karel)
└── test/
    └── test_karel.js   # Automatické testy
```
