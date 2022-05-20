"use strict";
const builders_1 = require("@discordjs/builders");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure the auto host rotation bot.')
        .addStringOption(option => option
        .setName('section')
        .setDescription('The configuration section to edit.')
        .setRequired(true))
        .addStringOption(option => option
        .setName('name')
        .setDescription('The configuration name to edit.')
        .setRequired(true))
        .addStringOption(option => option
        .setName('value')
        .setDescription('The new configuration value to set.')
        .setRequired(true)),
    async execute(interaction) {
        await interaction.reply('This command is currently work in progress.');
    }
};
//# sourceMappingURL=config.js.map