// ⚠ ERZEUGT — nicht von Hand ändern.
// Momentaufnahme des Spieler-Fehlerkatalogs von Sol-Core.
// Neu holen:  node scripts/sync-error-catalog.mjs
//
// Das ist der NOTNAGEL für den ersten Klick und für Netzausfälle. Im Betrieb
// überlagert der Laufzeit-Abruf (/api/error-catalog) diese Werte — der Server
// ist die Wahrheit, diese Datei nur der letzte Stand, der mitgebaut wurde.

import type { ErrorCatalog } from './errors';

export const CATALOG_SNAPSHOT: ErrorCatalog = {
  "version": "889ca1c74b07",
  "langs": [
    "en",
    "de",
    "fr",
    "ru"
  ],
  "fallbackLang": "en",
  "codes": {
    "API-200": {
      "action": "info",
      "text": {
        "en": "This round was not found.",
        "de": "Diese Runde wurde nicht gefunden.",
        "fr": "Cette manche est introuvable.",
        "ru": "Этот раунд не найден."
      }
    },
    "API-201": {
      "action": "lock",
      "text": {
        "en": "Game temporarily unavailable.",
        "de": "Spiel vorübergehend nicht verfügbar.",
        "fr": "Jeu momentanément indisponible.",
        "ru": "Игра временно недоступна."
      }
    },
    "API-202": {
      "action": "lock",
      "text": {
        "en": "Game is not active.",
        "de": "Spiel ist nicht aktiv.",
        "fr": "Le jeu n'est pas actif.",
        "ru": "Игра неактивна."
      }
    },
    "API-204": {
      "action": "info",
      "text": {
        "en": "Invalid input.",
        "de": "Ungültige Eingabe.",
        "fr": "Saisie invalide.",
        "ru": "Неверный ввод."
      },
      "reasons": {
        "invalid_column": {
          "text": {
            "en": "Invalid choice — outside the playing field.",
            "de": "Ungültige Auswahl — außerhalb des Spielfelds.",
            "fr": "Choix invalide — hors du terrain de jeu.",
            "ru": "Неверный выбор — за пределами игрового поля."
          }
        },
        "invalid_tile": {
          "text": {
            "en": "Invalid choice — outside the playing field.",
            "de": "Ungültige Auswahl — außerhalb des Spielfelds.",
            "fr": "Choix invalide — hors du terrain de jeu.",
            "ru": "Неверный выбор — за пределами игрового поля."
          }
        },
        "impossible_guess": {
          "text": {
            "en": "Not possible on this value — nothing can beat it in that direction.",
            "de": "Bei diesem Wert nicht möglich — in diese Richtung geht nichts mehr.",
            "fr": "Impossible sur cette valeur — rien ne va plus dans cette direction.",
            "ru": "Невозможно при этом значении — в эту сторону ничего нет."
          }
        },
        "guess_exceeds_max_win": {
          "text": {
            "en": "Not playable — this guess would exceed the chain limit. Cash out or pick a likelier guess.",
            "de": "Nicht spielbar — dieser Tipp würde die Ketten-Obergrenze reißen. Cashout oder wahrscheinlicheren Tipp wählen.",
            "fr": "Injouable — ce pari dépasserait la limite de la chaîne. Encaissez ou choisissez un pari plus probable.",
            "ru": "Недоступно — эта догадка превысит предел цепочки. Заберите выигрыш или выберите более вероятный вариант."
          }
        },
        "protocol_handshake_required": {
          "text": {
            "en": "This game cannot start a round — its build is out of date. Please tell the operator.",
            "de": "Dieses Spiel kann keine Runde starten — sein Stand ist veraltet. Bitte dem Betreiber melden.",
            "fr": "Ce jeu ne peut pas lancer de partie — sa version est obsolète. Merci de prévenir l'exploitant.",
            "ru": "Эта игра не может начать раунд — её сборка устарела. Сообщите оператору."
          }
        }
      }
    },
    "API-206": {
      "action": "lock",
      "text": {
        "en": "This game type is not cleared for real money yet.",
        "de": "Diese Spielart ist noch nicht für Echtgeld freigeschaltet.",
        "fr": "Ce type de jeu n'est pas encore autorisé en argent réel.",
        "ru": "Этот режим ещё не открыт для игры на реальные деньги."
      }
    },
    "API-300": {
      "action": "info",
      "text": {
        "en": "Bet is below the minimum.",
        "de": "Einsatz unter dem Minimum.",
        "fr": "Mise inférieure au minimum.",
        "ru": "Ставка ниже минимума."
      }
    },
    "API-301": {
      "action": "info",
      "text": {
        "en": "Bet is above the maximum.",
        "de": "Einsatz über dem Maximum.",
        "fr": "Mise supérieure au maximum.",
        "ru": "Ставка выше максимума."
      }
    },
    "API-302": {
      "action": "cooldown",
      "text": {
        "en": "Payout limit reached — please try again later.",
        "de": "Auszahlungslimit erreicht — bitte später erneut.",
        "fr": "Limite de paiement atteinte — réessayez plus tard.",
        "ru": "Достигнут лимит выплат — попробуйте позже."
      },
      "reasons": {
        "bankroll_cap": {
          "action": "info",
          "text": {
            "en": "Your bet exceeds the pool limit right now — try a smaller bet.",
            "de": "Einsatz übersteigt gerade das Gewinn-Limit des Pools — versuch einen kleineren Einsatz.",
            "fr": "Votre mise dépasse la limite du pool en ce moment — essayez une mise plus petite.",
            "ru": "Ставка сейчас превышает лимит пула — попробуйте меньшую ставку."
          }
        },
        "crash_exposure_cap": {
          "action": "info",
          "text": {
            "en": "This round is already fully booked — try a smaller bet or the next round.",
            "de": "Diese Runde ist schon voll ausgelastet — kleinerer Einsatz oder die nächste Runde.",
            "fr": "Cette manche est déjà pleine — misez moins ou attendez la suivante.",
            "ru": "Этот раунд уже заполнен — уменьшите ставку или дождитесь следующего."
          }
        },
        "withdraw_daily_limit": {
          "text": {
            "en": "Daily withdrawal limit reached — please try again later.",
            "de": "Tages-Auszahlungslimit erreicht — bitte später erneut.",
            "fr": "Limite de retrait quotidienne atteinte — réessayez plus tard.",
            "ru": "Достигнут дневной лимит вывода — попробуйте позже."
          }
        }
      }
    },
    "API-303": {
      "action": "lock",
      "text": {
        "en": "The creator wallet cannot play its own game.",
        "de": "Die Creator-Wallet darf nicht selbst spielen.",
        "fr": "Le portefeuille du créateur ne peut pas jouer à son propre jeu.",
        "ru": "Кошелёк создателя не может играть в собственную игру."
      }
    },
    "API-304": {
      "action": "cooldown",
      "text": {
        "en": "Too fast — please wait a moment.",
        "de": "Zu schnell — kurz warten.",
        "fr": "Trop rapide — patientez un instant.",
        "ru": "Слишком быстро — подождите немного."
      }
    },
    "API-305": {
      "action": "deposit",
      "text": {
        "en": "Not enough balance — please deposit.",
        "de": "Guthaben reicht nicht — bitte einzahlen.",
        "fr": "Solde insuffisant — veuillez déposer.",
        "ru": "Недостаточно средств — пополните баланс."
      }
    },
    "API-306": {
      "action": "info",
      "text": {
        "en": "Invalid bet combination.",
        "de": "Ungültige Wett-Kombination.",
        "fr": "Combinaison de mises invalide.",
        "ru": "Неверная комбинация ставок."
      }
    },
    "API-307": {
      "action": "info",
      "text": {
        "en": "Amount is above the on-chain limit per withdrawal — withdraw less at a time.",
        "de": "Betrag über dem On-Chain-Limit je Auszahlung — bitte in kleineren Schritten auszahlen.",
        "fr": "Montant supérieur à la limite on-chain par retrait — retirez par petits montants.",
        "ru": "Сумма превышает ончейн-лимит одной выплаты — выводите меньшими частями."
      }
    },
    "API-308": {
      "action": "info",
      "text": {
        "en": "A withdrawal is already being processed — please wait for it to finish.",
        "de": "Eine Auszahlung wird bereits verarbeitet — bitte kurz abwarten.",
        "fr": "Un retrait est déjà en cours — veuillez patienter.",
        "ru": "Вывод уже обрабатывается — подождите его завершения."
      }
    },
    "API-309": {
      "action": "info",
      "text": {
        "en": "The outcome of this withdrawal is unclear — do NOT retry. Check your balance in a moment.",
        "de": "Der Ausgang dieser Auszahlung ist unklar — bitte NICHT wiederholen. Gleich das Guthaben prüfen.",
        "fr": "L'issue de ce retrait est incertaine — ne réessayez PAS. Vérifiez votre solde dans un instant.",
        "ru": "Итог этой выплаты неясен — НЕ повторяйте. Проверьте баланс через минуту."
      }
    },
    "API-310": {
      "action": "info",
      "text": {
        "en": "Withdrawals are paused right now — nothing was debited.",
        "de": "Auszahlungen sind gerade pausiert — es wurde nichts abgebucht.",
        "fr": "Les retraits sont suspendus — rien n’a été débité.",
        "ru": "Выводы сейчас приостановлены — списания не было."
      }
    },
    "API-311": {
      "action": "info",
      "text": {
        "en": "Amount is below the minimum withdrawal — you may always withdraw your full balance.",
        "de": "Betrag unter dem Mindest-Auszahlbetrag — das ganze Guthaben darfst du immer abheben.",
        "fr": "Montant inférieur au retrait minimum — vous pouvez toujours retirer la totalité.",
        "ru": "Сумма меньше минимальной для вывода — весь баланс вывести можно всегда."
      }
    },
    "API-312": {
      "action": "info",
      "text": {
        "en": "Your win is still being settled on-chain — please try the withdrawal again in a few minutes. Nothing was deducted.",
        "de": "Dein Gewinn wird gerade on-chain verbucht — bitte in ein paar Minuten erneut auszahlen. Es wurde nichts abgebucht.",
        "fr": "Votre gain est en cours de règlement on-chain — réessayez le retrait dans quelques minutes. Rien n’a été débité.",
        "ru": "Ваш выигрыш ещё зачисляется on-chain — попробуйте вывести через несколько минут. Ничего не списано."
      }
    },
    "API-313": {
      "action": "info",
      "text": {
        "en": "Maintenance in progress — real-money play and withdrawals are briefly paused for the safety of our players. Open games finish normally, demo mode stays available. We will be back shortly!",
        "de": "Wartung läuft — Echtgeld-Spiel und Auszahlungen sind zur Sicherheit unserer Spieler kurz pausiert. Offene Spiele laufen normal zu Ende, der Demo-Modus bleibt verfügbar. Wir sind in Kürze wieder da!",
        "fr": "Maintenance en cours — le jeu en argent réel et les retraits sont brièvement suspendus pour la sécurité de nos joueurs. Les parties en cours se terminent normalement, le mode démo reste disponible. Nous revenons très vite !",
        "ru": "Идут технические работы — игра на реальные деньги и выводы ненадолго приостановлены ради безопасности игроков. Открытые игры завершаются как обычно, демо-режим доступен. Мы скоро вернёмся!"
      }
    },
    "API-314": {
      "action": "info",
      "text": {
        "en": "Liquidity & Builder phase: everything is live and open, we are still gathering pool capital for the best possible play. Real-money bets unlock with phase 2 — demo mode is fully playable everywhere until then.",
        "de": "Liquidity- & Builder-Phase: Alles läuft und ist offen, wir sammeln gerade noch Pool-Kapital für das beste Spielerlebnis. Echtgeld-Wetten schalten mit Phase 2 frei — bis dahin ist der Demo-Modus überall voll spielbar.",
        "fr": "Phase Liquidity & Builder : tout est en ligne et ouvert, nous réunissons encore le capital du pool pour la meilleure expérience de jeu. Les mises en argent réel s’activeront avec la phase 2 — d’ici là, le mode démo est entièrement jouable.",
        "ru": "Фаза Liquidity & Builder: всё работает и открыто, мы ещё собираем капитал пула для лучшего игрового опыта. Ставки на реальные деньги откроются со второй фазой — до этого демо-режим полностью доступен."
      }
    },
    "API-402": {
      "action": "lock",
      "text": {
        "en": "Session invalid or expired — please reconnect your wallet.",
        "de": "Sitzung ungültig oder abgelaufen — bitte Wallet neu verbinden.",
        "fr": "Session invalide ou expirée — reconnectez votre portefeuille.",
        "ru": "Сессия недействительна или истекла — подключите кошелёк заново."
      }
    },
    "API-500": {
      "action": "retry",
      "text": {
        "en": "Server error — please try again.",
        "de": "Serverfehler — bitte erneut versuchen.",
        "fr": "Erreur serveur — veuillez réessayer.",
        "ru": "Ошибка сервера — попробуйте ещё раз."
      }
    },
    "API-501": {
      "action": "retry",
      "text": {
        "en": "Randomness service unavailable — please try again.",
        "de": "Zufalls-Dienst nicht verfügbar — bitte erneut versuchen.",
        "fr": "Service de tirage indisponible — réessayez.",
        "ru": "Служба генерации чисел недоступна — попробуйте ещё раз."
      }
    },
    "API-502": {
      "action": "retry",
      "text": {
        "en": "That round was already settled — nothing was booked. Try again.",
        "de": "Diese Runde war bereits abgerechnet — es wurde nichts gebucht. Bitte erneut.",
        "fr": "Cette manche était déjà réglée — rien n’a été comptabilisé. Réessayez.",
        "ru": "Этот раунд уже рассчитан — ничего не списано. Попробуйте снова."
      }
    },
    "API-503": {
      "action": "retry",
      "text": {
        "en": "Temporarily unavailable — the bet was not placed. Try again shortly.",
        "de": "Vorübergehend nicht verfügbar — die Wette kam nicht zustande. Gleich erneut versuchen.",
        "fr": "Temporairement indisponible — la mise n’a pas été prise. Réessayez bientôt.",
        "ru": "Временно недоступно — ставка не принята. Повторите чуть позже."
      }
    },
    "API-700": {
      "action": "info",
      "text": {
        "en": "Lobby not found.",
        "de": "Lobby nicht gefunden.",
        "fr": "Salon introuvable.",
        "ru": "Лобби не найдено."
      }
    },
    "API-701": {
      "action": "info",
      "text": {
        "en": "This lobby is full.",
        "de": "Diese Lobby ist voll.",
        "fr": "Ce salon est complet.",
        "ru": "Это лобби заполнено."
      }
    },
    "API-702": {
      "action": "info",
      "text": {
        "en": "This lobby has expired.",
        "de": "Diese Lobby ist abgelaufen.",
        "fr": "Ce salon a expiré.",
        "ru": "Это лобби истекло."
      }
    },
    "API-703": {
      "action": "info",
      "text": {
        "en": "Wrong PIN.",
        "de": "Falscher PIN.",
        "fr": "Code PIN incorrect.",
        "ru": "Неверный PIN."
      }
    },
    "API-704": {
      "action": "info",
      "text": {
        "en": "You are already in another lobby.",
        "de": "Du bist bereits in einer anderen Lobby.",
        "fr": "Vous êtes déjà dans un autre salon.",
        "ru": "Вы уже находитесь в другом лобби."
      }
    },
    "API-705": {
      "action": "lock",
      "text": {
        "en": "The creator wallet cannot play its own game.",
        "de": "Die Creator-Wallet darf nicht im eigenen Spiel mitspielen.",
        "fr": "Le portefeuille du créateur ne peut pas jouer à son propre jeu.",
        "ru": "Кошелёк создателя не может играть в собственной игре."
      }
    },
    "API-706": {
      "action": "info",
      "text": {
        "en": "Stake is outside the allowed range.",
        "de": "Einsatz außerhalb des erlaubten Bereichs.",
        "fr": "Mise hors de la plage autorisée.",
        "ru": "Ставка вне допустимого диапазона."
      }
    },
    "API-707": {
      "action": "info",
      "text": {
        "en": "The seed session rotated — the match was refunded.",
        "de": "Die Seed-Sitzung wurde rotiert — das Match wurde erstattet.",
        "fr": "La session de graine a tourné — le match a été remboursé.",
        "ru": "Сессия сидов сменилась — матч возвращён."
      }
    },
    "API-708": {
      "action": "deposit",
      "text": {
        "en": "Not enough balance to start — the stake was refunded.",
        "de": "Guthaben reicht nicht zum Start — der Einsatz wurde erstattet.",
        "fr": "Solde insuffisant pour démarrer — la mise a été remboursée.",
        "ru": "Недостаточно средств для старта — ставка возвращена."
      }
    },
    "API-709": {
      "action": "cooldown",
      "text": {
        "en": "Too fast — please wait a moment.",
        "de": "Zu schnell — kurz warten.",
        "fr": "Trop rapide — patientez un instant.",
        "ru": "Слишком быстро — подождите немного."
      }
    },
    "API-710": {
      "action": "info",
      "text": {
        "en": "Only the host can do that.",
        "de": "Das darf nur der Host.",
        "fr": "Seul l'hôte peut faire cela.",
        "ru": "Это может сделать только хост."
      }
    },
    "API-711": {
      "action": "info",
      "text": {
        "en": "The match was already refunded.",
        "de": "Das Match wurde bereits erstattet.",
        "fr": "Le match a déjà été remboursé.",
        "ru": "Матч уже возвращён."
      }
    },
    "API-712": {
      "action": "retry",
      "text": {
        "en": "The turn already moved on — refreshing.",
        "de": "Der Zug ist schon weiter — wird aktualisiert.",
        "fr": "Le tour a déjà avancé — actualisation.",
        "ru": "Ход уже сменился — обновляем."
      }
    },
    "API-812": {
      "action": "retry",
      "text": {
        "en": "This round no longer exists — the next one is loading.",
        "de": "Diese Runde gibt es nicht mehr — die nächste wird geladen.",
        "fr": "Cette manche n'existe plus — la suivante se charge.",
        "ru": "Этого раунда больше нет — загружается следующий."
      }
    },
    "API-813": {
      "action": "info",
      "text": {
        "en": "Betting is closed for this round — the next one starts shortly.",
        "de": "Das Wettfenster ist zu — die nächste Runde kommt gleich.",
        "fr": "Les paris sont clos pour cette manche — la suivante arrive.",
        "ru": "Приём ставок на этот раунд закрыт — следующий скоро."
      }
    },
    "API-814": {
      "action": "info",
      "text": {
        "en": "That outcome is not on offer in this round.",
        "de": "Dieser Ausgang wird in dieser Runde nicht angeboten.",
        "fr": "Ce résultat n'est pas proposé dans cette manche.",
        "ru": "Этот исход в данном раунде не предлагается."
      }
    },
    "API-815": {
      "action": "retry",
      "text": {
        "en": "Odds are still being calculated — try again in a moment.",
        "de": "Die Quoten werden noch berechnet — gleich erneut versuchen.",
        "fr": "Les cotes sont en cours de calcul — réessayez dans un instant.",
        "ru": "Коэффициенты ещё считаются — попробуйте через мгновение."
      }
    },
    "API-816": {
      "action": "info",
      "text": {
        "en": "This round is already fully booked — try a smaller bet or the next round.",
        "de": "Diese Runde ist schon voll ausgelastet — kleinerer Einsatz oder die nächste Runde.",
        "fr": "Cette manche est déjà pleine — misez moins ou attendez la suivante.",
        "ru": "Этот раунд уже заполнен — уменьшите ставку или дождитесь следующего."
      }
    },
    "API-817": {
      "action": "info",
      "text": {
        "en": "Bet limit for this round reached.",
        "de": "Wett-Limit für diese Runde erreicht.",
        "fr": "Limite de mises atteinte pour cette manche.",
        "ru": "Достигнут лимит ставок на этот раунд."
      }
    },
    "API-820": {
      "action": "retry",
      "text": {
        "en": "This round no longer exists — the next flight is loading.",
        "de": "Diese Runde gibt es nicht mehr — der nächste Flug wird gleich geladen.",
        "fr": "Cette manche n'existe plus — le prochain vol se charge.",
        "ru": "Этого раунда больше нет — следующий полёт загружается."
      }
    },
    "API-821": {
      "action": "info",
      "text": {
        "en": "Betting is closed — this round is already flying. The next one starts shortly.",
        "de": "Das Wettfenster ist zu — diese Runde fliegt bereits. Die nächste kommt gleich.",
        "fr": "Les paris sont clos — cette manche est déjà en vol. La suivante arrive.",
        "ru": "Ставки закрыты — раунд уже летит. Следующий скоро."
      }
    },
    "API-822": {
      "action": "info",
      "text": {
        "en": "You have no open bet in this round.",
        "de": "Du hast in dieser Runde keine offene Wette.",
        "fr": "Vous n'avez pas de mise ouverte dans cette manche.",
        "ru": "У вас нет открытой ставки в этом раунде."
      }
    },
    "API-823": {
      "action": "info",
      "text": {
        "en": "Too late — the round already crashed.",
        "de": "Zu spät — die Runde ist bereits gecrasht.",
        "fr": "Trop tard — la manche a déjà crashé.",
        "ru": "Слишком поздно — раунд уже разбился."
      }
    },
    "API-824": {
      "action": "info",
      "text": {
        "en": "Auto-cashout is outside the allowed range — above 1.00× and at most this game’s cap.",
        "de": "Auto-Ausstieg außerhalb des erlaubten Bereichs — über 1.00× und höchstens bis zum Deckel dieses Spiels.",
        "fr": "Retrait auto hors plage autorisée — au-dessus de 1,00× et au plus le plafond du jeu.",
        "ru": "Авто-вывод вне допустимого диапазона — выше 1.00× и не больше потолка игры."
      }
    },
    "API-825": {
      "action": "info",
      "text": {
        "en": "This bet has already been settled.",
        "de": "Diese Wette ist bereits abgerechnet.",
        "fr": "Cette mise a déjà été réglée.",
        "ru": "Эта ставка уже рассчитана."
      }
    },
    "API-826": {
      "action": "info",
      "text": {
        "en": "You are already flying in this round — one bet per round.",
        "de": "Du fliegst in dieser Runde schon mit — es gilt eine Wette pro Runde.",
        "fr": "Vous êtes déjà en vol dans cette manche — une mise par manche.",
        "ru": "Вы уже в этом раунде — одна ставка на раунд."
      }
    },
    "API-827": {
      "action": "info",
      "text": {
        "en": "This round is not flying right now — cashing out only works in flight.",
        "de": "Diese Runde fliegt gerade nicht — Aussteigen geht nur im Flug.",
        "fr": "Cette manche n'est pas en vol — le retrait n'est possible qu'en vol.",
        "ru": "Раунд сейчас не летит — выйти можно только в полёте."
      }
    }
  }
} as const;
