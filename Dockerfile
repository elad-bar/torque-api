FROM node:14

WORKDIR /usr/src/app

COPY . .

RUN npm install express mqtt markdown-it

EXPOSE 8128

CMD [ "node", "server.js" ]