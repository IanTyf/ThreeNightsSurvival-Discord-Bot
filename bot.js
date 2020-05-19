
const Discord = require('discord.js');

const client = new Discord.Client();

const maxPlayers = 6; 
const characters = ['Bot', 'Madman', 'Magician', 'Prophet', 'Werewolf', 'Werewolf'];
//const characters = ['Werewolf', 'Werewolf', 'Magician', 'Prophet'];
const goodCharacters = ['Bot', 'Madman', 'Magician', 'Prophet'];
const badCharacters = ['Werewolf'];

let gameStart = false;
let players = [];
let alivePlayers = [];
let identities = [];
let tempIdentities = [];
let night = 0;
let day = 0;
let prophetChecked = false;
let magicianSwapped = false;
let werewolfKilledTonight = 0;
let werewolfCount = 2;
let newDeathIndexes = [];

let playChannel = undefined;

client.on('ready', function() {
	console.log('bot connected!');
	gameStart = false;
});

client.on('message', function(msg) {
	if (msg.content === '!TNS test') {
		//console.log(msg);
		msg.channel.send(`Hello, ${msg.author}`);
	}

	if (msg.content === "!TNS test private") {
		//console.log(msg);
		//msg.channel.send('Just sent a private message');
		msg.author.send('This is a private message.');
	}

	if (msg.content === '!TNS rule') {
		let embed = new Discord.MessageEmbed()
			.setTitle('Rules of Three Nights Survival:')
			.addField('Good guys', 'Prophet, Magician, Madman, Bot')
			.addField('Bad guys', 'Werewolf, Werewolf')
			.addField('Win Condition', '-Good Guys win if after three nights, there is at least one good guy still alive.\n-Bad Guys wins once all good guys die')
			.addField('Gameplay', '-The game is divided into nights and days. \n-Each night, every werewolf choose to kill a player that is still alive. The werewolves do not know each other. However, on the first night, Werewolves aren\'t able to kill each other. The prophet checks a player\'s identity (good or bad). At the end of the first night, the Magician can choose to swap the identity of any two players.\n-Each day, players take turns to speak. At any point during the day, the Madman can attack a player and reveal its identity(good or bad). If the player is indeed a werewolf, he dies. Otherwise, the Madman dies for his recklessness. If a non-Madman tries to attack another player, he\'ll get recked and die.')
			.addField('Notes', '-The game won\'t end even if all werewolves have died.\n-Werewolves and Magican may choose to skip their abilities at night.\n-Bot does nothing.\n-The swap of Magician happens at the end of the first night. That is, players will only know their new identity once going into the second night.\n-If the Madman gets killed by a Werewolf, the Bot will turn into a Madman.');
		msg.channel.send(embed);	
	}

	if (msg.content === '!TNS help') {
		let embed = new Discord.MessageEmbed()
			.setTitle('Available Commands')
			.setDescription('-!TNS rule - display game rule\n-!TNS join - join a game session\n-!TNS quit - quit the current game session (only before game starts. If game starts, use forceGameOver instead)\n-!TNS start - start a game session(when 6 players joined)\n-!TNS forceGameOver - end the current game session')
		msg.channel.send(embed);
	}

	if (msg.content === '!TNS join') {
		if (!gameStart) {
			if (players.length < maxPlayers) {
				if (!players.includes(msg.author)) {
					players.push(msg.author);
					msg.channel.send(`Currently joined: ${players}`);
					if (players.length === maxPlayers) {
						msg.channel.send('Ready to go! Type <!TNS start> to start the game!');
					}
				}
			}
			else {
				msg.channel.send(`${msg.author}, the queue is maxed. Please wait for the next game or threaten someone to <!TNS quit>.`);
			}
		}
	}

	if (msg.content === '!TNS quit') {
		if (!gameStart) {
			if (players.includes(msg.author)) {
				players.splice(players.indexOf(msg.author), 1);
				msg.channel.send(`Currently joined: ${players}`);
			}
		}
	}

	if (msg.content === '!TNS forceGameOver') {
		gameEnds();
		msg.channel.send('The game is over.')
	}

	if (msg.content === '!TNS start') {
		if (!gameStart && players.length === maxPlayers) {
			// start of game
			playChannel = msg.channel;
			gameStart = true;
			night = 0;
			day = 0;
			prophetChecked = false; 
			magicianSwapped = false; 
			werewolfKilledTonight = 0;
			werewolfCount = 2; 
			alivePlayers = players.slice(0);
			msg.channel.send('Game Starts! Please check the private message for your character.');
			giveCharacters(msg, players);
			nextNight(msg, 1);
		}
	}

	if (msg.content.substring(0, 10) === '!TNS check') {
		if (gameStart && night > 0 && night > day) {
			const caller = msg.author;
			const index = players.indexOf(caller);
			if (tempIdentities[index] === 'Prophet' && !prophetChecked) {
				let checkedPlayerIndex = msg.content.split(' ');
				if (checkedPlayerIndex.length === 3) {
					checkedPlayerIndex = parseInt(checkedPlayerIndex[2]) - 1;
					const checkedIdentity = tempIdentities[checkedPlayerIndex];
					if (goodCharacters.includes(checkedIdentity)) {
						msg.author.send(`${players[checkedPlayerIndex].username} is a good guy.`);
					}
					else {
						msg.author.send(`${players[checkedPlayerIndex].username} is a bad guy.`);
					}
					prophetChecked = true;
					nextDay();
				}
				else {
					msg.author.send('For example, to check player 1, type <!TNS check 1>.');
				}
			}
		}
	}

	if (msg.content.substring(0, 9) === '!TNS kill') {
		if (gameStart && night > 0 && night > day) {
			const caller = msg.author;
			const index = players.indexOf(caller);
			if (tempIdentities[index] === 'Werewolf') {
				if (werewolfKilledTonight < werewolfCount) {
					let killedPlayerIndex = msg.content.split(' ');
					if (killedPlayerIndex.length === 3) {
						if (killedPlayerIndex[2] === 'skip') {
							msg.author.send('You did not kill anyone tonight.');
							werewolfKilledTonight++;
							nextDay();
						}
						else {
							killedPlayerIndex = parseInt(killedPlayerIndex[2]) - 1;
							//alivePlayers[killedPlayerIndex] = 'dead';
							if (night === 1 && tempIdentities[killedPlayerIndex] === 'Werewolf') {
								// hit the other werewolf
								msg.author.send(`${players[killedPlayerIndex].username} is a werewolf...So he won't be killed tonight.`)
							}
							else {
								msg.author.send(`${players[killedPlayerIndex].username} has been killed.`);
								kill(killedPlayerIndex);
								if (!newDeathIndexes.includes(killedPlayerIndex)) {
									newDeathIndexes.push(killedPlayerIndex);
								}
							}
							werewolfKilledTonight++;
							nextDay();
						}
					}
					else {
						msg.author.send('For example, to kill player 1, type <!TNS kill 1>. To kill nobody, type <!TNS kill skip>.');
					}
				}
				else {
					msg.author.send('You can only kill one player each tonight. If you have not killed anyone tonight, your werewolf teammate just cheated and killed two players. Report him publicly and kick him out of the server!');
				}
			}
		}
	}

	if (msg.content.substring(0, 9) === '!TNS swap') {
		if (gameStart && night > 0 && night > day) {
			const caller = msg.author;
			const index = players.indexOf(caller);
			if (tempIdentities[index] === 'Magician' && !magicianSwapped) {
				let swappedPlayersIndexes = msg.content.split(' ');
				if (swappedPlayersIndexes.length === 3) {
					if (swappedPlayersIndexes[2] === 'skip') {
						msg.author.send('Skipped swapping.');
						magicianSwapped = true;
						nextDay();
					}
					else {
						msg.author.send('For example, to swap player 1 and 2, type <!TNS swap 1 2>. To skip this ability, type <!TNS swap skip>.');
					}
				}
				else if (swappedPlayersIndexes.length === 4) {
					const firstPlayerIndex = parseInt(swappedPlayersIndexes[2]) - 1;
					const secondPlayerIndex = parseInt(swappedPlayersIndexes[3]) - 1;
					const firstOldId = identities[firstPlayerIndex];
					identities[firstPlayerIndex] = identities[secondPlayerIndex];
					identities[secondPlayerIndex] = firstOldId; 
					msg.author.send('Identities swapped.');
					magicianSwapped = true;
					nextDay();
				}
				else {
					msg.author.send('For example, to swap player 1 and 2, type <!TNS swap 1 2>. To skip this ability, type <!TNS swap skip>.');
				}
			}
		}
	}

	if (msg.content.substring(0, 11) === '!TNS attack') {
		if (gameStart && night > 0 && night === day) {
			const caller = msg.author;
			const index = players.indexOf(caller);
			if (tempIdentities[index] === 'Madman') {
				let attackedIndex = msg.content.split(' ');
				if (attackedIndex.length === 3) {
					attackedIndex = attackedIndex[2] - 1;
					playChannel.send(`${msg.author} strikes at ${players[attackedIndex]}.`);
					if (tempIdentities[attackedIndex] === 'Werewolf') {
						// success
						playChannel.send(`${players[attackedIndex]} is ... indeed a werewolf! He is now out of the game.`);
						kill(attackedIndex);
					}
					else {
						// failure
						playChannel.send(`${players[attackedIndex]} is ... not a werewolf. Unfortunately, ${msg.author} died.`);
						kill(index);
					}
				}
			}
			else {
				playChannel.send(`Sorry, ${msg.author} you are not a madman. You got recked.`);
				kill(players.indexOf(msg.author));
			}
		}
	}

	if (msg.content === "!TNS night") {
		if (gameStart && night > 0 && night === day) {
			nextNight(msg, night+1);
		}
	}
});

function kill(index) {
	if (identities[index] === 'Madman' && night > day) {
		// bot turns into madman, if still alive
		const botIndex = identities.indexOf('Bot');
		//if (alivePlayers[botIndex] !== 'dead') {
		identities[botIndex] = 'Madman';
		//}
	}

	alivePlayers[index] = 'dead';
	/*
	if (tempIdentities[index] === 'Werewolf') {
		werewolfCount--;
	}*/

	let stillGoodGuy = false;
	for (let i=0; i<maxPlayers; i++) {
		if (goodCharacters.includes(identities[i]) && alivePlayers[i] !== 'dead') {
			stillGoodGuy = true;
			break;
		}
	}
	if (!stillGoodGuy) {
		// bad guys won
		playChannel.send('Game Over. Werewolves won! All good guys have died miserably.');
		let embed = new Discord.MessageEmbed()
			.setTitle('Winners: ');
		let listOfPlayers = '';
		for (let i=0; i<maxPlayers; i++) {
			if (identities[i] === 'Werewolf') {
				listOfPlayers += `${i+1}. ${players[i].username}\n`;
			}
		}
		embed = embed.setDescription(listOfPlayers);
		playChannel.send(embed);
		gameEnds();
	}
}

function gameEnds() {
	gameStart = false;
	players = [];
	alivePlayers = [];
	identities = [];
	tempIdentities = [];
	night = 0;
	day = 0;
	prophetChecked = false;
	magicianSwapped = false;
	werewolfKilledTonight = 0;
	werewolfCount = 2;
	playChannel = undefined;
}

function nextDay() {
	if (magicianSwapped && werewolfKilledTonight >= werewolfCount && prophetChecked) {
		// go to next day
		day++;
		tempIdentities = identities.slice(0);
		// update werewolf count
		werewolfCount = 0;
		for (let i=0; i<maxPlayers; i++) {
			if (identities[i] === 'Werewolf' && alivePlayers[i] !== 'dead') {
				werewolfCount++;
			}
		}

		if (day !== 3) {
			//werewolfKilledTonight = 0;
			//prophetChecked = false;
			playChannel.send(`Day ${day} has come. Here is what happened last night: `);
			let flag = (newDeathIndexes.length > 0);
			/*
			for (let i=0; i<maxPlayers; i++) {
				if (alivePlayers[i] === 'dead') {
					playChannel.send(`${players[i]} died.`);
					flag = true;
				}
			}
			*/
			for (let i=0; i<newDeathIndexes.length; i++) {
				playChannel.send(`${players[newDeathIndexes[i]]} died.`);
			}

			if (!flag) {
				playChannel.send('Nobody died last night.');
				let embed = new Discord.MessageEmbed()
					.setTitle('Living Players: ');
				let listOfPlayers = '';
				for (let i=0; i<maxPlayers; i++) {
					if (alivePlayers[i] !== 'dead') {
						listOfPlayers += `${i+1}. ${players[i].username}\n`;
					}
				}
				embed = embed.setDescription(listOfPlayers);
				playChannel.send(embed);
				let randomNum = Math.floor(Math.random() * maxPlayers);
				while (alivePlayers[randomNum] === 'dead') {
					randomNum = Math.floor(Math.random() * maxPlayers);
				}
				playChannel.send(`Player${randomNum+1}, aka${players[randomNum]} should start talking`);
			}
			else {
				let embed = new Discord.MessageEmbed()
					.setTitle('Living Players: ');
				let listOfPlayers = '';
				for (let i=0; i<maxPlayers; i++) {
					if (alivePlayers[i] !== 'dead') {
						listOfPlayers += `${i+1}. ${players[i].username}\n`;
					}
				}
				embed = embed.setDescription(listOfPlayers);
				playChannel.send(embed);
				let randomNum = Math.floor(Math.random() * maxPlayers);
				while (alivePlayers[randomNum] === 'dead') {
					randomNum = Math.floor(Math.random() * maxPlayers);
				}
				//playChannel.send(`Player${randomNum+1}, aka${players[randomNum]} should start talking`);
				playChannel.send(`Please let the players who just died share some final words. Then, Player${randomNum+1}, aka${players[randomNum]} should start talking`);
			}
			playChannel.send(`When everyone finishes talking, the last person should type <!TNS night> to proceed`);
		}
		else {
			// good guys won!
			
			playChannel.send('Three nights are gone...');

			playChannel.send('Game Over. Good Guys won! All werewolves have died.');
			let embed = new Discord.MessageEmbed()
				.setTitle('Winners: ');
			let listOfPlayers = '';
			for (let i=0; i<maxPlayers; i++) {
				if (identities[i] !== 'Werewolf') {
					listOfPlayers += `${i+1}. ${players[i].username}\n`;
				}
			}
			embed = embed.setDescription(listOfPlayers);
			playChannel.send(embed);
			gameEnds();
		}
	}
}

function giveCharacters(msg, players) {
	let remainingCharacters = characters.slice(0);
	for (let i=0; i<maxPlayers; i++) {
		const randomNum = Math.floor(Math.random() * remainingCharacters.length);
		identities.push(remainingCharacters[randomNum]);
		remainingCharacters.splice(remainingCharacters.indexOf(remainingCharacters[randomNum]), 1);

		const thePlayer = players[i];
		thePlayer.send(`Your character is ${identities[i]}`);
		console.log(identities[i]);
	}
}

function nextNight(msg, n) {
	playChannel.send(`Night falls.`);
	night = n;
	tempIdentities = identities.slice(0);
	werewolfKilledTonight = 0;
	// update werewolf count
	werewolfCount = 0;
	newDeathIndexes = [];
	for (let i=0; i<maxPlayers; i++) {
		if (identities[i] === 'Werewolf' && alivePlayers[i] !== 'dead') {
			werewolfCount++;
		}
	}

	for (let i=0; i<maxPlayers; i++) {
		const thePlayer = players[i];
		if (alivePlayers.includes(thePlayer)) {
			switch (identities[i]) {
				case 'Bot':
					thePlayer.send('You are a Bot. You sleep.');
					break;
				case 'Madman':
					thePlayer.send('You are a Madman. You hate sleeping but you have to.');
					thePlayer.send('During day time, you can attack any player you want at any time. If you successfully attack a werewolf, it will die. However, if you attack a good man, you will die instead.');
					thePlayer.send('For example, if you want to attack player 1, type <!TNS attack 1> (in the server, not privately to me).');
					nextDay();
					break;
				case 'Magician':
					if (n === 1) {
						thePlayer.send('You are a Magician. Tonight you can swap the identity of two players of your choice. You will not be able to do so in the following nights.');
						let embedM = new Discord.MessageEmbed()
							.setTitle('Players: ');
						let listOfPlayersM = '';
						for (let i=0; i<maxPlayers; i++) {
							listOfPlayersM += `${i+1}. ${players[i].username}\n`;
						}
						embedM = embedM.setDescription(listOfPlayersM);
						thePlayer.send(embedM);
						thePlayer.send('For example, to swap player 1 and 2, type <!TNS swap 1 2>. To skip this ability, type <!TNS swap skip>.');
					}
					else {
						thePlayer.send('You are a Magician. You cannot do anything tonight.');
					}
					break;
				case 'Prophet':
					prophetChecked = false;
					thePlayer.send('You are a prophet. You can check the identity of any player (including the dead players).');
					let embedP = new Discord.MessageEmbed()
							.setTitle('Players: ');
					let listOfPlayersP = '';
					for (let i=0; i<maxPlayers; i++) {
						listOfPlayersP += `${i+1}. ${players[i].username}\n`;
					}
					embedP = embedP.setDescription(listOfPlayersP);
					thePlayer.send(embedP);
					thePlayer.send('For example, to check player 1, type <!TNS check 1>.');
					break;
				case 'Werewolf':
					thePlayer.send('You are a werewolf. You may choose to kill any of the living players.');
					let embedW = new Discord.MessageEmbed()
							.setTitle('Living Players: ');
					let listOfPlayersW = '';
					for (let i=0; i<maxPlayers; i++) {
						if (alivePlayers[i] !== 'dead') {
							listOfPlayersW += `${i+1}. ${players[i].username}\n`;
						}
					}
					embedW = embedW.setDescription(listOfPlayersW);
					thePlayer.send(embedW);
					thePlayer.send('For example, to kill player 1, type <!TNS kill 1>. To kill nobody, type <!TNS kill skip>.');
					break;
			}
		}
	}
}

//client.login(token);
client.login(process.env.BOT_TOKEN);
