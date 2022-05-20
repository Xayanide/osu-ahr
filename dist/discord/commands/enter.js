"use strict";
const builders_1 = require("@discordjs/builders");
const DiscordBot_1 = require("../DiscordBot");
const OahrDiscord_1 = require("../OahrDiscord");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('enter')
        .setDescription('Enter a lobby.')
        .addIntegerOption(option => option
        .setName('lobby_id')
        .setDescription('The tournament lobby ID of the lobby to enter.')
        .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        const lobbyNumber = interaction.client.ahrBot.resolveLobbyId(interaction, true);
        const lobbyId = `#mp_${lobbyNumber}`;
        if (!lobbyNumber) {
            await interaction.editReply('error lobby_id required.');
            return;
        }
        if (!interaction.guild) {
            DiscordBot_1.logger.error('This command only works in servers.');
            await interaction.editReply('😫 This command only works in servers.');
            return;
        }
        if (interaction.client.ahrBot.ahrs[lobbyId]) {
            interaction.client.ahrBot.ahrs[lobbyId].lobby.logger.warn('The bot has already entered the lobby.');
            await interaction.editReply('I have already entered the lobby.');
            return;
        }
        let ahr;
        try {
            ahr = new OahrDiscord_1.OahrDiscord(interaction.client.ahrBot.ircClient, interaction.client.ahrBot.sharedObjects);
            await ahr.enterLobbyAsync(lobbyId);
        }
        catch (e) {
            DiscordBot_1.logger.error(`@DiscordBot#enter\n${e}`);
            await interaction.editReply(`😫 There was an error while entering a tournament lobby. ${e}`);
            ahr?.lobby.destroy();
            return;
        }
        try {
            interaction.client.ahrBot.registeAhr(ahr, interaction);
            // ロビー用チャンネルからenterコマンドを引数無しで呼び出している場合はそのチャンネルでログ転送を開始する
            const ch = interaction.guild?.channels.cache.get(interaction.channelId);
            if (ch && lobbyId === (`#${ch.name}`)) {
                ahr.startTransferLog(ch.id);
            }
            await interaction.client.ahrBot.updateMatchSummary(ahr);
            await interaction.editReply(`😀 Successfully entered the lobby.\n[Lobby History](https://osu.ppy.sh/mp/${lobbyNumber})`);
        }
        catch (e) {
            DiscordBot_1.logger.error(`@DiscordBot#enter\n${e.message}\n${e.stack}`);
            await interaction.editReply(`😫 There was an error while making a discord channel. ${e}`);
        }
    }
};
//# sourceMappingURL=enter.js.map