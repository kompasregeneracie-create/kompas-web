# Pravidlá pre web Kompasu Regenerácie

## Obsah
- Texty len z Michalových podkladov. Čísla nevymýšľať a nenafukovať.
- Píše sa „ekodedina“, nikdy „prvá ekodedina na Slovensku“.
- Gabor Maté sa píše s krátkym „a“ (Gabor, Gabora, Gaborom), nikdy „Gábor“.
- „My“ len pre veci, ktoré Kompas robí spolu s ľuďmi (podujatia, skupina blueprintu, ekodedina). Michalova osobná história (Deti nepočkajú, Nestrácajme čas, medzináboženské fórum) sa píše o ňom.
- Žiadne kontrastné heslá typu „nie je to X, je to Y“. Pokojný tón, bez nátlaku a strašenia.
- Partnerov (logá) zatiaľ neuvádzať.
- Tvárou webu je len Michal.

## Dizajn
- Farby: krémová #fffbf6, lesná zelená #183533, šalviová #8eaa93, broskyňová #ffe6db, oranžová #ff9c00 len na hlavné tlačidlo (s tmavozeleným textom).
- Písma: Blazface na nadpisy (náhrada Fraunces), Sora na text.
- Tagline: „Smerom k regeneratívnej budúcnosti a vnútornej rovnováhe.“

## Živá vrstva
- Dych 10 s, podhubie po okrajoch, oheň pri podujatiach, fotky sa nadýchnu, čas dňa mení svetlo.
- Animácia nikdy nejde cez text. Rešpektovať prefers-reduced-motion. Stránka funguje aj bez JavaScriptu.
- Animácie sa zastavia, keď nie sú vidieť. Žiadne ťažké knižnice ani video na pozadí.

## Jazyky (SK, CZ, EN)
- Zdroj je slovenská stránka `index.html`. Česká `cz/index.html` a anglická `en/index.html` sa nikdy neupravujú ručne.
- Pri zmene textu: uprav `index.html`, potom príslušný riadok v `tools/preklad.py` (slovenský text musí presne sedieť) a spusti `python3 tools/preklad.py`. Skript skončí chybou, ak niektorý slovenský text nesedí, aby žiadny jazyk neostal pozadu.
- Nový text = nový riadok v `PREKLADY` s českým aj anglickým prekladom.
- Štýly sú v `assets/kompas.css`, živá vrstva v `assets/kompas.js`, spoločné pre všetky jazyky. Po zmene štýlov alebo skriptu vždy spusti `python3 tools/preklad.py`, ktorý obnoví značku `?v=` pri odkazoch, aby prehliadače nebrali starú verziu z pamäte.
- Lokálne testovať cez server (`python3 -m http.server`), lebo odkazy na `cz/` a `en/` cez file:// nefungujú.

## Postup pri zmene
- Každú zmenu skontrolovať na mobile (390 px) aj počítači, bez chýb v konzole.
- Pred zverejnením na ostrý web ukázať Michalovi náhľad.
