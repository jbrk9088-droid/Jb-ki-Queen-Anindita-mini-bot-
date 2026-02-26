/**
 * JB Ki Queen Anindita Mini Bot
 * License: MIT (GitHub)
 * Author: JBPAPA71
 */

const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@adiwajshing/baileys");
const { state, saveState } = useSingleFileAuthState('./session.json');
const fs = require('fs');
const P = require('pino');
const express = require('express');
const { BOT_NAME, OWNER_NUMBER, WELCOME_MESSAGE, BOT_IMAGE, MENU_IMAGE, HTML_PAGE, PREFIX, PAIR_CODE } = require('./config');
const qrcode = require('qrcode-terminal');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(HTML_PAGE);
});

// Simple pair system check
let paired = false;

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        version
    });

    sock.ev.on('connection.update', update => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log("Scan QR to pair your bot!");
        }
        if (connection === 'close') {
            let reason = (lastDisconnect.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`${BOT_NAME} connected successfully!`);
        }
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async m => {
        if (!m.messages) return;
        const msg = m.messages[0];
        if (!msg.message) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // Pair system
        if (!paired) {
            if (text.toLowerCase() === PAIR_CODE) {
                paired = true;
                await sock.sendMessage(msg.key.remoteJid, { text: `✅ Bot paired successfully! Welcome!` });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Please send the correct pair code to use the bot.` });
                return;
            }
        }

        // Bot commands after pair
        if (text.startsWith(PREFIX + 'menu')) {
            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: MENU_IMAGE },
                caption: `*${BOT_NAME} Menu*\n\nCommands:\n/song - play song\n/alltag - tag everyone\n/menu - this menu`
            });
        }

        if (text.startsWith(PREFIX + 'song')) {
            await sock.sendMessage(msg.key.remoteJid, { text: "🎵 Playing your song..." });
        }

        if (text.startsWith(PREFIX + 'alltag')) {
            const groupMeta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = groupMeta.participants.map(p => p.id);
            await sock.sendMessage(msg.key.remoteJid, { text: `Hello everyone!`, mentions });
        }
    });

    // Welcome & Anti-link
    sock.ev.on('group-participants.update', async update => {
        const groupId = update.id;
        for (const p of update.participants) {
            if (update.action === 'add') {
                await sock.sendMessage(groupId, { text: WELCOME_MESSAGE.replace('@user', p.split('@')[0]) });
            }
            if (update.action === 'remove') {
                await sock.sendMessage(groupId, { text: `Goodbye @${p.split('@')[0]}` });
            }
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        const text = msg.message?.conversation || '';
        if (msg.key.remoteJid.endsWith('@g.us')) {
            if (text.includes('https://') || text.includes('http://')) {
                await sock.sendMessage(msg.key.remoteJid, { text: `Link detected! Removing user.` });
                await sock.groupParticipantsUpdate(msg.key.remoteJid, [msg.key.participant], 'remove');
            }
        }
    });
}

startBot();

app.listen(port, () => {
    console.log(`Bot Webpage running at http://localhost:${port}`);
});
