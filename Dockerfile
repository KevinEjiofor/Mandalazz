## Use official Node.js runtime as base image
#FROM node:20
#
## Set working directory in container
#WORKDIR /app
#
## Copy package.json and package-lock.json
#COPY package*.json ./
#
## Install dependencies
#RUN npm ci --only=production
#
## Copy application code
#COPY . .
#
## Expose port
#EXPOSE 3030
#
## Create non-root user for security (Debian-compatible)
#RUN groupadd -g 1001 nodejs && \
#    useradd -m -u 1001 -g nodejs nodejs
#
## Change ownership of the app directory
#RUN chown -R nodejs:nodejs /app
#
## Use non-root user
#USER nodejs
#
## Start the application in dev mode
#CMD ["npm", "run", "dev"]

FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Use Azure-provided PORT
EXPOSE 8080

RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Use production start
CMD ["npm", "start"]

