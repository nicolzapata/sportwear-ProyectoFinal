FROM node:18-alpine
WORKDIR /app
COPY sportwear/package*.json ./
RUN npm install
COPY sportwear/ .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
EXPOSE 3000