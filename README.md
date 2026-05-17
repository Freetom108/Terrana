# Terrana

Terrana ist eine Organizer-App für Naturprodukte (ätherische Öle, Kräuter & Tee, Bachblumen, Supplemente und mehr): Produkte sammeln, Blends erstellen, KI-Import sowie Backup — mit freemium-Funktionen und Upgrades über **Pro** / **Lifetime**.

## Voraussetzungen

- **Node.js** (LTS empfohlen) und npm
- **Expo** (über `npx expo` oder global installiert)
- Für Store-Builds: **EAS CLI** (`npm i -g eas-cli`) und Expo-Account
- Echte **In-App Purchases**: Development Build oder EAS-Build mit nativer `react-native-purchases`-Integration (nicht reines Expo Go allein)

## Setup

```bash
npm install
```

Kopieren Sie `.env.example` nach `.env` und tragen Sie die benötigten Öffentliche-Client-Variablen ein:

| Variable | Beschreibung |
|----------|----------------|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | API-Key für Anthropic (KI-Import aus Text) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat **Public SDK Key** (Android) |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat **Public SDK Key** (iOS) |

Nach Änderungen an der `.env`: Dev-Server mit `npx expo start --clear` neu starten.

## Lokale Entwicklung

```bash
npx expo start
```

Weitere Scripts: `npm run android`, `npm run ios`, `npm run web`; Typsicherheit: `npm run typecheck`.

## Builds mit EAS

Profile sind in `eas.json` beschrieben, z. B.:

```bash
# Android APK (intern / direkte Installation)
eas build --platform android --profile preview

# Produktions-Bundle für den Play Store
eas build --platform android --profile production

# iOS (entsprechendes Profil wählen)
eas build --platform ios --profile production
```

Nach dem Build liefert **expo.dev** den Artefakt-Download-Link bzw. QR-Code.

**Downloads über Spusu:** Wenn ihr die App-Angebots- oder Distribution über **Spusu** vermarktet, verweist dort auf denselben offiziellen **Install-Link** oder das verteilte APK/AAB, das ihr aus einem erfolgreichen EAS-Build bezieht (oder nutzt einen von Spusu bereitgestellten Vertriebs-Link, wenn abweichend).
