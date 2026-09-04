/**
 * Alle sichtbaren Texte der Vorlage — Englisch als Hauptsprache, dazu
 * Deutsch, Französisch und Russisch.
 *
 * DESIGN-ZONE: Formulierungen darfst du ändern, Schlüssel hinzufügen, Texte an
 * dein Spiel anpassen. Was bleiben MUSS: Jeder Schlüssel hat ALLE vier
 * Sprachen, und Englisch ist gefüllt — darauf fällt alles zurück.
 * `npm run check:contract` prüft genau das.
 *
 * Warum kein Framework: Die Vorlage soll kopierbar bleiben. Vier Sprachen und
 * ein paar hundert Zeilen brauchen keine Abhängigkeit — und eine Abhängigkeit
 * weniger ist eine Fehlerquelle weniger in einem Repo, das Fremde forken.
 *
 * Platzhalter schreiben sich `{name}` und werden von `t(key, { name })`
 * ersetzt. Zahlen und Geldbeträge werden NICHT hier formatiert — die kommen
 * fertig aus `lib/lamports.ts`, damit Rundung und Einheit an einer Stelle
 * liegen.
 */

export interface Uebersetzung {
  en: string;
  de: string;
  fr: string;
  ru: string;
}

export const STRINGS = {
  // ── Rahmen / Seite ───────────────────────────────────────────────────────
  'app.loading': {
    en: 'Loading…',
    de: 'Lädt…',
    fr: 'Chargement…',
    ru: 'Загрузка…',
  },
  // Die Herkunftszeile am Seitenfuß (components/PoweredBy.tsx). Übersetzt wird
  // nur das „Powered by" — „Sol-Core Engine" ist ein Eigenname und bleibt in
  // jeder Sprache stehen.
  'app.poweredBy': {
    en: 'Powered by',
    de: 'Betrieben mit',
    fr: 'Propulsé par',
    ru: 'Работает на',
  },
  'app.backendUnreachable': {
    en: 'Backend unreachable',
    de: 'Backend nicht erreichbar',
    fr: 'Backend injoignable',
    ru: 'Бэкенд недоступен',
  },
  'app.configHint': {
    en: 'Check SOLCORE_API_URL / API key / game id and NEXT_PUBLIC_ENGINE / _MECHANIC.',
    de: 'Prüfe SOLCORE_API_URL / API-Key / Game-ID und NEXT_PUBLIC_ENGINE / _MECHANIC.',
    fr: 'Vérifiez SOLCORE_API_URL / la clé API / l’id du jeu et NEXT_PUBLIC_ENGINE / _MECHANIC.',
    ru: 'Проверьте SOLCORE_API_URL / API-ключ / id игры и NEXT_PUBLIC_ENGINE / _MECHANIC.',
  },
  'app.engineMismatchTitle': {
    en: 'Engine conflict:',
    de: 'Engine-Konflikt:',
    fr: 'Conflit de moteur :',
    ru: 'Конфликт движка:',
  },
  'app.engineMismatchBody': {
    en: 'This game is registered on the server as {server}, but the app is configured as {app} (NEXT_PUBLIC_ENGINE). Every round will fail — align the env variables with the registration.',
    de: 'Dieses Spiel ist auf dem Server als {server} registriert, die App ist aber als {app} konfiguriert (NEXT_PUBLIC_ENGINE). Jede Runde wird fehlschlagen — Env-Variablen an die Registrierung anpassen.',
    fr: 'Ce jeu est enregistré sur le serveur comme {server}, mais l’application est configurée comme {app} (NEXT_PUBLIC_ENGINE). Chaque manche échouera — alignez les variables d’environnement sur l’enregistrement.',
    ru: 'На сервере игра зарегистрирована как {server}, а приложение настроено как {app} (NEXT_PUBLIC_ENGINE). Каждый раунд будет неудачным — приведите переменные окружения в соответствие с регистрацией.',
  },
  'app.mechanic.session': { en: 'Session', de: 'Session', fr: 'Session', ru: 'Сессия' },
  'app.mechanic.tournament': {
    en: 'Tournament',
    de: 'Turnier',
    fr: 'Tournoi',
    ru: 'Турнир',
  },
  'app.mechanic.live': { en: 'Live', de: 'Live', fr: 'Direct', ru: 'Лайв' },
  'app.serverDecides': {
    en: 'Results come from the Sol-Core server only.',
    de: 'Ergebnisse kommen ausschließlich vom Sol-Core-Server.',
    fr: 'Les résultats viennent uniquement du serveur Sol-Core.',
    ru: 'Результаты приходят только с сервера Sol-Core.',
  },
  'app.devnetOnly': {
    en: 'Devnet test SOL only.',
    de: 'Nur Devnet-Test-SOL.',
    fr: 'SOL de test Devnet uniquement.',
    ru: 'Только тестовые SOL в Devnet.',
  },
  'app.metaDescription': {
    en: 'A Sol-Core game ({network}).',
    de: 'Ein Sol-Core-Spiel ({network}).',
    fr: 'Un jeu Sol-Core ({network}).',
    ru: 'Игра на Sol-Core ({network}).',
  },
  'app.language': { en: 'Language', de: 'Sprache', fr: 'Langue', ru: 'Язык' },

  // ── Geld ─────────────────────────────────────────────────────────────────
  'money.balance': { en: 'Balance', de: 'Guthaben', fr: 'Solde', ru: 'Баланс' },
  'money.deposit': { en: 'Deposit', de: 'Einzahlen', fr: 'Déposer', ru: 'Пополнить' },
  'money.withdraw': { en: 'Withdraw', de: 'Auszahlen', fr: 'Retirer', ru: 'Вывести' },
  'money.depositSent': {
    en: 'Deposit sent — your balance appears in ~5–10 s.',
    de: 'Einzahlung gesendet — Guthaben erscheint in ~5–10 s.',
    fr: 'Dépôt envoyé — votre solde apparaît dans ~5–10 s.',
    ru: 'Депозит отправлен — баланс появится через ~5–10 с.',
  },
  'money.depositFailed': {
    en: 'Deposit failed: {msg}',
    de: 'Einzahlung fehlgeschlagen: {msg}',
    fr: 'Échec du dépôt : {msg}',
    ru: 'Депозит не прошёл: {msg}',
  },
  'money.withdrawSent': {
    en: 'Withdrawal sent.',
    de: 'Auszahlung gesendet.',
    fr: 'Retrait envoyé.',
    ru: 'Вывод отправлен.',
  },
  'money.withdrawBooked': {
    en: 'Withdrawal booked.',
    de: 'Auszahlung verbucht.',
    fr: 'Retrait enregistré.',
    ru: 'Вывод учтён.',
  },
  'money.withdrawFailed': {
    en: 'Withdrawal failed: {msg}',
    de: 'Auszahlung fehlgeschlagen: {msg}',
    fr: 'Échec du retrait : {msg}',
    ru: 'Вывод не прошёл: {msg}',
  },
  'money.withdrawError': {
    en: 'Withdrawal: {code}',
    de: 'Auszahlung: {code}',
    fr: 'Retrait : {code}',
    ru: 'Вывод: {code}',
  },
  'money.devMock': {
    en: 'Test mode (devMock): no real balance needed — just play.',
    de: 'Test-Modus (devMock): kein echtes Guthaben nötig — einfach spielen.',
    fr: 'Mode test (devMock) : aucun solde réel nécessaire — jouez simplement.',
    ru: 'Тестовый режим (devMock): реальный баланс не нужен — просто играйте.',
  },

  // ── Höchsteinsatz ────────────────────────────────────────────────────────
  'limit.locked': {
    en: 'not playable right now',
    de: 'gerade nicht spielbar',
    fr: 'injouable pour le moment',
    ru: 'сейчас недоступно',
  },
  'limit.max': { en: 'Max', de: 'Max', fr: 'Max', ru: 'Макс' },
  'limit.maxUpTo': { en: 'Max up to', de: 'Max bis', fr: 'Max jusqu’à', ru: 'Макс до' },

  // ── Nachprüfbarkeit ──────────────────────────────────────────────────────
  'verify.title': {
    en: 'Provably Fair',
    de: 'Provably Fair',
    fr: 'Provably Fair',
    ru: 'Provably Fair',
  },
  'verify.seedHash': {
    en: 'Seed hash:',
    de: 'Seed-Hash:',
    fr: 'Hash de graine :',
    ru: 'Хеш сида:',
  },
  'verify.round': {
    en: 'Verify this round →',
    de: 'Runde verifizieren →',
    fr: 'Vérifier cette manche →',
    ru: 'Проверить раунд →',
  },
  'verify.run': {
    en: 'Verify this run →',
    de: 'Lauf verifizieren →',
    fr: 'Vérifier cette partie →',
    ru: 'Проверить забег →',
  },
  'verify.short': { en: 'verify', de: 'verify', fr: 'vérifier', ru: 'проверить' },
  'verify.hint': {
    en: 'Recompute it in the Sol-Core Scanner — in your own browser, without taking our word for it',
    de: 'Im Sol-Core Scanner nachrechnen — im eigenen Browser, ohne uns zu glauben',
    fr: 'Recalculez-le dans le Sol-Core Scanner — dans votre navigateur, sans nous croire sur parole',
    ru: 'Пересчитайте в Sol-Core Scanner — в своём браузере, не веря нам на слово',
  },
  'verify.recentRounds': {
    en: 'Recent rounds',
    de: 'Letzte Runden',
    fr: 'Dernières manches',
    ru: 'Последние раунды',
  },
  'verify.lost': { en: 'lost', de: 'verloren', fr: 'perdu', ru: 'проигрыш' },
  'verify.roundNo': { en: 'Round #{no}', de: 'Runde #{no}', fr: 'Manche #{no}', ru: 'Раунд #{no}' },
  'verify.runId': { en: 'Run {id}', de: 'Lauf {id}', fr: 'Partie {id}', ru: 'Забег {id}' },

  // ── Ergebnis ─────────────────────────────────────────────────────────────
  'result.won': {
    en: 'You won! Payout {amount} ◎',
    de: 'Gewonnen! Auszahlung {amount} ◎',
    fr: 'Gagné ! Paiement {amount} ◎',
    ru: 'Выигрыш! Выплата {amount} ◎',
  },
  'result.lost': { en: 'Lost', de: 'Verloren', fr: 'Perdu', ru: 'Проигрыш' },

  // ── Reveal-Module (src/reveals/*.js) — gemeinsame Schlüssel ──────────────
  // Die Endbild-Zeile jeder Animation. Kurz, weil sie in ein Quadrat passen
  // muss, das auf dem Telefon 300 px breit ist.
  'reveal.won': {
    en: 'Won +{amount} ◎',
    de: 'Gewonnen +{amount} ◎',
    fr: 'Gagné +{amount} ◎',
    ru: 'Выигрыш +{amount} ◎',
  },
  // ── Reveal-Module: gemeinsame Zusatzschlüssel ────────────────────────────
  'reveal.roll': { en: 'Roll {roll}', de: 'Wurf {roll}', fr: 'Tirage {roll}', ru: 'Бросок {roll}' },
  'reveal.bet': { en: 'Bet {amount} ◎', de: 'Einsatz {amount} ◎', fr: 'Mise {amount} ◎', ru: 'Ставка {amount} ◎' },
  'reveal.more': { en: '+{n} more', de: '+{n} weitere', fr: '+{n} de plus', ru: '+{n} ещё' },

  // ── Reveal: dice ─────────────────────────────────────────────────────────
  'reveal.dice.over': { en: 'Roll over {target}', de: 'Wurf über {target}', fr: 'Tirage au-dessus de {target}', ru: 'Бросок выше {target}' },
  'reveal.dice.under': { en: 'Roll under {target}', de: 'Wurf unter {target}', fr: 'Tirage en dessous de {target}', ru: 'Бросок ниже {target}' },
  'reveal.dice.chance': { en: '{pct}% to win', de: '{pct}% Gewinnchance', fr: '{pct}% de chances', ru: '{pct}% на выигрыш' },

  // ── Reveal: limbo ────────────────────────────────────────────────────────
  'reveal.limbo.target': { en: 'Target {x}', de: 'Ziel {x}', fr: 'Cible {x}', ru: 'Цель {x}' },
  'reveal.limbo.multiplier': { en: 'Multiplier', de: 'Multiplikator', fr: 'Multiplicateur', ru: 'Множитель' },
  'reveal.limbo.climbing': { en: 'Multiplier climbing', de: 'Multiplikator steigt', fr: 'Le multiplicateur monte', ru: 'Множитель растёт' },
  'reveal.limbo.crashed': { en: 'Crashed', de: 'Gecrasht', fr: 'Crash', ru: 'Крах' },
  'reveal.limbo.reached': { en: 'Target reached', de: 'Ziel erreicht', fr: 'Cible atteinte', ru: 'Цель достигнута' },
  'reveal.limbo.missed': { en: 'Target missed', de: 'Ziel verfehlt', fr: 'Cible manquée', ru: 'Цель не достигнута' },

  // ── Reveal: wheel ────────────────────────────────────────────────────────
  'reveal.wheel.cap': { en: '{n} segments · max {max}', de: '{n} Segmente · max. {max}', fr: '{n} segments · max {max}', ru: '{n} сегментов · макс. {max}' },
  'reveal.wheel.landed': { en: 'Segment #{idx} of {n}', de: 'Segment #{idx} von {n}', fr: 'Segment n°{idx} sur {n}', ru: 'Сегмент #{idx} из {n}' },

  // ── Reveal: keno ─────────────────────────────────────────────────────────
  'reveal.keno.hits': { en: '{h} / {n} hits', de: '{h} / {n} Treffer', fr: '{h} / {n} touches', ru: '{h} / {n} попаданий' },
  'reveal.keno.hint': { en: 'Pick your numbers · hits pay', de: 'Zahlen wählen · Treffer zahlen', fr: 'Choisis tes numéros · les touches paient', ru: 'Выбери числа · попадания платят' },
  'reveal.keno.sub': { en: '{hits} of {picks} hits · {drawn} drawn', de: '{hits} von {picks} Treffern · {drawn} gezogen', fr: '{hits} sur {picks} touches · {drawn} tirés', ru: '{hits} из {picks} попаданий · {drawn} выпало' },

  // ── Reveal: scratch ──────────────────────────────────────────────────────
  'reveal.scratch.match': { en: 'Match 3', de: '3 gleiche', fr: '3 identiques', ru: '3 одинаковых' },
  'reveal.scratch.hint': { en: '{n} fields · match 3 to win', de: '{n} Felder · 3 gleiche gewinnen', fr: '{n} cases · 3 identiques pour gagner', ru: '{n} полей · 3 одинаковых для выигрыша' },
  'reveal.scratch.tier': { en: 'Prize tier {idx}', de: 'Gewinnstufe {idx}', fr: 'Palier {idx}', ru: 'Уровень приза {idx}' },
  'reveal.scratch.prize': { en: 'Prize', de: 'Gewinn', fr: 'Prix', ru: 'Приз' },
  'reveal.scratch.blank': { en: 'No prize', de: 'Kein Gewinn', fr: 'Pas de prix', ru: 'Без приза' },

  // ── Reveal: roulette ─────────────────────────────────────────────────────
  'reveal.roulette.cap': { en: 'European wheel · {n} pockets', de: 'Europäisches Rad · {n} Fächer', fr: 'Roue européenne · {n} cases', ru: 'Европейское колесо · {n} ячеек' },
  'reveal.roulette.capUs': { en: 'American wheel · {n} pockets', de: 'Amerikanisches Rad · {n} Fächer', fr: 'Roue américaine · {n} cases', ru: 'Американское колесо · {n} ячеек' },
  'reveal.roulette.sub': { en: 'Bet {bet} · Pocket {pocket}', de: 'Wette {bet} · Fach {pocket}', fr: 'Mise {bet} · Case {pocket}', ru: 'Ставка {bet} · Ячейка {pocket}' },
  'reveal.roulette.chips': { en: '{n} chips', de: '{n} Chips', fr: '{n} jetons', ru: '{n} фишек' },
  'reveal.roulette.green': { en: 'Green', de: 'Grün', fr: 'Vert', ru: 'Зелёное' },
  'reveal.roulette.straight': { en: 'Straight {n}', de: 'Plein {n}', fr: 'Plein {n}', ru: 'Число {n}' },
  'reveal.roulette.basket': { en: 'Basket {set}', de: 'Basket {set}', fr: 'Basket {set}', ru: 'Корзина {set}' },
  'reveal.roulette.inside': { en: '{type} {set}', de: '{type} {set}', fr: '{type} {set}', ru: '{type} {set}' },
  'reveal.roulette.splitName': { en: 'Split', de: 'Split', fr: 'Cheval', ru: 'Сплит' },
  'reveal.roulette.streetName': { en: 'Street', de: 'Street', fr: 'Transversale', ru: 'Стрит' },
  'reveal.roulette.cornerName': { en: 'Corner', de: 'Corner', fr: 'Carré', ru: 'Каре' },
  'reveal.roulette.sixLineName': { en: 'Double street', de: 'Double Street', fr: 'Sixain', ru: 'Двойной стрит' },

  // ── Reveal: slots-3x3 ────────────────────────────────────────────────────
  'reveal.slots3.centre': { en: 'centre line pays', de: 'Mittellinie zahlt', fr: 'la ligne centrale paie', ru: 'платит центральная линия' },
  'reveal.slots3.triple': { en: 'Triple', de: 'Drilling', fr: 'Triple', ru: 'Тройка' },
  'reveal.slots3.pair': { en: 'Pair', de: 'Paar', fr: 'Paire', ru: 'Пара' },
  'reveal.slots3.none': { en: 'No match', de: 'Kein Treffer', fr: 'Aucune combinaison', ru: 'Нет совпадений' },

  // ── Reveal: slots-modular ────────────────────────────────────────────────
  'reveal.slotsm.paytable': { en: 'Paytable · five of a kind', de: 'Auszahlung · fünf gleiche', fr: 'Table des gains · cinq identiques', ru: 'Таблица выплат · пять одинаковых' },
  'reveal.slotsm.lines': { en: '{n} lines', de: '{n} Linien', fr: '{n} lignes', ru: '{n} линий' },
  'reveal.slotsm.wilds': { en: 'wilds substitute', de: 'Wilds ersetzen', fr: 'les wilds remplacent', ru: 'вайлды заменяют' },
  'reveal.slotsm.scatters': { en: '3+ scatters pay', de: '3+ Scatter zahlen', fr: '3+ scatters paient', ru: '3+ скаттера платят' },
  'reveal.slotsm.spin': { en: 'Spin', de: 'Drehen', fr: 'Tour', ru: 'Спин' },
  'reveal.slotsm.noLine': { en: 'no line paid', de: 'keine Linie gezahlt', fr: 'aucune ligne payée', ru: 'ни одна линия не сыграла' },

  // ── Reveal: Session-/Turnier-Module (gemeinsame Bausteine) ──────────────
  'reveal.step': { en: 'Step {n}', de: 'Schritt {n}', fr: 'Étape {n}', ru: 'Шаг {n}' },
  'reveal.bustedStep': { en: 'Busted on step {n}', de: 'Verloren bei Schritt {n}', fr: 'Perdu à l’étape {n}', ru: 'Проигрыш на шаге {n}' },
  'reveal.cashedSteps': { en: 'Cashed out after {n} steps', de: 'Ausgezahlt nach {n} Schritten', fr: 'Encaissé après {n} étapes', ru: 'Выплата после {n} шагов' },
  'reveal.cashedOut': { en: 'cashed out', de: 'ausgezahlt', fr: 'encaissé', ru: 'выплата' },
  'reveal.topReached': { en: 'top reached', de: 'oben angekommen', fr: 'sommet atteint', ru: 'вершина достигнута' },
  'reveal.capped': { en: 'at the cap', de: 'am Limit', fr: 'au plafond', ru: 'по лимиту' },
  'reveal.tie': { en: 'tie', de: 'Gleichstand', fr: 'égalité', ru: 'ничья' },
  'reveal.equal': { en: 'Equal', de: 'Gleich', fr: 'Égal', ru: 'Равно' },

  // ── Reveal: mines ────────────────────────────────────────────────────────
  'reveal.mines.title': { en: 'Mines', de: 'Minen', fr: 'Mines', ru: 'Мины' },
  'reveal.mines.board': { en: '{mines} mines / {tiles} tiles', de: '{mines} Minen / {tiles} Felder', fr: '{mines} mines / {tiles} cases', ru: '{mines} мин / {tiles} полей' },
  'reveal.mines.gems': { en: '{n} gems · cashed out', de: '{n} Edelsteine · ausgezahlt', fr: '{n} gemmes · encaissé', ru: '{n} самоцветов · выплата' },
  'reveal.mines.bust': { en: 'Mine on pick {n} · {mines} mines on the board', de: 'Mine beim {n}. Feld · {mines} Minen im Spiel', fr: 'Mine au choix {n} · {mines} mines sur la grille', ru: 'Мина на ходу {n} · {mines} мин на поле' },

  // ── Reveal: towers ───────────────────────────────────────────────────────
  'reveal.towers.title': { en: 'Towers', de: 'Türme', fr: 'Tours', ru: 'Башни' },
  'reveal.towers.floor': { en: 'F{n}', de: 'E{n}', fr: 'É{n}', ru: 'Э{n}' },
  'reveal.towers.shape': { en: '{levels} floors × {columns} · {bombs} bombs', de: '{levels} Etagen × {columns} · {bombs} Bomben', fr: '{levels} étages × {columns} · {bombs} bombes', ru: '{levels} этажей × {columns} · {bombs} бомб' },
  'reveal.towers.mixed': { en: '{levels} floors · mixed', de: '{levels} Etagen · gemischt', fr: '{levels} étages · mixte', ru: '{levels} этажей · смешанно' },
  'reveal.towers.cleared': { en: '{n} floors cleared · {end}', de: '{n} Etagen geschafft · {end}', fr: '{n} étages franchis · {end}', ru: '{n} этажей пройдено · {end}' },
  'reveal.towers.bust': { en: 'Bomb on floor {n} · {bombs} bombs per floor', de: 'Bombe auf Etage {n} · {bombs} Bomben je Etage', fr: 'Bombe à l’étage {n} · {bombs} bombes par étage', ru: 'Бомба на этаже {n} · {bombs} бомб на этаж' },
  'reveal.towers.bustShown': { en: 'Bomb on floor {n} · bombs shown', de: 'Bombe auf Etage {n} · Bomben aufgedeckt', fr: 'Bombe à l’étage {n} · bombes révélées', ru: 'Бомба на этаже {n} · бомбы показаны' },

  // ── Reveal: hilo ─────────────────────────────────────────────────────────
  'reveal.hilo.title': { en: 'Hi-Lo', de: 'Hi-Lo', fr: 'Hi-Lo', ru: 'Hi-Lo' },
  'reveal.hilo.idle': { en: 'Higher or lower?', de: 'Höher oder tiefer?', fr: 'Plus haut ou plus bas ?', ru: 'Больше или меньше?' },

  // ── Reveal: dice-ladder ──────────────────────────────────────────────────
  'reveal.diceLadder.title': { en: 'Dice Ladder', de: 'Würfelleiter', fr: 'Échelle de dés', ru: 'Лестница костей' },
  'reveal.diceLadder.higher': { en: '▲ Higher than {n}', de: '▲ Höher als {n}', fr: '▲ Plus que {n}', ru: '▲ Больше {n}' },
  'reveal.diceLadder.lower': { en: '▼ Lower than {n}', de: '▼ Tiefer als {n}', fr: '▼ Moins que {n}', ru: '▼ Меньше {n}' },
  'reveal.diceLadder.equal': { en: '= Equal to {n}', de: '= Gleich {n}', fr: '= Égal à {n}', ru: '= Равно {n}' },
  'reveal.diceLadder.tie': { en: 'Tie on {n} · loses', de: 'Gleichstand bei {n} · verloren', fr: 'Égalité à {n} · perdu', ru: 'Ничья на {n} · проигрыш' },

  // ── Reveal: steps ────────────────────────────────────────────────────────
  'reveal.steps.title': { en: 'Steps', de: 'Stufen', fr: 'Marches', ru: 'Ступени' },
  'reveal.steps.rungs': { en: '{n} rungs', de: '{n} Stufen', fr: '{n} marches', ru: '{n} ступеней' },
  'reveal.steps.checkpoints': { en: '{n} checkpoints', de: '{n} Sicherungen', fr: '{n} paliers', ru: '{n} чекпоинтов' },
  'reveal.steps.lives': { en: 'lives', de: 'Leben', fr: 'vies', ru: 'жизни' },
  'reveal.steps.start': { en: 'start', de: 'Start', fr: 'départ', ru: 'старт' },
  'reveal.steps.safe': { en: 'safe', de: 'sicher', fr: 'sûr', ru: 'сейф' },
  'reveal.steps.top': { en: 'top', de: 'oben', fr: 'sommet', ru: 'верх' },
  'reveal.steps.result': { en: 'Rung {rung} of {n} · {end}', de: 'Stufe {rung} von {n} · {end}', fr: 'Marche {rung} sur {n} · {end}', ru: 'Ступень {rung} из {n} · {end}' },
  'reveal.steps.falls': { en: '{n} falls', de: '{n} Stürze', fr: '{n} chutes', ru: '{n} падений' },
  'reveal.steps.bust': { en: 'Failed climb to rung {n} · {why}', de: 'Aufstieg zu Stufe {n} misslungen · {why}', fr: 'Montée vers la marche {n} ratée · {why}', ru: 'Подъём на ступень {n} не удался · {why}' },
  'reveal.steps.noLives': { en: 'no lives left', de: 'kein Leben mehr', fr: 'plus de vies', ru: 'жизней не осталось' },
  'reveal.steps.busted': { en: 'busted', de: 'verloren', fr: 'perdu', ru: 'проигрыш' },

  // ── Reveal: pump ─────────────────────────────────────────────────────────
  'reveal.pump.title': { en: 'Pump', de: 'Pumpe', fr: 'Pompe', ru: 'Насос' },
  'reveal.pump.pumps': { en: 'Pumps {n}', de: 'Pumpen {n}', fr: 'Pompes {n}', ru: 'Накачек {n}' },
  'reveal.pump.burstAt': { en: 'Burst at', de: 'Geplatzt bei', fr: 'Éclaté à', ru: 'Лопнул на' },
  'reveal.pump.sub': { en: 'Bet {bet} ◎ · {n} pumps', de: 'Einsatz {bet} ◎ · {n} Pumpen', fr: 'Mise {bet} ◎ · {n} pompes', ru: 'Ставка {bet} ◎ · {n} накачек' },

  // ── Reveal: spin-tower-pro ───────────────────────────────────────────────
  'reveal.spinTower.title': { en: 'Spin Tower', de: 'Spin Tower', fr: 'Spin Tower', ru: 'Spin Tower' },
  'reveal.spinTower.spin': { en: 'Spin {n}', de: 'Spin {n}', fr: 'Tour {n}', ru: 'Спин {n}' },
  'reveal.spinTower.perSpin': { en: '{amount} ◎/spin', de: '{amount} ◎/Spin', fr: '{amount} ◎/tour', ru: '{amount} ◎/спин' },
  'reveal.spinTower.joker': { en: 'Joker', de: 'Joker', fr: 'Joker', ru: 'Джокер' },
  'reveal.spinTower.nothing': { en: 'Nothing', de: 'Nichts', fr: 'Rien', ru: 'Пусто' },
  'reveal.spinTower.fail': { en: 'FAIL', de: 'FAIL', fr: 'FAIL', ru: 'FAIL' },
  'reveal.spinTower.pot': { en: 'POT', de: 'POT', fr: 'POT', ru: 'ПОТ' },
  'reveal.spinTower.secured': { en: 'SECURED', de: 'GESICHERT', fr: 'SÉCURISÉ', ru: 'ЗАЩИЩЕНО' },
  'reveal.spinTower.reset': { en: 'reset', de: 'Reset', fr: 'remise à zéro', ru: 'сброс' },
  'reveal.spinTower.stepdown': { en: 'step-down', de: 'Stufe runter', fr: 'un cran en moins', ru: 'на шаг вниз' },
  'reveal.spinTower.busted': { en: 'FAIL · busted', de: 'FAIL · verloren', fr: 'FAIL · perdu', ru: 'FAIL · проигрыш' },
  'reveal.spinTower.capReached': { en: 'Spin cap reached', de: 'Spin-Limit erreicht', fr: 'Plafond de tours atteint', ru: 'Лимит спинов' },
  'reveal.spinTower.cashed': { en: 'Cashed out', de: 'Ausgezahlt', fr: 'Encaissé', ru: 'Выплата' },
  'reveal.spinTower.sub': { en: '{status} · {n} spins · {staked} ◎ staked', de: '{status} · {n} Spins · {staked} ◎ gesetzt', fr: '{status} · {n} tours · {staked} ◎ misés', ru: '{status} · {n} спинов · {staked} ◎ поставлено' },

  // ── Reveal: gauntlet ─────────────────────────────────────────────────────
  'reveal.gauntlet.title': { en: 'Gauntlet', de: 'Gauntlet', fr: 'Gauntlet', ru: 'Гаунтлет' },
  'reveal.gauntlet.steps': { en: '{n} steps', de: '{n} Schritte', fr: '{n} étapes', ru: '{n} шагов' },
  'reveal.gauntlet.roll': { en: 'roll', de: 'Wurf', fr: 'tirage', ru: 'бросок' },
  'reveal.gauntlet.survived': { en: 'survived · +{n}', de: 'überlebt · +{n}', fr: 'survécu · +{n}', ru: 'выжил · +{n}' },
  'reveal.gauntlet.bust': { en: 'bust · roll {roll} ≥ {thr}', de: 'raus · Wurf {roll} ≥ {thr}', fr: 'perdu · tirage {roll} ≥ {thr}', ru: 'вылет · бросок {roll} ≥ {thr}' },
  'reveal.gauntlet.banked': { en: 'banked', de: 'gebankt', fr: 'sécurisé', ru: 'зафиксировано' },
  'reveal.gauntlet.stop': { en: 'stop', de: 'Stopp', fr: 'stop', ru: 'стоп' },
  'reveal.gauntlet.full': { en: 'full', de: 'voll', fr: 'complet', ru: 'полный' },
  'reveal.gauntlet.pts': { en: '{n} pts', de: '{n} Pkt.', fr: '{n} pts', ru: '{n} очк.' },
  'reveal.gauntlet.bustStep': { en: 'Bust on step {n}', de: 'Raus bei Schritt {n}', fr: 'Perdu à l’étape {n}', ru: 'Вылет на шаге {n}' },
  'reveal.gauntlet.expired': { en: 'Run expired', de: 'Lauf abgelaufen', fr: 'Course expirée', ru: 'Забег истёк' },
  'reveal.gauntlet.bankedPts': { en: 'Banked {pts}', de: 'Gebankt: {pts}', fr: 'Sécurisé : {pts}', ru: 'Зафиксировано: {pts}' },
  'reveal.gauntlet.sub': { en: '{n} of {max} steps · entry {fee} ◎ to the pot', de: '{n} von {max} Schritten · Einsatz {fee} ◎ in den Pot', fr: '{n} étapes sur {max} · mise {fee} ◎ dans le pot', ru: '{n} из {max} шагов · взнос {fee} ◎ в банк' },

  // ── Reveal: plinko ───────────────────────────────────────────────────────
  'reveal.plinko.rows': { en: '{rows} rows', de: '{rows} Reihen', fr: '{rows} rangées', ru: '{rows} рядов' },
  'reveal.plinko.head': {
    en: '{rows} rows · {risk}',
    de: '{rows} Reihen · {risk}',
    fr: '{rows} rangées · {risk}',
    ru: '{rows} рядов · {risk}',
  },
  'reveal.plinko.risk.low': { en: 'low risk', de: 'geringes Risiko', fr: 'risque faible', ru: 'низкий риск' },
  'reveal.plinko.risk.medium': { en: 'medium risk', de: 'mittleres Risiko', fr: 'risque moyen', ru: 'средний риск' },
  'reveal.plinko.risk.high': { en: 'high risk', de: 'hohes Risiko', fr: 'risque élevé', ru: 'высокий риск' },
  'reveal.plinko.risk.base': { en: 'base {base}', de: 'Basis {base}', fr: 'base {base}', ru: 'база {base}' },
  'reveal.plinko.oneBall': { en: '1 ball', de: '1 Kugel', fr: '1 bille', ru: '1 шар' },
  'reveal.plinko.balls': { en: '{n} balls · avg', de: '{n} Kugeln · Ø', fr: '{n} billes · moy.', ru: '{n} шаров · сред.' },

  // ── Coin-Flip-Reveal (src/reveals/coin-flip.js) ──────────────────────────
  // ── Gewinnmeldung in der Kopfleiste (WinToast) ───────────────────────────
  'win.toast': {
    en: 'Won +{amount} ◎',
    de: 'Gewonnen +{amount} ◎',
    fr: 'Gagné +{amount} ◎',
    ru: 'Выигрыш +{amount} ◎',
  },

  'coinflip.you': { en: 'You:', de: 'Du:', fr: 'Vous :', ru: 'Ваш выбор:' },
  'coinflip.roll': { en: 'Roll {roll}', de: 'Wurf {roll}', fr: 'Tirage {roll}', ru: 'Бросок {roll}' },
  'coinflip.idle': {
    en: 'Heads or Tails',
    de: 'Kopf oder Zahl',
    fr: 'Face ou Pile',
    ru: 'Орёл или решка',
  },

  // ── Einzelwette ──────────────────────────────────────────────────────────
  'bet.stake': {
    en: 'Bet (SOL)',
    de: 'Einsatz (SOL)',
    fr: 'Mise (SOL)',
    ru: 'Ставка (SOL)',
  },
  'bet.running': { en: 'Running…', de: 'Läuft…', fr: 'En cours…', ru: 'Идёт…' },
  'bet.pickField': {
    en: 'Pick at least one field.',
    de: 'Bitte mindestens ein Feld wählen.',
    fr: 'Choisissez au moins une case.',
    ru: 'Выберите хотя бы одно поле.',
  },
  'bet.stakeTooSmall': {
    en: 'Bet too small for the number of chips selected.',
    de: 'Einsatz zu klein für die Anzahl gewählter Chips.',
    fr: 'Mise trop faible pour le nombre de jetons choisis.',
    ru: 'Ставка слишком мала для выбранного числа фишек.',
  },
  'bet.noExtraInputs': {
    en: 'This engine needs no extra input.',
    de: 'Diese Engine braucht keine Zusatz-Eingaben.',
    fr: 'Ce moteur ne demande aucune saisie supplémentaire.',
    ru: 'Этому движку не нужны дополнительные вводы.',
  },

  // ── Session ──────────────────────────────────────────────────────────────
  'session.stakePerSpin': {
    en: 'Bet PER SPIN (SOL)',
    de: 'Einsatz JE SPIN (SOL)',
    fr: 'Mise PAR TOUR (SOL)',
    ru: 'Ставка ЗА СПИН (SOL)',
  },
  'session.stakePerSpinLocked': {
    en: 'Bet per spin (SOL) — locked for this round',
    de: 'Einsatz je Spin (SOL) — für diese Runde gesperrt',
    fr: 'Mise par tour (SOL) — verrouillée pour cette manche',
    ru: 'Ставка за спин (SOL) — зафиксирована на этот раунд',
  },
  'session.stakeLockedShort': {
    en: 'Bet per spin — locked for this round',
    de: 'Einsatz je Spin — für diese Runde gesperrt',
    fr: 'Mise par tour — verrouillée pour cette manche',
    ru: 'Ставка за спин — зафиксирована на этот раунд',
  },
  'session.start': {
    en: 'Start round',
    de: 'Runde starten',
    fr: 'Démarrer la manche',
    ru: 'Начать раунд',
  },
  'session.newRound': {
    en: 'New round',
    de: 'Neue Runde',
    fr: 'Nouvelle manche',
    ru: 'Новый раунд',
  },
  'session.cashout': {
    en: 'Cash out now',
    de: 'Cashout jetzt',
    fr: 'Encaisser maintenant',
    ru: 'Забрать сейчас',
  },
  'session.busted': {
    en: 'Busted — lost',
    de: 'Geplatzt — verloren',
    fr: 'Éclaté — perdu',
    ru: 'Взрыв — проигрыш',
  },
  'session.step': {
    en: 'Step {n} · possible {amount} ◎',
    de: 'Schritt {n} · möglich {amount} ◎',
    fr: 'Étape {n} · possible {amount} ◎',
    ru: 'Шаг {n} · возможно {amount} ◎',
  },
  'session.higher': { en: 'Higher', de: 'Höher', fr: 'Plus haut', ru: 'Больше' },
  'session.lower': { en: 'Lower', de: 'Tiefer', fr: 'Plus bas', ru: 'Меньше' },
  // Dritter Tipp der Ketten-Engines — nur sichtbar, wenn das Spiel ihn
  // erlaubt (allowEqual). Wortgleich mit dem Text der Animation
  // ('reveal.equal'), damit Knopf und Aufdeckung dasselbe sagen.
  'session.equal': { en: 'Equal', de: 'Gleich', fr: 'Égal', ru: 'Равно' },
  // Warum ein Tipp-Knopf gesperrt ist. Beide Gründe kommen vom Server: der
  // erste ist aus Karte und Regelwerk ableitbar, den zweiten nennt er in
  // seiner Ablehnung (`allowedGuesses`). Stehen als `title` am Knopf und als
  // Zeile darunter — ein grauer Knopf ohne Grund ist ein kaputter Knopf.
  'session.guessImpossible': {
    en: 'Not possible on this value — nothing can beat it in that direction.',
    de: 'Bei diesem Wert nicht möglich — in diese Richtung geht nichts mehr.',
    fr: 'Impossible sur cette valeur — rien ne va plus dans cette direction.',
    ru: 'Невозможно при этом значении — в эту сторону ничего нет.',
  },
  'session.guessCapped': {
    en: 'Not playable — this guess would exceed the chain limit. Cash out or pick a likelier guess.',
    de: 'Nicht spielbar — dieser Tipp würde die Ketten-Obergrenze reißen. Cashout oder wahrscheinlicheren Tipp wählen.',
    fr: 'Injouable — ce pari dépasserait la limite de la chaîne. Encaissez ou choisissez un pari plus probable.',
    ru: 'Недоступно — эта догадка превысит предел цепочки. Заберите выигрыш или выберите более вероятный вариант.',
  },
  'session.everySpinCosts': {
    en: 'Careful: EVERY spin costs this bet again',
    de: 'Achtung: JEDER Spin kostet erneut diesen Einsatz',
    fr: 'Attention : CHAQUE tour coûte à nouveau cette mise',
    ru: 'Внимание: КАЖДЫЙ спин снова стоит эту ставку',
  },
  'session.everySpinCostsShort': {
    en: 'Every spin costs the bet again',
    de: 'Jeder Spin kostet erneut den Einsatz',
    fr: 'Chaque tour coûte à nouveau la mise',
    ru: 'Каждый спин снова стоит ставку',
  },
  'session.configNotLoaded': {
    en: 'Config not loaded — using defaults',
    de: 'Config nicht geladen — Standardwerte angenommen',
    fr: 'Config non chargée — valeurs par défaut utilisées',
    ru: 'Конфиг не загружен — взяты значения по умолчанию',
  },
  'session.stakeUnknown': {
    en: 'The server does not report the round bet — shown is the last value you entered.',
    de: 'Der Server meldet den Rundeneinsatz nicht — angezeigt ist der zuletzt eingegebene Wert.',
    fr: 'Le serveur n’indique pas la mise de la manche — la valeur affichée est la dernière saisie.',
    ru: 'Сервер не сообщает ставку раунда — показано последнее введённое значение.',
  },
  'session.failReset': {
    en: 'FAIL: all towers to 0, round ends',
    de: 'FAIL: alle Türme auf 0, Runde endet',
    fr: 'ÉCHEC : toutes les tours à 0, la manche se termine',
    ru: 'ПРОВАЛ: все башни на 0, раунд заканчивается',
  },
  'session.failStepdown': {
    en: 'FAIL: every tower down one level, round continues',
    de: 'FAIL: jeder Turm eine Stufe runter, Runde läuft weiter',
    fr: 'ÉCHEC : chaque tour descend d’un niveau, la manche continue',
    ru: 'ПРОВАЛ: каждая башня опускается на уровень, раунд продолжается',
  },
  'session.safePoint': {
    en: '(safe point catches you)',
    de: '(Safe-Point fängt dich)',
    fr: '(le point sûr vous rattrape)',
    ru: '(контрольная точка вас удержит)',
  },
  'session.towers': {
    en: 'Towers — multiplier per level',
    de: 'Türme — Multiplikator je Stufe',
    fr: 'Tours — multiplicateur par niveau',
    ru: 'Башни — множитель за уровень',
  },

  // ── Turnier ──────────────────────────────────────────────────────────────
  'tournament.bestScore': {
    en: 'Your best score:',
    de: 'Dein bester Score:',
    fr: 'Votre meilleur score :',
    ru: 'Ваш лучший счёт:',
  },
  'tournament.entries': { en: 'Entries', de: 'Einsätze', fr: 'Entrées', ru: 'Взносы' },
  'tournament.noScores': {
    en: 'No scores in this cycle yet.',
    de: 'Noch keine Scores in diesem Zyklus.',
    fr: 'Aucun score dans ce cycle pour l’instant.',
    ru: 'В этом цикле ещё нет результатов.',
  },

  // ── Live (Quoten) ────────────────────────────────────────────────────────
  'live.nextRoundIn': {
    en: 'Next round in {s}s',
    de: 'Nächste Runde in {s}s',
    fr: 'Prochaine manche dans {s} s',
    ru: 'Следующий раунд через {s} с',
  },
  'live.nextRoundStarts': {
    en: 'Next round starting…',
    de: 'Nächste Runde startet…',
    fr: 'Prochaine manche en préparation…',
    ru: 'Следующий раунд начинается…',
  },
  'live.racing': { en: 'Race running…', de: 'Rennen läuft…', fr: 'Course en cours…', ru: 'Забег идёт…' },
  'live.stakeSol': { en: 'SOL bet', de: 'SOL Einsatz', fr: 'SOL de mise', ru: 'SOL ставка' },
  'live.potential': {
    en: 'poss. {amount} ◎',
    de: 'mögl. {amount} ◎',
    fr: 'poss. {amount} ◎',
    ru: 'возм. {amount} ◎',
  },
  'live.outcomeFull': {
    en: 'This outcome is full — bet less or pick another one.',
    de: 'Dieses Outcome ist voll — kleinerer Einsatz oder anderes Outcome.',
    fr: 'Ce résultat est complet — misez moins ou choisissez-en un autre.',
    ru: 'Этот исход заполнен — уменьшите ставку или выберите другой.',
  },
  'live.bettingClosed': {
    en: 'Betting just closed — next round.',
    de: 'Wettfenster gerade geschlossen — nächste Runde.',
    fr: 'Les paris viennent de fermer — manche suivante.',
    ru: 'Приём ставок только что закрыт — следующий раунд.',
  },
  'live.connectToBet': {
    en: 'Connect a wallet to bet.',
    de: 'Wallet verbinden, um zu setzen.',
    fr: 'Connectez un portefeuille pour miser.',
    ru: 'Подключите кошелёк, чтобы делать ставки.',
  },
  'live.lineup': {
    en: 'Line-up — place your bets.',
    de: 'Startaufstellung — platziere deine Bets.',
    fr: 'Grille de départ — placez vos mises.',
    ru: 'Стартовая расстановка — делайте ставки.',
  },
  'live.recentResults': {
    en: 'Recent results',
    de: 'Letzte Ergebnisse',
    fr: 'Derniers résultats',
    ru: 'Последние результаты',
  },

  // ── Live-Crash ───────────────────────────────────────────────────────────
  'crash.stake': { en: 'Bet (◎)', de: 'Einsatz (◎)', fr: 'Mise (◎)', ru: 'Ставка (◎)' },
  'crash.stakeAria': { en: 'Bet in SOL', de: 'Einsatz in SOL', fr: 'Mise en SOL', ru: 'Ставка в SOL' },
  'crash.stakeNaN': {
    en: 'Enter the bet as a number, e.g. 0.10.',
    de: 'Einsatz bitte als Zahl eingeben, z. B. 0.10.',
    fr: 'Saisissez la mise sous forme de nombre, par ex. 0.10.',
    ru: 'Введите ставку числом, например 0.10.',
  },
  'crash.autoCashout': {
    en: 'Auto cash-out (×)',
    de: 'Auto-Ausstieg (×)',
    fr: 'Retrait auto (×)',
    ru: 'Авто-вывод (×)',
  },
  'crash.autoNaN': {
    en: 'Enter the auto cash-out as a number, e.g. 2.50 — or leave it empty.',
    de: 'Auto-Ausstieg bitte als Zahl eingeben, z. B. 2.50 — oder leer lassen.',
    fr: 'Saisissez le retrait auto sous forme de nombre, par ex. 2.50 — ou laissez vide.',
    ru: 'Введите авто-вывод числом, например 2.50 — или оставьте пустым.',
  },
  'crash.autoTooHigh': {
    en: 'Auto cash-out at most {max}× — this game pays no more.',
    de: 'Auto-Ausstieg höchstens {max}× — mehr zahlt dieses Spiel nicht aus.',
    fr: 'Retrait auto au plus {max}× — ce jeu ne paie pas davantage.',
    ru: 'Авто-вывод максимум {max}× — больше игра не платит.',
  },
  'crash.autoTooLow': {
    en: 'Auto cash-out must be above 1.00× — or left empty.',
    de: 'Auto-Ausstieg muss über 1.00× liegen — oder leer bleiben.',
    fr: 'Le retrait auto doit dépasser 1,00× — ou rester vide.',
    ru: 'Авто-вывод должен быть выше 1.00× — или пустым.',
  },
  'crash.autoHint': {
    en: 'The auto cash-out exits for you as soon as the curve reaches it — even without a click. Without a target you click yourself.',
    de: 'Der Auto-Ausstieg steigt für dich aus, sobald die Kurve ihn erreicht — auch ohne Klick. Ohne Ziel klickst du selbst.',
    fr: 'Le retrait auto sort pour vous dès que la courbe l’atteint — même sans clic. Sans objectif, vous cliquez vous-même.',
    ru: 'Авто-вывод сработает сам, как только кривая до него дойдёт — даже без клика. Без цели вы кликаете сами.',
  },
  'crash.autoAria': {
    en: 'Safety target as a multiplier, optional, at most {max}',
    de: 'Sicherheitsziel als Multiplikator, optional, höchstens {max}',
    fr: 'Objectif de sécurité en multiplicateur, facultatif, au plus {max}',
    ru: 'Целевой множитель, необязательно, не более {max}',
  },
  'crash.preparing': {
    en: 'The next flight is being prepared…',
    de: 'Der nächste Flug wird vorbereitet…',
    fr: 'Le prochain vol est en préparation…',
    ru: 'Следующий полёт готовится…',
  },
  'crash.roundDone': {
    en: 'This round is over.',
    de: 'Diese Runde ist durch.',
    fr: 'Cette manche est terminée.',
    ru: 'Этот раунд завершён.',
  },
  'crash.notAboard': {
    en: 'You are not in this round — the next betting window opens shortly.',
    de: 'Du fliegst diese Runde nicht mit — gleich öffnet das nächste Wettfenster.',
    fr: 'Vous n’êtes pas dans cette manche — la prochaine fenêtre de paris ouvre bientôt.',
    ru: 'Вы не в этом раунде — следующее окно ставок скоро откроется.',
  },
  'crash.nobodyAboard': {
    en: 'Nobody aboard yet — be the first.',
    de: 'Noch niemand an Bord — sei der Erste.',
    fr: 'Personne à bord — soyez le premier.',
    ru: 'Пока никого — будьте первым.',
  },
  'crash.settling': {
    en: 'Round is being settled…',
    de: 'Runde wird abgerechnet…',
    fr: 'La manche est en cours de règlement…',
    ru: 'Раунд рассчитывается…',
  },
  'crash.waitedTooLong': {
    en: 'Waited too long — bet gone.',
    de: 'Zu lange gewartet — Einsatz weg.',
    fr: 'Attendu trop longtemps — mise perdue.',
    ru: 'Слишком долго ждали — ставка потеряна.',
  },
  'crash.outInTime': {
    en: 'Out in time',
    de: 'Rechtzeitig raus',
    fr: 'Sorti à temps',
    ru: 'Успели выйти',
  },
  'crash.practiceTitle': { en: 'Practice mode.', de: 'Übungsmodus.', fr: 'Mode entraînement.', ru: 'Тренировочный режим.' },
  'crash.practiceBody': {
    en: 'This game currently moves a practice balance on the server — your wallet balance stays untouched. Deposit and withdraw above still work: the balance is valid across all games on the platform.',
    de: 'Dieses Spiel bewegt gerade ein Übungs-Guthaben auf dem Server — dein Wallet-Guthaben bleibt unangetastet. Ein- und Auszahlen oben funktioniert trotzdem: das Guthaben gilt für alle Spiele der Plattform.',
    fr: 'Ce jeu déplace actuellement un solde d’entraînement sur le serveur — votre solde de portefeuille reste intact. Le dépôt et le retrait ci-dessus fonctionnent quand même : le solde vaut pour tous les jeux de la plateforme.',
    ru: 'Сейчас игра двигает тренировочный баланс на сервере — баланс кошелька не затрагивается. Пополнение и вывод выше всё равно работают: баланс действует во всех играх платформы.',
  },
  'crash.realMoney': { en: 'Real money', de: 'Echtgeld', fr: 'Argent réel', ru: 'Реальные деньги' },
  'crash.playMoney': { en: 'Play money', de: 'Spielgeld', fr: 'Argent fictif', ru: 'Игровые деньги' },
  'crash.hint': {
    en: 'Place a bet, let the curve climb, cash out in time.',
    de: 'Einsatz setzen, Kurve steigen lassen, rechtzeitig aussteigen.',
    fr: 'Misez, laissez la courbe monter, encaissez à temps.',
    ru: 'Сделайте ставку, дайте кривой расти, вовремя заберите.',
  },
  'crash.fairNote': {
    en: 'The crash point is fixed before the betting window and is the same for everyone. Results come from the Sol-Core server only.',
    de: 'Der Crash-Punkt steht vor dem Wettfenster fest und gilt für alle gleich. Ergebnisse kommen ausschließlich vom Sol-Core-Server.',
    fr: 'Le point de crash est fixé avant la fenêtre de paris et vaut pour tous. Les résultats viennent uniquement du serveur Sol-Core.',
    ru: 'Точка краха фиксируется до окна ставок и одинакова для всех. Результаты приходят только с сервера Sol-Core.',
  },
  'crash.starting': { en: 'Starting shortly', de: 'Startet gleich', fr: 'Bientôt', ru: 'Скоро старт' },
  'crash.flying': { en: 'The flight is running', de: 'Der Flug läuft', fr: 'Le vol est en cours', ru: 'Полёт идёт' },
  'crash.aboutToTakeOff': {
    en: 'The curve is about to take off. The longer it climbs, the more it pays —',
    de: 'Gleich hebt die Kurve ab. Je länger sie steigt, desto mehr zahlt sie —',
    fr: 'La courbe va décoller. Plus elle monte longtemps, plus elle paie —',
    ru: 'Кривая вот-вот взлетит. Чем дольше она растёт, тем больше платит —',
  },
  'crash.andItBursts': {
    en: 'and at some point it bursts.',
    de: 'und irgendwann platzt sie.',
    fr: 'et à un moment elle éclate.',
    ru: 'и в какой-то момент она лопается.',
  },
  'crash.roundSettled': {
    en: 'Round settled',
    de: 'Runde ausgewertet',
    fr: 'Manche évaluée',
    ru: 'Раунд подсчитан',
  },
  'crash.yourExit': { en: 'your exit', de: 'dein Ausstieg', fr: 'votre sortie', ru: 'ваш выход' },

  // ── Roulette ─────────────────────────────────────────────────────────────
  'roulette.pickOne': {
    en: 'Pick one field.',
    de: 'Ein Feld wählen.',
    fr: 'Choisissez une case.',
    ru: 'Выберите одно поле.',
  },
  'roulette.pickMany': {
    en: 'Pick several fields — including on the lines between the numbers. The bet is spread evenly across the chips.',
    de: 'Mehrere Felder wählen — auch auf den Linien zwischen den Zahlen. Der Einsatz wird gleichmäßig auf die Chips verteilt.',
    fr: 'Choisissez plusieurs cases — y compris sur les lignes entre les numéros. La mise est répartie également sur les jetons.',
    ru: 'Выберите несколько полей — в том числе на линиях между числами. Ставка делится поровну между фишками.',
  },
  'roulette.payouts': {
    en: 'Straight 36× · Split 18× · Street 12× · Corner 9× · Double street 6× · Dozen/Column 3× · Even chance 2×',
    de: 'Zahl 36× · Split 18× · Street 12× · Ecke 9× · Doppelstraße 6× · Dutzend/Kolonne 3× · einfache Chance 2×',
    fr: 'Plein 36× · Cheval 18× · Transversale 12× · Carré 9× · Sixain 6× · Douzaine/Colonne 3× · Chance simple 2×',
    ru: 'Число 36× · Сплит 18× · Стрит 12× · Угол 9× · Двойной стрит 6× · Дюжина/Колонка 3× · Равные шансы 2×',
  },
  'roulette.zeroBets': { en: 'Zero bets', de: 'Null-Wetten', fr: 'Paris sur zéro', ru: 'Ставки на зеро' },
  'roulette.doubleStreet': {
    en: 'Double street {from}-{to} · 6×',
    de: 'Doppelstraße {from}-{to} · 6×',
    fr: 'Sixain {from}-{to} · 6×',
    ru: 'Двойной стрит {from}-{to} · 6×',
  },

  // ── Gemeinsam ────────────────────────────────────────────────────────────
  'demo.note': {
    en: 'Demo mode — simulated balance, every spin is genuinely provably fair. No real money.',
    de: 'Demo-Modus — simuliertes Guthaben, jeder Spin ist echt provably-fair. Kein echtes Geld.',
    fr: 'Mode démo — solde simulé, chaque tour est réellement provably fair. Pas d’argent réel.',
    ru: 'Демо-режим — симулированный баланс, каждый спин действительно provably fair. Без реальных денег.',
  },
  'demo.practiceRunNote': {
    en: 'Practice run in demo mode — no real pot, it is about the score.',
    de: 'Übungslauf im Demo-Modus — kein echter Pot, es geht um den Score.',
    fr: 'Partie d’entraînement en mode démo — pas de vraie cagnotte, c’est le score qui compte.',
    ru: 'Тренировочный забег в демо-режиме — банка нет, важен счёт.',
  },
  'demo.startPracticeRun': {
    en: 'Start practice run', de: 'Übungslauf starten', fr: 'Démarrer l’entraînement', ru: 'Начать тренировку',
  },
  'common.connectWallet': {
    en: 'Connect wallet', de: 'Wallet verbinden', fr: 'Connecter le portefeuille', ru: 'Подключить кошелёк',
  },
  'common.play': { en: 'Play', de: 'Spielen', fr: 'Jouer', ru: 'Играть' },
  'common.unknownError': {
    en: 'Unknown error', de: 'Unbekannter Fehler', fr: 'Erreur inconnue', ru: 'Неизвестная ошибка',
  },

  // ── Turnier (Fortsetzung) ────────────────────────────────────────────────
  'tournament.retry': { en: 'Try again', de: 'Neuer Versuch', fr: 'Nouvel essai', ru: 'Ещё попытка' },
  'tournament.join': { en: 'Join', de: 'Mitspielen', fr: 'Participer', ru: 'Участвовать' },
  'tournament.endsIn': { en: 'Ends in', de: 'Endet in', fr: 'Se termine dans', ru: 'Завершится через' },
  'tournament.leaderboard': { en: 'Leaderboard', de: 'Leaderboard', fr: 'Classement', ru: 'Таблица лидеров' },
  'tournament.pot': { en: 'Pot', de: 'Pot', fr: 'Cagnotte', ru: 'Банк' },
  'tournament.points': { en: 'Points', de: 'Punkte', fr: 'Points', ru: 'Очки' },
  'tournament.cycleEnds': { en: 'Cycle ending…', de: 'Zyklus endet…', fr: 'Fin du cycle…', ru: 'Цикл завершается…' },
  'tournament.bust': {
    en: 'Bust — run zeroed', de: 'Bust — Lauf genullt', fr: 'Éclaté — partie remise à zéro', ru: 'Провал — забег обнулён',
  },

  // ── Live (Fortsetzung) ───────────────────────────────────────────────────
  'live.loadingStream': {
    en: 'Loading live stream…', de: 'Lade Live-Stream…', fr: 'Chargement du direct…', ru: 'Загрузка трансляции…',
  },
  'live.result': { en: 'Result', de: 'Ergebnis', fr: 'Résultat', ru: 'Результат' },
  'live.myBets': { en: 'My bets', de: 'Meine Bets', fr: 'Mes mises', ru: 'Мои ставки' },
  'live.streamPaused': { en: 'Stream paused', de: 'Stream pausiert', fr: 'Direct en pause', ru: 'Трансляция на паузе' },
  'live.bettingClosedBadge': {
    en: 'Betting closed', de: 'Wettfenster geschlossen', fr: 'Paris fermés', ru: 'Ставки закрыты',
  },
  'live.startingSoon': {
    en: 'Betting closed — starting…', de: 'Wettfenster geschlossen — Start…', fr: 'Paris fermés — départ…', ru: 'Ставки закрыты — старт…',
  },

  // ── Session (Fortsetzung) ────────────────────────────────────────────────
  'session.level': { en: 'Level {n}', de: 'Stufe {n}', fr: 'Niveau {n}', ru: 'Уровень {n}' },
  'session.cashedOut': {
    en: 'Cashed out {amount} ◎', de: 'Cashout {amount} ◎', fr: 'Encaissé {amount} ◎', ru: 'Забрано {amount} ◎',
  },
  'session.stepInfo': {
    en: 'Level {n}{lives} · possible {amount} ◎',
    de: 'Stufe {n}{lives} · möglich {amount} ◎',
    fr: 'Niveau {n}{lives} · possible {amount} ◎',
    ru: 'Уровень {n}{lives} · возможно {amount} ◎',
  },
  'session.livesLeft': {
    en: ' · lives {left}{of}', de: ' · Leben {left}{of}', fr: ' · vies {left}{of}', ru: ' · жизни {left}{of}',
  },
  'session.topLevelNote': {
    en: '★ = top level: the next hit on this tower pays the multiplier as SECURED (FAIL-immune, paid at the end of the round) — the tower stays up and keeps counting in the pot.',
    de: '★ = höchste Stufe: der nächste Treffer auf diesen Turm zahlt den Multiplikator als GESICHERT (FAIL-immun, Auszahlung am Rundenende) — der Turm bleibt oben stehen und zählt weiter im Pot.',
    fr: '★ = niveau max : le prochain succès sur cette tour paie le multiplicateur comme SÉCURISÉ (immunisé à l’ÉCHEC, payé en fin de manche) — la tour reste en place et continue de compter dans la cagnotte.',
    ru: '★ = верхний уровень: следующее попадание по этой башне платит множитель как ЗАКРЕПЛЁННЫЙ (не боится ПРОВАЛА, выплата в конце раунда) — башня остаётся наверху и продолжает считаться в банке.',
  },
  'session.cashoutNote': {
    en: 'Cash out any time from the first spin — it pays pot + secured.',
    de: 'Cashout ist ab dem ersten Spin jederzeit möglich und zahlt Pot + Gesichertes.',
    fr: 'Encaissez à tout moment dès le premier tour — cela paie la cagnotte + le sécurisé.',
    ru: 'Забрать можно в любой момент с первого спина — платит банк + закреплённое.',
  },
  // ── spin-tower-pro ────────────────────────────────────────────────────────
  // Diese fünf standen bis zum 29.08.2026 als deutsche Zeichenketten direkt im
  // Bauteil. Sie sind der Prüfung entgangen, weil sie in Ausdrücken und
  // Template-Literalen steckten, nicht als JSX-Text — ein Franzose las im
  // laufenden Spiel plötzlich „Abgestürzt: Stufe 3 → 1".
  'session.tower': { en: 'Tower {n}', de: 'Turm {n}', fr: 'Tour {n}', ru: 'Башня {n}' },
  'session.spinInfo': {
    en: 'Spin {n}{max} · Cash out {amount} ◎',
    de: 'Spin {n}{max} · Cashout {amount} ◎',
    fr: 'Spin {n}{max} · Encaisser {amount} ◎',
    ru: 'Спин {n}{max} · Кэшаут {amount} ◎',
  },
  'session.failPotLost': {
    en: 'FAIL — pot lost',
    de: 'FAIL — Pot verloren',
    fr: 'FAIL — pot perdu',
    ru: 'FAIL — пот потерян',
  },
  'session.failSecuredPaid': {
    en: 'secured {amount} ◎ paid out',
    de: 'gesichert {amount} ◎ ausgezahlt',
    fr: 'sécurisé {amount} ◎ versé',
    ru: 'обеспеченные {amount} ◎ выплачены',
  },
  'session.fell': {
    en: 'Fell: level {from} → {to}',
    de: 'Abgestürzt: Stufe {from} → {to}',
    fr: 'Chute : niveau {from} → {to}',
    ru: 'Падение: уровень {from} → {to}',
  },
  'session.ground': { en: '(ground)', de: '(Boden)', fr: '(sol)', ru: '(низ)' },
  'session.failTakesIt': {
    en: 'FAIL takes it', de: 'FAIL nimmt ihn', fr: 'L’ÉCHEC l’emporte', ru: 'ПРОВАЛ забирает',
  },
  'session.failImmune': {
    en: 'FAIL-immune · pays at the end of the round',
    de: 'FAIL-immun · zahlt am Rundenende',
    fr: 'Immunisé à l’ÉCHEC · paie en fin de manche',
    ru: 'Не боится ПРОВАЛА · платит в конце раунда',
  },
  'session.secured': { en: 'Secured', de: 'Gesichert', fr: 'Sécurisé', ru: 'Закреплено' },
  'session.pot': { en: 'Pot', de: 'Pot', fr: 'Cagnotte', ru: 'Банк' },
  'session.potPlusSecured': {
    en: 'Pot + secured', de: 'Pot + Gesichertes', fr: 'Cagnotte + sécurisé', ru: 'Банк + закреплённое',
  },
  'session.payoutLimit': {
    en: 'Payout limit reached', de: 'Payout-Limit erreicht', fr: 'Limite de paiement atteinte', ru: 'Достигнут лимит выплат',
  },

  // ── Crash (Fortsetzung) ──────────────────────────────────────────────────
  'crash.aboard': { en: 'You are aboard.', de: 'Du bist an Bord.', fr: 'Vous êtes à bord.', ru: 'Вы на борту.' },
  'crash.oneMoment': { en: 'One moment…', de: 'Einen Moment…', fr: 'Un instant…', ru: 'Момент…' },
  'crash.inFlight': { en: 'In flight', de: 'Im Flug', fr: 'En vol', ru: 'В полёте' },
  'crash.loadingFlight': {
    en: 'Loading the shared flight…', de: 'Lade den geteilten Flug…', fr: 'Chargement du vol partagé…', ru: 'Загрузка общего полёта…',
  },
  'crash.withInFlight': { en: 'Aboard', de: 'Mit im Flug', fr: 'À bord', ru: 'В полёте' },
  'crash.joinFlight': { en: 'Join the flight', de: 'Mitfliegen', fr: 'Embarquer', ru: 'Полететь' },
  'crash.seed': { en: 'Seed', de: 'Seed', fr: 'Graine', ru: 'Сид' },
  'crash.seedHash': { en: 'Seed hash', de: 'Seed-Hash', fr: 'Hash de graine', ru: 'Хеш сида' },
  'crash.autoAriaNoCap': {
    en: 'Safety target as a multiplier, optional',
    de: 'Sicherheitsziel als Multiplikator, optional',
    fr: 'Objectif de sécurité en multiplicateur, facultatif',
    ru: 'Целевой множитель, необязательно',
  },
  'crash.connectToFly': {
    en: 'Connect a wallet to join the flight.',
    de: 'Wallet verbinden, um mitzufliegen.',
    fr: 'Connectez un portefeuille pour embarquer.',
    ru: 'Подключите кошелёк, чтобы полететь.',
  },
  'crash.bettingOpen': { en: 'Betting open', de: 'Wetten offen', fr: 'Paris ouverts', ru: 'Ставки открыты' },
  'crash.cashedOut': { en: 'Cashed out', de: 'Ausgestiegen', fr: 'Encaissé', ru: 'Выведено' },
  'crash.crashed': { en: 'Crashed', de: 'Abgestürzt', fr: 'Crashé', ru: 'Разбился' },
  'crash.phaseCrash': { en: 'Crash', de: 'Crash', fr: 'Crash', ru: 'Крах' },
  'crash.phaseSettled': { en: 'Settled', de: 'Ausgewertet', fr: 'Réglé', ru: 'Подсчитан' },
  'crash.playerFlying': { en: 'flying', de: 'fliegt', fr: 'en vol', ru: 'летит' },
  'crash.playerOut': { en: 'out', de: 'raus', fr: 'sorti', ru: 'вышел' },
  'crash.playerWon': { en: 'won', de: 'gewonnen', fr: 'gagné', ru: 'выиграл' },
  'crash.playerLost': { en: 'lost', de: 'verloren', fr: 'perdu', ru: 'проиграл' },
  'crash.autoHintCapped': {
    en: 'The auto cash-out exits for you as soon as the curve reaches it — even without a click. Without a target you click yourself; this game never pays more than {max}× (the creator’s cap). The flight itself keeps running for everyone.',
    de: 'Der Auto-Ausstieg steigt für dich aus, sobald die Kurve ihn erreicht — auch ohne Klick. Ohne Ziel klickst du selbst; mehr als {max}× zahlt dieses Spiel dabei nie aus (Deckel des Creators). Der Flug selbst läuft für alle weiter.',
    fr: 'Le retrait auto sort pour vous dès que la courbe l’atteint — même sans clic. Sans objectif, vous cliquez vous-même ; ce jeu ne paie jamais plus de {max}× (plafond du créateur). Le vol continue pour tout le monde.',
    ru: 'Авто-вывод сработает сам, как только кривая до него дойдёт — даже без клика. Без цели вы кликаете сами; больше {max}× игра не платит (потолок создателя). Сам полёт продолжается для всех.',
  },
  'crash.readyForTakeoff': {
    en: 'Ready for take-off', de: 'Bereit zum Abflug', fr: 'Prêt au décollage', ru: 'Готов к взлёту',
  },

  // ── Roulette (Fortsetzung) ───────────────────────────────────────────────
  'roulette.dozen1': { en: '1st dozen', de: '1. Dutzend', fr: '1re douzaine', ru: '1-я дюжина' },
  'roulette.dozen2': { en: '2nd dozen', de: '2. Dutzend', fr: '2e douzaine', ru: '2-я дюжина' },
  'roulette.dozen3': { en: '3rd dozen', de: '3. Dutzend', fr: '3e douzaine', ru: '3-я дюжина' },
  'roulette.column1': { en: 'Column 1', de: 'Kolonne 1', fr: 'Colonne 1', ru: 'Колонка 1' },
  'roulette.column2': { en: 'Column 2', de: 'Kolonne 2', fr: 'Colonne 2', ru: 'Колонка 2' },
  'roulette.column3': { en: 'Column 3', de: 'Kolonne 3', fr: 'Colonne 3', ru: 'Колонка 3' },

  // ── Slots ────────────────────────────────────────────────────────────────
  'slot.paylines': {
    en: '5×3 · lines · wild · scatter',
    de: '5×3 · Linien · Wild · Scatter',
    fr: '5×3 · lignes · wild · scatter',
    ru: '5×3 · линии · wild · scatter',
  },

  // ── Live Drift (live-drift): die Auf/Ab-Spur ─────────────────
  'drift.readyToStart': {
    en: 'Ready to start',
    de: 'Bereit zum Start',
    fr: 'Prêt à démarrer',
    ru: 'Готов к старту',
  },
  'drift.running': { en: 'Running', de: 'Läuft', fr: 'En cours', ru: 'Идёт' },
  'drift.busted': { en: 'Hit zero', de: 'Bei null gerissen', fr: 'Tombé à zéro', ru: 'Обнулилось' },
  'drift.timeUp': { en: 'Time up', de: 'Zeit abgelaufen', fr: 'Temps écoulé', ru: 'Время вышло' },
  'drift.roundSettled': { en: 'Round settled', de: 'Runde abgerechnet', fr: 'Manche réglée', ru: 'Раунд рассчитан' },
  'drift.exited': { en: 'Exited', de: 'Ausgestiegen', fr: 'Sorti', ru: 'Вышел' },
  'drift.yourExit': { en: 'your exit', de: 'dein Ausstieg', fr: 'ta sortie', ru: 'твой выход' },
  'drift.aboutToStart': {
    en: 'The track starts at 1.00× and moves every half second —',
    de: 'Die Spur startet bei 1,00× und bewegt sich jede halbe Sekunde —',
    fr: 'La piste démarre à 1,00× et bouge chaque demi-seconde —',
    ru: 'Дорожка стартует с 1,00× и движется каждые полсекунды —',
  },
  'drift.upAndDown': {
    en: 'up AND down. At 0.00 everything is gone.',
    de: 'hoch UND runter. Bei 0,00 ist alles weg.',
    fr: 'vers le haut ET le bas. À 0,00 tout est perdu.',
    ru: 'вверх И вниз. На 0,00 всё пропадает.',
  },
  'drift.bustedAtZero': {
    en: 'hit zero',
    de: 'bei 0,00 gerissen',
    fr: 'tombé à zéro',
    ru: 'обнулилось',
  },
  'drift.endedAt': {
    en: 'time up at {value}×',
    de: 'Zeit abgelaufen bei {value}×',
    fr: 'temps écoulé à {value}×',
    ru: 'время вышло на {value}×',
  },
  'drift.timeLeftAria': {
    en: 'Round time used',
    de: 'Verbrauchte Rundenzeit',
    fr: 'Temps de manche écoulé',
    ru: 'Использованное время раунда',
  },
  'drift.bettingOpen': { en: 'Betting open', de: 'Einsatz offen', fr: 'Mises ouvertes', ru: 'Приём ставок' },
  'drift.inRun': { en: 'In the run', de: 'Im Lauf', fr: 'En course', ru: 'В забеге' },
  'drift.phaseEnded': { en: 'Round over', de: 'Runde vorbei', fr: 'Manche terminée', ru: 'Раунд окончен' },
  'drift.phaseSettled': { en: 'Settled', de: 'Abgerechnet', fr: 'Réglé', ru: 'Рассчитано' },
  'drift.playerRunning': { en: 'running', de: 'läuft', fr: 'en course', ru: 'в игре' },
  'drift.playerOut': { en: 'out', de: 'raus', fr: 'sorti', ru: 'вышел' },
  'drift.playerWon': { en: 'won', de: 'gewonnen', fr: 'gagné', ru: 'выиграл' },
  'drift.playerLost': { en: 'lost', de: 'verloren', fr: 'perdu', ru: 'проиграл' },
  'drift.realMoney': { en: 'real money', de: 'Echtgeld', fr: 'argent réel', ru: 'реальные деньги' },
  'drift.playMoney': { en: 'play money', de: 'Spielgeld', fr: 'argent fictif', ru: 'игровые деньги' },
  'drift.starting': { en: 'starting…', de: 'startet…', fr: 'démarrage…', ru: 'запуск…' },
  'drift.loadingRun': { en: 'Loading run…', de: 'Lauf wird geladen…', fr: 'Chargement…', ru: 'Загрузка забега…' },
  'drift.preparing': {
    en: 'The next round is being prepared…',
    de: 'Die nächste Runde wird vorbereitet…',
    fr: 'La prochaine manche se prépare…',
    ru: 'Следующий раунд готовится…',
  },
  'drift.practiceTitle': { en: 'Practice mode.', de: 'Übungsmodus.', fr: 'Mode entraînement.', ru: 'Тренировка.' },
  'drift.practiceBody': {
    en: 'This game moves a practice balance on the server — your wallet balance stays untouched. Depositing and withdrawing above still works: that balance counts for every game on the platform.',
    de: 'Dieses Spiel bewegt ein Übungs-Guthaben auf dem Server — dein Wallet-Guthaben bleibt unangetastet. Ein- und Auszahlen oben funktioniert trotzdem: das Guthaben gilt für alle Spiele der Plattform.',
    fr: "Ce jeu utilise un solde d'entraînement sur le serveur — le solde de ton wallet reste intact. Les dépôts et retraits ci-dessus fonctionnent quand même : ce solde vaut pour tous les jeux de la plateforme.",
    ru: 'Игра использует тренировочный баланс на сервере — баланс кошелька не затрагивается. Пополнение и вывод выше работают: этот баланс общий для всех игр платформы.',
  },
  'drift.stake': { en: 'Bet (◎)', de: 'Einsatz (◎)', fr: 'Mise (◎)', ru: 'Ставка (◎)' },
  'drift.stakeAria': { en: 'Bet in SOL', de: 'Einsatz in SOL', fr: 'Mise en SOL', ru: 'Ставка в SOL' },
  'drift.stakeNaN': {
    en: 'Bet is not a number.',
    de: 'Einsatz ist keine Zahl.',
    fr: "La mise n'est pas un nombre.",
    ru: 'Ставка не является числом.',
  },
  'drift.autoExit': { en: 'Auto-exit (×)', de: 'Auto-Ausstieg (×)', fr: 'Sortie auto (×)', ru: 'Автовыход (×)' },
  'drift.autoNaN': {
    en: 'Auto-exit is not a number.',
    de: 'Auto-Ausstieg ist keine Zahl.',
    fr: "La sortie auto n'est pas un nombre.",
    ru: 'Автовыход не является числом.',
  },
  'drift.autoTooHigh': {
    en: 'Auto-exit above the cap of this game ({max}×).',
    de: 'Auto-Ausstieg über dem Deckel dieses Spiels von {max}×.',
    fr: 'Sortie auto au-dessus du plafond de ce jeu ({max}×).',
    ru: 'Автовыход выше предела этой игры {max}×.',
  },
  'drift.autoTooLow': {
    en: 'Auto-exit must be above 1.00×.',
    de: 'Auto-Ausstieg muss über 1,00× liegen.',
    fr: 'La sortie auto doit dépasser 1,00×.',
    ru: 'Автовыход должен быть выше 1,00×.',
  },
  'drift.autoAria': {
    en: 'Auto-exit multiplier, at most {max} times',
    de: 'Auto-Ausstieg-Multiplikator, höchstens {max}-fach',
    fr: 'Multiplicateur de sortie auto, au plus {max}×',
    ru: 'Множитель автовыхода, максимум {max}×',
  },
  'drift.autoAriaNoCap': {
    en: 'Auto-exit multiplier (optional)',
    de: 'Auto-Ausstieg-Multiplikator (optional)',
    fr: 'Multiplicateur de sortie auto (optionnel)',
    ru: 'Множитель автовыхода (необязательно)',
  },
  'drift.joinRun': { en: 'Join the run', de: 'Mitlaufen', fr: 'Rejoindre', ru: 'Присоединиться' },
  'drift.connectToPlay': {
    en: 'Connect your wallet to join the run.',
    de: 'Wallet verbinden, um mitzulaufen.',
    fr: 'Connecte ton wallet pour participer.',
    ru: 'Подключите кошелёк, чтобы играть.',
  },
  'drift.rulesHint': {
    en: 'The track moves up and down at random. Exit whenever you like — at 0.00 the round is over and the bet is gone. If the time runs out, whatever the track shows is paid out.',
    de: 'Die Spur läuft zufällig hoch und runter. Steig aus, wann du willst — bei 0,00 ist die Runde vorbei und der Einsatz weg. Läuft die Zeit ab, wird der aktuelle Stand ausgezahlt.',
    fr: "La piste monte et descend au hasard. Sors quand tu veux — à 0,00 la manche est finie et la mise perdue. Si le temps s'écoule, la valeur affichée est payée.",
    ru: 'Дорожка случайно идёт вверх и вниз. Выходите когда хотите — на 0,00 раунд окончен и ставка потеряна. Если время выйдет, выплачивается текущее значение.',
  },
  'drift.aboard': { en: 'You are in.', de: 'Du bist dabei.', fr: 'Tu es dans la course.', ru: 'Вы в игре.' },
  'drift.startsIn': {
    en: 'Starts in {s}s — then the track begins to move.',
    de: 'Start in {s}s — dann bewegt sich die Spur.',
    fr: 'Départ dans {s}s — la piste va bouger.',
    ru: 'Старт через {s}с — затем дорожка начнёт двигаться.',
  },
  'drift.notAboard': {
    en: 'Not in this round — the next one starts shortly.',
    de: 'Diese Runde läuft ohne dich — die nächste startet gleich.',
    fr: 'Pas dans cette manche — la prochaine arrive.',
    ru: 'Вы не в этом раунде — следующий скоро.',
  },
  'drift.exitNow': { en: 'Exit', de: 'Aussteigen', fr: 'Sortir', ru: 'Выйти' },
  'drift.outAt': { en: 'Out at {value}×', de: 'Raus bei {value}×', fr: 'Sorti à {value}×', ru: 'Вышел на {value}×' },
  'drift.oneMoment': { en: 'One moment…', de: 'Einen Moment…', fr: 'Un instant…', ru: 'Момент…' },
  'drift.noNumberOtherSession': {
    en: 'This bet was placed in another session — this tab does not know whether it carries an auto-exit. That is why no number is shown here; the server decides the value on click.',
    de: 'Diese Wette wurde in einer anderen Sitzung gesetzt — ob sie einen Auto-Ausstieg trägt, weiß dieser Tab nicht. Deshalb steht hier keine Zahl; den Stand bestimmt beim Klick der Server.',
    fr: "Cette mise a été placée dans une autre session — cet onglet ignore si elle porte une sortie auto. D'où l'absence de chiffre ici ; le serveur décide au clic.",
    ru: 'Эта ставка сделана в другой сессии — эта вкладка не знает, есть ли у неё автовыход. Поэтому число не показано; значение определит сервер при клике.',
  },
  'drift.noNumberNoCap': {
    en: 'The server did not send the payout cap of this game. That is why no number is shown here; the server decides the value on click.',
    de: 'Den Auszahlungs-Deckel dieses Spiels hat der Server nicht mitgeliefert. Deshalb steht hier keine Zahl; den Stand bestimmt beim Klick der Server.',
    fr: "Le serveur n'a pas envoyé le plafond de paiement de ce jeu. D'où l'absence de chiffre ici ; le serveur décide au clic.",
    ru: 'Сервер не прислал предел выплаты этой игры. Поэтому число не показано; значение определит сервер при клике.',
  },
  'drift.stakeWorth': {
    en: 'Bet {stake} ◎ · worth {worth} ◎ right now',
    de: 'Einsatz {stake} ◎ · gerade {worth} ◎ wert',
    fr: 'Mise {stake} ◎ · vaut {worth} ◎ maintenant',
    ru: 'Ставка {stake} ◎ · сейчас стоит {worth} ◎',
  },
  'drift.targetAlreadyHit': {
    en: 'Your target of {value}× has already been touched — the server pays it even if the track falls again.',
    de: 'Dein Ziel von {value}× wurde bereits berührt — der Server zahlt es, auch wenn die Spur wieder fällt.',
    fr: 'Ton objectif de {value}× a déjà été atteint — le serveur le paie même si la piste redescend.',
    ru: 'Ваша цель {value}× уже достигнута — сервер выплатит её, даже если дорожка снова упадёт.',
  },
  'drift.autoExitAt': {
    en: 'Auto-exit at {value}× — the server pays that without a click as soon as the track touches it.',
    de: 'Auto-Ausstieg bei {value}× — den zahlt der Server auch ohne Klick, sobald die Spur ihn berührt.',
    fr: 'Sortie auto à {value}× — le serveur la paie sans clic dès que la piste y touche.',
    ru: 'Автовыход на {value}× — сервер выплатит без клика, как только дорожка коснётся значения.',
  },
  'drift.capExitAt': {
    en: 'Without your own target, the cap of this game exits for you: {value}× — a bet here never pays more, even if the track keeps climbing.',
    de: 'Ohne eigenes Ziel steigt der Deckel dieses Spiels für dich aus: {value}× — mehr zahlt eine Wette hier nicht, auch wenn die Spur weitersteigt.',
    fr: "Sans objectif, le plafond du jeu sort pour toi : {value}× — une mise ne paie jamais plus, même si la piste continue de monter.",
    ru: 'Без своей цели за вас выйдет предел игры: {value}× — больше ставка здесь не платит, даже если дорожка растёт.',
  },
  'drift.gotOut': { en: 'Out in time', de: 'Rechtzeitig raus', fr: 'Sorti à temps', ru: 'Вышли вовремя' },
  'drift.lostAtZero': {
    en: 'The track hit zero — bet gone.',
    de: 'Die Spur ist auf null gefallen — Einsatz weg.',
    fr: 'La piste est tombée à zéro — mise perdue.',
    ru: 'Дорожка упала до нуля — ставка потеряна.',
  },
  'drift.settling': {
    en: 'Settling…',
    de: 'Wird abgerechnet…',
    fr: 'Règlement…',
    ru: 'Идёт расчёт…',
  },
  'drift.roundDone': { en: 'Round over.', de: 'Runde vorbei.', fr: 'Manche terminée.', ru: 'Раунд окончен.' },
  'drift.inTheRun': { en: 'In the run', de: 'Mit im Lauf', fr: 'Dans la course', ru: 'В забеге' },
  'drift.nobodyAboard': {
    en: 'Nobody in this round yet.',
    de: 'Diese Runde läuft noch ohne Mitspieler.',
    fr: "Personne dans cette manche pour l'instant.",
    ru: 'Пока никого в этом раунде.',
  },
  'drift.you': { en: 'You', de: 'Du', fr: 'Toi', ru: 'Вы' },
  'drift.andMore': { en: '… and {n} more', de: '… und {n} weitere', fr: '… et {n} autres', ru: '… и ещё {n}' },
  'drift.hint': {
    en: 'Place a bet, watch the track move, exit before it hits zero.',
    de: 'Einsatz setzen, die Spur beobachten, aussteigen bevor sie auf null fällt.',
    fr: "Misez, observez la piste, sortez avant qu'elle tombe à zéro.",
    ru: 'Сделайте ставку, следите за дорожкой, выйдите до нуля.',
  },
  'drift.fairnessNote': {
    en: 'The whole track is fixed by the seed before the betting window and is the same for everyone. The server reveals it tick by tick — never further than the current time. Results come from the Sol-Core server only.',
    de: 'Die ganze Spur steht durch den Seed vor dem Wettfenster fest und gilt für alle gleich. Der Server enthüllt sie Tick für Tick — nie weiter als bis zur aktuellen Zeit. Ergebnisse kommen ausschließlich vom Sol-Core-Server.',
    fr: "Toute la piste est fixée par la graine avant la fenêtre de mise et vaut pour tous. Le serveur la révèle tick par tick — jamais au-delà de l'instant présent. Les résultats viennent uniquement du serveur Sol-Core.",
    ru: 'Вся дорожка задана сидом до окна ставок и одинакова для всех. Сервер раскрывает её тик за тиком — никогда дальше текущего момента. Результаты приходят только от сервера Sol-Core.',
  },

  // ── Engines — Beschreibung, Spielerhinweise, Eingabefelder ───────────────
  // Die Texte je Engine (lib/engines.ts hält nur noch die Schlüssel). Vorher
  // standen sie fest auf Deutsch in engines.ts, und ein englischer Spieler las
  // „Kopf oder Zahl — 50/50 mit House-Edge" in einem englischen Spiel. Die
  // params-Strukturen bleiben Systemvertrag — hier steht nur, was der
  // Spieler liest. Schema: engine.<key>.blurb / .inputs / .outcomes / .hint /
  // .step und engine.<key>.ctl.<feld> bzw. engine.<key>.opt.<feld>.<wert>.

  // coin-flip
  'engine.coin-flip.blurb': {
    en: 'Heads or tails — 50/50 with a house edge.',
    de: 'Kopf oder Zahl — 50/50 mit House-Edge.',
    fr: 'Pile ou face — 50/50 avec avantage de la maison.',
    ru: 'Орёл или решка — 50/50 с преимуществом казино.',
  },
  'engine.coin-flip.inputs': {
    en: 'Pick heads or tails, set your stake — one click.',
    de: 'Kopf oder Zahl wählen, Einsatz setzen — ein Klick.',
    fr: 'Choisissez pile ou face, fixez la mise — un clic.',
    ru: 'Выберите орла или решку, поставьте ставку — один клик.',
  },
  'engine.coin-flip.outcomes': {
    en: 'Right side: stake × ~1.96 (set by the game). Wrong side: stake lost.',
    de: 'Richtige Seite: Einsatz mal ~1,96x (vom Spiel festgelegt). Falsche Seite: Einsatz weg.',
    fr: 'Bon côté : mise × ~1,96 (fixé par le jeu). Mauvais côté : mise perdue.',
    ru: 'Угадали: ставка × ~1,96 (задаёт игра). Не угадали: ставка проиграна.',
  },
  'engine.coin-flip.ctl.side': { en: 'Side', de: 'Seite', fr: 'Côté', ru: 'Сторона' },
  'engine.coin-flip.opt.side.heads': { en: 'Heads', de: 'Kopf', fr: 'Face', ru: 'Орёл' },
  'engine.coin-flip.opt.side.tails': { en: 'Tails', de: 'Zahl', fr: 'Pile', ru: 'Решка' },

  // dice
  'engine.dice.blurb': {
    en: 'Over or under a target from 0–99.99.',
    de: 'Über/Unter einen Zielwert 0–99,99.',
    fr: 'Au-dessus ou en dessous d’une cible de 0 à 99,99.',
    ru: 'Больше или меньше цели от 0 до 99,99.',
  },
  'engine.dice.inputs': {
    en: 'Choose a target (0–99.99) and bet over or under.',
    de: 'Zielzahl wählen (0–99,99) und auf darüber oder darunter wetten.',
    fr: 'Choisissez une cible (0–99,99) et pariez au-dessus ou en dessous.',
    ru: 'Выберите цель (0–99,99) и поставьте на больше или меньше.',
  },
  'engine.dice.outcomes': {
    en: 'Hit: the riskier the pick, the higher the multiplier (small chance = big win). Miss: stake lost.',
    de: 'Treffer: je riskanter die Wahl, desto höher der Multiplikator (kleine Chance = großer Gewinn). Daneben: Einsatz weg.',
    fr: 'Gagné : plus le choix est risqué, plus le multiplicateur est élevé (petite chance = gros gain). Raté : mise perdue.',
    ru: 'Попадание: чем рискованнее выбор, тем выше множитель (малый шанс = крупный выигрыш). Промах: ставка проиграна.',
  },
  'engine.dice.ctl.target': {
    en: 'Target (0.01–99.99)',
    de: 'Zielwert (0,01–99,99)',
    fr: 'Cible (0,01–99,99)',
    ru: 'Цель (0,01–99,99)',
  },
  'engine.dice.ctl.direction': { en: 'Direction', de: 'Richtung', fr: 'Direction', ru: 'Направление' },
  'engine.dice.opt.direction.over': { en: 'Over', de: 'Über', fr: 'Au-dessus', ru: 'Больше' },
  'engine.dice.opt.direction.under': { en: 'Under', de: 'Unter', fr: 'En dessous', ru: 'Меньше' },

  // limbo
  'engine.limbo.blurb': {
    en: 'Set a target multiplier — hit it and you win.',
    de: 'Ziel-Multiplikator setzen — triffst du ihn, gewinnst du.',
    fr: 'Fixez un multiplicateur cible — atteignez-le et vous gagnez.',
    ru: 'Задайте целевой множитель — достигли его, и вы выиграли.',
  },
  'engine.limbo.inputs': {
    en: 'Set a target multiplier (e.g. 5×) — that is all.',
    de: 'Ziel-Multiplikator setzen (z. B. 5x) — mehr nicht.',
    fr: 'Fixez un multiplicateur cible (p. ex. 5×) — rien de plus.',
    ru: 'Задайте целевой множитель (например, 5×) — и всё.',
  },
  'engine.limbo.outcomes': {
    en: 'The round draws a number: if it reaches your target, you win exactly your target — below it, the stake is lost.',
    de: 'Die Runde zieht eine Zahl: erreicht sie dein Ziel, gewinnst du genau dein Ziel — darunter ist der Einsatz weg.',
    fr: 'La manche tire un nombre : s’il atteint votre cible, vous gagnez exactement votre cible — en dessous, la mise est perdue.',
    ru: 'Раунд выдаёт число: если оно достигает вашей цели, вы выигрываете ровно цель — ниже ставка проиграна.',
  },
  'engine.limbo.ctl.target': {
    en: 'Target multiplier (×)',
    de: 'Ziel-Multiplikator (×)',
    fr: 'Multiplicateur cible (×)',
    ru: 'Целевой множитель (×)',
  },

  // mines
  'engine.mines.blurb': {
    en: 'Reveal tiles without hitting a mine.',
    de: 'Felder aufdecken ohne auf eine Mine zu treffen.',
    fr: 'Révélez des cases sans toucher de mine.',
    ru: 'Открывайте клетки, не попадая на мину.',
  },
  'engine.mines.inputs': {
    en: 'Reveal ONE tile per move on the grid (size set by the game, default 5×5).',
    de: 'Pro Zug EIN Feld auf dem Raster aufdecken (Größe legt das Spiel fest, Standard 5×5).',
    fr: 'Révélez UNE case par coup sur la grille (taille fixée par le jeu, 5×5 par défaut).',
    ru: 'За ход открывайте ОДНУ клетку на поле (размер задаёт игра, по умолчанию 5×5).',
  },
  'engine.mines.outcomes': {
    en: 'Every safe tile raises the multiplier; you can cash out after each one. Hit a mine = stake lost.',
    de: 'Jedes sichere Feld erhöht den Multiplikator; nach jedem Feld kannst du cashen. Mine getroffen = Einsatz weg.',
    fr: 'Chaque case sûre augmente le multiplicateur ; vous pouvez encaisser après chacune. Mine touchée = mise perdue.',
    ru: 'Каждая безопасная клетка повышает множитель; после любой можно забрать выигрыш. Мина = ставка проиграна.',
  },
  'engine.mines.step': { en: 'Tile', de: 'Feld', fr: 'Case', ru: 'Клетка' },
  'engine.mines.hint': {
    en: 'Reveal ONE tile per step; cash out any time.',
    de: 'Pro Schritt EIN Feld aufdecken; jederzeit cashout.',
    fr: 'Révélez UNE case par étape ; encaissez à tout moment.',
    ru: 'За шаг открывайте ОДНУ клетку; забрать выигрыш можно в любой момент.',
  },

  // hilo
  'engine.hilo.blurb': {
    en: 'Higher or lower than the current card?',
    de: 'Höher oder tiefer als die aktuelle Karte?',
    fr: 'Plus haut ou plus bas que la carte actuelle ?',
    ru: 'Выше или ниже текущей карты?',
  },
  'engine.hilo.inputs': {
    en: 'The game reveals a card; you guess whether the next one is higher or lower.',
    de: 'Das Spiel deckt eine Karte auf; du tippst, ob die nächste höher oder tiefer ist.',
    fr: 'Le jeu révèle une carte ; vous devinez si la suivante est plus haute ou plus basse.',
    ru: 'Игра открывает карту; вы угадываете, будет ли следующая выше или ниже.',
  },
  'engine.hilo.outcomes': {
    en: 'Right: the multiplier grows (unlikely guesses more); cash out any time. Wrong or tie: stake lost. The chain ends after the number of steps set by the game.',
    de: 'Richtig: der Multiplikator wächst (unwahrscheinliche Tipps stärker); jederzeit Cashout. Falsch oder Gleichstand: Einsatz weg. Kette endet nach der im Spiel gesetzten Schrittzahl.',
    fr: 'Juste : le multiplicateur augmente (davantage pour les paris improbables) ; encaissez à tout moment. Faux ou égalité : mise perdue. La chaîne s’arrête après le nombre d’étapes fixé par le jeu.',
    ru: 'Верно: множитель растёт (маловероятные догадки — сильнее); забрать можно в любой момент. Неверно или ничья: ставка проиграна. Цепочка заканчивается после заданного игрой числа шагов.',
  },
  'engine.hilo.hint': {
    en: 'Guess higher or lower; a tie loses. The chain ends after the number of steps set by the game.',
    de: 'Höher/Tiefer tippen; Gleichstand verliert. Die Kette endet nach der im Spiel gesetzten Schrittzahl.',
    fr: 'Pariez plus haut ou plus bas ; l’égalité perd. La chaîne s’arrête après le nombre d’étapes fixé par le jeu.',
    ru: 'Угадывайте выше или ниже; ничья проигрывает. Цепочка заканчивается после заданного игрой числа шагов.',
  },

  // plinko
  'engine.plinko.blurb': {
    en: 'A ball drops through pins into a multiplier slot.',
    de: 'Kugel fällt durch Pins in einen Multiplikator-Slot.',
    fr: 'Une bille tombe entre les pions dans une case multiplicateur.',
    ru: 'Шарик падает сквозь штырьки в ячейку с множителем.',
  },
  'engine.plinko.inputs': {
    en: 'Drop the ball — rows and risk profile are set by the game.',
    de: 'Kugel fallen lassen — Reihen und Risikoprofil legt das Spiel fest.',
    fr: 'Lâchez la bille — rangées et profil de risque sont fixés par le jeu.',
    ru: 'Бросьте шарик — ряды и уровень риска задаёт игра.',
  },
  'engine.plinko.outcomes': {
    en: 'The ball lands in a multiplier slot: the edges pay big, the middle small — sometimes less than the stake.',
    de: 'Die Kugel landet in einem Multiplikator-Fach: außen zahlt groß, die Mitte klein — teils weniger als der Einsatz.',
    fr: 'La bille tombe dans une case multiplicateur : les bords paient gros, le centre peu — parfois moins que la mise.',
    ru: 'Шарик попадает в ячейку с множителем: края платят много, середина мало — иногда меньше ставки.',
  },
  'engine.plinko.ctl.balls': { en: 'Balls', de: 'Kugeln', fr: 'Billes', ru: 'Шарики' },
  'engine.plinko.opt.balls.1': { en: '1 ball', de: '1 Kugel', fr: '1 bille', ru: '1 шарик' },
  'engine.plinko.opt.balls.3': { en: '3 balls', de: '3 Kugeln', fr: '3 billes', ru: '3 шарика' },
  'engine.plinko.opt.balls.10': { en: '10 balls', de: '10 Kugeln', fr: '10 billes', ru: '10 шариков' },
  'engine.plinko.opt.balls.100': { en: '100 balls', de: '100 Kugeln', fr: '100 billes', ru: '100 шариков' },

  // wheel
  'engine.wheel.blurb': {
    en: 'Wheel of fortune — one segment wins.',
    de: 'Glücksrad — ein Segment gewinnt.',
    fr: 'Roue de la fortune — un segment gagne.',
    ru: 'Колесо фортуны — выигрывает один сегмент.',
  },
  'engine.wheel.inputs': {
    en: 'Spin the wheel — segments and odds are set by the game.',
    de: 'Rad drehen — Segmente und Chancen legt das Spiel fest.',
    fr: 'Faites tourner la roue — segments et chances sont fixés par le jeu.',
    ru: 'Крутите колесо — сегменты и шансы задаёт игра.',
  },
  'engine.wheel.outcomes': {
    en: 'One segment wins: each has its own multiplier, from 0× up to the game’s top segment.',
    de: 'Ein Segment gewinnt: jedes hat seinen eigenen Multiplikator, von 0x bis zum Top-Segment des Spiels.',
    fr: 'Un segment gagne : chacun a son propre multiplicateur, de 0× jusqu’au segment maximal du jeu.',
    ru: 'Выигрывает один сегмент: у каждого свой множитель, от 0× до максимального сегмента игры.',
  },

  // keno
  'engine.keno.blurb': {
    en: 'Pick 1–10 numbers from 1–40; hits pay out.',
    de: '1–10 Zahlen aus 1–40 tippen; Treffer zahlen aus.',
    fr: 'Choisissez 1 à 10 numéros parmi 1–40 ; les bons numéros paient.',
    ru: 'Выберите 1–10 чисел из 1–40; совпадения приносят выплату.',
  },
  'engine.keno.inputs': {
    en: 'Pick 1–10 numbers out of 40.',
    de: '1–10 Zahlen aus 40 tippen.',
    fr: 'Choisissez 1 à 10 numéros parmi 40.',
    ru: 'Выберите 1–10 чисел из 40.',
  },
  'engine.keno.outcomes': {
    en: '10 numbers are drawn: the more hits, the higher the payout — few hits pay nothing.',
    de: '10 Zahlen werden gezogen: je mehr Treffer, desto höher die Auszahlung — wenige Treffer zahlen nichts.',
    fr: '10 numéros sont tirés : plus vous en avez, plus le gain est élevé — peu de bons numéros ne paient rien.',
    ru: 'Выпадает 10 чисел: чем больше совпадений, тем выше выплата — мало совпадений не платят ничего.',
  },
  'engine.keno.ctl.picks': { en: 'Pick numbers', de: 'Zahlen tippen', fr: 'Choisir des numéros', ru: 'Выбрать числа' },
  'engine.keno.ctl.picks.hint': { en: 'e.g. 3,7,12,25', de: 'z. B. 3,7,12,25', fr: 'p. ex. 3,7,12,25', ru: 'напр. 3,7,12,25' },
  'engine.keno.allowed': {
    en: 'Allowed: up to {max} numbers from 1–{pool}.',
    de: 'Erlaubt: bis zu {max} Zahlen aus 1–{pool}.',
    fr: 'Autorisé : jusqu’à {max} numéros parmi 1–{pool}.',
    ru: 'Разрешено: до {max} чисел из 1–{pool}.',
  },

  // scratch
  'engine.scratch.blurb': {
    en: 'Scratch card — one ticket, one draw from the prize table.',
    de: 'Rubbellos — ein Los, eine Ziehung aus der Gewinntabelle.',
    fr: 'Carte à gratter — un ticket, un tirage dans la table des gains.',
    ru: 'Скретч-карта — один билет, один розыгрыш по таблице призов.',
  },
  'engine.scratch.inputs': {
    en: 'Buy a ticket — there is nothing to choose.',
    de: 'Los kaufen — es gibt nichts zu wählen.',
    fr: 'Achetez un ticket — il n’y a rien à choisir.',
    ru: 'Купите билет — выбирать нечего.',
  },
  'engine.scratch.outcomes': {
    en: 'One draw from the game’s prize table decides the round: every prize tier has a weight (how often it comes up) and a multiplier (what it pays). Most tickets are blanks — stake lost. Scratching is visual: the prize is fixed before the first field is revealed.',
    de: 'Eine Ziehung aus der Gewinntabelle des Spiels entscheidet die Runde: jede Gewinnklasse hat ein Gewicht (wie oft sie kommt) und einen Multiplikator (was sie zahlt). Die meisten Lose sind Nieten — Einsatz weg. Das Rubbeln ist Optik: der Preis steht fest, bevor das erste Feld freigelegt wird.',
    fr: 'Un tirage dans la table des gains du jeu décide la manche : chaque palier a un poids (sa fréquence) et un multiplicateur (ce qu’il paie). La plupart des tickets sont perdants — mise perdue. Le grattage est visuel : le gain est fixé avant que la première case soit révélée.',
    ru: 'Раунд решает один розыгрыш по таблице призов игры: у каждого уровня есть вес (как часто выпадает) и множитель (сколько платит). Большинство билетов пустые — ставка проиграна. Стирание — только визуал: приз определён до того, как открыто первое поле.',
  },

  // roulette
  'engine.roulette.blurb': {
    en: 'Classic roulette bets.',
    de: 'Klassische Roulette-Wetten.',
    fr: 'Paris de roulette classiques.',
    ru: 'Классические ставки рулетки.',
  },
  'engine.roulette.inputs': {
    en: 'Place a classic bet: red/black, odd/even, 1–18/19–36, dozen, column or a single number (0–36).',
    de: 'Klassische Wette setzen: Rot/Schwarz, Gerade/Ungerade, 1–18/19–36, Dutzend, Kolonne oder eine Zahl (0–36).',
    fr: 'Placez un pari classique : rouge/noir, pair/impair, 1–18/19–36, douzaine, colonne ou un numéro plein (0–36).',
    ru: 'Сделайте классическую ставку: красное/чёрное, чёт/нечет, 1–18/19–36, дюжина, колонка или одно число (0–36).',
  },
  'engine.roulette.outcomes': {
    en: 'Fixed classic odds: even chances pay 2×, dozen/column 3×, single number 36×. Miss: stake lost.',
    de: 'Feste klassische Quoten: einfache Chancen zahlen 2x, Dutzend/Kolonne 3x, einzelne Zahl 36x. Daneben: Einsatz weg.',
    fr: 'Cotes classiques fixes : chances simples 2×, douzaine/colonne 3×, numéro plein 36×. Raté : mise perdue.',
    ru: 'Фиксированные классические коэффициенты: равные шансы 2×, дюжина/колонка 3×, одно число 36×. Промах: ставка проиграна.',
  },
  'engine.roulette.ctl.betType': { en: 'Bet', de: 'Wette', fr: 'Pari', ru: 'Ставка' },
  'engine.roulette.opt.betType.red': { en: 'Red', de: 'Rot', fr: 'Rouge', ru: 'Красное' },
  'engine.roulette.opt.betType.black': { en: 'Black', de: 'Schwarz', fr: 'Noir', ru: 'Чёрное' },
  'engine.roulette.opt.betType.odd': { en: 'Odd', de: 'Ungerade', fr: 'Impair', ru: 'Нечет' },
  'engine.roulette.opt.betType.even': { en: 'Even', de: 'Gerade', fr: 'Pair', ru: 'Чёт' },
  'engine.roulette.opt.betType.low': { en: '1–18', de: '1–18', fr: '1–18', ru: '1–18' },
  'engine.roulette.opt.betType.high': { en: '19–36', de: '19–36', fr: '19–36', ru: '19–36' },
  'engine.roulette.opt.betType.dozen': {
    en: 'Dozen (value 0–2)',
    de: 'Dutzend (value 0–2)',
    fr: 'Douzaine (value 0–2)',
    ru: 'Дюжина (value 0–2)',
  },
  'engine.roulette.opt.betType.column': {
    en: 'Column (value 0–2)',
    de: 'Kolonne (value 0–2)',
    fr: 'Colonne (value 0–2)',
    ru: 'Колонка (value 0–2)',
  },
  'engine.roulette.opt.betType.straight': {
    en: 'Number (value 0–36)',
    de: 'Zahl (value 0–36)',
    fr: 'Numéro (value 0–36)',
    ru: 'Число (value 0–36)',
  },
  'engine.roulette.ctl.value': {
    en: 'Value (straight/dozen/column only)',
    de: 'Value (nur straight/dozen/column)',
    fr: 'Value (straight/dozen/column uniquement)',
    ru: 'Value (только straight/dozen/column)',
  },

  // slots-3x3
  'engine.slots-3x3.blurb': {
    en: 'Three-reel slot; line symbols pay out.',
    de: 'Drei-Walzen-Slot; Linien-Symbole zahlen aus.',
    fr: 'Machine à trois rouleaux ; les symboles de ligne paient.',
    ru: 'Слот с тремя барабанами; символы на линии приносят выплату.',
  },
  'engine.slots-3x3.inputs': {
    en: 'Spin the reels — one stake, nothing else to choose.',
    de: 'Walzen drehen — ein Einsatz, keine weitere Auswahl.',
    fr: 'Lancez les rouleaux — une mise, rien d’autre à choisir.',
    ru: 'Крутите барабаны — одна ставка, больше ничего выбирать.',
  },
  'engine.slots-3x3.outcomes': {
    en: 'The middle line decides: three matching symbols pay the triple value, two matching the pair value, otherwise the stake is lost.',
    de: 'Die Mittellinie entscheidet: drei gleiche Symbole zahlen den Dreifach-Wert, zwei gleiche den Paar-Wert, sonst ist der Einsatz weg.',
    fr: 'La ligne du milieu décide : trois symboles identiques paient la valeur triple, deux identiques la valeur paire, sinon la mise est perdue.',
    ru: 'Решает средняя линия: три одинаковых символа платят тройное значение, два — парное, иначе ставка проиграна.',
  },

  // slots-modular
  'engine.slots-modular.blurb': {
    en: '5×3 video slot: lines, wilds, scatters.',
    de: '5×3-Video-Slot: Linien, Wilds, Scatter.',
    fr: 'Machine vidéo 5×3 : lignes, wilds, scatters.',
    ru: 'Видеослот 5×3: линии, вайлды, скаттеры.',
  },
  'engine.slots-modular.inputs': {
    en: 'Spin the reels — one stake, nothing else to choose.',
    de: 'Walzen drehen — ein Einsatz, keine weitere Auswahl.',
    fr: 'Lancez les rouleaux — une mise, rien d’autre à choisir.',
    ru: 'Крутите барабаны — одна ставка, больше ничего выбирать.',
  },
  'engine.slots-modular.outcomes': {
    en: 'Up to 20 paylines pay 3/4/5 matching symbols from the left (wild substitutes); 3+ scatters pay anywhere. All hits of a spin add up — otherwise the stake is lost.',
    de: 'Bis zu 20 Gewinnlinien zahlen 3/4/5 gleiche Symbole von links (Wild ersetzt); 3+ Scatter zahlen überall. Alle Treffer eines Spins summieren sich — sonst ist der Einsatz weg.',
    fr: 'Jusqu’à 20 lignes paient 3/4/5 symboles identiques depuis la gauche (le wild remplace) ; 3 scatters ou plus paient partout. Tous les gains d’un tour s’additionnent — sinon la mise est perdue.',
    ru: 'До 20 линий платят за 3/4/5 одинаковых символов слева (вайлд заменяет); 3+ скаттера платят в любом месте. Все выигрыши одного спина суммируются — иначе ставка проиграна.',
  },

  // towers
  'engine.towers.blurb': {
    en: 'Floor by floor upwards — pick the safe column.',
    de: 'Etage für Etage hoch — die sichere Spalte wählen.',
    fr: 'Étage par étage — choisissez la colonne sûre.',
    ru: 'Этаж за этажом вверх — выбирайте безопасную колонку.',
  },
  'engine.towers.inputs': {
    en: 'Pick one column per floor (2–4 columns, set by the game — usually 3). One column per floor hides a bomb.',
    de: 'Pro Etage eine Spalte wählen (2–4 Spalten, legt das Spiel fest — meist 3). Eine Spalte pro Etage versteckt eine Bombe.',
    fr: 'Choisissez une colonne par étage (2 à 4 colonnes, fixées par le jeu — souvent 3). Une colonne par étage cache une bombe.',
    ru: 'На каждом этаже выбирайте одну колонку (2–4 колонки, задаёт игра — обычно 3). В одной колонке на этаже спрятана бомба.',
  },
  'engine.towers.outcomes': {
    en: 'Every safe floor raises the multiplier; cash out any time. Hit a bomb = stake lost. Top floor = maximum.',
    de: 'Jede sichere Etage erhöht den Multiplikator; jederzeit Cashout. Bombe getroffen = Einsatz weg. Oberste Etage = Maximum.',
    fr: 'Chaque étage sûr augmente le multiplicateur ; encaissez à tout moment. Bombe touchée = mise perdue. Dernier étage = maximum.',
    ru: 'Каждый безопасный этаж повышает множитель; забрать можно в любой момент. Бомба = ставка проиграна. Верхний этаж = максимум.',
  },
  'engine.towers.step': { en: 'Column', de: 'Spalte', fr: 'Colonne', ru: 'Колонка' },
  'engine.towers.hint': {
    en: 'Pick one column per floor; cash out any time.',
    de: 'Pro Etage eine Spalte wählen; jederzeit cashout.',
    fr: 'Choisissez une colonne par étage ; encaissez à tout moment.',
    ru: 'На каждом этаже выбирайте одну колонку; забрать можно в любой момент.',
  },

  // dice-ladder
  'engine.dice-ladder.blurb': {
    en: 'Higher or lower than the current dice total?',
    de: 'Höher oder tiefer als die aktuelle Augensumme?',
    fr: 'Plus haut ou plus bas que le total actuel des dés ?',
    ru: 'Выше или ниже текущей суммы очков?',
  },
  'engine.dice-ladder.inputs': {
    en: 'Two dice (default) are rolled — guess whether the next total is higher or lower. Unlike cards, the totals are NOT equally likely: the middle comes up often, the edges rarely.',
    de: 'Zwei Würfel (Standard) werden geworfen — tippen, ob die Summe des nächsten Wurfs höher oder tiefer ist. Anders als bei Karten sind die Summen NICHT gleich wahrscheinlich: die Mitte kommt oft, die Ränder selten.',
    fr: 'Deux dés (par défaut) sont lancés — devinez si le total suivant est plus haut ou plus bas. Contrairement aux cartes, les totaux ne sont PAS équiprobables : le milieu sort souvent, les extrêmes rarement.',
    ru: 'Бросаются два кубика (по умолчанию) — угадайте, будет ли следующая сумма выше или ниже. В отличие от карт, суммы НЕ равновероятны: середина выпадает часто, края редко.',
  },
  'engine.dice-ladder.outcomes': {
    en: 'Right: the multiplier grows — the less likely the guess, the more; cash out any time. Wrong or tie: stake lost. The chain ends after the number of steps set by the game.',
    de: 'Richtig: der Multiplikator wächst — je unwahrscheinlicher der Tipp, desto stärker; jederzeit Cashout. Falsch oder Gleichstand: Einsatz weg. Die Kette endet nach der im Spiel gesetzten Schrittzahl.',
    fr: 'Juste : le multiplicateur augmente — plus le pari est improbable, plus il monte ; encaissez à tout moment. Faux ou égalité : mise perdue. La chaîne s’arrête après le nombre d’étapes fixé par le jeu.',
    ru: 'Верно: множитель растёт — чем менее вероятна догадка, тем сильнее; забрать можно в любой момент. Неверно или ничья: ставка проиграна. Цепочка заканчивается после заданного игрой числа шагов.',
  },
  'engine.dice-ladder.hint': {
    en: 'Guess higher or lower on the next dice total; a tie loses (unless the game sets otherwise).',
    de: 'Höher/Tiefer auf die nächste Augensumme tippen; Gleichstand verliert (sofern das Spiel nichts anderes setzt).',
    fr: 'Pariez plus haut ou plus bas sur le prochain total ; l’égalité perd (sauf réglage contraire du jeu).',
    ru: 'Угадывайте выше или ниже следующей суммы; ничья проигрывает (если игра не задаёт иное).',
  },

  // steps
  'engine.steps.blurb': {
    en: 'Step by step upwards — climb or cash out.',
    de: 'Stufe für Stufe hoch — klettern oder cashen.',
    fr: 'Marche après marche — grimpez ou encaissez.',
    ru: 'Ступень за ступенью вверх — карабкайтесь или забирайте.',
  },
  'engine.steps.inputs': {
    en: 'One choice per move: cash out or climb one step (one button). Every attempt succeeds with a fixed chance set by the game.',
    de: 'Eine Wahl pro Zug: Cashout oder eine Stufe hochklettern (ein Knopf). Jeder Versuch gelingt mit einer festen, vom Spiel gesetzten Chance.',
    fr: 'Un choix par coup : encaisser ou grimper d’une marche (un bouton). Chaque tentative réussit avec une chance fixe définie par le jeu.',
    ru: 'Один выбор за ход: забрать или подняться на ступень (одна кнопка). Каждая попытка удаётся с фиксированным шансом, заданным игрой.',
  },
  'engine.steps.outcomes': {
    en: 'Every step pays a fixed ladder multiplier; cash out any time from the minimum step. Without safe points a fall loses the stake. WITH safe points you have lives: only failures cost one — depending on the game you stay on the safe point or drop to the next lower one. A failure with no lives left loses the stake.',
    de: 'Jede Stufe zahlt einen festen Leiter-Multiplikator; Cashout jederzeit ab der Mindest-Stufe. Ohne Safe-Points verliert ein Absturz den Einsatz. MIT Safe-Points hast du Leben: nur Fehlschläge kosten eins — je nach Spiel bleibst du auf dem Safe-Point stehen oder fällst auf den nächsttieferen. Ein Fehlschlag ohne Restleben verliert den Einsatz.',
    fr: 'Chaque marche paie un multiplicateur fixe ; encaissez à tout moment à partir de la marche minimale. Sans points de sécurité, une chute perd la mise. AVEC points de sécurité, vous avez des vies : seuls les échecs en coûtent une — selon le jeu, vous restez sur le point de sécurité ou tombez au précédent. Un échec sans vie restante perd la mise.',
    ru: 'Каждая ступень платит фиксированный множитель; забрать можно в любой момент начиная с минимальной ступени. Без безопасных точек падение теряет ставку. С безопасными точками у вас есть жизни: только неудачи стоят одну — в зависимости от игры вы остаётесь на безопасной точке или падаете на предыдущую. Неудача без оставшихся жизней теряет ставку.',
  },
  'engine.steps.step': { en: 'Climb', de: 'Klettern', fr: 'Grimper', ru: 'Подняться' },
  'engine.steps.hint': {
    en: 'Climb or cash out — safe points and lives absorb failures until the protection is used up.',
    de: 'Klettern oder cashen — Safe-Points und Leben fangen Fehlschläge ab, bis der Schutz verbraucht ist.',
    fr: 'Grimpez ou encaissez — points de sécurité et vies absorbent les échecs jusqu’à épuisement de la protection.',
    ru: 'Карабкайтесь или забирайте — безопасные точки и жизни гасят неудачи, пока защита не исчерпана.',
  },

  // spin-tower-pro
  'engine.spin-tower-pro.blurb': {
    en: 'Spin towers upwards — EVERY spin costs the stake again.',
    de: 'Türme hochspinnen — JEDER Spin kostet erneut den Einsatz.',
    fr: 'Faites monter les tours — CHAQUE spin coûte à nouveau la mise.',
    ru: 'Поднимайте башни спинами — КАЖДЫЙ спин снова стоит ставку.',
  },
  'engine.spin-tower-pro.inputs': {
    en: 'One button: spin. Careful, this is the difference from every other game here — EVERY spin costs your full stake again, not just the round start. From the first spin the stake is locked for the whole round and cannot be changed.',
    de: 'Ein Knopf: spinnen. Achtung, das ist der Unterschied zu jedem anderen Spiel hier — JEDER Spin kostet erneut deinen vollen Einsatz, nicht nur der Rundenstart. Ab dem ersten Spin ist der Einsatz für die ganze Runde gesperrt und nicht mehr änderbar.',
    fr: 'Un bouton : spin. Attention, c’est la différence avec tous les autres jeux ici — CHAQUE spin coûte à nouveau votre mise entière, pas seulement le début de manche. Dès le premier spin, la mise est verrouillée pour toute la manche et ne peut plus être modifiée.',
    ru: 'Одна кнопка: спин. Внимание, в этом отличие от всех других игр здесь — КАЖДЫЙ спин снова стоит полную ставку, а не только начало раунда. С первого спина ставка заблокирована на весь раунд и не может быть изменена.',
  },
  'engine.spin-tower-pro.outcomes': {
    en: 'Every spin draws exactly one result: a tower rises one level, a tower on its top level pays its top multiplier as SECURED (and stays up), the joker makes all towers rise or secure, “nothing” happens, or FAIL. Your pot is the sum of the multipliers of the CURRENTLY reached levels — FAIL takes it: depending on the game all towers drop to 0 and the round ends, or every tower slips one level and the round goes on. Secured winnings are FAIL-proof: no FAIL can take them, but they are paid only with the final settlement at the end of the round, not immediately. Cash out any time from the first spin — it pays pot + secured. At the latest after the number of spins set by the game the round ends by itself.',
    de: 'Jeder Spin zieht genau ein Ergebnis: ein Turm steigt eine Stufe, ein Turm auf seiner höchsten Stufe zahlt seinen Top-Multiplikator als GESICHERT aus (und bleibt oben stehen), der Joker lässt alle Türme steigen bzw. sichern, „Nichts" passiert, oder FAIL. Dein Pot ist die Summe der Multiplikatoren der AKTUELL erreichten Stufen — FAIL nimmt ihn: je nach Spiel fallen alle Türme auf 0 und die Runde endet, oder jeder Turm rutscht eine Stufe runter und die Runde läuft weiter. Gesichertes ist FAIL-immun: es kann dir kein FAIL mehr nehmen, ausgezahlt wird es aber erst mit der Schluss-Abrechnung am Rundenende, nicht sofort. Cashout ab dem ersten Spin jederzeit — er zahlt Pot + Gesichertes. Spätestens nach der im Spiel gesetzten Spin-Zahl endet die Runde von selbst.',
    fr: 'Chaque spin tire exactement un résultat : une tour monte d’un niveau, une tour à son niveau maximal paie son multiplicateur maximal comme SÉCURISÉ (et reste en haut), le joker fait monter ou sécuriser toutes les tours, « rien » ne se passe, ou FAIL. Votre pot est la somme des multiplicateurs des niveaux ACTUELLEMENT atteints — FAIL le prend : selon le jeu, toutes les tours retombent à 0 et la manche s’arrête, ou chaque tour recule d’un niveau et la manche continue. Le sécurisé est à l’abri du FAIL : aucun FAIL ne peut le prendre, mais il n’est payé qu’au décompte final en fin de manche, pas immédiatement. Encaissez à tout moment dès le premier spin — cela paie pot + sécurisé. Au plus tard après le nombre de spins fixé par le jeu, la manche s’arrête d’elle-même.',
    ru: 'Каждый спин даёт ровно один результат: башня поднимается на уровень, башня на верхнем уровне выплачивает свой максимальный множитель как ЗАКРЕПЛЁННЫЙ (и остаётся наверху), джокер поднимает или закрепляет все башни, «ничего» не происходит, или FAIL. Ваш банк — сумма множителей ТЕКУЩИХ достигнутых уровней — FAIL забирает его: в зависимости от игры все башни падают до 0 и раунд заканчивается, либо каждая башня опускается на уровень и раунд продолжается. Закреплённое защищено от FAIL: никакой FAIL его не заберёт, но выплачивается оно только при итоговом расчёте в конце раунда, не сразу. Забрать можно в любой момент с первого спина — выплачивается банк + закреплённое. Не позднее заданного игрой числа спинов раунд завершается сам.',
  },
  'engine.spin-tower-pro.step': { en: 'Spin', de: 'Spin', fr: 'Spin', ru: 'Спин' },
  'engine.spin-tower-pro.hint': {
    en: 'Every spin costs the stake again. Read pot (at risk) and secured (FAIL-proof) separately — and cash out in time.',
    de: 'Jeder Spin kostet erneut den Einsatz. Pot (verlierbar) und Gesichertes (FAIL-immun) getrennt lesen — und rechtzeitig cashen.',
    fr: 'Chaque spin coûte à nouveau la mise. Lisez séparément le pot (à risque) et le sécurisé (à l’abri du FAIL) — et encaissez à temps.',
    ru: 'Каждый спин снова стоит ставку. Читайте банк (под риском) и закреплённое (защищено от FAIL) отдельно — и забирайте вовремя.',
  },

  // gauntlet
  'engine.gauntlet.blurb': {
    en: 'Highscore tournament: pick a risk tier, bank points — the pot goes to the top places.',
    de: 'Highscore-Turnier: Risikostufe wählen, Punkte banken — Pot an die Top-Plätze.',
    fr: 'Tournoi de meilleur score : choisissez un niveau de risque, sécurisez des points — le pot va aux premières places.',
    ru: 'Турнир рекордов: выберите уровень риска, фиксируйте очки — банк уходит лучшим местам.',
  },
  'engine.gauntlet.inputs': {
    en: 'Fixed stake per run. Each step, pick a risk tier: Safe (90%, +10), Medium (60%, +15) or Risky (30%, +30) — same expected value, your strategy decides.',
    de: 'Fester Einsatz pro Lauf. Pro Schritt eine Risikostufe wählen: Safe (90%, +10), Medium (60%, +15) oder Risky (30%, +30) — gleicher Erwartungswert, deine Strategie entscheidet.',
    fr: 'Mise fixe par run. À chaque étape, choisissez un niveau de risque : Safe (90 %, +10), Medium (60 %, +15) ou Risky (30 %, +30) — même espérance, votre stratégie décide.',
    ru: 'Фиксированная ставка за заход. На каждом шаге выбирайте уровень риска: Safe (90%, +10), Medium (60%, +15) или Risky (30%, +30) — одинаковое матожидание, решает ваша стратегия.',
  },
  'engine.gauntlet.outcomes': {
    en: 'The stake goes into the cycle pot. Collect points and bank in time — a bust zeroes the run (new attempt possible, best score counts). At the end of the cycle 100% of the pot goes to the top places.',
    de: 'Der Einsatz geht in den Zyklus-Pot. Punkte sammeln und rechtzeitig banken — ein Bust nullt den Lauf (neuer Versuch möglich, bester Score zählt). Am Zyklusende geht der Pot zu 100% an die Top-Plätze.',
    fr: 'La mise va dans le pot du cycle. Accumulez des points et sécurisez à temps — un bust remet le run à zéro (nouvelle tentative possible, le meilleur score compte). En fin de cycle, 100 % du pot va aux premières places.',
    ru: 'Ставка идёт в банк цикла. Набирайте очки и фиксируйте вовремя — бюст обнуляет заход (можно попробовать снова, засчитывается лучший результат). В конце цикла 100% банка уходит лучшим местам.',
  },
  'engine.gauntlet.hint': {
    en: 'One risk tier per step; “Bank” secures the score — a bust zeroes it.',
    de: 'Pro Schritt eine Risikostufe; „Banken" sichert den Score — Bust nullt ihn.',
    fr: 'Un niveau de risque par étape ; « Sécuriser » verrouille le score — un bust le remet à zéro.',
    ru: 'Один уровень риска за шаг; «Зафиксировать» сохраняет результат — бюст обнуляет его.',
  },

  // pump
  'engine.pump.blurb': {
    en: 'Keep pumping — until it bursts.',
    de: 'Immer weiter pumpen — bis es platzt.',
    fr: 'Pompez encore et encore — jusqu’à ce que ça éclate.',
    ru: 'Качайте дальше — пока не лопнет.',
  },
  'engine.pump.inputs': {
    en: 'Pump the balloon — one button, again and again.',
    de: 'Ballon aufpumpen — ein Knopf, immer wieder.',
    fr: 'Gonflez le ballon — un bouton, encore et encore.',
    ru: 'Надувайте шар — одна кнопка, снова и снова.',
  },
  'engine.pump.outcomes': {
    en: 'Every pump raises the multiplier; cash out any time. The balloon bursts at a hidden point — then the stake is lost.',
    de: 'Jeder Pump erhöht den Multiplikator; jederzeit Cashout. Der Ballon platzt an einem verdeckten Punkt — dann ist der Einsatz weg.',
    fr: 'Chaque pompage augmente le multiplicateur ; encaissez à tout moment. Le ballon éclate à un point caché — la mise est alors perdue.',
    ru: 'Каждое нажатие повышает множитель; забрать можно в любой момент. Шар лопается в скрытой точке — тогда ставка проиграна.',
  },
  'engine.pump.step': { en: 'Pump', de: 'Pump', fr: 'Pomper', ru: 'Качать' },
  'engine.pump.hint': {
    en: 'Every pump raises the multiplier; cash out in time.',
    de: 'Jeder Pump erhöht den Multiplikator; rechtzeitig cashen.',
    fr: 'Chaque pompage augmente le multiplicateur ; encaissez à temps.',
    ru: 'Каждое нажатие повышает множитель; забирайте вовремя.',
  },

  // live-odds
  'engine.live-odds.blurb': {
    en: 'Shared live rounds: bet on an outcome — the same one wins everywhere.',
    de: 'Geteilte Live-Runden: auf ein Outcome setzen — überall gewinnt dasselbe.',
    fr: 'Manches live partagées : pariez sur un résultat — le même gagne partout.',
    ru: 'Общие живые раунды: ставьте на исход — везде выигрывает один и тот же.',
  },
  'engine.live-odds.inputs': {
    en: 'During the betting window, bet on an outcome (e.g. runners 1–4 of a race) at fixed odds per outcome. Several bets per round allowed.',
    de: 'Während des Wettfensters auf ein Outcome setzen (z. B. Starter 1–4 eines Rennens), feste Quote pro Outcome. Mehrere Bets pro Runde erlaubt.',
    fr: 'Pendant la fenêtre de pari, misez sur un résultat (p. ex. partants 1–4 d’une course) à cote fixe par résultat. Plusieurs paris par manche autorisés.',
    ru: 'В окне ставок ставьте на исход (например, участники 1–4 гонки) с фиксированным коэффициентом на исход. Разрешено несколько ставок за раунд.',
  },
  'engine.live-odds.outcomes': {
    en: 'When the countdown ends, the server draws ONE result for all games of this stream (provably fair, hash committed before betting opens). A hit pays stake × odds — the credit is on your account immediately, the display follows the reveal animation.',
    de: 'Nach Ablauf des Countdowns zieht der Server EIN Ergebnis für alle Spiele dieses Streams (provably fair, Hash vor Wettbeginn committed). Treffer zahlt Einsatz × Quote — die Gutschrift ist sofort auf dem Konto, die Anzeige folgt der Reveal-Animation.',
    fr: 'À la fin du compte à rebours, le serveur tire UN résultat pour tous les jeux de ce flux (provably fair, hash engagé avant l’ouverture des paris). Un gain paie mise × cote — le crédit est immédiat sur le compte, l’affichage suit l’animation de révélation.',
    ru: 'По окончании отсчёта сервер выдаёт ОДИН результат для всех игр этого потока (provably fair, хеш зафиксирован до открытия ставок). Выигрыш платит ставка × коэффициент — зачисление на счёт сразу, отображение следует за анимацией.',
  },
  'engine.live-odds.hint': {
    en: 'Pick an outcome, set your stake, wait for the countdown — the race shows the result.',
    de: 'Outcome wählen, Einsatz setzen, Countdown abwarten — das Rennen zeigt das Ergebnis.',
    fr: 'Choisissez un résultat, fixez la mise, attendez le compte à rebours — la course montre le résultat.',
    ru: 'Выберите исход, поставьте ставку, дождитесь отсчёта — гонка покажет результат.',
  },

  // live-crash
  'engine.live-crash.blurb': {
    en: 'One shared flight: everyone sees the same rising curve — cash out too late and you lose.',
    de: 'Ein geteilter Flug: alle sehen dieselbe steigende Kurve — wer zu spät aussteigt, verliert.',
    fr: 'Un vol partagé : tout le monde voit la même courbe monter — sortez trop tard et vous perdez.',
    ru: 'Один общий полёт: все видят одну растущую кривую — вышли слишком поздно, и вы проиграли.',
  },
  'engine.live-crash.inputs': {
    en: 'Set your stake before the start, optionally a safety target. While the flight runs, cash out any time with a click. One bet per round.',
    de: 'Vor dem Start Einsatz setzen, optional ein Sicherheitsziel. Während der Flug läuft, jederzeit per Klick aussteigen. Eine Wette pro Runde.',
    fr: 'Fixez la mise avant le départ, avec en option un objectif de sécurité. Pendant le vol, sortez à tout moment d’un clic. Un pari par manche.',
    ru: 'Поставьте ставку до старта, при желании — цель безопасности. Пока идёт полёт, выходите в любой момент кликом. Одна ставка за раунд.',
  },
  'engine.live-crash.outcomes': {
    en: 'The curve rises until it bursts — the crash point is the same for all players and fixed before the betting window (hash committed, verifiable after the round). Cash out in time and you get stake × the multiplier shown; click too late and the stake is lost.',
    de: 'Die Kurve steigt, bis sie platzt — der Crash-Punkt ist für alle Spieler derselbe und steht vor dem Wettfenster fest (Hash committed, nach der Runde nachrechenbar). Wer rechtzeitig aussteigt, bekommt Einsatz × angezeigtem Multiplikator; wer zu spät klickt, verliert den Einsatz.',
    fr: 'La courbe monte jusqu’à éclater — le point de crash est le même pour tous et fixé avant la fenêtre de pari (hash engagé, vérifiable après la manche). Sortez à temps et vous recevez mise × multiplicateur affiché ; cliquez trop tard et la mise est perdue.',
    ru: 'Кривая растёт, пока не лопнет — точка краша одна для всех и определена до окна ставок (хеш зафиксирован, проверяемо после раунда). Вышли вовремя — получаете ставка × показанный множитель; кликнули поздно — ставка проиграна.',
  },
  'engine.live-crash.hint': {
    en: 'Set your stake, let the curve rise, cash out in time — the crash point is the same for everyone.',
    de: 'Einsatz setzen, Kurve steigen lassen, rechtzeitig aussteigen — der Crash-Punkt gilt für alle gleich.',
    fr: 'Fixez la mise, laissez la courbe monter, sortez à temps — le point de crash est le même pour tous.',
    ru: 'Поставьте ставку, дайте кривой расти, выходите вовремя — точка краша одна для всех.',
  },

  // live-drift
  'engine.live-drift.blurb': {
    en: 'One shared track that runs up AND down — get out before it drops to zero.',
    de: 'Eine geteilte Spur, die hoch UND runter läuft — aussteigen, bevor sie auf null fällt.',
    fr: 'Une piste partagée qui monte ET descend — sortez avant qu’elle tombe à zéro.',
    ru: 'Одна общая дорожка, идущая вверх И вниз — выходите, пока она не упала до нуля.',
  },
  'engine.live-drift.inputs': {
    en: 'Set your stake before the start, optionally a safety target. While the track runs, exit any time with a click. One bet per round.',
    de: 'Vor dem Start Einsatz setzen, optional ein Sicherheitsziel. Während die Spur läuft, jederzeit per Klick aussteigen. Eine Wette pro Runde.',
    fr: 'Fixez la mise avant le départ, avec en option un objectif de sécurité. Pendant que la piste avance, sortez à tout moment d’un clic. Un pari par manche.',
    ru: 'Поставьте ставку до старта, при желании — цель безопасности. Пока дорожка движется, выходите в любой момент кликом. Одна ставка за раунд.',
  },
  'engine.live-drift.outcomes': {
    en: 'The track starts at 1.00× and every 500 ms takes a random step up OR down — the same track for all players, fixed by a seed before the betting window (hash committed, verifiable after the round). If it drops to 0.00, the round is over and the stake is lost. When time runs out (60 s), the current value is paid out — even below 1.00×. The payout is always stake × value × 97%.',
    de: 'Die Spur startet bei 1,00x und macht alle 500 ms einen Zufallsschritt nach oben ODER unten — dieselbe Spur für alle Spieler, per Seed vor dem Wettfenster festgelegt (Hash committed, nach der Runde nachrechenbar). Fällt sie auf 0,00, ist die Runde vorbei und der Einsatz weg. Läuft die Zeit ab (60 s), wird der aktuelle Stand ausgezahlt — auch wenn er unter 1,00x liegt. Ausgezahlt wird immer Einsatz × Stand × 97 %.',
    fr: 'La piste démarre à 1,00× et fait toutes les 500 ms un pas aléatoire vers le haut OU le bas — la même piste pour tous, fixée par un seed avant la fenêtre de pari (hash engagé, vérifiable après la manche). Si elle tombe à 0,00, la manche est finie et la mise perdue. Quand le temps est écoulé (60 s), la valeur courante est payée — même sous 1,00×. Le gain est toujours mise × valeur × 97 %.',
    ru: 'Дорожка стартует с 1,00× и каждые 500 мс делает случайный шаг вверх ИЛИ вниз — одна и та же для всех игроков, задана сидом до окна ставок (хеш зафиксирован, проверяемо после раунда). Упала до 0,00 — раунд окончен, ставка проиграна. Вышло время (60 с) — выплачивается текущее значение, даже ниже 1,00×. Выплата всегда ставка × значение × 97 %.',
  },
  'engine.live-drift.hint': {
    en: 'Set your stake, watch the track, exit before it drops to zero — the track is the same for everyone.',
    de: 'Einsatz setzen, die Spur beobachten, aussteigen bevor sie auf null fällt — die Spur gilt für alle gleich.',
    fr: 'Fixez la mise, suivez la piste, sortez avant qu’elle tombe à zéro — la piste est la même pour tous.',
    ru: 'Поставьте ставку, следите за дорожкой, выходите до нуля — дорожка одна для всех.',
  },

  // pvp-coinflip
  'engine.pvp-coinflip.blurb': {
    en: 'Player vs player: a coin flip for the whole pot — 50/50, no house edge.',
    de: 'Spieler gegen Spieler: Münzwurf um den ganzen Pot — 50/50, kein House-Edge.',
    fr: 'Joueur contre joueur : pile ou face pour tout le pot — 50/50, sans avantage de la maison.',
    ru: 'Игрок против игрока: подбрасывание монеты за весь банк — 50/50, без преимущества казино.',
  },
  'engine.pvp-coinflip.inputs': {
    en: 'Create a lobby with a stake (optionally PIN-locked) or join an open lobby. Both press “Ready”; the server then flips the coin.',
    de: 'Lobby mit Einsatz erstellen (optional per PIN sperren) oder einer offenen Lobby beitreten. Beide setzen „Bereit"; der Server wirft dann die Münze.',
    fr: 'Créez un salon avec une mise (verrouillable par PIN) ou rejoignez un salon ouvert. Les deux appuient sur « Prêt » ; le serveur lance alors la pièce.',
    ru: 'Создайте лобби со ставкой (по желанию с PIN) или присоединитесь к открытому. Оба нажимают «Готов»; затем сервер подбрасывает монету.',
  },
  'engine.pvp-coinflip.outcomes': {
    en: 'The winner takes the whole pot (both stakes) — fees are retained. Exactly 50/50 and provably fair; if you lose, your stake is gone. Money is booked only at game start (everyone ready), never when creating the lobby.',
    de: 'Der Gewinner erhält den ganzen Pot (beide Einsätze) — Fees bleiben einbehalten. Exakt 50/50 und provably fair; verlierst du, ist dein Einsatz weg. Geld wird erst beim Spielstart (alle bereit) gebucht, nie beim Erstellen der Lobby.',
    fr: 'Le gagnant prend tout le pot (les deux mises) — les frais sont retenus. Exactement 50/50 et provably fair ; si vous perdez, votre mise est perdue. L’argent n’est débité qu’au début de la partie (tous prêts), jamais à la création du salon.',
    ru: 'Победитель забирает весь банк (обе ставки) — комиссии удерживаются. Ровно 50/50 и provably fair; проиграли — ставка потеряна. Деньги списываются только при старте игры (все готовы), никогда при создании лобби.',
  },
  'engine.pvp-coinflip.hint': {
    en: 'Create or join a lobby, press “Ready” — the server flips the coin as soon as both are ready.',
    de: 'Lobby erstellen oder beitreten, „Bereit" setzen — der Server wirft die Münze, sobald beide bereit sind.',
    fr: 'Créez ou rejoignez un salon, appuyez sur « Prêt » — le serveur lance la pièce dès que les deux sont prêts.',
    ru: 'Создайте или войдите в лобби, нажмите «Готов» — сервер подбросит монету, как только оба готовы.',
  },

  // pvp-dice-duel
  'engine.pvp-dice-duel.blurb': {
    en: 'Player vs player: turn-based dice risk (Farkle) for the whole pot.',
    de: 'Spieler gegen Spieler: rundenbasiertes Würfel-Risiko (Farkle) um den ganzen Pot.',
    fr: 'Joueur contre joueur : risque aux dés au tour par tour (Farkle) pour tout le pot.',
    ru: 'Игрок против игрока: пошаговый риск на кубиках (Farkle) за весь банк.',
  },
  'engine.pvp-dice-duel.inputs': {
    en: 'Create a lobby with a stake (optionally PIN-locked) or join an open lobby. Both press “Ready”; then you roll in turns: after each roll set aside at least one scoring die, then roll again or bank the turn points.',
    de: 'Lobby mit Einsatz erstellen (optional per PIN sperren) oder einer offenen Lobby beitreten. Beide setzen „Bereit"; dann wird abwechselnd gewürfelt: pro Wurf mindestens einen wertenden Würfel beiseitelegen, dann erneut würfeln oder die Zugpunkte sichern.',
    fr: 'Créez un salon avec une mise (verrouillable par PIN) ou rejoignez un salon ouvert. Les deux appuient sur « Prêt » ; puis on lance à tour de rôle : à chaque lancer, mettez de côté au moins un dé qui marque, puis relancez ou sécurisez les points du tour.',
    ru: 'Создайте лобби со ставкой (по желанию с PIN) или присоединитесь к открытому. Оба нажимают «Готов»; затем бросаете по очереди: после каждого броска отложите хотя бы один засчитываемый кубик, потом бросайте снова или зафиксируйте очки хода.',
  },
  'engine.pvp-dice-duel.outcomes': {
    en: 'Whoever banks more takes the whole pot (both stakes) — fees are retained. No scoring die = Farkle (turn points are lost). Format quick3 (3 turns per player) or race10000 (first to 10,000). Provably fair; if you lose, your stake is gone. Money is booked only at game start (everyone ready).',
    de: 'Wer mehr sichert, gewinnt den ganzen Pot (beide Einsätze) — Fees bleiben einbehalten. Kein wertender Würfel = Farkle (Zugpunkte verfallen). Format quick3 (3 Züge je Spieler) oder race10000 (bis 10.000). Provably fair; verlierst du, ist dein Einsatz weg. Geld wird erst beim Spielstart (alle bereit) gebucht.',
    fr: 'Celui qui sécurise le plus prend tout le pot (les deux mises) — les frais sont retenus. Aucun dé qui marque = Farkle (les points du tour sont perdus). Format quick3 (3 tours par joueur) ou race10000 (premier à 10 000). Provably fair ; si vous perdez, votre mise est perdue. L’argent n’est débité qu’au début de la partie (tous prêts).',
    ru: 'Кто зафиксирует больше, забирает весь банк (обе ставки) — комиссии удерживаются. Нет засчитываемого кубика = Farkle (очки хода сгорают). Формат quick3 (3 хода на игрока) или race10000 (первый до 10 000). Provably fair; проиграли — ставка потеряна. Деньги списываются только при старте игры (все готовы).',
  },
  'engine.pvp-dice-duel.hint': {
    en: 'Create or join a lobby, press “Ready” — then roll in turns: set aside scoring dice, keep rolling or bank. A Farkle loses the turn.',
    de: 'Lobby erstellen oder beitreten, „Bereit" setzen — dann abwechselnd würfeln: wertende Würfel beiseitelegen, weiter würfeln oder sichern. Farkle verliert den Zug.',
    fr: 'Créez ou rejoignez un salon, appuyez sur « Prêt » — puis lancez à tour de rôle : mettez de côté les dés qui marquent, relancez ou sécurisez. Un Farkle perd le tour.',
    ru: 'Создайте или войдите в лобби, нажмите «Готов» — затем бросайте по очереди: откладывайте засчитываемые кубики, бросайте дальше или фиксируйте. Farkle теряет ход.',
  },

  // pvp-dice-pro
  'engine.pvp-dice-pro.blurb': {
    en: 'Player vs player: configurable dice duel (single-roll showdown, push-your-luck or point system with a custom scoring table) for the whole pot.',
    de: 'Spieler gegen Spieler: konfigurierbares Würfel-Duell (Einzelwurf-Vergleich, Push-your-luck oder Punktesystem mit eigener Wertungstabelle) um den ganzen Pot.',
    fr: 'Joueur contre joueur : duel de dés configurable (lancer unique, push-your-luck ou système de points avec table de score personnalisée) pour tout le pot.',
    ru: 'Игрок против игрока: настраиваемая дуэль на кубиках (сравнение одного броска, push-your-luck или система очков со своей таблицей) за весь банк.',
  },
  'engine.pvp-dice-pro.inputs': {
    en: 'Create a lobby with a stake (optionally PIN-locked) or join an open lobby. Both press “Ready”; then you play in turns in the format chosen by the creator: single-roll showdown (roll, higher score wins), push-your-luck Farkle or point system (keep scoring dice, bank or risk — by the creator’s scoring table).',
    de: 'Lobby mit Einsatz erstellen (optional per PIN sperren) oder einer offenen Lobby beitreten. Beide setzen „Bereit"; dann wird nach dem vom Creator gewählten Format abwechselnd gespielt: Einzelwurf-Vergleich (würfeln, höherer Score gewinnt), Push-your-luck-Farkle oder Punktesystem (wertende Würfel behalten, sichern oder riskieren — nach der vom Creator festgelegten Wertungstabelle).',
    fr: 'Créez un salon avec une mise (verrouillable par PIN) ou rejoignez un salon ouvert. Les deux appuient sur « Prêt » ; puis on joue à tour de rôle selon le format choisi par le créateur : lancer unique (le score le plus haut gagne), Farkle push-your-luck ou système de points (gardez les dés qui marquent, sécurisez ou risquez — selon la table de score du créateur).',
    ru: 'Создайте лобби со ставкой (по желанию с PIN) или присоединитесь к открытому. Оба нажимают «Готов»; затем играете по очереди в формате, выбранном создателем: сравнение одного броска (выше результат — победа), push-your-luck Farkle или система очков (оставляйте засчитываемые кубики, фиксируйте или рискуйте — по таблице создателя).',
  },
  'engine.pvp-dice-pro.outcomes': {
    en: 'Whoever leads by the format takes the whole pot (both stakes) — fees are retained. Win condition: highest score over N turns or first to the goal (the opponent gets last-licks turns). Tie ⇒ sudden death. In the point system the creator paytable shown in the game decides which combinations score how many points. Provably fair; if you lose, your stake is gone. Money is booked only at game start (everyone ready).',
    de: 'Wer nach dem Format vorn liegt, gewinnt den ganzen Pot (beide Einsätze) — Fees bleiben einbehalten. Siegbedingung: höchster Score über N Züge oder Erster am Ziel (der Gegner bekommt seine Last-Licks-Züge). Gleichstand ⇒ Sudden Death. Beim Punktesystem bestimmt die im Spiel angezeigte Creator-Paytable, welche Kombinationen wie viele Punkte bringen. Provably fair; verlierst du, ist dein Einsatz weg. Geld wird erst beim Spielstart (alle bereit) gebucht.',
    fr: 'Celui qui mène selon le format prend tout le pot (les deux mises) — les frais sont retenus. Condition de victoire : meilleur score sur N tours ou premier au but (l’adversaire a ses tours de rattrapage). Égalité ⇒ mort subite. Dans le système de points, la table du créateur affichée dans le jeu fixe combien de points rapporte chaque combinaison. Provably fair ; si vous perdez, votre mise est perdue. L’argent n’est débité qu’au début de la partie (tous prêts).',
    ru: 'Кто лидирует по формату, забирает весь банк (обе ставки) — комиссии удерживаются. Условие победы: наибольший результат за N ходов или первый у цели (сопернику даются ответные ходы). Ничья ⇒ внезапная смерть. В системе очков показанная в игре таблица создателя определяет, сколько очков даёт каждая комбинация. Provably fair; проиграли — ставка потеряна. Деньги списываются только при старте игры (все готовы).',
  },
  'engine.pvp-dice-pro.hint': {
    en: 'Create or join a lobby, press “Ready” — then play by format: single-roll showdown, push-your-luck Farkle or point system (keep scoring dice, bank or risk — scoring per the table shown).',
    de: 'Lobby erstellen oder beitreten, „Bereit" setzen — dann nach Format spielen: Einzelwurf-Vergleich, Push-your-luck-Farkle oder Punktesystem (wertende Würfel behalten, sichern oder riskieren — Wertung laut angezeigter Tabelle).',
    fr: 'Créez ou rejoignez un salon, appuyez sur « Prêt » — puis jouez selon le format : lancer unique, Farkle push-your-luck ou système de points (gardez les dés qui marquent, sécurisez ou risquez — score selon la table affichée).',
    ru: 'Создайте или войдите в лобби, нажмите «Готов» — затем играйте по формату: сравнение одного броска, push-your-luck Farkle или система очков (оставляйте засчитываемые кубики, фиксируйте или рискуйте — по показанной таблице).',
  },
  // ── Nachzügler (03.09.2026) ──────────────────────────────────────────────
  // Sätze, die beim Umbau auf vier Sprachen fest auf Deutsch in den
  // Komponenten stehen geblieben waren — der Selbsttest sucht nur nach
  // Umlauten in JSX-Text und übersah Template-Strings und Button-Labels.
  'app.defaultGameName': { en: 'Sol-Core Game', de: 'Sol-Core-Spiel', fr: 'Jeu Sol-Core', ru: 'Игра Sol-Core' },
  'result.roll': { en: '· Roll {roll}', de: '· Wurf {roll}', fr: '· Tirage {roll}', ru: '· Бросок {roll}' },

  // Demo-Leiste
  'demo.title': { en: 'Demo mode', de: 'Demo-Modus', fr: 'Mode démo', ru: 'Демо-режим' },
  'demo.intro': {
    en: '— try it without a wallet on a simulated 3 ◎. Every spin is still genuinely provably fair.',
    de: '— ohne Wallet mit simulierten 3 ◎ testen. Jeder Spin ist trotzdem echt provably fair.',
    fr: '— essayez sans wallet avec 3 ◎ simulés. Chaque tour reste réellement provably fair.',
    ru: '— попробуйте без кошелька на симулированных 3 ◎. Каждый спин по-прежнему честно provably fair.',
  },
  'demo.play': { en: 'Play demo (3 ◎)', de: 'Demo spielen (3 ◎)', fr: 'Jouer la démo (3 ◎)', ru: 'Играть демо (3 ◎)' },
  'demo.startFailed': {
    en: 'Demo start failed: {error}',
    de: 'Demo-Start fehlgeschlagen: {error}',
    fr: 'Échec du démarrage de la démo : {error}',
    ru: 'Не удалось запустить демо: {error}',
  },
  'demo.badge': { en: 'Demo', de: 'Demo', fr: 'Démo', ru: 'Демо' },
  'demo.exit': { en: 'Exit', de: 'Beenden', fr: 'Quitter', ru: 'Выйти' },

  // Session
  'session.bombsPerFloor': {
    en: 'Bombs per floor — {rows}',
    de: 'Bomben je Etage — {rows}',
    fr: 'Bombes par étage — {rows}',
    ru: 'Бомбы по этажам — {rows}',
  },
  'session.floorShort': { en: 'F{n}: {cols}', de: 'E{n}: {cols}', fr: 'É{n}: {cols}', ru: 'Э{n}: {cols}' },
  'session.everySpinCostsBody': {
    en: '— not just the round start. From the first spin the stake is locked for the whole round and cannot be changed.',
    de: '— nicht nur der Rundenstart. Ab dem ersten Spin ist der Einsatz für die ganze Runde gesperrt und nicht mehr änderbar.',
    fr: '— pas seulement le début de manche. Dès le premier spin, la mise est verrouillée pour toute la manche et ne peut plus être modifiée.',
    ru: '— а не только начало раунда. С первого спина ставка заблокирована на весь раунд и не может быть изменена.',
  },
  'session.roundEndsAfter': {
    en: 'The round ends after at most {max} spins{maxSpend}.',
    de: 'Die Runde endet spätestens nach {max} Spins{maxSpend}.',
    fr: 'La manche s’arrête après {max} spins au plus{maxSpend}.',
    ru: 'Раунд заканчивается не позднее чем через {max} спинов{maxSpend}.',
  },
  'session.maxTotalStake': {
    en: ' — at most {amount} ◎ total stake',
    de: ' — maximal {amount} ◎ Gesamteinsatz',
    fr: ' — au plus {amount} ◎ de mise totale',
    ru: ' — не более {amount} ◎ общей ставки',
  },
  'session.spinCounter': { en: 'Spin {n}', de: 'Spin {n}', fr: 'Spin {n}', ru: 'Спин {n}' },
  'session.securedNote': {
    en: 'FAIL-proof · paid at the end of the round',
    de: 'FAIL-immun · zahlt am Rundenende',
    fr: 'À l’abri du FAIL · payé en fin de manche',
    ru: 'Защищено от FAIL · выплата в конце раунда',
  },
  'session.pick': { en: 'Pick {what}', de: '{what} wählen', fr: 'Choisir : {what}', ru: 'Выберите: {what}' },
  'session.rung': { en: 'Step {n}', de: 'Stufe {n}', fr: 'Marche {n}', ru: 'Ступень {n}' },
  'session.stepCosts': { en: ' — costs {amount} ◎', de: ' — kostet {amount} ◎', fr: ' — coûte {amount} ◎', ru: ' — стоит {amount} ◎' },
  'session.cashoutShort': { en: 'Cash out', de: 'Cashout', fr: 'Encaisser', ru: 'Забрать' },

  // Turnier
  'tournament.stepOf': { en: 'Step {n}/{max}', de: 'Schritt {n}/{max}', fr: 'Étape {n}/{max}', ru: 'Шаг {n}/{max}' },
  'tournament.banked': { en: 'Banked', de: 'Gebankt', fr: 'Sécurisé', ru: 'Зафиксировано' },
  'tournament.bankedBest': {
    en: 'Banked · Best score: {score}',
    de: 'Gebankt · Bester Score: {score}',
    fr: 'Sécurisé · Meilleur score : {score}',
    ru: 'Зафиксировано · Лучший результат: {score}',
  },
  'tournament.entryInfo': {
    en: 'Entry {fee} ◎ · you pay {total} ◎ (incl. fees)',
    de: 'Einsatz {fee} ◎ · du zahlst {total} ◎ (inkl. Fees)',
    fr: 'Mise {fee} ◎ · vous payez {total} ◎ (frais inclus)',
    ru: 'Взнос {fee} ◎ · вы платите {total} ◎ (с комиссиями)',
  },
  'tournament.attempts': {
    en: ' · Attempts {n}/{max}',
    de: ' · Versuche {n}/{max}',
    fr: ' · Tentatives {n}/{max}',
    ru: ' · Попытки {n}/{max}',
  },
  'tournament.bank': {
    en: 'Bank ({score} points)',
    de: 'Banken ({score} Punkte)',
    fr: 'Sécuriser ({score} points)',
    ru: 'Зафиксировать ({score} очков)',
  },
  'tournament.rank': { en: '· Rank', de: '· Platz', fr: '· Rang', ru: '· Место' },
  'tournament.payoutSplit': {
    en: 'Payout: {split} — 100% of the pot goes to the winners.',
    de: 'Ausschüttung: {split} — der Pot geht zu 100% an die Gewinner.',
    fr: 'Répartition : {split} — 100 % du pot va aux gagnants.',
    ru: 'Выплата: {split} — 100% банка уходит победителям.',
  },
  'tournament.riskSafe': { en: 'Safe', de: 'Safe', fr: 'Sûr', ru: 'Безопасно' },
  'tournament.riskMedium': { en: 'Medium', de: 'Medium', fr: 'Moyen', ru: 'Средне' },
  'tournament.riskRisky': { en: 'Risky', de: 'Risky', fr: 'Risqué', ru: 'Рискованно' },

  // Live
  'live.roundNo': { en: 'Round #{no}', de: 'Runde #{no}', fr: 'Manche n° {no}', ru: 'Раунд №{no}' },
  'live.wins': { en: '#{no} {label} wins!', de: '#{no} {label} gewinnt!', fr: '#{no} {label} gagne !', ru: '#{no} {label} побеждает!' },

  // Crash
  'crash.autoMax': { en: ' · max {max}×', de: ' · max {max}×', fr: ' · max {max}×', ru: ' · макс. {max}×' },
  'crash.upTo': { en: 'up to {max}', de: 'bis {max}', fr: 'jusqu’à {max}', ru: 'до {max}' },
  'crash.optional': { en: 'optional', de: 'optional', fr: 'facultatif', ru: 'необязательно' },
  'crash.takeoffIn': {
    en: 'Take-off in {s}s — then the curve rises.',
    de: 'Abflug in {s}s — dann steigt die Kurve.',
    fr: 'Décollage dans {s}s — puis la courbe monte.',
    ru: 'Взлёт через {s}с — затем кривая пойдёт вверх.',
  },
  'crash.cashOut': { en: 'Cash out', de: 'Aussteigen', fr: 'Encaisser', ru: 'Забрать' },
  'crash.cashOutAt': { en: 'Cash out · {x}×', de: 'Aussteigen · {x}×', fr: 'Encaisser · {x}×', ru: 'Забрать · {x}×' },
  'crash.outAt': { en: 'Out at {x}×', de: 'Raus bei {x}×', fr: 'Sorti à {x}×', ru: 'Вышли на {x}×' },
  'crash.noTargetOtherSession': {
    en: 'This bet was placed in another session — this tab does not know whether it carries a safety target. That is why no number is shown; the server sets the multiplier when you click.',
    de: 'Diese Wette wurde in einer anderen Sitzung gesetzt — ob sie ein Sicherheitsziel trägt, weiß dieser Tab nicht. Deshalb steht hier keine Zahl; den Multiplikator bestimmt beim Klick der Server.',
    fr: 'Ce pari a été placé dans une autre session — cet onglet ignore s’il porte un objectif de sécurité. C’est pourquoi aucun nombre n’est affiché ; le serveur fixe le multiplicateur au clic.',
    ru: 'Эта ставка сделана в другой сессии — вкладка не знает, есть ли у неё цель безопасности. Поэтому число не показано; множитель определяет сервер при клике.',
  },
  'crash.noCapKnown': {
    en: 'The server did not send this game’s payout cap. That is why no number is shown; the server sets the multiplier when you click.',
    de: 'Den Auszahlungs-Deckel dieses Spiels hat der Server nicht mitgeliefert. Deshalb steht hier keine Zahl; den Multiplikator bestimmt beim Klick der Server.',
    fr: 'Le serveur n’a pas transmis le plafond de gain de ce jeu. C’est pourquoi aucun nombre n’est affiché ; le serveur fixe le multiplicateur au clic.',
    ru: 'Сервер не передал потолок выплаты этой игры. Поэтому число не показано; множитель определяет сервер при клике.',
  },
  'crash.stakeWorth': {
    en: 'Stake {stake} ◎ · currently worth {value} ◎',
    de: 'Einsatz {stake} ◎ · gerade {value} ◎ wert',
    fr: 'Mise {stake} ◎ · vaut actuellement {value} ◎',
    ru: 'Ставка {stake} ◎ · сейчас стоит {value} ◎',
  },
  'crash.autoAt': {
    en: 'Auto cash-out at {x}× — the server pays it even without a click as soon as the curve reaches it.',
    de: 'Auto-Ausstieg bei {x}× — den zahlt der Server auch ohne Klick, sobald die Kurve ihn erreicht.',
    fr: 'Retrait auto à {x}× — le serveur le paie même sans clic dès que la courbe l’atteint.',
    ru: 'Авто-вывод на {x}× — сервер выплатит его даже без клика, как только кривая до него дойдёт.',
  },
  'crash.capExits': {
    en: 'Without a target of your own, this game’s cap exits for you: {x}× — a bet here never pays more, even if the curve keeps flying.',
    de: 'Ohne eigenes Ziel steigt der Deckel dieses Spiels für dich aus: {x}× — mehr zahlt eine Wette hier nicht, auch wenn die Kurve weiterfliegt.',
    fr: 'Sans objectif à vous, le plafond de ce jeu sort pour vous : {x}× — un pari ne paie jamais plus ici, même si la courbe continue.',
    ru: 'Без собственной цели за вас выйдет потолок этой игры: {x}× — больше ставка здесь не платит, даже если кривая летит дальше.',
  },
  'crash.atMultiplier': { en: ' at {x}×', de: ' bei {x}×', fr: ' à {x}×', ru: ' на {x}×' },
  'crash.you': { en: 'You', de: 'Du', fr: 'Vous', ru: 'Вы' },
  'crash.andMore': { en: '… and {n} more', de: '… und {n} weitere', fr: '… et {n} autres', ru: '… и ещё {n}' },
  'crash.burstAt': { en: 'burst at {x}×', de: 'geplatzt bei {x}×', fr: 'éclaté à {x}×', ru: 'лопнул на {x}×' },

  // Roulette-Brett
  'roulette.red': { en: 'Red', de: 'Rot', fr: 'Rouge', ru: 'Красное' },
  'roulette.black': { en: 'Black', de: 'Schwarz', fr: 'Noir', ru: 'Чёрное' },
  'roulette.odd': { en: 'Odd', de: 'Ungerade', fr: 'Impair', ru: 'Нечет' },
  'roulette.even': { en: 'Even', de: 'Gerade', fr: 'Pair', ru: 'Чёт' },
  'roulette.low': { en: '1–18', de: '1–18', fr: '1–18', ru: '1–18' },
  'roulette.high': { en: '19–36', de: '19–36', fr: '19–36', ru: '19–36' },
  'roulette.split': { en: 'Split {a}/{b} · 18×', de: 'Split {a}/{b} · 18×', fr: 'Cheval {a}/{b} · 18×', ru: 'Сплит {a}/{b} · 18×' },
  'roulette.street': {
    en: 'Street {a}-{b}-{c} · 12×',
    de: 'Street {a}-{b}-{c} · 12×',
    fr: 'Transversale {a}-{b}-{c} · 12×',
    ru: 'Стрит {a}-{b}-{c} · 12×',
  },
  'roulette.corner': {
    en: 'Corner {a}/{b}/{c}/{d} · 9×',
    de: 'Ecke {a}/{b}/{c}/{d} · 9×',
    fr: 'Carré {a}/{b}/{c}/{d} · 9×',
    ru: 'Каре {a}/{b}/{c}/{d} · 9×',
  },
  'roulette.chipsSelected': {
    en: '{n} chip(s) selected.',
    de: '{n} Chip(s) gewählt.',
    fr: '{n} jeton(s) sélectionné(s).',
    ru: 'Выбрано фишек: {n}.',
  },

  // Slots
  'slot.wild': { en: 'WILD', de: 'WILD', fr: 'WILD', ru: 'WILD' },
  'slot.scatter': { en: 'SCATTER', de: 'SCATTER', fr: 'SCATTER', ru: 'SCATTER' },
  'slot.freeSpinsInfo': {
    en: 'Free spins: {n}+ scatters → up to {max} spins ×{mult}',
    de: 'Free Spins: {n}+ Scatter → bis zu {max} Spins ×{mult}',
    fr: 'Tours gratuits : {n}+ scatters → jusqu’à {max} tours ×{mult}',
    ru: 'Фриспины: {n}+ скаттеров → до {max} спинов ×{mult}',
  },
  'slot.lineWin': {
    en: 'Line {line}: {count}× {symbol} ({pay}×)',
    de: 'Linie {line}: {count}× {symbol} ({pay}×)',
    fr: 'Ligne {line} : {count}× {symbol} ({pay}×)',
    ru: 'Линия {line}: {count}× {symbol} ({pay}×)',
  },
  'slot.scatterWin': {
    en: '{count} scatter ({pay}×)',
    de: '{count} Scatter ({pay}×)',
    fr: '{count} scatter ({pay}×)',
    ru: '{count} скаттер ({pay}×)',
  },
  'slot.freeSpinsResult': {
    en: '🎁 {spins} free spins · +{win}×',
    de: '🎁 {spins} Free Spins · +{win}×',
    fr: '🎁 {spins} tours gratuits · +{win}×',
    ru: '🎁 {spins} фриспинов · +{win}×',
  },
  // ── Kopfleiste, Spielmenü, Sound (03.09.2026) ───────────────────────────
  'menu.open': { en: 'Menu', de: 'Menü', fr: 'Menu', ru: 'Меню' },
  'menu.wallet': { en: 'Wallet', de: 'Wallet', fr: 'Wallet', ru: 'Кошелёк' },
  'menu.notConnected': {
    en: 'No wallet connected',
    de: 'Keine Wallet verbunden',
    fr: 'Aucun wallet connecté',
    ru: 'Кошелёк не подключён',
  },
  // ── Wallet-Knopf (WalletButton → BaseWalletMultiButton) ──────────────────
  'wallet.connect': { en: 'Connect', de: 'Verbinden', fr: 'Connecter', ru: 'Подключить' },
  'wallet.connecting': { en: 'Connecting…', de: 'Verbinde…', fr: 'Connexion…', ru: 'Подключение…' },
  'wallet.change': { en: 'Change wallet', de: 'Wallet wechseln', fr: 'Changer de wallet', ru: 'Сменить кошелёк' },

  // ── Währungs-Näherung (fiat.tsx, Amount, BalanceBar) ─────────────────────
  'fiat.show': { en: 'Show value in', de: 'Wert anzeigen in', fr: 'Afficher la valeur en', ru: 'Показывать в' },
  'fiat.off': { en: 'Off', de: 'Aus', fr: 'Non', ru: 'Выкл' },
  'fiat.note': {
    en: 'Approximate, for orientation only. Every bet and payout is settled in SOL.',
    de: 'Nur ein Näherungswert zur Orientierung. Abgerechnet wird jede Wette und jede Auszahlung in SOL.',
    fr: 'Valeur approximative, à titre indicatif. Chaque mise et chaque gain sont réglés en SOL.',
    ru: 'Приблизительно, для ориентира. Все ставки и выплаты рассчитываются в SOL.',
  },

  'menu.copyAddress': { en: 'Copy address', de: 'Adresse kopieren', fr: 'Copier l’adresse', ru: 'Скопировать адрес' },
  'menu.copied': { en: 'Copied', de: 'Kopiert', fr: 'Copié', ru: 'Скопировано' },
  'menu.disconnect': { en: 'Disconnect', de: 'Trennen', fr: 'Déconnecter', ru: 'Отключить' },
  'menu.language': { en: 'Language', de: 'Sprache', fr: 'Langue', ru: 'Язык' },
  'menu.sound': { en: 'Sound', de: 'Sound', fr: 'Son', ru: 'Звук' },
  'menu.soundOn': { en: 'On', de: 'An', fr: 'Activé', ru: 'Вкл' },
  'menu.soundOff': { en: 'Off', de: 'Aus', fr: 'Désactivé', ru: 'Выкл' },
  'menu.motion': { en: 'Animations', de: 'Animationen', fr: 'Animations', ru: 'Анимации' },
  'menu.motionOn': { en: 'On', de: 'An', fr: 'Activées', ru: 'Вкл' },
  'menu.motionOff': { en: 'Off', de: 'Aus', fr: 'Désactivées', ru: 'Выкл' },
  'menu.noRounds': { en: 'No rounds yet.', de: 'Noch keine Runden.', fr: 'Pas encore de manche.', ru: 'Раундов пока нет.' },
  'menu.seedHash': { en: 'Seed hash', de: 'Seed-Hash', fr: 'Hash du seed', ru: 'Хеш сида' },
  'menu.history': { en: 'History', de: 'Historie', fr: 'Historique', ru: 'История' },
  'menu.moreGames': {
    en: 'Explore more games',
    de: 'Mehr Spiele entdecken',
    fr: 'Découvrir plus de jeux',
    ru: 'Больше игр',
  },
  'history.stake': { en: 'Stake', de: 'Einsatz', fr: 'Mise', ru: 'Ставка' },
  'history.result': { en: 'Result', de: 'Ergebnis', fr: 'Résultat', ru: 'Результат' },
  'history.value': { en: 'Value', de: 'Wert', fr: 'Valeur', ru: 'Сумма' },
  'money.open': {
    en: 'Balance — deposit, withdraw, history',
    de: 'Guthaben — Einzahlen, Auszahlen, Historie',
    fr: 'Solde — dépôt, retrait, historique',
    ru: 'Баланс — пополнение, вывод, история',
  },
  'money.amount': { en: 'Amount (SOL)', de: 'Betrag (SOL)', fr: 'Montant (SOL)', ru: 'Сумма (SOL)' },
  'demo.open': { en: 'Demo balance', de: 'Demo-Guthaben', fr: 'Solde démo', ru: 'Демо-баланс' },
  'demo.autoNote': {
    en: 'You are playing on a simulated balance. Connect a wallet to play for real.',
    de: 'Du spielst mit einem simulierten Guthaben. Verbinde eine Wallet, um echt zu spielen.',
    fr: 'Vous jouez avec un solde simulé. Connectez un wallet pour jouer en réel.',
    ru: 'Вы играете на симулированном балансе. Подключите кошелёк, чтобы играть по-настоящему.',
  },
} as const satisfies Record<string, Uebersetzung>;

export type StringKey = keyof typeof STRINGS;
