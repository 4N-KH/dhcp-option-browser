# --- Build Stage ---
FROM node:20 AS builder

WORKDIR /app

# Copy package files and core configs
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY postcss.config.mjs ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build Next.js app
RUN npm run build

# --- Production Stage ---
FROM node:20 AS runner

WORKDIR /app
ENV NODE_ENV=production

# only necessary build artifacts for production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
