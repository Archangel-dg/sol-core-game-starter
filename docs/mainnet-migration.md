# Von Devnet auf Mainnet umstellen

Dein Spiel läuft standardmäßig gegen **Devnet** — dieselbe Kette, dieselbe
Mechanik, aber mit Test-SOL, das nichts kostet. Dieses Dokument beschreibt, was
sich ändert, wenn du auf **Mainnet** wechselst, also auf echtes Geld.

> **Kurzfassung:** Es sind vier Umgebungsvariablen. Drei davon brechen den Build
> ab, wenn sie fehlen — absichtlich. Ein Spiel, das still auf Devnet
> zurückfällt, während der Spieler glaubt, echtes SOL einzusetzen, wäre der
> schlimmere Fehler.

---

## Bevor du anfängst

Der Wechsel setzt voraus, dass **Sol-Core selbst** bereits auf Mainnet läuft.
Das ist eine Entscheidung des Plattform-Betreibers, nicht deine — solange die
Plattform auf Devnet steht, gibt es keine Mainnet-Programm-ID, gegen die dein
Spiel arbeiten könnte.

Frag im Creator-Dashboard oder beim Betreiber nach:

- der **Mainnet-Programm-ID** (die Devnet-ID ist eine andere und funktioniert
  auf Mainnet nicht),
- ob dein Spiel für Echtgeld **freigeschaltet** ist (jede Engine wird einzeln
  freigegeben),
- der **API-URL**, falls sie sich für Mainnet unterscheidet.

---

## Die vier Variablen

### 1–3: Solana-Verbindung (öffentlich, im Browser sichtbar)

```env
# Devnet (Standard, so ist der Starter ausgeliefert)
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=8R7PfDa6FYVZdYgg7mGD8kfXNRN66M9VenLjP1t2qaoG
```

```env
# Mainnet
NEXT_PUBLIC_SOLANA_RPC=https://dein-mainnet-rpc.example.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_PROGRAM_ID=<Mainnet-Programm-ID vom Betreiber>
```

**Zum RPC:** Nimm keinen öffentlichen Mainnet-Endpunkt. Die kostenlosen
Endpunkte sind hart rate-limitiert; unter Last bekommen deine Spieler
Fehlermeldungen statt Einzahlungen. Ein eigener Endpunkt (Helius, QuickNode,
Triton, …) kostet im Einstieg nichts und ist der Unterschied zwischen „läuft"
und „läuft manchmal".

**Zu `NEXT_PUBLIC_SOLANA_NETWORK`:** Der Wert ist nicht kosmetisch. Er steuert
das Netzwerk-Abzeichen, die Seiten-Metadaten und ob Hinweise auf Test-SOL
angezeigt werden. Steht dort `devnet`, während die anderen beiden auf Mainnet
zeigen, verspricht deine Oberfläche etwas anderes, als tatsächlich passiert.

### 4: API-URL (serverseitig, nie im Browser)

```env
SOLCORE_API_URL=https://api.sol-core.com
```

Ändert sich nur, wenn der Betreiber eine andere Adresse nennt. `SOLCORE_API_KEY`
und `SOLCORE_GAME_ID` bleiben dieselben — sie hängen an deinem Spiel, nicht am
Netzwerk.

---

## Warum der Build abbricht

Fehlt eine der drei `NEXT_PUBLIC_SOLANA_*`-Variablen, bricht `next build` mit
dieser Meldung ab:

```
NEXT_PUBLIC_SOLANA_RPC ist nicht gesetzt. Production-Builds brauchen
NEXT_PUBLIC_SOLANA_RPC zwingend (z. B. in Vercel als Env-Var setzen) —
kein stiller Devnet-Fallback. Siehe docs/mainnet-migration.md.
```

Das ist beabsichtigt. Im Dev-Modus (`next dev`) greift ein Devnet-Fallback mit
Konsolen-Warnung, damit du sofort loslegen kannst. In einem Production-Build
gibt es diesen Fallback nicht: Ein Spiel, das unbemerkt auf Devnet zeigt,
während Spieler echtes Geld erwarten, ist gefährlicher als ein Build, der
scheitert.

**Auf Vercel:** Die Variablen gehören unter Settings → Environment Variables,
und zwar für die Umgebung, die du deployst (Production). Nach dem Setzen
brauchst du einen **neuen Build** — `NEXT_PUBLIC_*`-Werte werden zur Bauzeit
ins Bundle eingebacken, ein Redeploy des alten Builds ändert nichts.

---

## Was sich für deine Spieler ändert

| | Devnet | Mainnet |
|---|---|---|
| Einsatz | Test-SOL, wertlos | echtes SOL |
| Woher das Guthaben kommt | Faucet, kostenlos | Spieler kauft/überweist es |
| Fehler beim Einsatz | ärgerlich | **kostet echtes Geld** |
| Rückabwicklung | egal | nur über den Betreiber |

Der Faucet-Hinweis in der Oberfläche verschwindet automatisch, sobald
`NEXT_PUBLIC_SOLANA_NETWORK` auf `mainnet-beta` steht.

---

## Checkliste

- [ ] Betreiber hat bestätigt, dass Sol-Core auf Mainnet läuft
- [ ] Mainnet-Programm-ID erhalten und eingetragen
- [ ] Eigener Mainnet-RPC eingerichtet (kein öffentlicher Endpunkt)
- [ ] `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
- [ ] Alle vier Variablen in Vercel für **Production** gesetzt
- [ ] **Neuer Build** ausgelöst (nicht nur Redeploy)
- [ ] Deine Engine ist für Echtgeld freigeschaltet
- [ ] Mit **eigenem** Geld getestet: Einzahlung, eine Runde, Auszahlung
- [ ] Das Netzwerk-Abzeichen in deinem Spiel zeigt „Mainnet"

Der vorletzte Punkt ist der wichtige. Teste den vollständigen Weg einmal mit
einem kleinen Betrag, bevor du dein Spiel öffentlich machst — Einzahlung,
Runde, **und Auszahlung**. Eine Auszahlung, die erst beim ersten echten Spieler
scheitert, kostet dich das Vertrauen, das du gerade aufbaust.

---

## Wenn etwas nicht stimmt

| Symptom | Ursache |
|---|---|
| Build bricht mit `ist nicht gesetzt` ab | Variable fehlt in der Production-Umgebung |
| Abzeichen zeigt „Devnet" trotz Mainnet-Werten | alter Build — neu bauen, nicht nur redeployen |
| Einzahlung kommt nie an | falsche Programm-ID (Devnet-ID auf Mainnet) |
| Sporadische RPC-Fehler unter Last | öffentlicher RPC-Endpunkt — eigenen einrichten |
| Wetten werden abgelehnt | Engine nicht für Echtgeld freigeschaltet |

Weiterführend: [`DEPLOY.md`](./DEPLOY.md) für das Deployment allgemein,
[`API-REFERENCE.md`](./API-REFERENCE.md) für die Endpunkte,
[`ENGINES.md`](./ENGINES.md) für die Engine-spezifischen Eigenheiten.
