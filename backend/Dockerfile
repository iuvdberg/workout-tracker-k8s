# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
# Copy WASM/binary generated client files (tsc only compiles .ts, not other assets)
RUN cp -r src/generated dist/

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
