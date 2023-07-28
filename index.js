const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();
const botToken = process.env.ENVIRONMENT == 'PROD' ? process.env.BOT_TOKEN : process.env.BOT_TOKEN_DEV;
const bot = new Telegraf(botToken);

const axios = require('axios');
const cheerio = require('cheerio');
const { stat } = require('fs');

const mainMenuKeyboard = {
  parse_mode: "Markdown",
  "reply_markup": {
    "keyboard": [
      ["🧺 Washer", "♨️ Dryer"],
      // ["❓ Info", "🌐 Website"],
    ],
  },
};

const url = 'https://www.circuit.co.uk/circuit-view/laundry-site/?site=6240';

const getLaundryStatus = async (machineType) => {
  const status = await axios.get(url)
    .then(response => {
      if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);

        // Locate the element containing the update status
        const statusElement = $('.accordion--circuit-view');
        let updateStatus = statusElement.text().trim()
        // const formattedStatus = updateStatus.replace(/\s\s+/g, ' ');
        updateStatus = updateStatus.split('\n')
        const statusArray = []
        for (let i = 0; i < updateStatus.length; i++) {
          updateStatus[i] = updateStatus[i].trim()
          if (updateStatus[i].includes('Report a fault')) {
            statusArray.push('|')
            continue
          }
          if (updateStatus[i] != '' && !updateStatus[i].includes('Average completion time')) {
            statusArray.push(updateStatus[i])
          }
        }
        updateStatus = statusArray.join('\n')
        updateStatus = updateStatus.split('|')

        const washerArray = []
        const dryerArray = []
        washerArray.push('**===============\n🧺 Washers\n===============**');
        dryerArray.push('**===============\n♨️ Dryers\n===============**');
        for (let i = 0; i < updateStatus.length; i++) {
          updateStatus[i] = updateStatus[i].trim()
          if (updateStatus[i].includes('Washer')) {
            washerArray.push(beautifyStatus(updateStatus[i]));
            washerArray.push('————————————————————');
          }
          if (updateStatus[i].includes('Dryer')) {
            dryerArray.push(beautifyStatus(updateStatus[i]));
            dryerArray.push('————————————————————');
          }
          else {
            continue
          }
        }
        const washerPrettiedStatus = washerArray.join('\n');
        const dryerPrettiedStatus = dryerArray.join('\n');
        if (machineType == 'washer') {
          updateStatus = washerPrettiedStatus
        } else if (machineType == 'dryer') {
          updateStatus = dryerPrettiedStatus
        } else {
          updateStatus = washerPrettiedStatus + '\n\n' + dryerPrettiedStatus
        }
        return updateStatus;
      } else {
        console.log('Error: Unable to fetch the website.');
      }
    })
    .catch(error => {
      console.log('Error:', error.message);
    });
  return status || 'Error: Unable to fetch the website.';
}

const getWasherStatus = async (ctx) => {
  const washerStatus = await getLaundryStatus('washer');
  return washerStatus;
}

const getDryerStatus = async (ctx) => {
  const dryerStatus = await getLaundryStatus('dryer');
  return dryerStatus;
}

const beautifyStatus = (status) => {
  status = status.replace('Washer', '🧺 Washer')
  status = status.replace('Dryer', '♨️ Dryer')
  status = status.replace('available.', 'available 🟢')
  status = status.replace(' mins', ' minutes left ⏳')
  status = status.replace('is currently cycle complete.', 'is cycle complete 🟡')
  status = status.replace('in use.', 'in use 🔴')
  status = status.replace('is currently out of order.', 'is out of order ⚫️')
  status = status.replace('is currently out of service.', 'is out of service ⚫️')
  status = status.replace('Expected completion time:', 'ETA ⏰ ')

  return status
}


bot.start(async (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, `**Welcome!**

This is a bot to check laundry machine status in Murano Street Student Village, coded by Dolicon (@dthx2710) for SIT UOG CS OIP23

Click Menu Buttons or commands to see laundry machine status
/washer - Washer information
/dryer - Dryer information
/help - Help

Estimated time for 🧺 Washers are 38mins and ♨️ Dryers are 50mins

Scraped from https://www.circuit.co.uk/circuit-view/laundry-site/?site=6240`, mainMenuKeyboard);
})

bot.help((ctx) => ctx.reply(`This is a bot to check laundry machine status in Murano Street Student Village

Click Menu Buttons or commands to see laundry machine status
/washer - Washer information
/dryer - Dryer information
/help - Help

Estimated time for 🧺 Washers are 38mins and ♨️ Dryers are 50mins

DM Dolicon (@dthx2710) for any issues

Scraped from https://www.circuit.co.uk/circuit-view/laundry-site/?site=6240`, mainMenuKeyboard));

bot.hears("Status", async (ctx) => {
  const laundryStatus = await getLaundryStatus();
  ctx.reply(`${laundryStatus}`, mainMenuKeyboard);
})

bot.hears("❓ Info", async (ctx) => {
  ctx.reply(`
This is a bot to check laundry machine status in Murano Street Student Village

Estimated time for 🧺 Washers are 38mins and ♨️ Dryers are 50mins

Scraped from https://www.circuit.co.uk/circuit-view/laundry-site/?site=6240

This bot is coded by Dolicon (@dthx2710) for SIT UOG CS OIP23
  
  `, mainMenuKeyboard);
})

bot.hears("🌐 Website", async (ctx) => {
  ctx.reply(`https://www.circuit.co.uk/circuit-view/laundry-site/?site=6240`, mainMenuKeyboard);
})

bot.hears("🧺 Washer", async (ctx) => {
  const machineType = 'washer';
  const washerStatus = await getWasherStatus();
  ctx.reply(`${washerStatus}`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh Status', callback_data: `refresh-${machineType}` }],
      ]
    }
  });
})

bot.hears("♨️ Dryer", async (ctx) => {
  const machineType = 'dryer';
  const dryerStatus = await getDryerStatus();
  ctx.reply(`${dryerStatus}`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh Status', callback_data: `refresh-${machineType}` }],
      ]
    }
  });
})

bot.command('washer', async (ctx) => {
  const machineType = 'washer';
  const washerStatus = await getWasherStatus();
  ctx.reply(`${washerStatus}`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh Status', callback_data: `refresh-${machineType}` }],
      ]
    }
  });
})

bot.command('dryer', async (ctx) => {
  const machineType = 'dryer';
  const dryerStatus = await getDryerStatus();
  ctx.reply(`${dryerStatus}`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh Status', callback_data: `refresh-${machineType}` }],
      ]
    }
  });
})

const userCooldowns = {};

bot.on('callback_query', async (ctx) => {

  const userId = ctx.from.id;
  const currentTime = Date.now();

  // Check if the user is on cooldown
  if (userCooldowns[userId] && currentTime - userCooldowns[userId] < 5000) { // 5000 milliseconds (5 seconds) cooldown
    // User is on cooldown, do not execute the refresh action
    ctx.answerCbQuery("Please wait a moment before refreshing again.");
    return;
  }

  // Set the user on cooldown
  userCooldowns[userId] = currentTime;
  const machineType = ctx.update.callback_query.data.split('-')[1];
  const washerStatus = await getWasherStatus();
  const dryerStatus = await getDryerStatus();
  const refreshStatus = machineType == 'washer' ? washerStatus : dryerStatus;
  // format timestamp
  const timestamp = Date.now();
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();
  const formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

  ctx.editMessageText(`${refreshStatus}

Updated at ${formattedTime}`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh Status', callback_data: `refresh-${machineType}` }],
      ]
    }
  });
  ctx.answerCbQuery("Status refreshed");
})


bot.on('message', (ctx) => {
  ctx.reply(`Click menu or type /washer or /dryer commands to see laundry machine status

/help if you need help using the bot or contact info`, mainMenuKeyboard);
})

require('http')
  .createServer(bot.webhookCallback('/murano_laundrybot'))
  .listen(process.env.PORT || 8080);

// dev
bot.launch();