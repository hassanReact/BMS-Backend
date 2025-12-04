FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 7200

CMD ["npm", "start"]