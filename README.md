# JobBoost AI 🚀

**Assistant open source de recherche d'emploi pour les développeurs, propulsé par l'intelligence artificielle.**

JobBoost AI est né d'un besoin concret : rendre la recherche d'emploi moins répétitive, mieux organisée et plus efficace.

Le projet vise à aider les développeurs à découvrir des opportunités, analyser les offres selon leurs compétences, adapter leurs CV et suivre leurs candidatures depuis une seule interface.

## 🧠 Fonctionnalités

- **Collecte des offres** : intégration de sources d'emploi, notamment France Travail, avec d'autres plateformes envisagées.
- **Matching IA** : analyse des offres et comparaison avec les compétences du candidat.
- **CV personnalisés** : génération de contenus adaptés aux exigences des postes.
- **Lettres de motivation** : assistance à la rédaction et à la génération PDF.
- **Suivi des candidatures** : gestion des statuts et des opportunités.
- **Automatisation n8n** : orchestration des processus de recherche d'emploi.
- **Dashboard** : statistiques et suivi de l'activité.

> ⚠️ Projet en développement actif. Certaines fonctionnalités sont expérimentales ou en cours de stabilisation. Les candidatures doivent rester sous le contrôle de l'utilisateur.

## 🛠 Stack technique

| Domaine | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | NestJS, Node.js |
| Base de données | PostgreSQL, Prisma |
| Intelligence artificielle | Ollama, Qwen3 |
| Automatisation | n8n |
| Génération PDF | Puppeteer |
| Infrastructure | Docker Compose |


## 🗺️ Roadmap & Contributions

Suivez le développement de JobBoost AI sur notre tableau Trello public :

👉 [Consulter la roadmap JobBoost AI](https://trello.com/b/Aog2gctS/jobboost-ai-roadmap-d%C3%A9veloppement)

Découvrez les fonctionnalités terminées, les améliorations prévues et les prochaines étapes du projet.

Les développeurs peuvent proposer des idées, signaler des bugs et contribuer via les GitHub Issues et Pull Requests.

## ⚙️ Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet, à partir de `.env.example`.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL pour Prisma |
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base |
| `FT_CLIENT_ID` | Identifiant API France Travail |
| `FT_CLIENT_SECRET` | Secret API France Travail |
| `FT_TOKEN_URL` | URL OAuth2 de France Travail |
| `FT_API_URL` | URL de l'API des offres |
| `ADZUNA_APP_ID` | Identifiant API Adzuna |
| `ADZUNA_APP_KEY` | Clé API Adzuna |
| `JOOBLE_API_KEY` | Clé API Jooble |
| `SERPER_API_KEY` | Clé API Serper |
| `OLLAMA_BASE_URL` | Adresse du serveur Ollama |
| `OLLAMA_MODEL` | Modèle IA utilisé |
| `N8N_JOBBOOST_WEBHOOK_URL` | URL du webhook d'automatisation |
| `SMTP_HOST` | Serveur SMTP |
| `SMTP_PORT` | Port SMTP |
| `SMTP_SECURE` | Activation TLS implicite |
| `SMTP_USER` | Identifiant SMTP |
| `SMTP_APP_PASSWORD` | Mot de passe d'application SMTP |
| `SMTP_FROM_NAME` | Nom affiché pour les emails |
| `NEXT_PUBLIC_API_URL` | Adresse publique de l'API, utilisée par le navigateur |
| `API_INTERNAL_URL` | Adresse de l'API utilisée entre conteneurs |

### Exemple de configuration locale

```dotenv
DATABASE_URL="postgresql://jobboost:CHANGE_ME@localhost:5433/jobboost?schema=public"

POSTGRES_USER=jobboost
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=jobboost

FT_CLIENT_ID=
FT_CLIENT_SECRET=
FT_TOKEN_URL="https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire"
FT_API_URL="https://api.francetravail.io/partenaire/offresdemploi/v2"

ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=
SERPER_API_KEY=

OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen3:8b

N8N_JOBBOOST_WEBHOOK_URL=http://n8n:5678/webhook/jobboost-morning

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_NAME="JobBoost AI"

NEXT_PUBLIC_API_URL=http://localhost:8080
API_INTERNAL_URL=http://api:8080
```

**Important :** les valeurs ci-dessus sont des exemples pour un environnement Windows avec Docker Desktop. Le service NestJS doit utiliser l'adresse interne `postgres:5432` pour accéder à PostgreSQL dans Docker. Les variables doivent être correctement transmises aux conteneurs par Docker Compose.

Ne publiez jamais vos clés API, mots de passe ou votre véritable fichier `.env`.

## 🐳 Démarrage avec Docker

```bash
docker compose up -d
```

Accès aux services en environnement local :

| Service | Adresse |
|---|---|
| Application web | http://localhost:3000 |
| API NestJS | http://localhost:8080 |
| n8n | http://localhost:5678 |

Les dépendances, migrations et commandes d'initialisation doivent être vérifiées selon la version du projet.

## 🗺 Roadmap publique

Le développement est organisé sur Trello :

[JobBoost AI — Roadmap & Développement](https://trello.com/b/Aog2gctS/jobboost-ai-roadmap-d%C3%A9veloppement)

La feuille de route couvre notamment le profil candidat, la collecte des offres, le matching IA, la personnalisation des CV, les candidatures, l'automatisation n8n, le marché caché, les relances, les statistiques, la sécurité et le déploiement.

## 🤝 Contribuer

JobBoost AI est conçu pour évoluer avec les retours des développeurs et des personnes en recherche d'emploi.

Vous pouvez proposer une amélioration, signaler un bug, suggérer une nouvelle source d'offres ou contribuer au développement.

Consultez la roadmap Trello et les issues GitHub pour suivre les prochaines évolutions.

## 🎯 Notre vision

**Passer moins de temps sur les tâches répétitives et consacrer davantage d'énergie aux opportunités qui comptent.**

L'IA doit accompagner le candidat, pas inventer ses compétences ni prendre des décisions importantes à sa place.

---

Développé par Abderrahman Ben Salah.