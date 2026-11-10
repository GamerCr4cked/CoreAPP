const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { handleInteraction: handleApply } = require('./handlers/apply-handler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// Auto-assign Blacklisted role on member join
client.on('guildMemberAdd', async member => {
  const roleId = process.env.BLACKLISTED_ROLE_ID;
  if (!roleId) return;

  try {
    await member.roles.add(roleId);
    console.log(`Assigned Blacklisted role to ${member.user.tag}`);
  } catch (err) {
    console.error(`Failed to assign Blacklisted role to ${member.user.tag}:`, err.message);
  }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  // Route buttons and modals to apply handler
  if (interaction.isButton() || interaction.isModalSubmit()) {
    try {
      await handleApply(interaction);
    } catch (error) {
      console.error('Error handling interaction:', error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    try {
      const reply = { content: '❌ Something went wrong.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (e) {
      // Interaction already expired, nothing we can do
    }
  }
});

client.once('ready', () => {
  console.log(`⚡ CoreAPP is online as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
