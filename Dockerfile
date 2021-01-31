FROM node:15.5-buster

EXPOSE 3000
WORKDIR /opt/thingbook-server

# Install rerequisites
COPY ["package*.json", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent

# Build
COPY . .
RUN npm run tsc

CMD ["./build/app.js"]
