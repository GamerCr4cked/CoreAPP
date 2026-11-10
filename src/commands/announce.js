const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post an announcement')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Announcement title')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement message')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('ping')
        .setDescription('Role to ping with the announcement')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const title = interaction.options.getString('title');
    const rawMessage = interaction.options.getString('message');

    // Format placeholders:
    // {n}  = new line
    // {b}  = blank line
    // {hr} = separator line ─────────
    const message = rawMessage
      .replace(/\{n\}/gi, '\n')
      .replace(/\{b\}/gi, '\n\n')
      .replace(/\{hr\}/gi, '\n─────────────────────────\n');
    const pingRole = interaction.options.getRole('ping');

    let pingText = '';
    if (pingRole) {
      pingText = `<@&${pingRole.id}>`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf97316)
      .setTitle(`📢  ${title}`)
      .setDescription(message)
      .setFooter({ text: `Posted by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.channel.send({
      content: pingText || undefined,
      embeds: [embed]
    });

    await interaction.editReply({ content: '✅ Announcement posted!' });
  }
};
