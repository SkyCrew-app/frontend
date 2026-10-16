# ✈️ SkyCrew - AeroClub Management System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/frontend-Next.js-000000)](https://nextjs.org/)
[![shadcn/ui](https://img.shields.io/badge/UI-shadcn%2Fui-7f0)](https://ui.shadcn.com/)

---

## 📝 Description

**SkyCrew** est une application web complète conçue pour optimiser la gestion d'un aéroclub. Cette interface frontend offre une expérience utilisateur intuitive pour interagir avec le système, incluant le suivi en temps réel des aéronefs, la gestion des réservations, les certifications des pilotes, le suivi de maintenance, et bien plus encore.

---

## 🌟 Fonctionnalités

- **🛩️ Suivi de flotte en temps réel** : Visualisez la disponibilité des avions, l'état de maintenance et l'historique des vols.
- **📅 Réservations d'aéronefs** : Système de réservation automatisé avec détection des conflits et notifications.
- **📖 Carnets de vol & Suivi de maintenance** : Enregistrez les vols et suivez l'historique de maintenance de chaque aéronef.
- **🎓 Qualifications des pilotes** : Gérez les licences, certifications et heures de vol des pilotes.
- **👨‍🏫 Disponibilité des instructeurs** : Planifiez des vols avec instructeur et gérez leur disponibilité.
- **💰 Suivi des coûts** : Surveillez les dépenses opérationnelles et l'utilisation des aéronefs.
- **🔒 Audits de sécurité** : Planifiez et enregistrez les inspections de sécurité.
- **💳 Facturation & Paiements** : Interface pour que les membres consultent leurs factures et effectuent des paiements en ligne.

---

## 🛠️ Stack Technique

- **Frontend**: [Next.js](https://nextjs.org/) ⚡, [React.js](https://reactjs.org/) ⚛️, [TypeScript](https://www.typescriptlang.org/) 📘
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) 🎨, [Tailwind CSS](https://tailwindcss.com/) 🌬️
- **Gestion d'état**: [React Context](https://reactjs.org/docs/context.html) ou [Redux](https://redux.js.org/) (si utilisé)
- **Communication API**: [GraphQL](https://graphql.org/) via [Apollo Client](https://www.apollographql.com/docs/react/) ou [urql](https://formidable.com/open-source/urql/) (selon l'implémentation)
- **Authentification**: [NextAuth.js](https://next-auth.js.org/) 🔐 (si applicable)

---

## 📸 Captures d'écran

![Capture du tableau de bord](/screen/homepage.png)
*Un aperçu du tableau de bord principal affichant les indicateurs clés et les notifications.*

![Suivi des aéronefs](/screen/flotte.png)
*Suivi de flotte en temps réel avec des informations détaillées sur les aéronefs.*

![E-learning](/screen/elearning.png)
*Plateforme d'apprentissage en ligne pour les pilotes et le personnel.*

---

## ⚙️ Installation

Pour configurer le projet en local, suivez ces étapes :

### **Prérequis**

Assurez-vous d'avoir les éléments suivants installés :

- [Node.js](https://nodejs.org/) (v20 ou supérieur) 📦
- [Git](https://git-scm.com/) 🔧

### **Configuration du Frontend**

1. **Cloner le dépôt :**

   ```bash
   git clone https://github.com/SkyCrew-app/frontend
   cd frontend
   ```

2. **Installer les dépendances :**

   ```bash
   npm install --force
   ```

3. **Configurer les variables d'environnement :**

   Créez un fichier `.env.local` à la racine du projet :

   ```env
      NEXT_PUBLIC_API_URL=http://localhost:3000/graphql
      NEXTAUTH_URL=http://api.skycrew.local:8080/graphql
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
      NEXT_PUBLIC_PAYPAL_CLIENT_ID=
      SENTRY_SECRET_KEY=
      # Optional: base map of the flight preparation (empty = OpenFreeMap, no key)
      NEXT_PUBLIC_MAP_STYLE_URL=
   ```

4. **Démarrer le serveur de développement Next.js :**

   ```bash
   npm run dev
   ```

---

## 🎮 Utilisation

Une fois le frontend en cours d'exécution, accédez à `http://localhost:5173` dans votre navigateur pour utiliser l'interface de SkyCrew.

- **Connexion** : Utilisez vos identifiants pour vous connecter, ou inscrivez-vous si l'enregistrement des nouveaux utilisateurs est activé.
- **Exploration** : Naviguez à travers le suivi des aéronefs, les réservations, les profils pilotes, et bien plus via une interface intuitive.

---

## 📚 Communication avec l'API

Le frontend communique avec le backend via une **API GraphQL**. Assurez-vous que le backend est en cours d'exécution et accessible à l'URL spécifiée dans vos variables d'environnement (`NEXT_PUBLIC_API_URL`).

### **Exemples de Requêtes GraphQL**

Le frontend utilise des requêtes et mutations pour interagir avec le backend, telles que :

- **Récupérer les données des aéronefs**
- **Créer des réservations**
- **Mettre à jour les profils pilotes**

---

## 📅 Roadmap

- [ ] **Fonctionnalités Hors Ligne** : Ajouter la prise en charge hors ligne avec les Service Workers.
- [ ] **Internationalisation** : Supporter plusieurs langues pour une portée globale.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. **Forker le projet**

2. **Créer une branche pour votre fonctionnalité**

   ```bash
   git checkout -b feature/VotreFonctionnalite ou fix/VotreCorrection
   ```

3. **Commiter vos changements**

   ```bash
   git commit -m 'Ajout de Votre Fonctionnalité'
   ```

4. **Pusher vers la branche**

   ```bash
   git push origin feature/VotreFonctionnalite
   ```

5. **Ouvrir une Pull Request**

---

## 📝 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **Communauté Next.js** : Pour leur documentation exhaustive et leur support.
- **shadcn/ui** : Pour la fourniture d'un excellent ensemble de composants UI.
- **Passionnés d'aviation** : Inspirant la création de ce système de gestion.

---

## 📬 Contact

Pour toute question ou problème, n'hésitez pas à nous contacter :

- **Nom** : Anthony DENIN
- **Email** : [anthony.denin@ynov.com](mailto:anthony.denin@ynov.com)
- **LinkedIn** : [Anthony DENIN](https://linkedin.com/in/anthony-denin)
- **GitHub** : [MrBartou](https://github.com/MrBartou)

---

*Créé avec ❤️ par MrBartou.*
