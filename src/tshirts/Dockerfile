FROM node:10.16-alpine
WORKDIR /opt/mre

ENV WEBSITES_PORT=3901

COPY package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY tsconfig.json ./
COPY src ./src/
RUN ["npm", "run", "build-only"]

COPY public ./public/

EXPOSE ${WEBSITE_PORT}/tcp
CMD ["npm", "start", "port", "${WEBSITES_PORT}"]
