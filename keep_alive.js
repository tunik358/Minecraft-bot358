const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send("Bot aktif 🟢");
});

app.listen(3000, () => {
  console.log("Keep alive server aktif 🟢");
});

module.exports = { keep_alive: () => {} };
