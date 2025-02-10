FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

COPY .env .env

CMD ["node", "src/server.js"]
