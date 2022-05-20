"use strict";
const builders_1 = require("@discordjs/builders");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a message to a lobby.')
        .addStringOption(option => option
        .setName('message')
        .setDescription('The message to send.')
        .setRequired(true))
        .addIntegerOption(option => option
        .setName('lobby_id')
        .setDescription('The tournament lobby ID of a lobby to send a message to.')
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
        const msg = interaction.options.getString('message', true);
        if ((msg.startsWith('!') && !msg.startsWith('!mp ')) || msg.startsWith('*')) {
            ahr.lobby.RaiseReceivedChatCommand(ahr.lobby.GetOrMakePlayer(ahr.client.nick), msg);
            await interaction.editReply(`Executed: ${msg}`);
        }
        else {
            ahr.lobby.SendMessage(msg);
            await interaction.editReply(`Sent: ${msg}`);
        }
    }
};
//# sourceMappingURL=say.js.map