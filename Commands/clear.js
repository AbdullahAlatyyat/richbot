module.exports ={
    name: 'clear',
    description: 'this is a Clear command!',
    async execute(message, args){
        if (!args[0]) return message.reply('please enter the amount of messages that you want to clear, or type $clear all');
        if (isNaN(args[0]) && args[0].toLowerCase() != 'all') return message.reply('please enter a real number');
        if (args[0] < 1 && args[0].toLowerCase() != 'all') return message.reply('you must delete atleast 1 message');

        if (args[0].toLowerCase() == 'all' || args[0] > 100)
        {
            var keepRunning = true;
            await startClearing(message, keepRunning);
        }
        else
        {
            await message.channel.messages.fetch({limit: args[0]}).then(messages => {
                message.channel.bulkDelete(messages);
            });
        }
    }
}


async function startClearing(message, keepRunning) {        
  setTimeout(async function() {  
    if (keepRunning) {   
        await message.channel.messages.fetch({limit: 100}).then(async messages => {
            if (messages.size == 0)
            {
                keepRunning = false;
                return;
            }
            message.channel.bulkDelete(messages);
            await startClearing(message, keepRunning);            
        });    
    }                       
  }, 250)
}