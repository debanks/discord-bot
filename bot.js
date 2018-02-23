var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var mysql = require('mysql');

var con = mysql.createConnection({
    host: auth.host,
    user: auth.user,
    password: auth.password,
    database: auth.database
});

// Pull a random int from 1 - max
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max - 1)) + 1;
}

// Return text with extra spaces up to length
function getSpacedText(text, length) {
    var diff = length - text.length;
    if (diff < 1) {
        return text;
    } else {
        var finished = text;
        for (var i = 0; i < diff; i++) {
            finished += " ";
        }
        return finished;
    }
}

// grab the commands from the results
function processCommands(results) {
    var commands = {};
    for (var i = 0; i < results.length; i++) {
        commands[results[i].command] = results[i]
    }
    return commands;
}


logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

var bot = new Discord.Client();
bot.on('ready', function () {
    bot.user.setPresence({status: 'online', game: {name: "!commands for all commands", type: 0}});
    logger.info('Connected');
});

bot.on('message', function (message) {
    var content = message.content;
    if (content.substring(0, 1) === '!') {
        var args = content.substring(1).split(' ');
        var cmd = args[0];
        var max;
        var fields = [
            {
                "name": "!ping",
                "value": "Will pong back to check if it is working"
            },
            {
                "name": "!roll [max|100]",
                "value": "Pull a random number from 1-max"
            },
            {
                "name": "!rollall [max|100]",
                "value": "Pull a random number for every user from 1-max"
            },
            {
                "name": "!rollvoice [max|100]",
                "value": "Pull a random number for every user in the first voice channel from 1-max"
            },
            {
                "name": "!gifadd [command] [image_url]",
                "value": "Add a gif tied to a command"
            }
        ];

        args = args.splice(1);
        switch (cmd) {
            case 'ping':
                message.channel.send('Pong!');
                break;
            case 'commands':
            case 'help':
                con.query('SELECT * FROM commands', function(error, results, columns) {
                    if (error) logger.error(error);
                    for (var i = 0; i < results.length; i++) {
                        fields.push({
                            name: '!' + results[i].command,
                            value: results[i].description
                        });
                    }

                    message.channel.send({
                        "embed": {
                            "description": "Here's the full list of commands you can use with this bot",
                            "color": 16760410,
                            "author": {
                                "name": "Meme Machine Commands",
                                "url": "https://discordapp.com",
                                "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
                            },
                            "fields": fields
                        }
                    });
                });
                break;
            case 'gifadd':
                if (args.length < 2) {
                    message.channel.send("Invalid Syntax, use `!gifadd [command] [image_url]`");
                } else {
                    con.query('SELECT * FROM commands', function(error, results, fields) {
                        if (error) logger.error(error);
                        var commands = processCommands(results);
                        if (commands[cmd]) {
                            message.channel.send("Command already taken");
                        } else {
                            con.query("INSERT INTO commands (command, type, image_url, description) VALUES ('" + args[0] + "','image','" + args[1] + "','Post a gif')", function(error, results, fields) {
                                if (error) {
                                    message.channel.send("There was an error saving your command");
                                } else {
                                    message.channel.send("Success! use `!" + args[0] + '` to use it')
                                }
                            });
                        }
                    });
                }
                break;
            case 'roll':
                max = args.length > 0 ? args[0] : 100;
                if (isNaN(max)) {
                    message.channel.send("Invalid Syntax, use `!roll [number]`");
                } else {
                    message.channel.send("```" + message.author.username + "** rolled a " + getRandomInt(max) + "```");
                }
                break;
            case 'rollall':
                var users = message.channel.members.array();
                max = args.length > 0 ? args[0] : 100;
                if (isNaN(max)) {
                    message.channel.send("Invalid Syntax, use `!rollall [number]`");
                } else {

                    var text = "```";
                    var scores = [];
                    var maxLength = 0;
                    for (var i in users) {
                        var user = users[i].user;
                        if (user.bot) {
                            continue;
                        }
                        scores.push([user.username, getRandomInt(max)]);
                        maxLength = user.username.length > maxLength ? user.username.length : maxLength;
                    }
                    scores.sort(function(a,b) {
                        return b[1] - a[1];
                    });

                    for (i = 0; i < scores.length; i++) {
                        text +=  getSpacedText(scores[i][0], maxLength) + " rolled a " + scores[i][1] + "\n";
                    }

                    text += "```";
                    message.channel.send(text);
                }
                break;
            case 'rollvoice':
                var channels = message.guild.channels.array();
                var channel = false;

                for (var i = 0; i < channels.length; i++) {
                    if (channels[i].type === 'voice') {
                        channel = channels[i];
                        break;
                    }
                }

                if (!channel) {
                    message.channel.send("No Voice Channels");
                    return;
                }

                var users = channel.members.array();
                max = args.length > 0 ? args[0] : 100;
                if (isNaN(max)) {
                    message.channel.send("Invalid Syntax, use `!rollall [number]`");
                } else if (users.length === 0) {
                    message.channel.send("No users in the voice channel");
                } else {

                    var text = "```";
                    var scores = [];
                    var maxLength = 0;
                    for (var i in users) {
                        var user = users[i].user;
                        if (user.bot) {
                            continue;
                        }
                        scores.push([user.username, getRandomInt(max)]);
                        maxLength = user.username.length > maxLength ? user.username.length : maxLength;
                    }
                    scores.sort(function(a,b) {
                        return b[1] - a[1];
                    });

                    for (i = 0; i < scores.length; i++) {
                        text +=  getSpacedText(scores[i][0], maxLength) + " rolled a " + scores[i][1] + "\n";
                    }

                    text += "```";
                    message.channel.send(text);
                }
                break;
            default:
                logger.info(cmd);
                con.query('SELECT * FROM commands', function(error, results, fields) {
                    if (error) logger.error(error);
                    var commands = processCommands(results);
                    if (!commands[cmd]) {
                        message.channel.send("Invalid command, use `!commands` to see all commands available");
                    } else {
                        var command = commands[cmd];
                        switch (command.type) {
                            case "image":
                                message.channel.send(command.image_url);
                                break;
                        }
                    }
                });
        }
    }
});

bot.login(auth.token);