# --- Build Stage ---
FROM node:20 AS builder

WORKDIR /app

# Package-Dateien und wichtige Konfigs kopieren
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY postcss.config.mjs ./

# Dev-Dependencies installieren
RUN npm install

# Projektdateien kopieren
COPY . .

# Next.js Build ausführen
RUN npm run build

# --- Production Stage ---
FROM node:20 AS runner

WORKDIR /app
ENV NODE_ENV=production

# Nur die nötigen Artefakte für den Start kopieren
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
