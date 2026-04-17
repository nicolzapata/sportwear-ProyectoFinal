FROM node:18-alpine
WORKDIR /app
COPY sportwear-backend/package*.json ./
RUN npm install
COPY sportwear-backend/ .
EXPOSE 3000
CMD ["node", "src/index.js"]