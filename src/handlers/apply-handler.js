const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, MessageFlags, PermissionFlagsBits
} = require('discord.js');
const { Rcon } = require('rcon-client');

// In-memory toggle state (resets on restart — ON by default)
let applicationsOpen = true;

/**
 * Send a command to the Minecraft server via RCON
 */
async function sendRconCommand(command) {
  const host = process.env.RCON_HOST;
  const port = parseInt(process.env.RCON_PORT || '25575');
  const password = process.env.RCON_PASSWORD;

  if (!host || !password) {
    console.error('RCON not configured (missing RCON_HOST or RCON_PASSWORD)');
    return null;
  }

  const rcon = new Rcon({ host, port, password });
  try {
    await rcon.connect();
    const response = await rcon.send(command);
    await rcon.end();
    return response;
  } catch (err) {
    console.error('RCON error:', err.message);
    try { await rcon.end(); } catch (_) {}
    return null;
  }
}

/**
 * Validate Minecraft username: 3-16 chars, letters/numbers/underscore only
 */
function isValidUsername(name) {
  return /^[a-zA-Z0-9_]{3,16}$/.test(name);
}

/**
 * Build the owner notification embed
 */
function buildNotifyEmbed(username, applicant) {
  return new EmbedBuilder()
    .setColor(0xf0b232)
    .setTitle('📥 New Application')
    .addFields(
      { name: 'Minecraft Username', value: `\`${username}\``, inline: true },
      { name: 'Discord User', value: `${applicant} (${applicant.tag})`, inline: true },
      { name: 'User ID', value: `\`${applicant.id}\``, inline: false }
    )
    .setThumbnail(applicant.displayAvatarURL())
    .setFooter({ text: 'PowerCoreSMP Application' })
    .setTimestamp();
}

async function handleInteraction(interaction) {

  // ==================== APPLY BUTTON ====================
  if (interaction.isButton() && interaction.customId === 'apply_btn') {
    if (!applicationsOpen) {
      return interaction.reply({
        content: '❌ Applications are currently **closed**. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('apply_modal')
      .setTitle('Apply to PowerCoreSMP');

    const usernameInput = new TextInputBuilder()
      .setCustomId('mc_username')
      .setLabel('Minecraft Username')
      .setPlaceholder('e.g. Steve_123')
      .setStyle(TextInputStyle.Short)
      .setMinLength(3)
      .setMaxLength(16)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));
    return interaction.showModal(modal);
  }

  // ==================== TOGGLE BUTTON (Admin only) ====================
  if (interaction.isButton() && interaction.customId === 'toggle_apply') {
    // Admin check
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Only admins can toggle applications.',
        flags: MessageFlags.Ephemeral
      });
    }

    applicationsOpen = !applicationsOpen;

    // Update the button label on the message
    const message = interaction.message;
    const oldRow = message.components[0];
    const newRow = ActionRowBuilder.from(oldRow);
    newRow.components[1] = new ButtonBuilder()
      .setCustomId('toggle_apply')
      .setLabel(`Applications: ${applicationsOpen ? 'ON' : 'OFF'}`)
      .setStyle(applicationsOpen ? ButtonStyle.Secondary : ButtonStyle.Danger)
      .setEmoji('⚙️');

    // Also update the apply button to be disabled when OFF
    newRow.components[0] = ButtonBuilder.from(oldRow.components[0])
      .setDisabled(!applicationsOpen);

    await interaction.update({ components: [newRow] });
  }

  // ==================== APPLY MODAL SUBMIT ====================
  if (interaction.isModalSubmit() && interaction.customId === 'apply_modal') {
    const username = interaction.fields.getTextInputValue('mc_username').trim();

    if (!isValidUsername(username)) {
      return interaction.reply({
        content: '❌ Invalid username. Only letters, numbers, and underscores (3-16 characters).',
        flags: MessageFlags.Ephemeral
      });
    }

    const applicant = interaction.user;

    // Acknowledge silently (no public message in the button channel)
    await interaction.reply({
      content: '✅ Your application has been submitted! Check your DMs.',
      flags: MessageFlags.Ephemeral
    });

    // DM the player
    const playerEmbed = new EmbedBuilder()
      .setColor(0x3fb950)
      .setTitle('📋 Application Submitted!')
      .setDescription('Your application to join **PowerCoreSMP** has been submitted. You will be contacted once reviewed.')
      .addFields(
        { name: 'Minecraft Username', value: `\`${username}\``, inline: true }
      )
      .setFooter({ text: 'PowerCoreSMP Application' })
      .setTimestamp();

    try {
      await applicant.send({ embeds: [playerEmbed] });
    } catch (err) {
      console.error('Failed to DM applicant:', err.message);
    }

    const notifyEmbed = buildNotifyEmbed(username, applicant);
    const ownerId = process.env.OWNER_ID;
    const channelId = process.env.APPLICATION_CHANNEL_ID;

    // Build channel URL for the "Go to Channel" button
    const guildId = interaction.guildId;
    const channelUrl = channelId
      ? `https://discord.com/channels/${guildId}/${channelId}`
      : `https://discord.com/channels/${guildId}`;

    // Send to application channel — ping owner + Confirm/Deny buttons
    if (channelId) {
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
          const channelButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`confirm_apply:${applicant.id}:${username}`)
              .setLabel('Confirm')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅'),
            new ButtonBuilder()
              .setCustomId(`deny_apply:${applicant.id}:${username}`)
              .setLabel('Deny')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
          );

          await channel.send({
            content: ownerId ? `<@${ownerId}>` : '',
            embeds: [notifyEmbed],
            components: [channelButtons]
          });
        }
      } catch (err) {
        console.error('Failed to send application to channel:', err.message);
      }
    }

    // DM the owner with just the redirect link button
    if (ownerId) {
      try {
        const owner = await interaction.client.users.fetch(ownerId);
        if (owner) {
          const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Go to Channel')
              .setStyle(ButtonStyle.Link)
              .setURL(channelUrl)
              .setEmoji('🔗')
          );
          await owner.send({ embeds: [notifyEmbed], components: [linkRow] });
        }
      } catch (err) {
        console.error('Failed to DM owner:', err.message);
      }
    }
  }

  // ==================== CONFIRM APPLICATION ====================
  if (interaction.isButton() && interaction.customId.startsWith('confirm_apply:')) {
    const parts = interaction.customId.split(':');
    const applicantId = parts[1];
    const username = parts[2];

    // Disable buttons on the owner's message
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirmed_done')
        .setLabel('Confirmed ✅')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('denied_done')
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });

    // Swap roles: remove Blacklisted, add Members
    const guildId = process.env.GUILD_ID;
    const membersRoleId = process.env.MEMBERS_ROLE_ID;
    const blacklistedRoleId = process.env.BLACKLISTED_ROLE_ID;

    if (guildId) {
      try {
        const guild = await interaction.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(applicantId);
        if (member) {
          if (blacklistedRoleId) await member.roles.remove(blacklistedRoleId);
          if (membersRoleId) await member.roles.add(membersRoleId);
        }
      } catch (err) {
        console.error('Failed to update roles on confirm:', err.message);
      }
    }

    // Whitelist the player via RCON
    const rconResult = await sendRconCommand(`whitelist add ${username}`);
    if (rconResult !== null) {
      console.log(`RCON whitelist add ${username}: ${rconResult}`);
    }

    // DM the applicant
    const serverIp = process.env.MC_SERVER_IP || 'Not configured';
    const acceptEmbed = new EmbedBuilder()
      .setColor(0x3fb950)
      .setTitle('🎉 Application Accepted!')
      .setDescription('You have been **whitelisted** on PowerCoreSMP!')
      .addFields(
        { name: 'Minecraft Username', value: `\`${username}\``, inline: true },
        { name: 'Server IP', value: `\`\`\`\n${serverIp}\n\`\`\``, inline: false }
      )
      .setFooter({ text: 'Welcome to PowerCoreSMP!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Open Guide')
        .setStyle(ButtonStyle.Link)
        .setURL('https://pcsmp.gcr4cked.dpdns.org/')
        .setEmoji('📖')
    );

    try {
      const applicant = await interaction.client.users.fetch(applicantId);
      if (applicant) {
        await applicant.send({ embeds: [acceptEmbed], components: [row] });
      }
    } catch (err) {
      console.error('Failed to DM applicant on confirm:', err.message);
    }
  }

  // ==================== DENY APPLICATION (show reason modal) ====================
  if (interaction.isButton() && interaction.customId.startsWith('deny_apply:')) {
    const modal = new ModalBuilder()
      .setCustomId(`deny_modal:${interaction.customId.replace('deny_apply:', '')}`)
      .setTitle('Deny Application');

    const reasonInput = new TextInputBuilder()
      .setCustomId('deny_reason')
      .setLabel('Reason for denial')
      .setPlaceholder('e.g. Invalid username, not meeting requirements...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    return interaction.showModal(modal);
  }

  // ==================== DENY MODAL SUBMIT ====================
  if (interaction.isModalSubmit() && interaction.customId.startsWith('deny_modal:')) {
    const parts = interaction.customId.replace('deny_modal:', '').split(':');
    const applicantId = parts[0];
    const username = parts[1];
    const reason = interaction.fields.getTextInputValue('deny_reason').trim();

    // Disable buttons on the owner's message
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirmed_done')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('denied_done')
        .setLabel('Denied ❌')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });

    // Remove from whitelist via RCON
    const rconResult = await sendRconCommand(`whitelist remove ${username}`);
    if (rconResult !== null) {
      console.log(`RCON whitelist remove ${username}: ${rconResult}`);
    }

    // DM the applicant
    const denyEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('❌ Application Denied')
      .setDescription('Unfortunately, your application to join **PowerCoreSMP** has been denied.')
      .addFields(
        { name: 'Minecraft Username', value: `\`${username}\``, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'You may reapply in the future.' })
      .setTimestamp();

    try {
      const applicant = await interaction.client.users.fetch(applicantId);
      if (applicant) {
        await applicant.send({ embeds: [denyEmbed] });
      }
    } catch (err) {
      console.error('Failed to DM applicant on deny:', err.message);
    }
  }
}

module.exports = { handleInteraction };
