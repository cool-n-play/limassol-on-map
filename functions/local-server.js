const { createApp } = require("./app");

const PORT = Number(process.env.PORT || 5001);
const app = createApp();

app.listen(PORT, () => {
  console.log(`limassol-on-map API http://127.0.0.1:${PORT}/api/pharmacies`);
});
