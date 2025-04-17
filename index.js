const mineflayer = require('mineflayer');
const fs = require('fs');
const { keep_alive } = require("./keep_alive");
const { Vec3 } = require('vec3');

let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

const host = data["ip"];
const username = data["name"];

const bot = mineflayer.createBot({
  host: host,
  username: username,
  version: "1.18.2"
});

const actions = ['forward', 'back', 'left', 'right'];
const pi = 3.14159;
let lasttime = -1;
let moving = 0;
let connected = 0;
let lastaction;
let moveinterval = 2;
let maxrandom = 5;

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

bot.on('login', () => {
  console.log("Giriş yapıldı ✅");
});

bot.on('spawn', () => {
  connected = 1;
});

// Uyuma ve otomatik hareket
bot.on('time', () => {
  if (connected < 1) return;

  // Geceyse yatmaya çalış
  if (!bot.time.isDay && bot.entity?.position) {
    const bedPos = bot.findBlock({
      matching: block => bot.isABed(block),
      maxDistance: 2
    });

    if (bedPos) {
      bot.sleep(bedPos).then(() => {
        console.log("Bot uyuyor...");
      }).catch(err => {
        console.log("Uyuyamadı:", err.message);
      });
    }
  }

  // Rastgele hareket
  if (lasttime < 0) {
    lasttime = bot.time.age;
  } else {
    const randomadd = Math.random() * maxrandom * 20;
    const interval = moveinterval * 20 + randomadd;

    if (bot.time.age - lasttime > interval) {
      if (moving === 1) {
        bot.setControlState(lastaction, false);
        moving = 0;
        lasttime = bot.time.age;
      } else {
        const yaw = Math.random() * pi - (0.5 * pi);
        const pitch = Math.random() * pi - (0.5 * pi);
        bot.look(yaw, pitch, false);

        lastaction = actions[Math.floor(Math.random() * actions.length)];
        bot.setControlState(lastaction, true);
        moving = 1;
        lasttime = bot.time.age;
        bot.activateItem();
      }
    }
  }
});

function whisper(to, message) {
  bot.chat(`/w ${to} ${message}`);
}

bot.on('playerJoined', (player) => {
  if (player.username !== bot.username) {
    bot.chat(`Hoş geldin ${player.username}! Ben Yardımcı Bot'um 🤖`);

    setTimeout(() => whisper(player.username, 'Sana komutları öğretmeye hazırım!'), 1500);
    setTimeout(() => whisper(player.username, 'İlk komut: "BOT: Yardım" — beni yanına ışınlar.'), 4000);
    setTimeout(() => whisper(player.username, 'İkinci komut: "BOT: Geri dönebilirsin" — beni AFK bölgeme yollar.'), 6500);
    setTimeout(() => whisper(player.username, 'Üçüncü komut: "BOT: bana [eşya] ver" — sana istediğin eşyayı veririm (elimde varsa) 😄'), 8500);
    setTimeout(() => whisper(player.username, 'Hepsi bu kadar! Komutları istediğin zaman tekrar yazabilirsin 😄'), 11000);
  }
});

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  const lower = message.toLowerCase().trim();
  console.log(`[${username}]: ${message}`);

  if (lower.startsWith('bot:')) {
    const command = lower.substring(4).trim();

    if (command === 'yardım') {
      whisper(username, `Yanına ışınlanıyorum...`);
      bot.chat(`/tp ${bot.username} ${username}`);
    }

    else if (command === 'geri dönebilirsin') {
      bot.chat('AFK bölgesine dönüyorum...');
      bot.chat(`/tp ${bot.username} -24 -63 -45`);
    }

    else if (command.startsWith('bana ') && command.endsWith('ver')) {
      const rawItem = command.replace('bana ', '').replace('ver', '').trim();
      const match = rawItem.match(/^(\d+)\s+(.*)$/);
      let amount = 1;
      let itemName = rawItem;

      if (match) {
        amount = parseInt(match[1]);
        itemName = match[2].trim();
      }

      const targetPlayer = bot.players[username]?.entity;
      if (!targetPlayer) {
        bot.chat("Oyuncuyu göremiyorum 😢");
        return;
      }

      const matchingItems = bot.inventory.items().filter(i => i.name.includes(itemName));
      const totalQuantity = matchingItems.reduce((sum, i) => sum + i.count, 0);

      if (totalQuantity < amount) {
        whisper(username, `Üzgünüm, envanterimde yeterince "${itemName}" yok 😕 (0 adet var, ${amount} adet isteniyor)`);
        return;
      }

      let given = 0;
      for (const item of matchingItems) {
        if (given >= amount) break;

        const toToss = Math.min(item.count, amount - given);
        try {
          await bot.toss(item.type, null, toToss);
          given += toToss;
        } catch (err) {
          bot.chat("Eşyayı veremedim 😢 Hata: " + err.message);
          return;
        }
      }

      whisper(username, `Buyur ${username}, işte ${given} adet ${itemName}! 🎁`);
    }

    else {
      whisper(username, `Bilinmeyen komut "${command}". Geçerli komutlar: "BOT: Yardım", "BOT: Geri dönebilirsin", "BOT: bana [eşya] ver"`);
    }
  }
});

// Keep-alive server başlat
keep_alive();
