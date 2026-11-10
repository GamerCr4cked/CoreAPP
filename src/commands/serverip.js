const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverip')
    .setDescription('Get the Minecraft server IP'),

  async execute(interaction) {
    const ip = process.env.MC_SERVER_IP || 'Not configured';

    const embed = new EmbedBuilder()
      .setColor(0x3fb950)
      .setTitle('🎮 PowerCoreSMP Server')
      .addFields(
        { name: 'Server IP', value: `\`\`\`\n${ip}\n\`\`\``, inline: false },
        { name: 'Version', value: 'Minecraft **1.21.4+** (Java Edition)', inline: false }
      )
      .setFooter({ text: 'PowerCoreSMP S1 — See you in-game!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
