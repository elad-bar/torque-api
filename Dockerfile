FROM node:14

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 8128

CMD [ "node", "--experimental-modules", "server.js" ]