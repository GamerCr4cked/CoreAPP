const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('Get the PowerCoreSMP player guide'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x58a6ff)
      .setTitle('⚡ PowerCoreSMP Player Guide')
      .setDescription(
        'Everything you need to know about Power Cores, abilities, crafting, rituals, and survival.\n\n' +
        '**[Open the Full Guide](https://gamercr4cked.github.io/PowerCoreSMP/)**'
      )
      .addFields(
        { name: '🚀 Quick Start', value: '`/core-equip` → Select hotbar slot → `SHIFT + RIGHT CLICK`', inline: false },
        { name: '🛡️ 10 Standard Cores', value: 'Fire, Ice, Void, Nature, Storm, Lunar, Blood, Crystal, Ocean, Undead', inline: true },
        { name: '🌌 3 Dimensional Cores', value: 'Dragon, Soul, Ancient', inline: true }
      )
      .setFooter({ text: 'PowerCoreSMP — Choose your core. Master your abilities. Survive.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Open Guide')
        .setStyle(ButtonStyle.Link)
        .setURL('https://gamercr4cked.github.io/pcsmp-guide/')
        .setEmoji('📖')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
