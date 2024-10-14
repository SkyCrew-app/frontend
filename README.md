# ✈️ SkyCrew - AeroClub Management System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14-brightgreen)](https://nodejs.org/)
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

![Capture du tableau de bord](https://via.placeholder.com/800x400.png?text=Tableau+de+Bord)
*Un aperçu du tableau de bord principal affichant les indicateurs clés et les notifications.*

![Suivi des aéronefs](https://via.placeholder.com/800x400.png?text=Suivi+des+Aéronefs)
*Suivi de flotte en temps réel avec des informations détaillées sur les aéronefs.*

---

## ⚙️ Installation

Pour configurer le projet en local, suivez ces étapes :

### **Prérequis**

Assurez-vous d'avoir les éléments suivants installés :

- [Node.js](https://nodejs.org/) (v14 ou supérieur) 📦
- [Git](https://git-scm.com/) 🔧

### **Configuration du Frontend**

1. **Cloner le dépôt :**

   ```bash
   git clone https://github.com/votreutilisateur/skycrew-frontend.git
   cd skycrew-frontend
   ```

2. **Installer les dépendances :**

   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement :**

   Créez un fichier `.env.local` à la racine du projet :

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/graphql
   NEXT_PUBLIC_MAPBOX_API_KEY=votre_clé_mapbox
   # Ajoutez d'autres variables si nécessaire
   ```

4. **Démarrer le serveur de développement Next.js :**

   ```bash
   npm run dev
   ```

---

## 🎮 Utilisation

Une fois le frontend en cours d'exécution, accédez à `http://localhost:3000` dans votre navigateur pour utiliser l'interface de SkyCrew.

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

## 🧪 Tests

Pour exécuter les tests unitaires du frontend :

```bash
npm run test
```

Cette commande exécutera les tests en utilisant **Jest** et **React Testing Library**.

---

## 📅 Roadmap

- [ ] **Design Responsive** : Assurer une expérience utilisateur optimale sur tous les appareils.
- [ ] **Support du Mode Sombre** : Implémenter une option de thème sombre.
- [ ] **Fonctionnalités Hors Ligne** : Ajouter la prise en charge hors ligne avec les Service Workers.
- [ ] **Internationalisation** : Supporter plusieurs langues pour une portée globale.

---

## 🐛 Problèmes Connus

- **Erreurs GraphQL** : Certaines requêtes peuvent échouer si le backend n'est pas correctement configuré.
- **Compatibilité Navigateur** : Certaines fonctionnalités peuvent ne pas fonctionner sur les navigateurs obsolètes.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. **Forker le projet**

2. **Créer une branche pour votre fonctionnalité**

   ```bash
   git checkout -b feature/VotreFonctionnalite
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

- **Nom** : Votre Nom
- **Email** : [votre.email@example.com](mailto:votre.email@example.com)
- **LinkedIn** : [Votre Profil LinkedIn](https://linkedin.com/in/votreprofil)
- **GitHub** : [VotrePseudo](https://github.com/votrepseudo)

---

*Créé avec ❤️ par MrBartou.*
