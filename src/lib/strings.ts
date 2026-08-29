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
  'limit.now': {
    en: 'Max bet right now',
    de: 'Max. Einsatz jetzt',
    fr: 'Mise max maintenant',
    ru: 'Макс. ставка сейчас',
  },
  'limit.upTo': {
    en: 'Max bet up to',
    de: 'Max. Einsatz bis zu',
    fr: 'Mise max jusqu’à',
    ru: 'Макс. ставка до',
  },
  'limit.locked': {
    en: 'not playable right now',
    de: 'gerade nicht spielbar',
    fr: 'injouable pour le moment',
    ru: 'сейчас недоступно',
  },
  'limit.take': {
    en: 'Use the maximum bet',
    de: 'Höchsteinsatz übernehmen',
    fr: 'Utiliser la mise maximale',
    ru: 'Взять максимальную ставку',
  },
  'limit.why': { en: 'why?', de: 'warum?', fr: 'pourquoi ?', ru: 'почему?' },
  'limit.less': { en: 'less', de: 'weniger', fr: 'moins', ru: 'свернуть' },
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
} as const satisfies Record<string, Uebersetzung>;

export type StringKey = keyof typeof STRINGS;
