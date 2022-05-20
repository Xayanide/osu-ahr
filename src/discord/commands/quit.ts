import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildCommandInteraction, logger } from '../DiscordBot';

export = {
  data: new SlashCommandBuilder()
    .setName('quit')
    .setDescription('Quit managing a lobby.')
    .addIntegerOption(option =>
      option
        .setName('lobby_id')
        .setDescription('The tournament lobby ID of a lobby to quit managing.')
        .setRequired(false)),
  async execute(interaction: GuildCommandInteraction) {
    await interaction.deferReply();
    const lobbyId = interaction.client.ahrBot.resolveLobbyId(interaction);
    if (!lobbyId) {
      await interaction.editReply('Please specify a lobby ID.');
      return;
    }
    const ahr = interaction.client.ahrBot.ahrs[lobbyId];
    if (!ahr) {
      await interaction.editReply('Invalid lobby specified.');
      return;
    }

    try {
      await ahr.lobby.QuitLobbyAsync();
      await interaction.editReply('Successfully stopped managing a lobby.');
    } catch (e: any) {
      logger.error(`@DiscordBot#quit\n${e}`);
      await interaction.editReply(`😫 There was an error while quiting a lobby. ${e}`);
    }
  }
};
