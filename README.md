# VAG Alignment Checker 0.5.1

Korrigering av Audi A3 8Y-logiken.

## Viktig rättelse
I 0.5 visades 1JA som om det vore bilens kompletta chassi-/alignmentkod.
Det var för förenklat.

För A3 8Y måste vi skilja på:
- G-kod(er) för framvagn/fjäderbens-/axellastfamilj
- 0N1 / 0N4 för bakaxeltyp
- 1JA / 1JC / 1JF för fjädrings-/dämpningsvariant

För 35 TFSI 110 kW visar externa reservdels-/tekniska källor flera möjliga G-koder
beroende på bl.a. fjäderbensdiameter och axellast. Därför visar appen nu
G-koder som kandidater tills exakt PR-data finns.

## UI-fix
"Underlag" har ersatts med "Tekniskt underlag" i ren svenska.
Tyska ord som Serienfahrwerk visas inte längre i resultatkortet.

## Princip
Appen ska hellre visa:
"G-kod: kandidater, exakt kod ej fastställd"
än att ge en falskt exakt kod.
