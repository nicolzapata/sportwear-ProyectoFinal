FROM node:18-alpine
WORKDIR /app
COPY sportwear/package*.json ./
RUN npm install
COPY sportwear/ .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]