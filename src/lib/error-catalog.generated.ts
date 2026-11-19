// ⚠ ERZEUGT — nicht von Hand ändern.
// Momentaufnahme des Spieler-Fehlerkatalogs von Sol-Core.
// Neu holen:  node scripts/sync-error-catalog.mjs
//
// Das ist der NOTNAGEL für den ersten Klick und für Netzausfälle. Im Betrieb
// überlagert der Laufzeit-Abruf (/api/error-catalog) diese Werte — der Server
// ist die Wahrheit, diese Datei nur der letzte Stand, der mitgebaut wurde.

import type { ErrorCatalog } from './errors';

export const CATALOG_SNAPSHOT: ErrorCatalog = {
  "version": "3168290cb9dd",
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
    "API-207": {
      "action": "lock",
      "text": {
        "en": "This API is in sandbox mode: only demo play with play money works. Its creator can switch on real money in the Sol-Core console.",
        "de": "Diese API ist im Sandbox-Modus: Nur das Demo mit Spielgeld läuft. Echtgeld schaltet ihr Creator in der Sol-Core-Konsole frei.",
        "fr": "Cette API est en mode sandbox : seule la démo avec de l'argent fictif fonctionne. Son créateur peut activer l'argent réel dans la console Sol-Core.",
        "ru": "Этот API в режиме песочницы: работает только демо с игровыми деньгами. Реальные деньги включает его создатель в консоли Sol-Core."
      }
    },
    "API-208": {
      "action": "info",
      "text": {
        "en": "Real money cannot be switched on yet: the API must be active, its engine cleared, and at least one demo round played in the last 30 days.",
        "de": "Echtgeld lässt sich noch nicht freischalten: Die API muss aktiv sein, ihre Engine freigegeben und in den letzten 30 Tagen mindestens eine Demo-Runde gespielt.",
        "fr": "L'argent réel ne peut pas encore être activé : l'API doit être active, son moteur autorisé et au moins une manche démo jouée au cours des 30 derniers jours.",
        "ru": "Реальные деньги пока нельзя включить: API должен быть активен, его движок разрешён, и за последние 30 дней сыграна хотя бы одна демо-игра."
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
        },
        "settings_unavailable": {
          "action": "retry",
          "text": {
            "en": "Real-money betting is briefly unavailable — please try again in a moment.",
            "de": "Echtgeld-Tipps gehen gerade kurz nicht — bitte gleich noch einmal.",
            "fr": "Les paris en argent réel sont brièvement indisponibles — réessayez dans un instant.",
            "ru": "Ставки на реальные деньги ненадолго недоступны — попробуйте через мгновение."
          }
        },
        "bankroll_unavailable": {
          "action": "retry",
          "text": {
            "en": "The pool size cannot be checked right now, so real-money play is briefly paused — please try again in a moment.",
            "de": "Die Größe des Pools lässt sich gerade nicht prüfen, deshalb geht Echtgeld kurz nicht — bitte gleich noch einmal.",
            "fr": "La taille du pool ne peut pas être vérifiée pour le moment, le jeu en argent réel est donc brièvement suspendu — réessayez dans un instant.",
            "ru": "Сейчас нельзя проверить размер пула, поэтому игра на реальные деньги ненадолго приостановлена — попробуйте через мгновение."
          }
        },
        "bankroll_share_cap": {
          "action": "info",
          "text": {
            "en": "The pool is fully committed for this game area right now — try a smaller bet or again shortly.",
            "de": "Der Pool ist für diesen Spielbereich gerade voll ausgelastet — kleinerer Einsatz oder gleich noch einmal.",
            "fr": "Le pool est entièrement engagé pour cette zone de jeu en ce moment — misez moins ou réessayez bientôt.",
            "ru": "Пул сейчас полностью занят для этого раздела игр — уменьшите ставку или попробуйте чуть позже."
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
        "en": "Amount is below the minimum withdrawal. Smaller balances are paid out by the operator on request.",
        "de": "Betrag unter dem Mindest-Auszahlbetrag. Kleinere Guthaben zahlt der Betreiber auf Anfrage aus.",
        "fr": "Montant inférieur au retrait minimum. L’exploitant verse les soldes plus faibles sur demande.",
        "ru": "Сумма меньше минимальной для вывода. Меньшие балансы оператор выплачивает по запросу."
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
    "API-316": {
      "action": "cooldown",
      "text": {
        "en": "This round is still being settled — one moment, then try again.",
        "de": "Diese Runde wird gerade noch abgerechnet — einen Moment, dann noch einmal.",
        "fr": "Cette manche est encore en cours de règlement — un instant, puis réessayez.",
        "ru": "Этот раунд ещё рассчитывается — подождите секунду и попробуйте снова."
      }
    },
    "API-317": {
      "action": "info",
      "text": {
        "en": "This retry does not match the original bet — please place your bet again.",
        "de": "Diese Wiederholung passt nicht zur ursprünglichen Wette — bitte neu setzen.",
        "fr": "Cette nouvelle tentative ne correspond pas au pari initial — veuillez miser à nouveau.",
        "ru": "Повтор не совпадает с исходной ставкой — сделайте ставку заново."
      }
    },
    "API-402": {
      "action": "lock",
      "text": {
        "en": "Session invalid or expired — please reconnect your wallet.",
        "de": "Sitzung ungültig oder abgelaufen — bitte Wallet neu verbinden.",
        "fr": "Session invalide ou expirée — reconnectez votre portefeuille.",
        "ru": "Сессия недействительна или истекла — подключите кошелёк заново."
      },
      "reasons": {
        "sitzung_widerrufen": {
          "action": "lock",
          "text": {
            "en": "Your session was ended — please sign in again.",
            "de": "Deine Sitzung wurde beendet — bitte neu anmelden.",
            "fr": "Votre session a été fermée — reconnectez-vous.",
            "ru": "Ваша сессия завершена — войдите снова."
          }
        },
        "sitzung_veraltet": {
          "action": "lock",
          "text": {
            "en": "Your session was ended — please sign in again.",
            "de": "Deine Sitzung wurde beendet — bitte neu anmelden.",
            "fr": "Votre session a été fermée — reconnectez-vous.",
            "ru": "Ваша сессия завершена — войдите снова."
          }
        }
      }
    },
    "API-403": {
      "action": "info",
      "text": {
        "en": "That username is taken. Please pick another one.",
        "de": "Dieser Benutzername ist schon vergeben. Bitte wähle einen anderen.",
        "fr": "Ce nom d'utilisateur est déjà pris. Choisissez-en un autre.",
        "ru": "Это имя уже занято. Выберите другое."
      }
    },
    "API-404": {
      "action": "info",
      "text": {
        "en": "Username or password is incorrect.",
        "de": "Benutzername oder Passwort ist falsch.",
        "fr": "Nom d'utilisateur ou mot de passe incorrect.",
        "ru": "Неверное имя пользователя или пароль."
      }
    },
    "API-405": {
      "action": "info",
      "text": {
        "en": "Username: 3–20 characters (letters, digits, _ . -). Password: at least 8 characters.",
        "de": "Benutzername: 3–20 Zeichen (Buchstaben, Ziffern, _ . -). Passwort: mindestens 8 Zeichen.",
        "fr": "Nom d'utilisateur : 3–20 caractères (lettres, chiffres, _ . -). Mot de passe : au moins 8 caractères.",
        "ru": "Имя пользователя: 3–20 символов (буквы, цифры, _ . -). Пароль: не менее 8 символов."
      },
      "reasons": {
        "username_invalid": {
          "text": {
            "en": "Username must be 3–20 characters: letters, digits, underscore, dot or hyphen.",
            "de": "Der Benutzername braucht 3–20 Zeichen: Buchstaben, Ziffern, Unterstrich, Punkt oder Bindestrich.",
            "fr": "Le nom d'utilisateur doit faire 3–20 caractères : lettres, chiffres, tiret bas, point ou trait d'union.",
            "ru": "Имя пользователя: 3–20 символов — буквы, цифры, подчёркивание, точка или дефис."
          }
        },
        "password_invalid": {
          "text": {
            "en": "Password must be at least 8 characters.",
            "de": "Das Passwort braucht mindestens 8 Zeichen.",
            "fr": "Le mot de passe doit comporter au moins 8 caractères.",
            "ru": "Пароль должен содержать не менее 8 символов."
          }
        }
      }
    },
    "API-406": {
      "action": "lock",
      "text": {
        "en": "Account sign-in is not available here yet. You can continue with a wallet.",
        "de": "Die Anmeldung mit Konto ist hier noch nicht verfügbar. Mit einer Wallet geht es weiter.",
        "fr": "La connexion par compte n'est pas encore disponible ici. Vous pouvez continuer avec un portefeuille.",
        "ru": "Вход по учётной записи здесь пока недоступен. Можно продолжить с кошельком."
      }
    },
    "API-410": {
      "action": "lock",
      "text": {
        "en": "MCP access is not possible: at most 5 active tokens per account, and none for operator wallets. Revoke an old token first.",
        "de": "MCP-Zugang nicht möglich: höchstens 5 aktive Tokens je Konto, keine für Betreiber-Wallets. Widerrufe zuerst einen alten Token.",
        "fr": "Accès MCP impossible : 5 jetons actifs au maximum par compte, aucun pour les wallets opérateur. Révoquez d'abord un ancien jeton.",
        "ru": "Доступ MCP невозможен: не более 5 активных токенов на аккаунт и ни одного для кошельков оператора. Сначала отзовите старый токен."
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
      },
      "reasons": {
        "enthuellt": {
          "action": "info",
          "text": {
            "en": "This round is already decided. Your bet was not booked.",
            "de": "Die Runde ist schon aufgelöst. Dein Tipp wurde nicht gebucht.",
            "fr": "Cette manche est déjà tranchée. Votre pari n'a pas été enregistré.",
            "ru": "Этот раунд уже решён. Ваша ставка не принята."
          }
        },
        "buch_zu": {
          "action": "info",
          "text": {
            "en": "This round is already closed. Your bet was not booked.",
            "de": "Die Runde ist schon abgeschlossen. Dein Tipp wurde nicht gebucht.",
            "fr": "Cette manche est déjà close. Votre pari n'a pas été enregistré.",
            "ru": "Этот раунд уже закрыт. Ваша ставка не принята."
          }
        },
        "storniert": {
          "action": "info",
          "text": {
            "en": "This round was cancelled. Your bet was not booked.",
            "de": "Die Runde wurde abgebrochen. Dein Tipp wurde nicht gebucht.",
            "fr": "Cette manche a été annulée. Votre pari n'a pas été enregistré.",
            "ru": "Этот раунд отменён. Ваша ставка не принята."
          }
        }
      }
    },
    "API-814": {
      "action": "info",
      "text": {
        "en": "That outcome is not on offer in this round.",
        "de": "Dieser Ausgang wird in dieser Runde nicht angeboten.",
        "fr": "Ce résultat n'est pas proposé dans cette manche.",
        "ru": "Этот исход в данном раунде не предлагается."
      },
      "reasons": {
        "odds_required": {
          "action": "retry",
          "text": {
            "en": "Please confirm the current odds and place your bet again.",
            "de": "Bitte die aktuelle Quote bestätigen und den Tipp noch einmal abgeben.",
            "fr": "Veuillez confirmer la cote actuelle et placer à nouveau votre mise.",
            "ru": "Подтвердите текущий коэффициент и сделайте ставку ещё раз."
          }
        }
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
      },
      "reasons": {
        "bankroll_bet_cap": {
          "action": "info",
          "text": {
            "en": "The possible win of this bet is above what the pool can cover right now — try a smaller bet.",
            "de": "Der mögliche Gewinn dieses Tipps ist höher, als der Pool gerade abdecken kann — versuch einen kleineren Einsatz.",
            "fr": "Le gain possible de cette mise dépasse ce que le pool peut couvrir pour le moment — essayez une mise plus petite.",
            "ru": "Возможный выигрыш этой ставки больше, чем сейчас может покрыть пул, — попробуйте ставку поменьше."
          }
        },
        "bankroll_selection_cap": {
          "action": "info",
          "text": {
            "en": "This outcome is already heavily backed in this round — try a smaller bet or another outcome.",
            "de": "Auf diesen Ausgang ist in dieser Runde schon viel gesetzt — kleinerer Einsatz oder ein anderer Ausgang.",
            "fr": "Ce résultat est déjà très joué dans cette manche — misez moins ou choisissez un autre résultat.",
            "ru": "На этот исход в раунде уже много поставлено — уменьшите ставку или выберите другой исход."
          }
        },
        "bankroll_player_cap": {
          "action": "info",
          "text": {
            "en": "You have reached your limit for this round — try a smaller bet or the next round.",
            "de": "Du hast dein Limit für diese Runde erreicht — kleinerer Einsatz oder die nächste Runde.",
            "fr": "Tu as atteint ta limite pour cette manche — mise moins ou attends la suivante.",
            "ru": "Ты достиг своего лимита на этот раунд — уменьши ставку или дождись следующего."
          }
        },
        "bankroll_round_cap": {
          "action": "info",
          "text": {
            "en": "This round is already fully booked — try a smaller bet or the next round.",
            "de": "Diese Runde ist schon voll ausgelastet — kleinerer Einsatz oder die nächste Runde.",
            "fr": "Cette manche est déjà pleine — misez moins ou attendez la suivante.",
            "ru": "Этот раунд уже заполнен — уменьшите ставку или дождитесь следующего."
          }
        },
        "bankroll_open_cap": {
          "action": "info",
          "text": {
            "en": "Live betting is fully booked across all events right now — try a smaller bet or again shortly.",
            "de": "Live-Tipps sind über alle Events gerade voll ausgelastet — kleinerer Einsatz oder gleich noch einmal.",
            "fr": "Les paris en direct sont pleins sur tous les événements pour le moment — misez moins ou réessayez bientôt.",
            "ru": "Живые ставки сейчас заполнены по всем событиям — уменьшите ставку или попробуйте чуть позже."
          }
        }
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
    "API-837": {
      "action": "lock",
      "text": {
        "en": "Live betting is blocked for this wallet.",
        "de": "Für diese Wallet sind Live-Wetten gesperrt.",
        "fr": "Les paris en direct sont bloqués pour ce portefeuille.",
        "ru": "Для этого кошелька ставки в лайве заблокированы."
      }
    },
    "API-842": {
      "action": "lock",
      "text": {
        "en": "You have locked yourself out. Until the lock ends, there is no real-money play — no bets, no games, no daily wheel.",
        "de": "Du hast dich selbst gesperrt. Bis die Sperre endet, gibt es bei SCORE kein Spiel mit echtem Geld — keine Tipps, keine Games, kein Tagesrad.",
        "fr": "Tu t’es bloqué toi-même. Jusqu’à la fin du blocage, pas de jeu en argent réel — ni paris, ni jeux, ni roue du jour.",
        "ru": "Ты заблокировал себя сам. До конца блокировки игры на реальные деньги недоступны — ни ставки, ни игры, ни колесо дня."
      }
    },
    "API-843": {
      "action": "info",
      "text": {
        "en": "Your daily limit can no longer be raised by you — only support can. Lowering it stays possible at any time.",
        "de": "Dein Tageslimit kannst du nicht mehr selbst erhöhen — das geht nur noch über den Betreiber. Senken bleibt jederzeit möglich.",
        "fr": "Tu ne peux plus augmenter toi-même ta limite journalière — seul le support le peut. La baisser reste possible à tout moment.",
        "ru": "Дневной лимит ты больше не можешь повысить сам — только через поддержку. Понизить можно в любой момент."
      }
    },
    "API-844": {
      "action": "lock",
      "text": {
        "en": "Your daily limit for today is reached. It resets at midnight UTC.",
        "de": "Dein Tageslimit für heute ist erreicht. Es beginnt um Mitternacht UTC neu.",
        "fr": "Ta limite journalière est atteinte pour aujourd’hui. Elle repart à minuit UTC.",
        "ru": "Дневной лимит на сегодня исчерпан. Он обнулится в полночь UTC."
      }
    },
    "API-836": {
      "action": "lock",
      "text": {
        "en": "This kind of money is currently switched off for this event.",
        "de": "Diese Geldart ist für dieses Event gerade abgeschaltet.",
        "fr": "Ce type de mise est actuellement désactivé pour cet événement.",
        "ru": "Этот вид средств сейчас отключён для этого события."
      }
    },
    "API-819": {
      "action": "info",
      "text": {
        "en": "Live betting is paused by the operator — please try again later.",
        "de": "Live-Wetten sind vom Betreiber angehalten — bitte später noch einmal.",
        "fr": "Les paris en direct sont suspendus par l’opérateur — réessayez plus tard.",
        "ru": "Живые ставки приостановлены оператором — попробуйте позже."
      },
      "reasons": {
        "runde_ausgelastet": {
          "action": "retry",
          "text": {
            "en": "It’s very busy right now — please place your tip again in a moment.",
            "de": "Gerade sehr viel los — bitte gleich noch einmal tippen.",
            "fr": "Il y a beaucoup de monde en ce moment — réessayez votre pari dans un instant.",
            "ru": "Сейчас очень много ставок — попробуйте ещё раз через мгновение."
          }
        },
        "not_aus": {
          "action": "info",
          "text": {
            "en": "Real-money betting is paused by the operator right now.",
            "de": "Echtgeld-Wetten sind gerade vom Betreiber angehalten.",
            "fr": "Les paris en argent réel sont suspendus par l’opérateur pour le moment.",
            "ru": "Ставки на реальные деньги сейчас приостановлены оператором."
          }
        }
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
    },
    "API-870": {
      "action": "retry",
      "text": {
        "en": "Connecting Telegram is not available right now. Please try again later.",
        "de": "Telegram verbinden geht gerade nicht. Bitte versuch es später noch einmal.",
        "fr": "La connexion à Telegram n'est pas disponible pour le moment. Réessaie plus tard.",
        "ru": "Подключить Telegram сейчас нельзя. Попробуй позже."
      }
    },
    "API-950": {
      "action": "info",
      "text": {
        "en": "This skill game does not exist.",
        "de": "Dieses Skill Game gibt es nicht.",
        "fr": "Ce jeu d'adresse n'existe pas.",
        "ru": "Такой игры на ловкость нет."
      }
    },
    "API-951": {
      "action": "retry",
      "text": {
        "en": "This round has expired. Start a new one.",
        "de": "Diese Runde ist abgelaufen. Starte eine neue.",
        "fr": "Cette manche a expiré. Lance-en une nouvelle.",
        "ru": "Этот раунд истёк. Начни новый."
      }
    },
    "API-952": {
      "action": "info",
      "text": {
        "en": "This round has already been counted.",
        "de": "Diese Runde wurde schon gewertet.",
        "fr": "Cette manche a déjà été comptée.",
        "ru": "Этот раунд уже засчитан."
      }
    },
    "API-953": {
      "action": "info",
      "text": {
        "en": "This round could not be verified and does not count for the leaderboard.",
        "de": "Diese Runde ließ sich nicht nachrechnen und zählt nicht für die Bestenliste.",
        "fr": "Cette manche n'a pas pu être vérifiée et ne compte pas pour le classement.",
        "ru": "Этот раунд не удалось проверить, он не идёт в таблицу лидеров."
      }
    },
    "API-960": {
      "action": "retry",
      "text": {
        "en": "Your towers have changed. Here is the current state — spin again.",
        "de": "Deine Türme haben sich geändert. Hier ist der aktuelle Stand — dreh noch einmal.",
        "fr": "Tes tours ont changé. Voici l’état actuel — relance.",
        "ru": "Твои башни изменились. Вот текущее состояние — крути ещё раз."
      }
    },
    "API-961": {
      "action": "retry",
      "text": {
        "en": "Your last spin on these towers is still being completed. Please wait a moment.",
        "de": "Dein letzter Dreh an diesen Türmen wird noch abgeschlossen. Bitte einen Moment warten.",
        "fr": "Ton dernier tour sur ces tours est encore en cours. Patiente un instant.",
        "ru": "Твоё последнее вращение на этих башнях ещё завершается. Подожди немного."
      }
    },
    "API-962": {
      "action": "lock",
      "text": {
        "en": "This game cannot be played with real money yet.",
        "de": "Dieses Spiel lässt sich noch nicht mit Echtgeld spielen.",
        "fr": "Ce jeu ne peut pas encore être joué en argent réel.",
        "ru": "В эту игру пока нельзя играть на реальные деньги."
      }
    },
    "API-963": {
      "action": "info",
      "text": {
        "en": "Please choose one of the fixed stakes — every stake has its own towers.",
        "de": "Bitte eine der festen Einsatzstufen wählen — jede Stufe hat ihre eigenen Türme.",
        "fr": "Choisis l’une des mises fixes — chaque mise a ses propres tours.",
        "ru": "Выбери одну из фиксированных ставок — у каждой ставки свои башни."
      }
    },
    "API-964": {
      "action": "retry",
      "text": {
        "en": "Your play-money pass is no longer valid. A new one is being created.",
        "de": "Dein Spielgeld-Ausweis ist nicht mehr gültig. Ein neuer wird angelegt.",
        "fr": "Ton passe d’argent fictif n’est plus valable. Un nouveau est créé.",
        "ru": "Твой пропуск для игровых денег больше не действует. Создаётся новый."
      }
    },
    "API-965": {
      "action": "info",
      "text": {
        "en": "These towers could not be found.",
        "de": "Diese Türme gibt es nicht.",
        "fr": "Ces tours sont introuvables.",
        "ru": "Эти башни не найдены."
      }
    },
    "API-966": {
      "action": "lock",
      "text": {
        "en": "Your spin is being checked. Your towers stay as they are until then.",
        "de": "Dein Dreh wird geprüft. Bis dahin bleiben deine Türme, wie sie sind.",
        "fr": "Ton tour est en cours de vérification. Tes tours restent telles quelles jusque-là.",
        "ru": "Твоё вращение проверяется. До тех пор башни остаются как есть."
      }
    },
    "API-967": {
      "action": "info",
      "text": {
        "en": "Your castle treasure is empty — there is nothing to collect yet.",
        "de": "Dein Burgschatz ist leer — es gibt noch nichts anzunehmen.",
        "fr": "Ton trésor du château est vide — il n’y a encore rien à encaisser.",
        "ru": "Сокровищница замка пуста — забирать пока нечего."
      }
    },
    "API-970": {
      "action": "retry",
      "text": {
        "en": "This hand has already moved on. Here is the current table — please decide again.",
        "de": "Diese Hand ist schon weiter. Hier ist der aktuelle Tisch — bitte neu entscheiden.",
        "fr": "Cette main a déjà avancé. Voici la table actuelle — décide à nouveau.",
        "ru": "Эта раздача уже продвинулась. Вот текущий стол — реши ещё раз."
      }
    },
    "API-971": {
      "action": "retry",
      "text": {
        "en": "Your last move is still being processed — one moment.",
        "de": "Dein letzter Zug läuft noch — einen Moment.",
        "fr": "Ton dernier coup est encore en cours — un instant.",
        "ru": "Твой последний ход ещё обрабатывается — секунду."
      }
    },
    "API-972": {
      "action": "info",
      "text": {
        "en": "That move is not possible right now.",
        "de": "Dieser Zug geht gerade nicht.",
        "fr": "Ce coup n’est pas possible pour l’instant.",
        "ru": "Этот ход сейчас невозможен."
      }
    },
    "API-980": {
      "action": "lock",
      "text": {
        "en": "Quattro spins cannot be played with real money yet.",
        "de": "Quattro-Spins lassen sich noch nicht mit Echtgeld spielen.",
        "fr": "Les tours Quattro ne peuvent pas encore être joués en argent réel.",
        "ru": "В спины Quattro пока нельзя играть на реальные деньги."
      }
    },
    "API-981": {
      "action": "info",
      "text": {
        "en": "This Quattro offer could not be found. Your winnings are in your balance as always.",
        "de": "Dieses Quattro-Angebot gibt es nicht. Dein Gewinn liegt wie immer im Guthaben.",
        "fr": "Cette offre Quattro est introuvable. Tes gains sont comme toujours sur ton solde.",
        "ru": "Это предложение Quattro не найдено. Твой выигрыш, как всегда, на балансе."
      }
    },
    "API-982": {
      "action": "info",
      "text": {
        "en": "This Quattro round has ended. Your winnings are in your balance.",
        "de": "Diese Quattro-Runde ist vorbei. Deine Gewinne liegen im Guthaben.",
        "fr": "Ce tour Quattro est terminé. Tes gains sont sur ton solde.",
        "ru": "Этот раунд Quattro завершён. Твои выигрыши на балансе."
      }
    },
    "API-983": {
      "action": "retry",
      "text": {
        "en": "Your last Quattro spin is still being completed. Please wait a moment.",
        "de": "Dein letzter Quattro-Spin wird noch abgeschlossen. Bitte einen Moment warten.",
        "fr": "Ton dernier tour Quattro est encore en cours. Patiente un instant.",
        "ru": "Твой последний спин Quattro ещё завершается. Подожди немного."
      }
    },
    "API-984": {
      "action": "retry",
      "text": {
        "en": "Your Quattro budget has changed. Here is the current state — spin again.",
        "de": "Dein Quattro-Guthaben hat sich geändert. Hier ist der aktuelle Stand — dreh noch einmal.",
        "fr": "Ton budget Quattro a changé. Voici l’état actuel — relance.",
        "ru": "Твой бюджет Quattro изменился. Вот текущее состояние — крути ещё раз."
      }
    },
    "API-985": {
      "action": "info",
      "text": {
        "en": "This stake does not fit: four equal fields, at least the minimum per field, at most your Quattro budget.",
        "de": "Dieser Einsatz passt nicht: vier gleiche Felder, je Feld mindestens der kleinste Einsatz, höchstens dein Quattro-Guthaben.",
        "fr": "Cette mise ne convient pas : quatre grilles égales, au moins la mise minimale par grille, au plus ton budget Quattro.",
        "ru": "Эта ставка не подходит: четыре равных поля, на поле не меньше минимальной ставки, всего не больше бюджета Quattro."
      }
    },
    "API-986": {
      "action": "lock",
      "text": {
        "en": "Your Quattro spin is being checked. Your budget stays as it is until then.",
        "de": "Dein Quattro-Spin wird geprüft. Bis dahin bleibt dein Quattro-Guthaben, wie es ist.",
        "fr": "Ton tour Quattro est en cours de vérification. Ton budget reste tel quel jusque-là.",
        "ru": "Твой спин Quattro проверяется. До тех пор бюджет остаётся как есть."
      }
    },
    "API-911": {
      "action": "info",
      "text": {
        "en": "Missions are paused for your account right now.",
        "de": "Missionen sind für dein Konto gerade pausiert.",
        "fr": "Les missions sont en pause pour ton compte.",
        "ru": "Миссии для твоего аккаунта сейчас приостановлены."
      }
    },
    "API-912": {
      "action": "info",
      "text": {
        "en": "This mission is not available. Reload your missions.",
        "de": "Diese Mission gibt es nicht. Lade deine Missionen neu.",
        "fr": "Cette mission n’est pas disponible. Recharge tes missions.",
        "ru": "Эта миссия недоступна. Обнови список миссий."
      }
    },
    "API-913": {
      "action": "info",
      "text": {
        "en": "This mission is not finished yet, or you already collected it.",
        "de": "Diese Mission ist noch nicht erledigt oder schon abgeholt.",
        "fr": "Cette mission n’est pas encore terminée, ou tu l’as déjà récupérée.",
        "ru": "Эта миссия ещё не выполнена или награда уже получена."
      }
    },
    "API-914": {
      "action": "info",
      "text": {
        "en": "No reroll left today. Reroll tokens come from crates and streaks.",
        "de": "Heute kein Neuwurf mehr frei. Neuwurf-Marken gibt es aus Kisten und Serien.",
        "fr": "Plus de relance aujourd’hui. Les jetons de relance viennent des coffres et des séries.",
        "ru": "Сегодня перебросов больше нет. Жетоны переброса дают сундуки и серии."
      }
    },
    "API-915": {
      "action": "info",
      "text": {
        "en": "Pick one of the three offered missions.",
        "de": "Wähle eine der drei angebotenen Missionen.",
        "fr": "Choisis l’une des trois missions proposées.",
        "ru": "Выбери одну из трёх предложенных миссий."
      }
    },
    "API-916": {
      "action": "info",
      "text": {
        "en": "This crate does not exist.",
        "de": "Diese Kiste gibt es nicht.",
        "fr": "Ce coffre n’existe pas.",
        "ru": "Такого сундука нет."
      }
    },
    "API-917": {
      "action": "info",
      "text": {
        "en": "Crates are switched off right now. Please try again later.",
        "de": "Kisten sind gerade abgeschaltet. Bitte versuch es später noch einmal.",
        "fr": "Les coffres sont désactivés pour le moment. Réessaie plus tard.",
        "ru": "Сундуки сейчас отключены. Попробуй позже."
      }
    },
    "API-918": {
      "action": "info",
      "text": {
        "en": "This Telegram account already collected this reward on another account. Connect your own Telegram account.",
        "de": "Dieses Telegram-Konto hat diese Belohnung schon auf einem anderen Konto geholt. Verbinde dein eigenes Telegram-Konto.",
        "fr": "Ce compte Telegram a déjà récupéré cette récompense sur un autre compte. Connecte ton propre compte Telegram.",
        "ru": "Этот аккаунт Telegram уже получил эту награду на другом аккаунте. Подключи свой собственный аккаунт Telegram."
      }
    },
    "API-920": {
      "action": "info",
      "text": {
        "en": "Free spins are not available for this game right now.",
        "de": "Freispiele gibt es für dieses Spiel gerade nicht.",
        "fr": "Les tours gratuits ne sont pas disponibles pour ce jeu pour le moment.",
        "ru": "Бесплатные вращения для этой игры сейчас недоступны."
      }
    },
    "API-921": {
      "action": "info",
      "text": {
        "en": "These free spins are used up or have expired.",
        "de": "Diese Freispiele sind aufgebraucht oder abgelaufen.",
        "fr": "Ces tours gratuits sont épuisés ou ont expiré.",
        "ru": "Эти бесплатные вращения израсходованы или истекли."
      }
    },
    "API-922": {
      "action": "info",
      "text": {
        "en": "These free spins cannot be created like this.",
        "de": "Diese Freispiele lassen sich so nicht anlegen.",
        "fr": "Ces tours gratuits ne peuvent pas être créés ainsi.",
        "ru": "Такие бесплатные вращения создать нельзя."
      }
    },
    "API-880": {
      "action": "info",
      "text": {
        "en": "Play here is in SCC. Convert your SOL or withdraw it.",
        "de": "Gespielt wird in SCC. Wandle dein SOL um oder zahle es aus.",
        "fr": "Ici on joue en SCC. Convertis tes SOL ou retire-les.",
        "ru": "Здесь играют в SCC. Обменяй свои SOL или выведи их."
      }
    },
    "API-881": {
      "action": "lock",
      "text": {
        "en": "SCC is switched off right now — only a remaining balance can be paid out.",
        "de": "SCC ist gerade aus — nur ein Restguthaben lässt sich auszahlen.",
        "fr": "Le SCC est désactivé pour le moment — seul un solde restant peut être retiré.",
        "ru": "SCC сейчас отключён — вывести можно только остаток баланса."
      }
    },
    "API-882": {
      "action": "deposit",
      "text": {
        "en": "Not enough SCC — please deposit.",
        "de": "Dein SCC-Guthaben reicht nicht — bitte einzahlen.",
        "fr": "Pas assez de SCC — veuillez déposer.",
        "ru": "Недостаточно SCC — пополните баланс."
      }
    },
    "API-883": {
      "action": "info",
      "text": {
        "en": "Amount is below the minimum SCC payout.",
        "de": "Betrag unter der Mindestauszahlung in SCC.",
        "fr": "Montant inférieur au retrait minimum en SCC.",
        "ru": "Сумма меньше минимальной выплаты в SCC."
      }
    },
    "API-884": {
      "action": "retry",
      "text": {
        "en": "No confirmed exchange rate right now — please try again in a moment.",
        "de": "Gerade kein bestätigter Kurs — bitte gleich noch einmal.",
        "fr": "Pas de taux confirmé pour le moment — réessaie dans un instant.",
        "ru": "Сейчас нет подтверждённого курса — попробуй через мгновение."
      }
    },
    "API-885": {
      "action": "info",
      "text": {
        "en": "Bet is above the SCC maximum for this game area.",
        "de": "Einsatz über dem SCC-Höchsteinsatz für diesen Bereich.",
        "fr": "Mise supérieure au maximum SCC pour cette zone de jeu.",
        "ru": "Ставка выше максимума SCC для этого раздела."
      }
    },
    "API-886": {
      "action": "info",
      "text": {
        "en": "You already have three open payout requests — wait until one is decided.",
        "de": "Du hast schon drei offene Auszahlungsanträge — warte, bis einer entschieden ist.",
        "fr": "Tu as déjà trois demandes de retrait ouvertes — attends qu’une soit traitée.",
        "ru": "У тебя уже три открытые заявки на вывод — дождись решения по одной из них."
      }
    }
  }
} as const;
