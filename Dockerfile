FROM node:14

WORKDIR /usr/src/app

COPY . .

RUN npm install express mqtt

EXPOSE 8128

CMD [ "node", "server.js" ]