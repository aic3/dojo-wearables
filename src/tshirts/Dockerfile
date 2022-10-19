FROM node:10.16-alpine
WORKDIR /opt/mre

<<<<<<< HEAD
ENV WEBSITE_PORT=443
=======
ENV WEBSITE_PORT=3901
>>>>>>> d96efe9 (Updated container deployment (#1))

COPY package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY tsconfig.json ./
COPY src ./src/
RUN ["npm", "run", "build-only"]

COPY public ./public/

EXPOSE ${WEBSITE_PORT}/tcp
<<<<<<< HEAD
CMD ["npm", "start", "port", "${WEBSITE_PORT}"]
=======
CMD ["npm", "start"]
>>>>>>> d96efe9 (Updated container deployment (#1))
