import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import * as dotenv from "dotenv";
import config from "config";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { code } from "telegraf/format";
import { removeFile } from "./utils.js";
import { processTextToChat, initCommand, INITIAL_SESSION } from "./logic.js";
import { EnvVariables } from "./getEnvs.js"

dotenv.config();
const key = EnvVariables.getAll();
console.log("ENV TELEGRAM_TOKEN:", key.TELEGRAM_TOKEN);
const bot = new Telegraf(key.TELEGRAM_TOKEN);

bot.use(session())

bot.command("new", initCommand)

bot.command("start", initCommand)

bot.on(message("voice"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply(code("Зачекайте трошки, я in progress ..."))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    removeFile(oggPath)

    const text = await openai.transcription(mp3Path)

    removeFile(mp3Path)

    await ctx.reply(code(`Ви запитуєте: ${text}`))

    await processTextToChat(ctx, text)
  } catch (e) {
    console.log("Error while voice message", e.message)
  }
})

bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply(code("Зачекайте трошки, я in progress ..."))

    ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text })

    const response = await openai.chat(ctx.session.messages)

    ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content })

    await ctx.reply(response.content)
  } catch (e) {
    console.log("Error while text message", e.message)
  }
})

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
