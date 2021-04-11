# ============================================================================
FROM node:15.5-buster AS builder
# ----------------------------------------------------------------------------

WORKDIR /opt/thingbook-server

# Install build rerequisites
COPY ["package*.json", "npm-shrinkwrap.json*", "./"]
RUN npm install --silent

# Build
COPY . .
RUN npm run build -- --project tsconfig.production.json


# ============================================================================
FROM node:15.5-buster AS production
# ----------------------------------------------------------------------------

EXPOSE 3000
WORKDIR /opt/thingbook-server

# Install runtime rerequisites
COPY ["package*.json", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent

COPY --from=builder /opt/thingbook-server/dist .
CMD ["./dist/application.js"]
