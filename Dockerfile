FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies inside Linux container
RUN npm install
RUN chmod -R +x node_modules/.bin || true

# Copy source code (node_modules and dist are excluded via .dockerignore)
COPY . .

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

# Push DB schema, run seed, and start production server
CMD ["sh", "-c", "npx prisma db push && npm run seed && npm run start"]
