# ---------- Builder Stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies
RUN npm install

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# ---------- Production Stage ----------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only production build artifacts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]