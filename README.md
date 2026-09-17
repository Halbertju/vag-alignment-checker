# VAG Alignment Checker 0.3

Version 0.3 lägger till riktig extern VIN-avkodning via NHTSA vPIC.

## Flöde
1. Skriv VIN.
2. Appen anropar NHTSA vPIC gratis och försöker få märke, modell, modellår, motor, drivning, kaross och växellåda.
3. Resultatet skickas vidare till vår egen VAG-regelmotor.
4. Om exakt chassivariant fortfarande saknas visas endast relevanta följdfrågor.
5. Om regelbasen inte täcker bilen ber appen om PR-lapp i stället för att hitta på alignmentdata.

## Viktig begränsning
vPIC är en amerikansk offentlig datakälla. Europeiska bilar kan därför ge ofullständiga svar. Appen har kvar lokal VIN-fallback och vår manuella regelbas.

## Test
Prova bland annat:
- WAUZZZGY2RA025029 (Audi, MY2024 - nytt testfall)
- WVGZZZ5NZHW424875
- WAUZZZF29KN097647

## Publicera
Ladda upp filerna i repository-roten och låt GitHub Pages publicera `main` / root.
