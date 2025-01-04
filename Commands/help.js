const fs = require('fs')

module.exports ={
    name: 'help',
    description: 'this is a Help command!',
    execute(message, args){
        const commandsList = [];
        const commandFiles = fs.readdirSync('./Commands').filter(file => file.endsWith('.js'));

        for (const file of commandFiles)
        {
            const command = require(`./${file}`);
            commandsList.push(command.name.toLowerCase());
        }

        var listOfCommands = '';
        commandsList.forEach(element => {
            listOfCommands += '\n$' + element;
        });
		listOfCommands += '\n$' +'list wallet'
		listOfCommands += '\n$' +'add wallet'
		listOfCommands += '\n$' +'remove wallet'
        message.channel.send('below you can find the list of commands you can run,' + listOfCommands);
    }
}