# VAG Alignment Checker 0.4

Version 0.4 använder en gratis serverfunktion på Cloudflare Pages.

## Varför Cloudflare nu?
GitHub Pages kan bara köra statiska filer. Den här versionen behöver en liten backend för att fråga flera VIN-källor utan att webbläsaren behöver prata direkt med alla externa tjänster.

Backend samlar just nu data från:
- DB.VIN — särskilt användbart för europeiska fordon när data finns
- VinWhere — kan komplettera med bl.a. drivning
- NHTSA vPIC — officiell amerikansk fabrikskälla och fallback

Appen slår ihop svaren och skickar bara ett normaliserat fordonsresultat till regelmotorn.

## Kostnad
Cloudflare Workers/Pages Functions har en gratisnivå. För ett litet internt verktyg bör prototypen kunna köras utan löpande kostnad så länge användningen håller sig inom gratisgränserna.

## Publicera via Cloudflare Pages
1. Lägg alla filer i GitHub-repot, inklusive mappen `functions/api/vin.js`.
2. Skapa ett gratis Cloudflare-konto.
3. Gå till Workers & Pages / Pages och skapa ett projekt från Git.
4. Anslut GitHub och välj repot `vag-alignment-checker`.
5. Framework preset: None.
6. Build command: lämna tomt.
7. Build output directory: `/` eller projektets rot beroende på Cloudflare-gränssnittet.
8. Deploy.

Cloudflare känner igen `functions/`-mappen och skapar endpointen:
`/api/vin?vin=...`

## Viktigt
GitHub Pages kan ligga kvar, men version 0.4:s VIN-backend fungerar först på Cloudflare Pages eftersom GitHub Pages inte kör serverfunktioner.

## Test
Testa:
WAUZZZGY2RA025029

Målet är att få mer än bara Audi + MY2024, helst modell A3 och kompletterande fordonsdata när någon av källorna har det.
