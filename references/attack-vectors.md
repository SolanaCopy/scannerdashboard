# Solidity Attack Vectors — referentie voor de AI-audit

Beknopte checklist van exploit-patronen waarop smart contracts gescand worden.
De scanner laadt de eerste ~8000 tekens hiervan in de AI-prompt. Focus ligt op
**permissionless fund-drains**: kan een willekeurige niet-eigenaar geld wegtrekken?

## 1. Toegangscontrole (access control)
- **Ontbrekende owner/role-check** op functies die funds verplaatsen (`withdraw`, `transfer`, `sweep`, `rescue`, `claim`, `migrate`). Geen `onlyOwner` / `require(msg.sender == owner)` = iedereen kan callen.
- **Verkeerde check**: `tx.origin` i.p.v. `msg.sender`; check op het verkeerde adres; check die overschreven kan worden.
- **Onbeschermde initializer**: `initialize()` zonder `initializer` modifier → aanvaller claimt ownership.
- **Publieke setters** voor kritieke state: `setOwner`, `setAdmin`, `setFeeReceiver`, `setImplementation` zonder restrictie.
- **Default-visible functies** die intern bedoeld waren maar `public`/`external` zijn.

## 2. Reentrancy
- **Single-function**: external call vóór state-update (verletten CEI: Checks-Effects-Interactions).
- **Cross-function**: state gedeeld tussen functies; reentry via een andere functie.
- **Read-only reentrancy**: view-functie geeft inconsistente waarde tijdens reentry (vaak bij LP/price-oracles).
- **ERC777/ERC677/hooks**: `tokensReceived` / `onTokenTransfer` callbacks heropenen de flow.
- Ontbrekende `nonReentrant` op functies met external calls + balanswijziging.

## 3. Approval- & transferFrom-drains
- Contract houdt `approve`/`allowance` van gebruikers en laat een **publieke** functie `transferFrom(user, attacker, amount)` uitvoeren.
- `permit()`-misbruik: signatuur zonder nonce/deadline-check; front-runnable permits.
- Oneindige approval naar een contract dat zelf ge-draind kan worden.

## 4. Prijs- & oracle-manipulatie
- **Spot-price uit een DEX-pool** als oracle (`getReserves`, `balanceOf(pair)`) → flashloan-manipuleerbaar.
- Geen TWAP; geen sanity-bounds; één enkele bron.
- Rekenkundige volgorde waardoor een grote swap de prijs tijdelijk kantelt vóór een withdraw.

## 5. Flashloan-geassisteerde exploits
- Logica die afhangt van een momentopname van balances/supply die binnen 1 tx manipuleerbaar is.
- `totalSupply`/`balanceOf`-afhankelijke beloningen, collateral-ratio's, of share-prijzen.

## 6. Rekenfouten & accounting
- **Over/underflow** (pre-0.8 zonder SafeMath, of unchecked-blokken in 0.8+).
- **Rounding**: deling vóór vermenigvuldiging; share/asset-conversie die naar 0 afrondt of in het voordeel van de aanvaller.
- **Eerste-deposit inflation attack** (ERC4626-achtig): eerste depositor manipuleert share-prijs.
- **Dubbel-tellen / dubbele withdraw**: balans wordt niet verlaagd, of twee paden claimen dezelfde funds.
- Verkeerde `decimals`-aanname tussen tokens.

## 7. Upgradeability & proxy
- **Unprotected `upgradeTo`** / `delegatecall` naar een door-aanvaller-gezet adres.
- Storage-collision tussen proxy en implementatie.
- Niet-geïnitialiseerde implementatie die `selfdestruct` kan triggeren.
- Implementatie-contract niet verified (verborgen logica).

## 8. Signature & replay
- Ontbrekende `nonce` / `deadline` / `chainId` (EIP-712) → replay.
- `ecrecover` zonder check op `address(0)`.
- Signature-malleability; hergebruik over functies.

## 9. Denial of Service (secundair — geen drain)
- Push-payments naar een adres dat revert (`receive` revert) blokkeert distributie.
- Unbounded loops over user-gecontroleerde arrays.
- Gas-griefing. *Meld alleen als het funds blokkeert, niet bij pure DoS.*

## 10. Rugpull-patronen (owner-misbruik)
- `mint()` zonder cap; `blacklist`/`pause` die verkopen blokkeert; wijzigbare fees tot 100%.
- `owner` kan liquidity of user-deposits wegtrekken (`emergencyWithdraw` zonder restrictie op bestemming).
- Hidden backdoor: obfuscated address, assembly-sends naar vast adres.

---

## BY DESIGN — NIET rapporteren als exploit
Deze patronen zien er verdacht uit maar zijn legitiem:
- Functie die funds naar een **vast/hardcoded adres** (cold wallet, treasury) stuurt i.p.v. `msg.sender` → permissionless sweep is by design. `dump()`, `flush()`, `sweep()` bij exchanges.
- Permissionless functie waarvan de output **altijd** naar een vast adres gaat → aanvaller betaalt gas om iemand anders te helpen, geen buit.
- Reentrancy-keten die funds naar het cold address stuurt i.p.v. naar de aanvaller.
- Functies die afhangen van externe contracts waarvan de **source niet beschikbaar** is → INSUFFICIENT_DATA, geen CRITICAL.

## Rapportage-drempel
Alleen **HIGH/CRITICAL** melden met een concreet pad: entrypoint(s), exacte aanvalsstappen, en waar de funds naartoe gaan (moet een door-aanvaller-gecontroleerd adres zijn). Bij twijfel: VERDACHT met code-citaat, geen CRITICAL.
