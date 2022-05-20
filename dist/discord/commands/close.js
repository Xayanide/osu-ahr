"use strict";
const builders_1 = require("@discordjs/builders");
const DiscordBot_1 = require("../DiscordBot");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('close')
        .setDescription('Close a lobby.')
        .addIntegerOption(option => option
        .setName('lobby_id')
        .setDescription('The tournament lobby ID of a lobby to close.')
        .setRequired(false)),
    async execute(interaction) {
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
            await ahr.lobby.CloseLobbyAsync();
            await interaction.editReply('Successfully closed a lobby.');
        }
        catch (e) {
            DiscordBot_1.logger.error(`@DiscordBot#close\n${e}`);
            await interaction.editReply(`😫 There was an error while closing a lobby. ${e}`);
        }
    }
};
//# sourceMappingURL=close.js.map