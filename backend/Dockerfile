# Use official Node image
FROM node:18.20.4-slim AS builder
WORKDIR /app

# Copy package files and install (using clean install)
COPY package*.json ./
RUN npm ci --only=production

# Use a smaller base image for runtime
FROM node:18.20.4-slim

# 🔒 SECURE: Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs
WORKDIR /app

# Copy built assets
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 5000
CMD ["node", "src/app.js"]
