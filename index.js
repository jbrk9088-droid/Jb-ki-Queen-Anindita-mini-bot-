import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import pino from "pino"

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState("auth")

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" })
  })

  sock.ev.on("creds.update", saveCreds)

  if (!sock.authState.creds.registered) {

    const phoneNumber = "91XXXXXXXXXX" // এখানে তোমার নাম্বার দাও (country code সহ)

    const code = await sock.requestPairingCode(phoneNumber)

    console.log("=================================")
    console.log("Your WhatsApp Pair Code:")
    console.log(code)
    console.log("=================================")
  }

  sock.ev.on("connection.update", (update) => {
    const { connection } = update

    if (connection === "open") {
      console.log("Bot Connected Successfully ✅")
    }
  })
}

startBot()
