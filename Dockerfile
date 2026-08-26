# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Install client dependencies
COPY client/package*.json ./client/
RUN cd client && npm install

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
RUN npm install --omit=dev --legacy-peer-deps

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/drizzle ./drizzle

# Create required directories for volume mounts
RUN mkdir -p uploads && chown -R node:node /app

# Drop privileges for security
USER node

# Expose standard web port
EXPOSE 3000

# Run migrations and start the server
CMD ["npm", "start"]
