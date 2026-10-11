const { onRequest } = require("firebase-functions/v2/https");
const { createApp } = require("./app");

const app = createApp();

exports.api = onRequest(
  {
    region: "europe-west1",
    cors: true,
    invoker: "public",
  },
  app
);
