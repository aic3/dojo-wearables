FROM node:10.16-alpine
WORKDIR /opt/mre

ENV WEBSITES_PORT=3901

COPY tshirts/package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY tshirts/tsconfig.json ./
COPY tshirts/src ./src/
COPY dojo-common ./dojo-common

# npm link ../dojo-common
RUN ["npm", "link", "./dojo-common"]
RUN ["npm", "run", "build-only"]

COPY tshirts/public ./public/

EXPOSE ${WEBSITES_PORT}/tcp
CMD ["npm", "start", "port", "${WEBSITES_PORT}"]
