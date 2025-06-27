# Stage 1: Build
FROM node:24-slim AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./  
RUN npm ci

# Copy source
COPY . .

# Build the app
RUN npm run build

# Stage 2: Run
FROM node:24-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nextjs && \
    adduser --system --uid 1001 --ingroup nextjs nextjs

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000

# Final run command
CMD ["node", "server.js"]
