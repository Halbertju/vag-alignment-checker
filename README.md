# VAG Alignment Checker 0.5

Version 0.5 bygger vidare på Cloudflare-versionen och börjar använda externa/OE-källor
för att lägga in modellfamiljer utan att användaren måste fotografera varje Launch-lista.

## Nytt: Audi A3 8Y (MY2020–2024)

Audi MY2024-prislistan anger:
- 1JA = standardchassi
- 1JC = sportchassi, 15 mm lägre, upp till 18 tum
- 1JF = sportchassi, 15 mm lägre, 19 tum
- PDE = adaptivt chassi med Audi drive select, 10 mm lägre än standard

Audi anger dessutom för A3 8Y att motorer från 110 kW har 4-länkad bakaxel,
medan svagare motorversioner använder torsionsaxel. Det gör att axle-typen kan
härledas när motoreffekt finns tillgänglig.

## Viktigt
För A3 8Y visar 0.5 rätt Audi-kod/chassifamilj, men numeriska toe/camber-värden
läggs inte in förrän vi har en tillräckligt säker källa för just 8Y-generationen.
Appen ska hellre ge rätt chassikod utan värden än återanvända 8V-värden av misstag.

## Publicering
Ersätt filerna i GitHub-repot med innehållet i denna zip. Behåll mappen:
functions/api/vin.js

Cloudflare deployar därefter automatiskt.
