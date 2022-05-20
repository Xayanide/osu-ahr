import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildCommandInteraction, logger } from '../DiscordBot';

export = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show the status of a lobby.')
    .addIntegerOption(option =>
      option
        .setName('lobby_id')
        .setDescription('The tournament lobby ID of the lobby to show it\'s status.')
        .setRequired(false)),
  async execute(interaction: GuildCommandInteraction) {
    await interaction.deferReply();
    const lobbyId = interaction.client.ahrBot.resolveLobbyId(interaction);
    if (!lobbyId) {
      await interaction.editReply('Please specify a lobby ID.');
      return;
    }

    if (!interaction.guild) {
      logger.error('This command only works in servers.');
      await interaction.editReply('😫 This command only works in servers.');
      return;
    }

    const ahr = interaction.client.ahrBot.ahrs[lobbyId];
    if (!ahr) {
      await interaction.editReply('Invalid lobby specified.');
      return;
    }

    try {
      await interaction.editReply({ embeds: [ahr.createDetailInfoEmbed()] });
    } catch (e: any) {
      logger.error(`@DiscordBot#info\n${e.message}\n${e.stack}`);
      await interaction.editReply(`😫 There was an error while handling this command. ${e.message}`);
    }
  }
};
