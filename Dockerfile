#FROM node:20
#
#WORKDIR /app
#
## Copy package files first for efficient caching
#COPY package.json package-lock.json ./
#
## Install only production dependencies
#RUN npm install --production
#
## Copy the rest of the application
#COPY . .
#
## Expose the application port
#EXPOSE 3030
#
## Start the app
#CMD ["node", "src/server.js"]

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3030

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start the application
CMD ["npm", "start"]