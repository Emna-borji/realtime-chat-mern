# realtime-chat-mern

**Messagerie temps réel** style Discord/WhatsApp : chats 1-à-1 et groupes, notifications de frappe et nouveaux messages via WebSocket.

## Objectif
Fournir une application de chat complète avec :
- Authentification sécurisée (JWT + bcrypt)
- Chats 1-à-1 et chats de **groupe** avec admin (rename, add/remove members)
- Diffusion en temps réel des messages via **Socket.io** (events `typing`, `stop typing`, `new message`)
- UI React avec Redux (store global, 7 reducers)

## Données
**MongoDB** (Mongoose). Trois collections :

| Collection | Champs principaux |
|---|---|
| `User` | `name`, `email` (unique), `password` (hash bcrypt), `pic` (image base64), `isAdmin` |
| `Chat` | `chatName`, `isGroupChat`, `users[]` (refs User), `latestMessage` (ref Message), `groupAdmin` (ref User) |
| `Message` | `sender` (ref User), `content`, `chat` (ref Chat) |

## Méthode

### API REST (préfixe `/api/`)
Toutes les routes sauf `register` / `login` sont protégées par **JWT** (middleware `protect`).

| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/api/users/` | Register (multipart avec photo de profil, `multer`) |
| POST | `/api/users/login` | Login — renvoie un JWT |
| GET | `/api/users/` | Rechercher des utilisateurs |
| POST | `/api/chat/` | Accéder / créer un chat 1-à-1 |
| GET | `/api/chat/` | Liste de mes chats |
| POST | `/api/chat/group` | Créer un groupe |
| PUT | `/api/chat/rename` | Renommer un groupe |
| PUT | `/api/chat/groupadd` | Ajouter un membre |
| PUT | `/api/chat/groupremove` | Retirer un membre |
| GET | `/api/message/:chatId` | Messages d'un chat |
| POST | `/api/message/` | Envoyer un message |

### Socket.io (même serveur)
- `setup` → `connected` (handshake avec `userData._id`)
- `join chat` (rejoint une room = `chatId`)
- `typing` / `stop typing` (broadcast dans la room)
- `new message` (fanout aux `chat.users`, émis en `message received`)

### Front (React)
3 pages, 21 composants :
- `/login` — Login
- `/register` — Register
- `/chats` — vue principale (sidebar `MyChats` + `ChatBox`, modals groupe, recherche, profil)

Redux store avec 7 reducers : `auth`, `chats`, `group`, `messages`, `notifications`, `users`, `root`. Socket.io-client branché sur le reducer `chats` pour notifier les nouveaux messages.

## Stack
**Backend** : Node, Express 4, Mongoose 8, Socket.io 4.7, bcryptjs 2.4, jsonwebtoken 9, multer 1.4, express-async-handler, validator, dotenv.

**Frontend** : React 18.3, React Router v6, Redux 5 + redux-thunk, React-Redux 9, socket.io-client 4.7, axios, React-Bootstrap + MDB React UI Kit, react-icons, @fortawesome, react-lottie (animation typing).

**Monorepo** piloté par `concurrently` + `nodemon`. Script `npm run build` bundle le front dans `/build`, servi en prod par Express.

## Résultats
Prototype complet fonctionnel bout-en-bout : auth JWT, chats 1-à-1 et groupes avec admin, messages persistés en Mongo, diffusion temps réel via Socket.io, UI React avec Redux et navigation entre conversations.

### Limites connues
- **Image de profil stockée en base64 dans Mongo** — simple mais fait grossir chaque document utilisateur. Idéal : stocker sur un bucket (S3, Cloudinary) et persister seulement l'URL.
- Pas de tests automatisés.
- Pas de rate-limiting sur login / register, pas de reset password, pas de vérification d'email.

## Comment lancer

### Pré-requis
- Node ≥ 18, npm
- MongoDB local (ou cluster MongoDB Atlas)

### Variables d'environnement (`.env` à créer à la racine)
```
MONGO_URL=mongodb://localhost:27017/chatroom
JWT_SECRET=change-me
PORT=5000
```

### Installation + lancement
```bash
# Backend + frontend
npm install
cd frontend && npm install && cd ..

# Dev — les deux en concurrently
npm run dev
# Backend : http://localhost:5000
# Frontend : http://localhost:3000 (proxy vers :5000)
```

### Production
```bash
npm run build        # bundle du frontend dans frontend/build
npm start            # Express sert l'API ET le build frontend
```
