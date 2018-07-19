var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var mysql = require('mysql');
var _ = require('lodash');

const Fortnite = require("fortnite-api");

var fortniteAPI = new Fortnite(
    [
        auth.fnEmail,
        auth.fnPass,
        auth.fnClient,
        auth.fnLauncher
    ],
    {
        debug: false
    }
);

var con = mysql.createConnection({
    host: auth.host,
    user: auth.user,
    password: auth.password,
    database: auth.database
});

// Pull a random int from 1 - max
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max)) + 1;
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
            },
            {
                "name": "!teams [numPerTeam] [lastOut]",
                "value": "Make teams out of people in voice chat"
            },
            {
                "name": "!land [planeStart:n,nw,e,w,se] [planeEnd: n,s,nw,e]",
                "value": "Pick a random place to land"
            }
        ];

        args = args.splice(1);
        switch (cmd) {
            case 'ping':
                message.channel.send('Pong!');
                break;
            case 'commands':
            case 'help':
                con.query('SELECT * FROM commands', function (error, results, columns) {
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
                    con.query('SELECT * FROM commands', function (error, results, fields) {
                        if (error) logger.error(error);
                        var commands = processCommands(results);
                        if (commands[cmd]) {
                            message.channel.send("Command already taken");
                        } else {
                            con.query("INSERT INTO commands (command, type, image_url, description) VALUES ('" + args[0] + "','image','" + args[1] + "','Post a gif')", function (error, results, fields) {
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
                    message.channel.send("```" + message.author.username + " rolled a " + getRandomInt(max) + "```");
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
                    scores.sort(function (a, b) {
                        return b[1] - a[1];
                    });

                    for (i = 0; i < scores.length; i++) {
                        text += getSpacedText(scores[i][0], maxLength, true) + " rolled a " + scores[i][1] + "\n";
                    }

                    text += "```";
                    message.channel.send(text);
                }
                break;
            case 'land':
                var locations = [];

                var start = args.length > 0 ? args[0].toLowerCase() : false;
                var end = args.length > 1 ? args[1].toLowerCase() : false;
                var debug = args.length > 2 ? parseInt(args[2], 10) : 0;

                if (start === end) {
                    end = false;
                    start = false;
                }

                if (['n', 'nw', 'ne', 'e', 'w', 'sw', 's', 'se'].indexOf(start) === -1 ||
                    ['n', 'nw', 'ne', 'e', 'w', 'sw', 's', 'se'].indexOf(end) === -1) {
                    end = false;
                    start = false;
                }

                if (end === false || start === 'nw' || end === 'nw' || (['n', 'n'].indexOf(start) > -1 && ['w', 'w'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Junk Junction', 'Haunted Hills', 'Pleasant Park']);
                    if (start === 'nw') {
                        locations = locations.concat(['Junk Junction', 'Haunted Hills', 'Pleasant Park']);
                    }
                }

                if (end === false || start === 'n' || end === 'n' || (['nw', 'ne'].indexOf(start) > -1 && ['nw', 'ne'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Lazy Links', 'Motel']);
                    if (start === 'n') {
                        locations = locations.concat(['Lazy Links', 'Motel']);
                    }
                }

                if (end === false || start === 'ne' || end === 'ne' || (['n', 'n'].indexOf(start) > -1 && ['e', 'e'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Risky Reels', 'Wailing Woods', 'Tomato Town']);
                    if (start === 'ne') {
                        locations = locations.concat(['Risky Reels', 'Wailing Woods', 'Tomato Town']);
                    }
                }

                if (end === false || start === 'w' || end === 'w' || (['nw', 'sw'].indexOf(start) > -1 && ['nw', 'sw'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Snobby Shores', 'Small Soccer Stadium', 'Viking Boat']);
                    if (start === 'w') {
                        locations = locations.concat(['Snobby Shores', 'Small Soccer Stadium', 'Viking Boat']);
                    }
                }

                if (end === false || start === 'sw' || end === 'sw' || (['s', 's'].indexOf(start) > -1 && ['w', 'w'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Greasy Grove', 'Flush Factory', 'Shifty Shafts', 'Dance Factories']);
                    if (start === 'sw') {
                        locations = locations.concat(['Greasy Grove', 'Flush Factory', 'Shifty Shafts', 'Dance Factories']);
                    }
                }

                if (end === false || start === 's' || end === 's' || (['sw', 'se'].indexOf(start) > -1 && ['sw', 'se'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Lucky Landing', 'Fatal Fields']);
                    if (start === 's') {
                        locations = locations.concat(['Lucky Landing', 'Fatal Fields']);
                    }
                }

                if (end === false || start === 'se' || end === 'se' || (['s', 's'].indexOf(start) > -1 && ['e', 'e'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Paradise Palms']);
                    if (start === 'se') {
                        locations = locations.concat(['Paradise Palms']);
                    }
                }

                if (end === false || start === 'e' || end === 'e' || (['ne', 'se'].indexOf(start) > -1 && ['ne', 'se'].indexOf(end) > -1 )) {
                    locations = locations.concat(['Lonely Lodge', 'Retail Row', 'Metal Containers', 'Race Track']);
                    if (start === 'e') {
                        locations = locations.concat(['Lonely Lodge', 'Retail Row', 'Metal Containers', 'Race Track']);
                    }
                }

                if (end === false ||
                    (['nw', 'se'].indexOf(start) > -1 && ['nw', 'se'].indexOf(end) > -1 ) ||
                    (['nw', 's'].indexOf(start) > -1 && ['nw', 's'].indexOf(end) > -1 ) ||
                    (['nw', 'e'].indexOf(start) > -1 && ['nw', 'e'].indexOf(end) > -1 ) ||
                    (['n', 's'].indexOf(start) > -1 && ['n', 's'].indexOf(end) > -1 ) ||
                    (['n', 'sw'].indexOf(start) > -1 && ['n', 'sw'].indexOf(end) > -1 ) ||
                    (['n', 'w'].indexOf(start) > -1 && ['n', 'w'].indexOf(end) > -1 ) ||
                    (['ne', 'w'].indexOf(start) > -1 && ['ne', 'w'].indexOf(end) > -1 ) ||
                    (['w', 'e'].indexOf(start) > -1 && ['w', 'e'].indexOf(end) > -1 )
                ) {
                    locations.push('Loot Lake');
                }

                if (end === false ||
                    (['nw', 'se'].indexOf(start) > -1 && ['nw', 'se'].indexOf(end) > -1 ) ||
                    (['nw', 's'].indexOf(start) > -1 && ['nw', 's'].indexOf(end) > -1 ) ||
                    (['w', 'se'].indexOf(start) > -1 && ['w', 'se'].indexOf(end) > -1 ) ||
                    (['n', 's'].indexOf(start) > -1 && ['n', 's'].indexOf(end) > -1 ) ||
                    (['n', 'sw'].indexOf(start) > -1 && ['n', 'sw'].indexOf(end) > -1 ) ||
                    (['n', 'w'].indexOf(start) > -1 && ['n', 'w'].indexOf(end) > -1 ) ||
                    (['ne', 'w'].indexOf(start) > -1 && ['ne', 'w'].indexOf(end) > -1 ) ||
                    (['ne', 'sw'].indexOf(start) > -1 && ['ne', 'sw'].indexOf(end) > -1 ) ||
                    (['w', 'e'].indexOf(start) > -1 && ['w', 'e'].indexOf(end) > -1 )
                ) {
                    locations.push('Tilted Towers');
                }

                if (end === false ||
                    (['nw', 'se'].indexOf(start) > -1 && ['nw', 'se'].indexOf(end) > -1 ) ||
                    (['nw', 'e'].indexOf(start) > -1 && ['nw', 'e'].indexOf(end) > -1 ) ||
                    (['w', 'se'].indexOf(start) > -1 && ['w', 'se'].indexOf(end) > -1 ) ||
                    (['n', 's'].indexOf(start) > -1 && ['n', 's'].indexOf(end) > -1 ) ||
                    (['n', 'se'].indexOf(start) > -1 && ['n', 'se'].indexOf(end) > -1 ) ||
                    (['n', 'e'].indexOf(start) > -1 && ['n', 'e'].indexOf(end) > -1 ) ||
                    (['ne', 's'].indexOf(start) > -1 && ['ne', 's'].indexOf(end) > -1 ) ||
                    (['ne', 'sw'].indexOf(start) > -1 && ['ne', 'sw'].indexOf(end) > -1 ) ||
                    (['w', 'e'].indexOf(start) > -1 && ['w', 'e'].indexOf(end) > -1 )
                ) {
                    locations.push('Dusty Divot');
                }

                if (end === false ||
                    (['nw', 'se'].indexOf(start) > -1 && ['nw', 'se'].indexOf(end) > -1 ) ||
                    (['nw', 's'].indexOf(start) > -1 && ['nw', 's'].indexOf(end) > -1 ) ||
                    (['w', 'se'].indexOf(start) > -1 && ['w', 'se'].indexOf(end) > -1 ) ||
                    (['n', 's'].indexOf(start) > -1 && ['n', 's'].indexOf(end) > -1 ) ||
                    (['n', 'sw'].indexOf(start) > -1 && ['n', 'sw'].indexOf(end) > -1 ) ||
                    (['ne', 's'].indexOf(start) > -1 && ['ne', 's'].indexOf(end) > -1 ) ||
                    (['ne', 'sw'].indexOf(start) > -1 && ['ne', 'sw'].indexOf(end) > -1 ) ||
                    (['e', 'sw'].indexOf(start) > -1 && ['e', 'sw'].indexOf(end) > -1 ) ||
                    (['e', 's'].indexOf(start) > -1 && ['e', 's'].indexOf(end) > -1 ) ||
                    (['w', 'e'].indexOf(start) > -1 && ['w', 'e'].indexOf(end) > -1 ) ||
                    (['n', 'se'].indexOf(start) > -1 && ['n', 'se'].indexOf(end) > -1 )
                ) {
                    locations.push('Salty Springs');
                }

                if ((['n', 'se'].indexOf(start) > -1 && ['n', 'se'].indexOf(end) > -1 )) {
                    locations.concat(['Retail Row', 'Fatal Fields', 'Tomato Town']);
                }

                var rand = Math.floor(Math.random() * locations.length);
                if (debug === 1) {
                    message.channel.send("```" + locations[rand] + "\n\nChoices: " + locations.toString() + "\nChoice:  " + rand + "```");
                } else {
                    message.channel.send("https://s3.us-east-2.amazonaws.com/fortnite-maps/" + locations[rand].replace(/ /g, '_') + '.jpg');
                }

                break;
            case 'teams':
                var channels = message.guild.channels.array();
                var channel = false;

                for (var i = 0; i < channels.length; i++) {
                    var users = channels[i].members.array();

                    if (channels[i].type === 'voice' && _.findIndex(users, {user: {username: message.author.username}}) > -1) {
                        channel = channels[i];
                        break;
                    }
                }

                if (!channel) {
                    message.channel.send("User not in a voice channel");
                    return;
                }

                var users = channel.members.array();
                var teamSize = args.length > 0 ? parseInt(args[0], 10) : 4;
                var safe = args.length > 1 ? args.slice(1, args.length).join(' ').toLowerCase() : false;

                max = 100;
                if (isNaN(max) || isNaN(teamSize) || teamSize < 1) {
                    message.channel.send("Invalid Syntax, use `!rollall [number]`");
                } else if (users.length === 0) {
                    message.channel.send("No users in the voice channel");
                } else {

                    var scores = [];
                    var maxLength = 0;
                    for (var i in users) {
                        var user = users[i].user;
                        scores.push([user.username, safe === user.username.toLowerCase() ? 101 : getRandomInt(max)]);
                        maxLength = user.username.length > maxLength ? user.username.length : maxLength;
                    }

                    scores.sort(function (a, b) {
                        return b[1] - a[1];
                    });

                    var team = 1;
                    var text = "\n**Team 1**\n```";
                    for (i = 0; i < scores.length; i++) {
                        text += getSpacedText(scores[i][0], maxLength, true) + "\n";
                        if (i % teamSize === teamSize - 1 && i < scores.length - 1) {
                            team++;
                            text += "```\n**Team " + team + "**\n```";
                        }
                    }

                    text += "```";
                    message.channel.send(text);
                }
                break;
            case 'rollvoice':
                var channels = message.guild.channels.array();
                var channel = false;

                for (var i = 0; i < channels.length; i++) {
                    var users = channels[i].members.array();

                    if (channels[i].type === 'voice' && _.findIndex(users, {user: {username: message.author.username}}) > -1) {
                        channel = channels[i];
                        break;
                    }
                }

                if (!channel) {
                    message.channel.send("User not in a voice channel");
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
                    scores.sort(function (a, b) {
                        return b[1] - a[1];
                    });

                    for (i = 0; i < scores.length; i++) {
                        text += getSpacedText(scores[i][0], maxLength, true) + " rolled a " + scores[i][1] + "\n";
                    }

                    text += "```";
                    message.channel.send(text);
                }
                break;
            case 'stats':
                if (args.length === 0) {
                    message.channel.send("Invalid Syntax, use `!stats [name]`");
                } else {
                    message.channel.send({
                        embed: {
                            color: 16760410,
                            title: args[0],
                            url: 'http://fortnite.davisbanks.com/fortnite-stats/' + args[0],
                            image: {url: 'http://api.fortnite.davisbanks.com/api/image/' + args[0]}
                        }
                    });
                }
                break;
            default:
                logger.info(cmd);
                con.query('SELECT * FROM commands', function (error, results, fields) {
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

function getSpacedText(text, length, isRight) {
    var text = text.toString();
    var diff = length - text.length;
    if (diff < 1) {
        return text;
    } else {
        var finished = text;
        for (var i = 0; i < diff; i++) {
            finished = isRight ? finished + " " : " " + finished;
        }
        return finished;
    }
}

bot.login(auth.token);