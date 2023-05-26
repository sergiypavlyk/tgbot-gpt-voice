import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import config from "config";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { code } from "telegraf/format";

console.log(config.get("TEST_ENV"))

const INITIAL_SESSION = {
  messages: [],
}

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

bot.use(session())

bot.command("new", async (ctx) => {
  ctx.session = INITIAL_SESSION
  await ctx.reply("Чекаю на голосове або текстове повідомлення...")
})

bot.command("start", async (ctx) => {
  ctx.session = INITIAL_SESSION
  await ctx.reply("Чекаю на голосове або текстове повідомлення...")
})

bot.on(message("voice"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply(code("Зачекайте сєку пліз, я в процесі:)"))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const text = await openai.transcription(mp3Path)
    await ctx.reply(code(`Ви запитуєте: ${text}`))

    ctx.session.messages.push({ role: openai.roles.USER, content: text })

    const response = await openai.chat(ctx.session.messages)

    ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content })

    await ctx.reply(response.content)
  } catch (e) {
    console.log("Error while voice message", e.message)
  }
})

bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply(code("Зачекайте сєку пліз, я в процесі:)"))

    ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text })

    const response = await openai.chat(ctx.session.messages)

    ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content })

    await ctx.reply(response.content)
  } catch (e) {
    console.log("Error while voice message", e.message)
  }
})

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
