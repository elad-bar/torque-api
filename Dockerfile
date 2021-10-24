FROM node:14

WORKDIR /usr/src/app

COPY . .

RUN npm install express mqtt markdown-it slugify influxdb-v2

EXPOSE 8128

CMD [ "node", "--experimental-modules", "server.js" ]