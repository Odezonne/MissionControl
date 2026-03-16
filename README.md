# 🎖️ Mission Control — Guide de déploiement Android

## Prérequis
- Node.js installé (https://nodejs.org)
- Un compte Expo gratuit (https://expo.dev)
- Un compte Google Play (25 USD une seule fois) pour publier

---

## ⚡ Étape 1 — Installer et lancer

```bash
# Dans le dossier MissionControl :
npm install

# Tester sur ton téléphone (installe l'app Expo Go sur Android)
npx expo start
# Scanne le QR code avec Expo Go
```

---

## 📦 Étape 2 — Compiler l'APK (sans Mac, sans câble)

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le projet (une seule fois)
eas build:configure

# Compiler l'APK Android (gratuit, ~15 min sur leurs serveurs)
eas build --platform android --profile preview
```

➡️ Expo te donne un lien pour télécharger l'APK directement.
   Tu peux l'installer sur ton téléphone ou le soumettre au Play Store.

---

## 🚀 Étape 3 — Publier sur le Play Store

```bash
# Compiler le bundle de production (AAB)
eas build --platform android --profile production

# Soumettre automatiquement (optionnel)
eas submit --platform android
```

Ou manuellement : upload le fichier `.aab` sur https://play.google.com/console

---

## 💾 Sauvegarde automatique

La progression est sauvegardée automatiquement sur le téléphone via AsyncStorage :
- XP et grade
- Toutes les missions et objectifs
- Ton indicatif et ta classe

Les données persistent entre les sessions, même hors ligne.

---

## 🔧 Modifier l'app

| Fichier | Rôle |
|---------|------|
| `App.js` | Tout le code (logique + UI) |
| `app.json` | Nom, icône, version |
| `eas.json` | Config de compilation |

Pour changer le nom de l'app : modifie `"name"` dans `app.json`
Pour changer l'icône : remplace `assets/icon.png` (1024x1024 px)
