const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.status(400).json({ error: "Number එක නෑ!" });
    phone = phone.replace(/[^0-9]/g, '');

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${phone}`);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.baileys("Desktop")
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const mek = messages[0];
                if (!mek.message || mek.key.fromMe) return;
                const from = mek.key.remoteJid;
                const body = mek.message.conversation || mek.message.extendedTextMessage?.text || '';
                const cmd = body.startsWith('.') ? body.slice(1).split(' ')[0].toLowerCase() : '';
                const q = body.split(' ').slice(1).join(' ');

                if (cmd === 'alive' || cmd === 'menu') {
                    await sock.sendMessage(from, { text: '*⚡ ACJIACHIOFFICIAL Bot is Alive! ⚡*\n\n*.hack* - Hack animation\n*.kickall* - Kick all members\n*.spdl* - Spotify download' }, { quoted: mek });
                }

                if (cmd === 'hack') {
                    const target = q || 'Unknown';
                    await sock.sendMessage(from, { text: `*💻 Hacking ${target}...*` }, { quoted: mek });
                    await delay(2000);
                    await sock.sendMessage(from, { text: `*💥 ${target} Hacked Successfully! 😈*` });
                }

            } catch (e) { console.error(e); }
        });

        if (!sock.authState.creds.registered) {
            await delay(3000);
            const code = await sock.requestPairingCode(phone);
            return res.json({ code: code?.match(/.{1,4}/g)?.join('-') || code });
        } else {
            return res.json({ message: "Already Connected!" });
        }

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('<h1>ACJIACHIOFFICIAL Bot is Running! 🤖</h1><p>Use /pair?phone=94XXXXXXXXX to get pairing code</p>');
});

app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));
