/**
 * check list
 * admin roleが正しく登録される
 * admin role以外のユーザーはスラッシュコマンド、ボタンコマンドを利用できない
 */

import log4js from 'log4js';
import { Client, Collection, Permissions, Guild, CommandInteraction, ApplicationCommandPermissionData, CreateRoleOptions, MessageActionRow, MessageButton, DiscordAPIError, Message, TextChannel, GuildMember, ButtonInteraction, MessageEmbed } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { IIrcClient } from '../IIrcClient';
import { OahrDiscord } from './OahrDiscord';
import { setContext } from './DiscordAppender';
import { BanchoResponse, BanchoResponseType } from '../parsers/CommandParser';
import { getConfig } from '../TypedConfig';
import fs from 'fs';
export const logger = log4js.getLogger('discord');

const ADMIN_ROLE: CreateRoleOptions = {
  name: 'ahr-admin',
  color: 'ORANGE',
  reason: 'ahr-bot administrator'
};

export interface DiscordBotConfig {
  token: string; // ボットのトークン https://discord.com/developers/applications
  clientId: string;
}

type MessageEmbedReplyData = {
  embeds: [
    MessageEmbed
  ]
  ephemeral?: boolean;
}
export type GuildCommandInteraction = CommandInteraction & { guildId: string; }
export type OahrSharedObjects = Record<string, unknown>;

export class DiscordBot {
  ircClient: IIrcClient;
  discordClient: Client;
  cfg: DiscordBotConfig;
  ahrs: { [index: string]: OahrDiscord };
  sharedObjects: OahrSharedObjects;

  constructor(client: IIrcClient, discordClient: Client) {
    this.ircClient = client;
    this.discordClient = discordClient;
    this.cfg = getConfig('Discord', {});
    this.ahrs = {};
    this.sharedObjects = {};
  }

  async start() {
    this.discordClient.commands = new Collection();
    this.discordClient.once('ready', async cl => {
      for (const g of cl.guilds.cache.values()) {
        await this.registerCommandsAndRoles(g);
      }
      setContext(cl, this.ahrs);
      logger.info('The discord bot is ready.');
      logger.info(`Invite link => ${this.generateInviteLink()}`);
    });

    this.discordClient.on('guildCreate', async guild => {
      console.log(`guildCreate ${guild.name}`);
      await this.registerCommandsAndRoles(guild);
    });

    this.discordClient.on('interactionCreate', async interaction => {
      if (!interaction.inGuild()) return;
      if (!this.checkMemberHasAhrAdminRole(interaction.member as GuildMember)) {
        if (interaction.isButton()) {
          await interaction.reply({ content: 'You do not have sufficient permissions to manage a lobby.', ephemeral: true });
        }
        return;
      }
      if (interaction.isCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        logger.info(`${interaction.guildId ? `Guild: ${interaction.guildId} | User: ${interaction.user.id}` : `User: ${interaction.user.id}`} Running command ${interaction.commandName}`);
        try {
          await command.execute(interaction);
        } catch (e: any) {
          logger.error(`@discordClient#interactionCreate:\n${interaction.guildId ? `Guild: ${interaction.guildId} | User: ${interaction.user.id}` : `User: ${interaction.user.id}`} Caught error running command ${interaction.commandName}\n${e.message}\n${e.stack}`);
          const replyData: MessageEmbedReplyData = {
            embeds: [
              new MessageEmbed()
                .setDescription(`Command \`${interaction.commandName}\` caught an error.`)
                .setColor('DARK_RED'),
            ],
          };
          if (!interaction.replied && !interaction.deferred) {
            replyData.ephemeral = true;
            await interaction.reply(replyData);
          }
          else {
            await interaction.editReply(replyData);
          }
        }
      }
      if (interaction.isButton()) {
        const m = /^(\w+),#mp_(\d+)$/.exec(interaction.customId);
        if (m) {
          await this.handleButtonInteraction(interaction, m[1], m[2]);
        }
      }
    });

    try {
      await this.discordClient.login(this.cfg.token);
    } catch (e: any) {
      if (e?.code === 'TOKEN_INVALID' && e.message) {
        logger.error(e.message);
        if (this.cfg.token === '') {
          logger.error('The discord bot token is empty.');
        } else {
          logger.error(`The discord bot token provided was invalid.\n"${this.cfg.token}"`);
        }
        logger.error('Check the setup guide -> https://github.com/Meowhal/osu-ahr#discord-integration');

      } else {
        logger.error(`@DiscordBot#start\n${e.message}\n${e.stack}`);
      }
      process.exit();
    }

  }

  checkMemberHasAhrAdminRole(member: GuildMember) {
    return member.roles.cache.find(f => f.name === ADMIN_ROLE.name) !== undefined;
  }

  async registerCommandsAndRoles(guild: Guild) {
    const applicationId = this.cfg.clientId;
    const guildId = guild.id;
    const botToken = this.cfg.token;

    const commands = [];
    const commandFiles = fs.readdirSync(`${__dirname}/commands`).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
    for (const file of commandFiles) {
      const command = await import(`${__dirname}/commands/${file}`);
      this.discordClient.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '9' }).setToken(botToken);
    try {
      await rest.put(
        Routes.applicationGuildCommands(applicationId, String(guildId)),
        {
          body: commands,
        }
      );
    } catch (e: any) {
      logger.error(`@DiscordBot#registerCommandsAndRoles\n${e.message}\n${e.stack}`);
    }
    await this.registerAhrAdminRole(guild);
  }

  async registerAhrAdminRole(guild: Guild) {
    let role = guild.roles.cache.find(r => r.name === ADMIN_ROLE.name);
    if (!role) {
      role = await guild.roles.create(ADMIN_ROLE);
    }
    return role.id;
  }

  async handleButtonInteraction(interaction: ButtonInteraction<'present'>, command: string, lobbyNumber: string) {
    if (!interaction.guild) return;
    const lobbyId = `#mp_${lobbyNumber}`;
    const ahr = this.ahrs[lobbyId];
    if (!ahr) {
      await interaction.reply({ content: `The lobby \`${lobbyId}\` has already been unmanaged.`, ephemeral: true });
    }

    try {
      switch (command) {
        case 'menu':
          const menu = ahr.createControllButtons();
          await interaction.reply({ content: `Menu for lobby \`${lobbyId}\``, components: [menu], ephemeral: true });
          return;
        case 'close':
          await ahr.lobby.CloseLobbyAsync();
          await interaction.reply({ content: `The lobby \`${lobbyId}\` has been closed.`, ephemeral: true });
          break;
        case 'startLog':
          await this.getOrCreateMatchChannel(interaction.guild, lobbyNumber);
          await interaction.reply({ content: `Started transferring logs to another channel for lobby \`${lobbyId}\``, ephemeral: true });
          this.startTransferLog(ahr, interaction.guild);
          break;
        case 'stopLog':
          ahr.stopTransferLog();
          await interaction.reply({ content: `Stopped transferring logs for lobby \`${lobbyId}\``, ephemeral: true });
          break;
      }
      await this.updateMatchSummary(ahr);
    } catch (e: any) {
      logger.error(`@DiscordBot#handleButtonInteraction\n${e.message}\n${e.stack}`);
    }
  }

  async getOrCreateMatchChannel(guild: Guild, lobbyNumber: string): Promise<TextChannel> {
    const lobbyId = `mp_${lobbyNumber}`;
    const dc = guild.channels.cache.find(c => c.name === lobbyId);
    if (dc) return dc as TextChannel;
    const role = guild.roles.cache.find(r => r.name === ADMIN_ROLE.name);
    return await guild.channels.create(lobbyId, {
      type: 'GUILD_TEXT',
      topic: `Created by ${this.discordClient.user?.username}. Lobby history: https://osu.ppy.sh/community/matches/${lobbyNumber}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES]
        },
        {
          id: role ?? '',
          allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES]
        },
        {
          id: this.discordClient.user?.id ?? '',
          allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.MANAGE_MESSAGES]
        }
      ]
    });
  }

  async getOrCreateMatchesChannel(guild: Guild): Promise<TextChannel> {
    const dc = guild.channels.cache.find(c => c.name.toLowerCase() === 'matches');
    if (dc) return dc as TextChannel;
    const role = guild.roles.cache.find(r => r.name === ADMIN_ROLE.name);
    return await guild.channels.create('matches', {
      type: 'GUILD_TEXT',
      topic: `Created by ${this.discordClient.user?.username}.`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES]
        },
        {
          id: role ?? '',
          allow: [Permissions.FLAGS.VIEW_CHANNEL]
        },
        {
          id: this.discordClient.user?.id ?? '',
          allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.MANAGE_MESSAGES]
        }
      ]
    });
  }

  registeAhr(ahr: OahrDiscord, interaction: GuildCommandInteraction) {
    if (!ahr.lobby.channel) {
      throw new Error('lobbyId is not defined');
    }
    const lid = ahr.lobby.channel;
    const updateHandler = (a: { message: string, response: BanchoResponse, }) => {
      switch (a.response.type) {
        case BanchoResponseType.BeatmapChanged:
        case BanchoResponseType.MatchStarted:
        case BanchoResponseType.MatchFinished:
        case BanchoResponseType.AbortedMatch:
        case BanchoResponseType.HostChanged:
          this.updateMatchSummary(ahr);
          break;
      }
    };
    ahr.lobby.ReceivedBanchoResponse.on(updateHandler);
    ahr.lobby.LeftChannel.once(() => {
      delete this.ahrs[lid];
      delete this.ahrs[ahr.discordChannelId];
      ahr.lobby.ReceivedBanchoResponse.off(updateHandler);
      this.deleteMatchSummary(ahr);
    });
    ahr.setGuildId(interaction.guildId);
    ahr.stopTransferLog();
    this.ahrs[lid] = ahr;

  }

  async startTransferLog(ahr: OahrDiscord, guild: Guild) {
    const dc = await this.getOrCreateMatchChannel(guild, ahr.lobby.lobbyId ?? '');
    ahr.startTransferLog(dc.id);
    this.ahrs[ahr.discordChannelId] = ahr;
  }

  /**
   * スラッシュコマンドの対象ロビーIDを取得する。
   * コマンドのパラメータで与えられている場合はそれを使用する。
   * コマンドを実行したチャンネルがロビーに紐付けされていればそれを使用する。
   * チャンネル名が mp_*** の形式であれば *** 部分を使用する。
   * @param interaction 1
   * @returns
   */
  resolveLobbyId(interaction: CommandInteraction, asNumber: boolean = false): string | undefined {
    if (!interaction.inGuild()) return;

    const op = interaction.options.getInteger('lobby_id', false);
    if (op) {
      if (asNumber) {
        return op.toString();
      } else {
        return `#mp_${op}`;
      }
    }

    const ahr = this.ahrs[interaction.channelId];
    if (ahr && ahr.lobby.channel) {
      if (asNumber) {
        return ahr.lobby.lobbyId;
      } else {
        return ahr.lobby.channel;
      }
    }

    const gc = interaction.guild?.channels.cache.get(interaction.channelId);

    const m = gc?.name.match(/mp_(\d+)/);
    if (m) {
      if (asNumber) {
        return m[1];
      } else {
        return `#${m[0]}`;
      }

    }
    return undefined;
  }

  generateInviteLink(): string {
    return this.discordClient.generateInvite({
      scopes: ['bot', 'applications.commands'],
      permissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.MANAGE_ROLES,
        Permissions.FLAGS.MANAGE_MESSAGES,
      ]
    });
  }

  createLinkButton(lobbyNumber: string) {
    return new MessageActionRow().addComponents(
      new MessageButton().setStyle('LINK').setLabel('Lobby Histroy').setURL(`https://osu.ppy.sh/community/matches/${lobbyNumber}`),
      new MessageButton().setStyle('LINK').setLabel('Channel').setURL('')
    );
  }

  async updateMatchSummary(ahr: OahrDiscord) {
    if (!ahr.updateSummaryMessage) return;
    try {
      const guild = this.discordClient.guilds.cache.find(f => f.id === ahr.guildId);
      if (guild === undefined) throw new Error('Guild not found');
      const channel = await this.getOrCreateMatchesChannel(guild);
      const embed = ahr.createSummaryInfoEmbed();
      const btns = ahr.createMenuButton();
      let message: Message | undefined = await this.findMatchSummaryMessage(channel, ahr);
      if (message) {
        await message.edit({ embeds: [embed], components: [btns] });
      } else {
        message = await channel.send({ embeds: [embed], components: [btns] });
      }
      ahr.matchSummaryMessageId = message.id;
    } catch (e: any) {
      if (e instanceof DiscordAPIError) {
        if (e.message === 'Missing Permissions') {
          logger.error(`Missing Permissions. Invite this bot again.\nInvite link => ${this.generateInviteLink()}`);
          return;
        } else if (e.message === 'Missing Access') {
          logger.error('Missing Access. The bot does not have the Permission to manage the #match channel, please delete the #match channel or give the bot editing privileges.');
          return;
        }
      }
      logger.error(`@DiscordBot#updateMatchSummary\n${e.message}\n${e.stack}`);
      ahr.updateSummaryMessage = false;
    }
  }

  async findMatchSummaryMessage(channel: TextChannel, ahr: OahrDiscord) {
    let message: Message | undefined;
    if (ahr.matchSummaryMessageId !== '') {
      message = await channel.messages.fetch(ahr.matchSummaryMessageId);
    }
    if (message) return message;
    const msgs = await channel.messages.fetch({ limit: 10 });
    const recent = msgs.find(f => (f.embeds && f.embeds.length > 0 && f.embeds[0].title === `#mp_${ahr.lobby.lobbyId ?? ''}`));
    if (recent) return recent;
  }

  async deleteMatchSummary(ahr: OahrDiscord) {
    if (!ahr.updateSummaryMessage) return;
    try {
      const guild = await this.discordClient.guilds.fetch(ahr.guildId);
      const channel = await this.getOrCreateMatchesChannel(guild);
      const message: Message | undefined = await this.findMatchSummaryMessage(channel, ahr);
      ahr.updateSummaryMessage = false;
      if (message) {
        await message.delete();
      }
    } catch (e: any) {
      logger.error(`@DiscordBot#deleteMatchSummary\n${e.message}\n${e.stack}`);
    }
  }
}
