---
target: RuneEmpire Center overview + login/register (round 3)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\patri\\Desktop\\Vizsgaremek\\center.runeempire.net\\frontend\\src\\features\\home\\HomePage.tsx"
target_fingerprint: "sha256:8ceafa1166169828312e5ec5f9a361b3f97518adaebc29a2bb740fae565753b0"
target_path: "C:\\Users\\patri\\Desktop\\Vizsgaremek\\center.runeempire.net\\frontend\\src\\features\\home\\HomePage.tsx"
timestamp: 2026-10-16T10-45-50Z
slug: src-features-home-homepage-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heurisztika | Pont | Fő probléma |
|---|---|---|---|
| 1 | Rendszerállapot láthatósága | 3 | Skeletonok, újrapróbálás, lépéssáv, élő szám; a Discord nem mutatja, mikor frissült |
| 2 | Valós világhoz illeszkedés | 3 | „Online játékosok” (hamarosan) a „3 tag online” (Discord) mellett összekeverhető |
| 3 | Felhasználói kontroll | 3 | Megmaradó adatok, „Javítsd ki”; elfelejtett jelszó = eltűnő toast |
| 4 | Következetesség | 2 | Ugyanaz a Discord-csatlakozás háromféle stílusban; „Fiókbeállítások” vs „Beállítások” |
| 5 | Hibamegelőzés | 3 | Előre látható szabályok; nincs élő jelszóegyezés-jelzés, a „Jelszó újra” üresen nem jelez hibát |
| 6 | Felismerés emlékezés helyett | 3 | Állandó címkék és súgók; a login placeholder ismétli a címkét |
| 7 | Rugalmasság, hatékonyság | 2 | A 6 jegyű kód nem küldődik be magától; a hero mindkét gombja üres |
| 8 | Esztétikus, minimalista | 2 | A legszínesebb elem a „Hamarosan” sáv; 1920-on ~500 px üres sáv; 240 px-es sidebar két linkkel |
| 9 | Hibából felépülés | 3 | Pontos hibák, újrapróbálás, fókusz az első hibás mezőre |
| 10 | Súgó | 2 | Nincs súgó/GYIK, a jelszó-visszaállítás csak Discordon |
| **Összesen** | | **26/40** | **Elfogadható (felső sáv)** |

## Design Specificity Verdict

**LLM:** részben saját: szabványos dashboard és osztott login, valódi Minecraft-identitásba öltöztetve (anyagszínek, Grenze, shader háttér, 3D figura, „Üdv a birodalomban”, saját stílusú Discord, őszinteségi rendszer). Kit-szerű: a sidebar nagybetűs csoportcímei, a glass osztott login, és főleg a login bemutatójának 4 ikon+cím+szöveg sora. Feszültség: a legkülönlegesebb eszköz, az anyagszínek, ma csak a „Hamarosan” sáv 28 px-es badge-eiben jelenik meg, vagyis a márkaszín a még nem létező dolgok reklámozására megy el.

**Detektor:** CLI 0 találat. Overlay: `radial-halo` a hero arany derengésén (valódi, a brief kérte; a legalacsonyabb kontraszt itt 5,74:1, ami még AA felett), `shape-assembled-illustration` hamis pozitív (TanStack devtools logó). Konzolhiba nincs, 375 px-en nincs kilógás, minden Tab-megállónak van fókusza, minden mért szöveg AA felett. Új: mobilon a login↔regisztráció fülsor 87 px-et ugrik (desktopon nem mozdul).

## Priority Issues

1. **[P1] A Beállítások élőnek látszó üres oldal, és 2FA-t ígér** (features.settings: true → éles menüpont és a hero egyetlen működő gombja; AccountPage szöveg). Javítás: a jelszócsere megépítése (a backend kész), vagy addig kikapcsolni és a 2FA-mondatot elhagyni. → clarify
2. **[P1] Az új játékos kártyája lehetetlen lépéssel kezd, és duplázza a Discord-gombot** (JoinCard: „Töltsd le…”, majd „hamarosan letölthető”; a Discord gomb kétszer). Javítás: a működő lépéssel kezdeni (Discord), egyetlen erős Discord-gomb, a Discord kártya saját gombja rejtve, amíg a JoinCard látszik. → onboard
3. **[P2] A „Hamarosan” sáv túlkiabálja a valódi adatot** (a legszínesebb elem, a Discord fölött, a badge-ek kattinthatónak tűnnek). Javítás: a Discord alá, egyszínű ikonokkal vagy egy halk sorral. → quieter
4. **[P2] Vékony kompozíció az Áttekintésen** (1920-on üres alsó fél; a figura ~1000 px-re a névtől; a Discord rácsban nagy üres cella egy zsúfolt csatorna mellett; 6 üres csatorna kevés információval). Javítás: hasábos (masonry) csatornalista, foglalt csatornák elöl, az üresek „+N üres csatorna” alá; figura a név mellé. → layout
5. **[P2] A login bemutató a legsablonosabb felület, a login oszlop fele üres.** Javítás: egy szerver-specifikus mondat + „ugyanaz a név és jelszó” + élő szám; a háttér vigye a hangulatot. → distill

## Persona Red Flags

**Alex:** a kód nem küldődik be magától 6 számjegynél; a hero-ban nincs mit csinálni; a Discord nem mutat frissítési időt.

**Sam:** az elfelejtett jelszó egyetlen kiútja (Discord) egy időre eltűnő toastban van, ami nem kap fókuszt; 6 számjegy után semmi nem történik és semmi nem jelentődik be.

**Casey:** a hero első gombja a halott „Bolt megnyitása”; a „Hamarosan” sáv 3 sor a Discord fölött; zsúfolt Discordnál a csatlakozás gomb ~1300 px-rel lejjebb; a JoinCard két gombja eltérő szélességű; mobilon a fülsor ugrik.

## Minor Observations

- 16 karakteres név mobilon három sorba törik — kisebb betűméret clamp-pel.
- A footer Discord ikonja `#`, pedig a meghívó link megvan.
- A két jelszómező súgója eltérő magasságú.
- Az Áttekintés h1-e csak a név; az oldal célja nem címsor.
- „Kód küldése” helyett „Tovább – kódot küldünk”.
- A kódlépésen az 1. lépés lehetne pipával késznek jelölve.
- A „Jelszó újra” üresen nem ad hibát.

## Questions to Consider

- Ha a Discord az egyetlen élő dolog, nem az „éppen kik vannak fent” kéne az Áttekintés élén?
- A kliens előtt miért lépne be egy 15 éves másodszor? Ha nincs oka, nem egy „Bent vagy, ez jön most” képernyő kéne a regisztráció végére?
- A „Hamarosan itt látod” sáv őszinte adat vagy UI-nak öltöztetett ütemterv?
