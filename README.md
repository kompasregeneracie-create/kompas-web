# Kompas Regenerácie – web

Nový web kompasregeneracie.sk. Zatiaľ len úvodná stránka, podstránky ostávajú na starom WordPresse.

- `index.html` – úvodná stránka po slovensky (zdroj)
- `cz/index.html`, `en/index.html` – česká a anglická verzia, vyrába ich `python3 tools/preklad.py`
- `assets/kompas.css`, `assets/kompas.js` – spoločný vzhľad a živá vrstva, bez knižníc
- `CLAUDE.md` – pravidlá pre každého, kto web upravuje cez Claude

## Ako sa zverejňuje

- Každá zmena sa najprv objaví na skúšobnej adrese kompasregeneracie-create.github.io/kompas-web.
- Na kompasregeneracie.sk ide až po ručnom spustení: Actions → „Zverejniť na kompasregeneracie.sk“ → Run workflow.
- Nahráva sa len nový web (index.html, cz/, en/, assets/). WordPress a jeho podstránky ostávajú na hostingu nedotknuté.
- Návrat na starý web: na hostingu odstrániť riadok `DirectoryIndex index.html index.php` z .htaccess.

## Ako sa mení

Zmenu povedz Claude, ten ju urobí v tomto repozitári. Po schválení sa nahrá na hosting.

## Čo ešte chýba pred spustením

- fotky (plná sála na Gaborovi, ďalšie z Gabora, Michal, prípadne minulé podujatia) a obrázok na zdieľanie 1200 × 630 px
- odkazy na registráciu (Posledný šaman, Gabor Maté o ADHD); zatiaľ je pri nich „Registrácia čoskoro“
- kontaktný mail a telefón, aj pre firmy
- logo vo vysokom rozlíšení
- napojenie formulára na SmartEmailing
- automatické nahrávanie na hosting (FTP údaje dodá Igor)

Miesta na doplnenie sú v index.html označené komentármi REGISTRÁCIA, KONTAKT a og:image.
