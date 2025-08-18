# -------------------------
# Étape 1 : BUILD
# -------------------------
FROM node:22-alpine AS builder

# 1) Créer le dossier de travail
WORKDIR /app

# 2) Copier package.json & package-lock.json (ou yarn.lock) pour installer
COPY package*.json ./

# 3) Installer les dépendances en mode production+dev
RUN npm install --force

# 4) Copier tout le code source (pages, app/, public/, etc.)
COPY . .

# 5) Lancer la compilation Next.js (génère .next/)
RUN npm run build

# -------------------------
# Étape 2 : PRODUCTION
# -------------------------
FROM node:22-alpine AS runner

# 1) Spécifier le dossier de travail
WORKDIR /app

# 2) Copier package.json & package-lock.json depuis l’étape builder
COPY --from=builder /app/package*.json ./

# 3) Installer uniquement les dépendances de production
#    (si vous aviez des devDependencies réellement nécessaires uniquement à la build,
#     elles ne seront pas installées ici, ce qui allège l’image)
RUN npm install --only=production --ignore-scripts --omit=dev --force

# 4) Copier le dossier compilé `.next/` depuis l’étape builder
COPY --from=builder /app/.next ./.next

# 5) Copier le dossier `public/` (vos images, fonts, etc.) 
COPY --from=builder /app/public ./public

# 6) Copier les fichiers nécessaires au runtime (si vous en avez, ex: next.config.js, tsconfig.json, etc.)
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/tsconfig.json ./

# 7) Si vous avez un dossier `node_modules` requis à la racine (pour runtime),
#    on l’a déjà installé au point 3. Pas de copie explicite de node_modules depuis builder.

# 8) Définir la variable d’environnement NODE_ENV=production
ENV NODE_ENV=production

# 9) Exposer le port 3000 (ou le port que votre app écoute)
EXPOSE 5173

# 10) Commande de démarrage : next start (écoute par défaut sur 3000)
CMD ["npm", "run", "start"]