const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Post the application message with Apply button (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x3fb950)
      .setTitle('📋 Apply to PowerCoreSMP')
      .setDescription(
        '**How to apply:**\n' +
        '1. Click the **Apply** button below\n' +
        '2. Enter your **Minecraft username** (Java Edition)\n' +
        '3. Submit and wait for a response!\n\n' +
        '**Requirements:**\n' +
        '• Minecraft Java Edition 1.21.4+\n' +
        '• Valid Minecraft username\n' +
        '• Must follow server rules'
      )
      .setFooter({ text: 'PowerCoreSMP S1 — Applications' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('apply_btn')
        .setLabel('Apply')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('toggle_apply')
        .setLabel('Applications: ON')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚙️')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
