FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY app.js ./

RUN mkdir -p /mnt/cache

ENV PORT=3000
ENV IMAGE_CACHE_DIRECTORY=/mnt/cache

EXPOSE 3000

CMD ["npm", "start"]
