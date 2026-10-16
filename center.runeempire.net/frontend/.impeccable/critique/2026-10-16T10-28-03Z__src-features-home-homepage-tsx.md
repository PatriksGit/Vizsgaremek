---
target: RuneEmpire Center overview + login/register (after fixes)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\patri\\Desktop\\Vizsgaremek\\center.runeempire.net\\frontend\\src\\features\\home\\HomePage.tsx"
target_fingerprint: "sha256:e67f7f1a068a94ac7b49f0b8701277d81269b79d920890e5df59b7676b919993"
target_path: "C:\\Users\\patri\\Desktop\\Vizsgaremek\\center.runeempire.net\\frontend\\src\\features\\home\\HomePage.tsx"
timestamp: 2026-10-16T10-28-03Z
slug: src-features-home-homepage-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heurisztika | Pont | Fő probléma |
|---|---|---|---|
| 1 | Rendszerállapot láthatósága | 3 | Jó skeletonok és „…” állapotok; a kódlépés lejárata statikus, nincs visszaszámlálás |
| 2 | Valós világhoz illeszkedés | 3 | Természetes magyar; a Discord „Csatlakozás” gomb összekeverhető az „Így csatlakozol a szerverhez” kártyával |
| 3 | Felhasználói kontroll | 3 | Megmaradó adatok, „Javítsd ki”; az elfelejtett jelszó csak egy eltűnő toast |
| 4 | Következetesség | 2 | Login ↔ regisztráció váltáskor a fülsor ~160 px-et ugrik; a footer linkjei élőnek tűnnek, de `#` |
| 5 | Hibamegelőzés | 3 | A szabályok előre ott vannak, a kliens ellenőrzés tükrözi a backendet |
| 6 | Felismerés emlékezés helyett | 3 | Hibánál a szabály-leírás eltűnik (fields.tsx:60-64), pont amikor kellene |
| 7 | Rugalmasság, hatékonyság | 2 | Visszatérő játékosnak kevés tennivaló; a belépő animáció minden látogatáskor ~1,6 s |
| 8 | Esztétikus, minimalista | 3 | Visszafogott paletta; a legnagyobb panel (játékidő) egyetlen mondat |
| 9 | Hibából felépülés | 3 | Pontos magyar hibák, Discord újrapróbálás, fókusz az első hibás mezőre |
| 10 | Súgó | 2 | Az egyetlen súgó a JoinCard, aminek a gombja nem működik; a jogi dialógusok üresek |
| **Összesen** | | **27/40** | **Elfogadható (felső sáv)** |

## Design Specificity Verdict

**LLM:** saját bőr általános vázon. Saját: a CSS-3D Steve, Grenze, a szerveres háttér, a Minecraft-anyag nevű tónusok, a házon belül rajzolt Discord kártya, következetes tegező hang, az őszinteségi rendszer. Kit-szerű: a bal sidebar nagybetűs csoportcímekkel, a mindenhol azonos PanelHeader, és főleg a login bemutatója (6 egyforma „ikon + félkövér cím + szürke mondat” sor). Gradiens szöveg, „→” gomb, közép-pontos meta nincs.

**Detektor:** CLI 0 találat. Overlay: `radial-halo` a hero arany derengésén (HeroCard.tsx:29, a briefben kért elem), `shape-assembled-illustration` hamis pozitív (a TanStack devtools logója, csak fejlesztésben). Konzolhiba nincs, 375 px-en nincs kilógás, minden Tab-megállónak van látható fókusza, az első Tab az „Ugrás a tartalomra”. Kontrasztok: minden mért szöveg ≥6,9:1, kivéve a csak fejlesztésben látszó halvány sidebar-sorokat (3,45:1).

## Priority Issues

1. **[P1] Az új játékos útja egy nem működő gombon ér véget** (JoinCard.tsx:31-40). Javítás: a SoonButton mellé egy működő Discord-link őszinte szöveggel („a Discordon szólunk, amint letölthető”). → onboard
2. **[P1] A login bemutató nem létező dolgokat ígér** (site.ts:58-67: korábbi vásárlások, 2FA, statisztikák). Javítás: jelen időben csak ami igaz, 3–4 sorra rövidítve; a jövőbelieket egyszer, „Hamarosan” alatt. → clarify
3. **[P2] A legnagyobb panel üres, a valódi adat a keskeny oszlopban** (PlaytimeCard lg:col-span-2, a Játékidő a Hamarosan sorban is szerepel). Javítás: adat nélkül a játékidő csak a Hamarosan sorban legyen, a Discord kapja a széles helyet. → distill
4. **[P2] Ugrál a login/regisztráció fülsor** (AuthPage.tsx:64 justify-center). Javítás: felülre igazított diák, vagy a fülsor a csúszkán kívül. → layout
5. **[P2] Hibánál eltűnnek a mezőszabályok** (fields.tsx:60-64). Javítás: a leírás mindig látszik, a hiba alá kerül, aria-describedby mindkettőre. → harden

## Persona Red Flags

**Alex:** az Áttekintésen a Fiókbeállításokon és a Discordon kívül nincs mit csinálni; a letiltott „Bolt megnyitása” az elsődleges helyen áll; a belépő animáció minden látogatáskor lefut.

**Sam:** a Kijelentkezés a 3. Tab-megálló, a tartalom előtt; a SoonButton nem fókuszálható, így billentyűzettel nem derül ki, hogy a bolt/kliens jön; az elfelejtett-jelszó toast Discord gombja eltűnik, mielőtt elérné; a footer linkjei (a Discord ikon is) `#`; el kell fogadnia egy olvashatatlan ÁSZF-et; a „Csatlakozás” jelzés nélkül nyit új lapot.

**Casey:** 375 px-en a figura karja rálóg a „Bolt megnyitása HAMAROSAN” gomb szélére; beágyazott görgetés a Discord-listában, félbevágott sorral; az egyetlen élő adat ~900 px-rel lejjebb kezdődik; a regisztráció 1. lépésének gombja a hajtás alatt; a kódlépésen az e-mail „gmail.co / m” módon törik.

## Minor Observations

- „1234 tag online” magyar ezres tagolás nélkül (Intl.NumberFormat → „1 234”).
- A login címke és placeholder duplázza egymást („Játékosnév”).
- „Büntetések” és „Online játékosok” (szerverszintű) nem illik egy személyes „hamarosan” listába egy üdvözlő oldalon.
- „A Discord most nem elérhető.” úgy hangzik, mintha a Discord állna le; valójában a mi lekérésünk hibázott.
- A két jelszómező súgósora eltérő magas, így elcsúsznak.
- A sidebar nagybetűs csoportcímei a shell legkit-szerűbb eleme.

## Questions to Consider

- Három valódi adattal (név, dátum, Discord) nem kéne az Áttekintésnek közösség/Discord-központúnak lennie, amíg nincs játékadat?
- Ha a panelek inventory-slotok, a statisztikák egy advancement-képernyő lennének, a Minecraft-identitás a szerkezetben is ott lenne — vagy giccs lenne belőle?
- Nyíljon-e meg a regisztráció a kliens és a jogi szövegek előtt?
