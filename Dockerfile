FROM node:20

WORKDIR /app

# Copy package files first for efficient caching
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose the application port
EXPOSE 3030

# Start the app
CMD ["node", "src/server.js"]

ENV MONGO_URI=${MONGO_URI}
