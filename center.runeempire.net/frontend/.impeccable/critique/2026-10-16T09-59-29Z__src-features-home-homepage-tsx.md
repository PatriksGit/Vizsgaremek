---
target: RuneEmpire Center overview + login/register
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\patri\\Desktop\\Vizsgaremek\\center.runeempire.net\\frontend\\src\\features\\home\\HomePage.tsx"
target_fingerprint: "sha256:7af63fae85d02c8746f6e7cc857eb5f5e664c14717528ddaae7481d3d88e6c94"
target_path: "C:\\Users\\patri\\Desktop\\Vizsgaremek\\center.runeempire.net\\frontend\\src\\features\\home\\HomePage.tsx"
timestamp: 2026-10-16T09-59-29Z
slug: src-features-home-homepage-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heurisztika | Pont | Fő probléma |
|---|---|---|---|
| 1 | Rendszerállapot láthatósága | 2 | A login kártyán beégetett „Jelenleg 147 játékos online” számláló pörög, az Áttekintésen ugyanez „–”; regisztrációs lépésváltáskor a fókusz a body-ra esik |
| 2 | Valós világhoz illeszkedés | 3 | Jó magyar szöveg, de „Üdv újra” a frissen regisztrált játékosnak is; „{n} hangcsatornában” embereket számol; „Profilom” a Beállításokra visz |
| 3 | Felhasználói kontroll | 3 | Az űrlapok megtartják a beírt adatot, „Javítsd ki” visszavisz, a jogi szövegek dialógusban nyílnak |
| 4 | Következetesség | 2 | A „hamarosan” ötféleképp jelenik meg (badge, tooltip, toast, dialógus, halvány gomb); élesben a menü elrejti a kész nélküli oldalakat, a hero halott boltgombja marad |
| 5 | Hibamegelőzés | 2 | A placeholderek kitöltött értéknek látszanak („••••••••”, „peldaemail@gmail.com”); a névszabály csak hiba után derül ki |
| 6 | Felismerés emlékezés helyett | 3 | Állandó címkék, ikon + szöveg, 2 lépéses jelző, az e-mail visszaírva a kódlépésen |
| 7 | Rugalmasság, hatékonyság | 1 | Visszatérő játékosnak nincs gyorsítás: élesben egy csempe sem link, nincs kliens-letöltés az Áttekintésen, nincs „emlékezz rám” |
| 8 | Esztétikus, minimalista | 2 | Az Áttekintés hajtás feletti részének ~60%-a helyőrző (6 üres csempe + elmosott álgrafikon) |
| 9 | Hibából felépülés | 3 | Mezőszintű magyar hibák, role=alert; a Discord hibaállapotban nincs újrapróbálás |
| 10 | Súgó | 2 | „Elfelejtetted a jelszavad?” csak toast; az ÁSZF dialógus üres, mégis el kell fogadni |
| **Összesen** | | **23/40** | **Elfogadható** |

## Design Specificity Verdict

**LLM-értékelés:** a bőr saját (Minecraft anyagszínek fegyelmezetten, csak a badge-ekben; Grenze; shader háttér; 3D Steve; személyes magyar szövegek), de a váz egy általános SaaS dashboard: hero + 6 egyforma KPI-csempe + 2/3 grafikon + 1/3 oldalkártya. A login bemutatója a klasszikus AI-féle „6 egyforma ikon + cím + két sor” lista (AuthShowcase.tsx:29-41). Az anyagok és a font nélkül bármilyen analitikai termék lehetne; a layoutban semmi nem szól a *játékosról*.

**Determinisztikus scan:** a CLI detektor 0 találatot adott (ellenőrizve, hogy TSX-et is vizsgál). A böngészős overlay: hero radial-spotlight-glow (a briefben kért arany derengés, szándékos), dark-glow a zöld online pöttyön és a login „Belépés” gomb arany ragyogásán, nested-cards (az online-pill és a mobilos bemutató panel a kártyán belül), clipped-overflow a login kártyán (szándékos csúszka), body-text-viewport-edge mobilon (16 px margó, rendben). A `body`-ra jelentett layout-transition / shape-assembled-illustration nem köthető komponenshez.

## Priority Issues

1. **[P1] Az Áttekintés nagyrészt helyőrző** — 6 üres csempe + elmosott álgrafikon; 375 px-en az első valódi adat (Discord) kb. két képernyővel lejjebb. Javítás: a bekötetlen csempéket a feature flagek szerint rejteni vagy egy „Hamarosan” sávba vonni; az álgrafikont adat nélkül elhagyni; előre hozni ami valódi (Discord, csatlakozási kártya kliens-letöltéssel). → distill, layout
2. **[P1] Kamu élő szám a login oldalon** — „147 játékos online” konstansból (config/site.ts:25), count-up animációval; ellentmond a saját helyőrző-szabálynak. Javítás: valódi státusz-végpont, vagy a pill elhagyása. → harden
3. **[P1] Vízszintes kilógás mobilon** — hosszú Discord-névvel 375 px-en scrollWidth 387 / clientWidth 365; a HomePage.tsx:51 `grid lg:grid-cols-3` implicit auto sávja min-contentre méreteződik, így a `truncate` nem lép életbe. Javítás: `grid-cols-1` / `min-w-0`. → adapt
4. **[P2] Kitöltött értéknek látszó placeholderek** — jelszó „••••••••”, „peldaemail@gmail.com”, „Játékosnév” a címke ismétléseként; hibaállapotban a pontok a „Adj meg egy jelszót.” mellett. Javítás: jelszónál nincs placeholder, e-mailnél „pl. nev@gmail.com”, a névszabály előre a leírásba. → clarify
5. **[P2] Nincs első belépési pillanat** — mindig „Üdv újra”, a regisztráció egy halott dashboardon ér véget. Javítás: első belépéskor „Üdv a birodalomban!”, és egy csatlakozási kártya (kliens letöltése, ugyanaz a név és jelszó a játékban). → onboard

## Persona Red Flags

**Alex (haladó):** élesben egy csempe sem kattintható; nincs kliens-link az Áttekintésen; halott boltgomb; „Profilom” szöveges helyőrzőre visz; a Discord-lista kis dobozban görög.

**Sam (képernyőolvasó/billentyűzet):** „Kód küldése” után a fókusz a body-ra esik, nincs bejelentés; a jelszó-mutató aria-pressed ÉS váltakozó címke („Jelszó elrejtése, pressed”); nincs skip link, a Kijelentkezés a 3. tab-megálló; a sidebar h2-i a h1 előtt; a sidebar csoportcímek ~3.45:1 (AA alatt), a „Hamarosan” badge 2.89:1; a csempe-tooltip csak egérrel érhető el; a /register-en a rejtett login űrlap autocomplete mezőit a jelszókezelő kitöltheti.

**Casey (mobil):** vízszintes kilógás; 6 üres csempe ~1.3 képernyő; a 3D figura sm alatt rejtve; a bemutató mobilon rejtve, így a „ugyanaz a név és jelszó, mint a játékban” sosem jut el; beágyazott görgetés a Discord-listában; kicsi Sheet-bezáró; a „Menü megnyitása” 36×36, a hero gombok 36 px magasak, a jelszó-mutató 32×32, a checkboxok 20×20 (44 px alatt).

## Minor Observations

- 1920×1080-on a tartalom y≈815-nél véget ér, alatta üres sötét sáv.
- Az álgrafikon a mai oszlopot aranyban emeli ki, pedig az adat kitalált.
- A Discord hibaállapotban nincs újrapróbálás és „utoljára frissítve”.
- A tiltott arany „Bolt megnyitása” 50% átlátszósággal sáros (szöveg ~1.9:1).
- „Napos sorozat” → „Napi sorozat” természetesebb.
- Desktop loginon a űrlaposzlop fölött ~150 px üres hely.
- A kódlépésen nincs lejárati visszaszámlálás és újraküldési cooldown.
- A footer minden linkje `#`.
- Nem létező ÁSZF elfogadtatása jogi és bizalmi kérdés is.

## Questions to Consider

- Ha csak az lenne az Áttekintésen, ami ma igaz (név, Discord, hogyan csatlakozz), hiányozna bárkinek a hat „–” csempe?
- Miért néz ki egy Minecraft játékos kezdőoldala SaaS analitikának a karakterlapja helyett, ahol a 3D figura a főszereplő?
- Mi az az egy dolog, amiért a játékos ezen a héten megnyitja a Centert: csatlakozás, rangvásárlás vagy egy kitiltás ellenőrzése?
