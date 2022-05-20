import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildCommandInteraction, logger } from '../DiscordBot';
import { OahrDiscord } from '../OahrDiscord';

export = {
  data: new SlashCommandBuilder()
    .setName('make')
    .setDescription('Make a tournament lobby.')
    .addStringOption(option =>
      option
        .setName('lobby_name')
        .setDescription('The initial lobby name that\'ll be set, e.g., "4.00-5.99 auto host rotation"')
        .setRequired(true)),
  async execute(interaction: GuildCommandInteraction) {
    await interaction.deferReply();
    if (!interaction.guild) {
      logger.error('This command only works in servers.');
      await interaction.editReply('😫 This command only works in servers.');
      return;
    }

    const name = interaction.options.getString('lobby_name', true);
    let ahr;

    try {
      ahr = new OahrDiscord(interaction.client.ahrBot.ircClient, interaction.client.ahrBot.sharedObjects);
      await ahr.makeLobbyAsync(name);
    } catch (e: any) {
      logger.error(`@DiscordBot#make\n${e}`);
      await interaction.editReply(`😫 There was an error while making a tournament lobby. ${e}`);
      ahr?.lobby.destroy();
      return;
    }

    try {
      const lobbyNumber = ahr.lobby.lobbyId ?? 'new_lobby';
      interaction.client.ahrBot.registeAhr(ahr, interaction);
      await interaction.client.ahrBot.updateMatchSummary(ahr);
      await interaction.editReply(`😀 Successfully made a lobby.\n[Lobby History](https://osu.ppy.sh/mp/${lobbyNumber})`);
    } catch (e: any) {
      logger.error(`@DiscordBot#make\n${e.message}\n${e.stack}`);
      await interaction.editReply(`There was an error while making a discord channel. ${e.message}`);
    }
  }
};
