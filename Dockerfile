FROM node:20-bullseye

WORKDIR /app

COPY . .
RUN npm install
RUN npm run build

# Run the standalone server
CMD ["npm", "start"]