"use strict";
const builders_1 = require("@discordjs/builders");
const DiscordBot_1 = require("../DiscordBot");
const OahrDiscord_1 = require("../OahrDiscord");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('make')
        .setDescription('Make a tournament lobby.')
        .addStringOption(option => option
        .setName('lobby_name')
        .setDescription('The initial lobby name that\'ll be set, e.g., "4.00-5.99 auto host rotation"')
        .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        if (!interaction.guild) {
            DiscordBot_1.logger.error('This command only works in servers.');
            await interaction.editReply('😫 This command only works in servers.');
            return;
        }
        const name = interaction.options.getString('lobby_name', true);
        let ahr;
        try {
            ahr = new OahrDiscord_1.OahrDiscord(interaction.client.ahrBot.ircClient, interaction.client.ahrBot.sharedObjects);
            await ahr.makeLobbyAsync(name);
        }
        catch (e) {
            DiscordBot_1.logger.error(`@DiscordBot#make\n${e}`);
            await interaction.editReply(`😫 There was an error while making a tournament lobby. ${e}`);
            ahr?.lobby.destroy();
            return;
        }
        try {
            const lobbyNumber = ahr.lobby.lobbyId ?? 'new_lobby';
            interaction.client.ahrBot.registeAhr(ahr, interaction);
            await interaction.client.ahrBot.updateMatchSummary(ahr);
            await interaction.editReply(`😀 Successfully made a lobby.\n[Lobby History](https://osu.ppy.sh/mp/${lobbyNumber})`);
        }
        catch (e) {
            DiscordBot_1.logger.error(`@DiscordBot#make\n${e.message}\n${e.stack}`);
            await interaction.editReply(`There was an error while making a discord channel. ${e.message}`);
        }
    }
};
//# sourceMappingURL=make.js.map