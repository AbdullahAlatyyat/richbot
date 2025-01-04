const { Client, GatewayIntentBits, Collection } = require('discord.js');
const Redis = require('ioredis');
const fetch = require('node-fetch');
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const redisClient = new Redis({
  host: '192.168.0.200',
  port: 32323,
});
const requestOptions = {
	method: "GET",
	redirect: "follow"
};
const prefix = '$';
const fs = require('fs')
const commandsList = [];

let currentIndex = 0;
let walIds = [];
let dict = [];

discordClient.commands = new Collection();

const commandFiles = fs.readdirSync('./Commands/').filter(file => file.endsWith('.js'));

for (const file of commandFiles)
{
    const command = require(`./Commands/${file}`);

    discordClient.commands.set(command.name, command)

    commandsList.push(command.name.toLowerCase());
}

const fetchData = async () => {
    try {
		const currentUrlToken = walIds[currentIndex];
		console.error(`current wallet check is ${currentUrlToken}`);
        const response = await fetch(`https://frontend-api-v2.pump.fun/coins/user-created-coins/${currentUrlToken}?offset=0&limit=999&includeNsfw=false`, requestOptions);
		 if (!response.ok) {
            throw new Error(`Failed to fetch data for ${currentUrlToken}: ${response.statusText}`);
        }
		const jsonResponse = await response.json();
		const tokenInDict = dict.find(item => item.walId === currentUrlToken);
		if (tokenInDict) {
			for (let index = 0; index < jsonResponse.length; index++) {
				const currToken = jsonResponse[index];
				if (!tokenInDict.tokens.includes(currToken.mint))
				{
					tokenInDict.tokens.push(currToken.mint);
					const richChannel = discordClient.channels.cache.find(channel => channel.name === "rich");
					if (richChannel) {
						richChannel.send(`@here wallet ${currentUrlToken} created new token: ${currToken.name} https://pump.fun/coin/${currToken.mint}`);
					} else {
						console.error("Channel 'rich' not found");
					}
				}
			}
		}
		else
		{
			dict.push({walId: currentUrlToken, tokens: jsonResponse.map(currToken => currToken.mint)});
		}
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
		currentIndex = (currentIndex + 1) % walIds.length;
		fetchData();
    }
};

discordClient.once('ready', () => {
    console.log('Hellitself bot is online');
	
	redisClient.get('walIds', (err, data) => {
		if (err) {
			console.error('Error fetching walIds from Redis:', err);
			return;
		}
		
		if (data) {
			walIds = data.split(',').filter(line => line.trim() !== '');
			if (walIds.length > 0) {
				fetchData();
			} else {
				console.error('No URLs found in walIds from Redis');
			}
		} else {
			console.error('walIds key not found in Redis');
		}
	});
});

discordClient.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
    const messageWithoutPrefix = message.content.replace(prefix,'');

    console.log("messageWithoutPrefix: " + messageWithoutPrefix);

    try{
		if (messageWithoutPrefix.startsWith('add wallet')){
			if (!args[1]) return message.reply('enter the wallet id');

			const localWalIds = args[1].split(',').filter(line => line.trim() !== '');
			if (localWalIds.length > 0) {
				for (let index = 0; index < localWalIds.length; index++) {
					const walId = localWalIds[index];
					if (!walIds.includes(walId)) {
						const response = await fetch(`https://frontend-api-v2.pump.fun/coins/user-created-coins/${walId}?offset=0&limit=999&includeNsfw=false`, requestOptions);
						if (!response.ok) {
							return message.reply(`Something went wrong, Wallet ID ${walId} is invalid or an error occured while adding it, please double check the Id and try again`);
					   	}

						walIds.push(walId);
	
						redisClient.set('walIds', walIds.join(','), (err) => {
							if (err) {
								console.error('Error updating walIds in Redis:', err);
							} else {
								console.log(`Wallet ID ${walId} added`);
								message.reply(`Wallet ID ${walId} added`);
							}
						});
					} else {
						console.log(`Wallet ID ${walId} already exists in the list`);
						message.reply(`Wallet ID ${walId} already exists in the list`);
					}
				}
			}
			else {
				return message.reply("wallets failed to add");
			}
        }
		else if (messageWithoutPrefix.startsWith('remove wallet')){
			if (!args[1]) return message.reply('enter the wallet id');
			
			const localWalIds = args[1].split(',').filter(line => line.trim() !== '');
			if (localWalIds.length > 0) {
				for (let index = 0; index < localWalIds.length; index++) {
					const walId = localWalIds[index];
					const walIndex = walIds.indexOf(walId);
					if (walIndex !== -1) {
						walIds.splice(walIndex, 1);

						redisClient.set('walIds', walIds.join(','), (err) => {
							if (err) {
								console.error('Error updating walIds in Redis:', err);
							} else {
								console.log(`Wallet ID ${walId} removed`);
								message.reply(`Wallet ID ${walId} removed`);
							}
						});
					} else {
						console.log(`Wallet ID ${walId} not found in the list`);
					    message.reply(`Wallet ID ${walId} not found in the list`);
					}
				}
			}
			else {
				return message.reply("wallets failed to add");
			}
        }
		else if (messageWithoutPrefix.startsWith('list wallet')){
            if (walIds.length > 0) {
				let replyText = 'Wallet IDs:\n';
				for (let index = 0; index < walIds.length; index++) {
					const walletId = walIds[index];
					replyText += `${walletId}\n`;
					if (index % 40 == 0)
					{
						message.reply(replyText);
						replyText = 'Wallet IDs:\n';
					}
				}
				message.reply(replyText);
			} else {
				message.reply('No wallet IDs found.');
			}
        }
        else if (commandsList.indexOf(command) != -1){
            discordClient.commands.get(command).execute(message,args);
        }
    } catch (error) {
        console.log(error)
    }
})

discordClient.login('');