# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Install client dependencies
COPY client/package*.json ./client/
RUN cd client && npm ci

# Copy all source code
COPY . .

# Build both backend and frontend
RUN npm run build

# Stage 2: Production
FROM node:22-slim

WORKDIR /app

# Set to production mode
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/drizzle ./drizzle

# Create required directories for volume mounts
RUN mkdir -p uploads logs && chown -R node:node /app

# Drop privileges for security
USER node

# Expose standard web port
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run migrations and start the server
CMD ["npm", "start"]
