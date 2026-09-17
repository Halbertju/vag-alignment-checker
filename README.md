# VAG Alignment Checker 0.2

Mål: användaren ska normalt bara skriva VIN.

## Så fungerar prototypen
1. Skriv VIN.
2. Appen avkodar sådant som kan utläsas gratis lokalt (märke, modellår och vissa typfamiljer).
3. Kända test-VIN kan ge full match direkt.
4. Om VIN inte räcker visas endast relevanta följdfrågor.
5. Om chassit fortfarande är osäkert ber appen om PR-lappen i stället för att gissa.

## Begränsning utan betalt API
En statisk gratis webbapp kan inte slå upp fullständig fabriksutrustning för ett godtyckligt VIN på internet.
Därför är arbetsflödet med dynamiska följdfrågor och PR-lapp avsiktligt.

## Kör lokalt
```bash
python -m http.server 8000
```
Öppna http://localhost:8000

## Publicera gratis
GitHub Pages eller Cloudflare Pages fungerar utan serverkostnad.
