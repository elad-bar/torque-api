FROM node:14

WORKDIR /usr/src/app

COPY . .

RUN npm install dotenv express

ENV HA_HOST=127.0.0.1
ENV HA_PORT=8123
ENV HA_TOKEN=""
ENV API_KEY=""

EXPOSE 8128

CMD [ "node", "server.js" ]