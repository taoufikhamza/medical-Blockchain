# Medical Blockchain dApp

Une application décentralisée (dApp) sécurisée permettant la gestion des dossiers médicaux sur la blockchain Ethereum. Ce projet garantit la transparence, la sécurité et l'immuabilité des données médicales tout en offrant une interface utilisateur moderne et intuitive.

## Fonctionnalités Principales

*   **Gestion des rôles :** 
    *   **Administrateur :** Gestion globale et supervision.
    *   **Patient :** Accès sécurisé à son propre dossier médical.
    *   **Visiteur :** Accès restreint pour garantir la confidentialité.
*   **Sécurité des données :** Stockage des informations critiques et gestion des accès via des contrats intelligents (Smart Contracts) immuables.
*   **Génération de documents :** Exportation professionnelle de rapports médicaux au format PDF.
*   **Interface Utilisateur :** Design moderne, réactif et professionnel pensé pour l'expérience utilisateur.

## Technologies Utilisées

### Frontend
*   **React.js :** Bibliothèque JavaScript pour la construction de l'interface utilisateur.
*   **Web3.js :** Interaction avec la blockchain Ethereum depuis l'application.
*   **CSS :** Design et mise en forme de l'application.

### Backend & Blockchain
*   **Solidity :** Langage de programmation pour le développement des Smart Contracts.
*   **Ethereum :** Réseau blockchain sous-jacent.
*   **Truffle :** Environnement de développement et pipeline de déploiement.
*   **Ganache :** Blockchain Ethereum personnelle pour le développement local.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants sur votre machine :

*   [Node.js](https://nodejs.org/) (inclut `npm`)
*   [Truffle](https://trufflesuite.com/truffle/) (`npm install -g truffle`)
*   [Ganache](https://trufflesuite.com/ganache/)
*   L'extension de navigateur [MetaMask](https://metamask.io/)

## Installation et Démarrage

Suivez ces étapes pour exécuter le projet localement :

**1. Cloner le dépôt :**
```bash
git clone https://github.com/taoufikhamza/medical-Blockchain.git
cd medical-blockchain
```

**2. Démarrer la blockchain locale :**
Ouvrez Ganache et créez un nouvel espace de travail ou lancez le mode "Quickstart".

**3. Compiler et déployer les contrats intelligents :**
Dans le dossier racine du projet, exécutez la commande suivante pour déployer les contrats sur votre blockchain locale :
```bash
truffle migrate --reset
```

**4. Configurer MetaMask :**
*   Connectez MetaMask à votre réseau Ganache local (par défaut `http://127.0.0.1:7545`).
*   Importez un compte Ganache dans MetaMask en utilisant sa clé privée.

**5. Installer les dépendances du frontend et lancer l'application :**
Naviguez dans le dossier `client`, installez les dépendances puis démarrez le serveur de développement :
```bash
cd client
npm install
npm start
```
L'application devrait maintenant s'ouvrir dans votre navigateur, généralement à l'adresse `http://localhost:3000`.

## Structure du Projet

*   `contracts/` : Contient le code source des Smart Contracts en Solidity.
*   `migrations/` : Scripts pour gérer le déploiement des contrats sur la blockchain.
*   `client/` : Contient l'ensemble du code source de l'application frontend React.
*   `test/` : Fichiers de tests pour garantir le bon fonctionnement des contrats.
