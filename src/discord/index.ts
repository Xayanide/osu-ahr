import { Client, Collection, Intents } from 'discord.js';
import log4js from 'log4js';
import { DiscordBot } from './DiscordBot';
import { IIrcClient, logIrcEvent, logPrivateMessage } from '../IIrcClient';
import * as irc from '../libs/irc';
import { CONFIG_OPTION, getIrcConfig } from '../TypedConfig';
import { applySpeedLimit } from '../libs/ChatLimiter';

const logger = log4js.getLogger('cli');

console.log('Starting up...');

const config_path = './config/log_discord.json';

log4js.configure(config_path);

try {
  CONFIG_OPTION.USE_ENV = true;
  const c = getIrcConfig();
  if (c.nick === 'your account id' || c.opt.password === 'you can get password from \'https://osu.ppy.sh/p/irc\'') {
    logger.error('You must enter your account ID and IRC password in the config file.');
    logger.error('You can get your IRC password in \'https://osu.ppy.sh/p/irc\' ');
    logger.error('Copy config/default.json to config/local.json, and then enter your account ID and IRC password.');
    process.exit(1);
  }

  const ircClient = new irc.Client(c.server, c.nick, c.opt);
  ircClient.on('error', err => {
    if (err.command === 'err_passwdmismatch') {
      logger.error(`${err.command}: ${err.args.join(' ')}`);
      logger.error('Check your account ID and IRC password.');
      process.exit(1);
    }
  });
  applySpeedLimit(ircClient, 10, 5000);
  logIrcEvent(ircClient);
  logPrivateMessage(ircClient);

  const discordClient = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_INTEGRATIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES] });

  const bot = new DiscordBot(ircClient, discordClient);
  discordClient.ahrBot = bot;
  bot.start();
} catch (e: any) {
  logger.error(`@discord-index\n${e}`);
  process.exit(1);
}

declare module 'discord.js' {
  interface Client {
    commands: Collection<unknown, any>;
    ahrBot: DiscordBot;
  }
}
