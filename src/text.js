import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import jwt from "jsonwebtoken";
import axios from "axios";

class TextConverter {
  async getToken() {
    const token = jwt.sign(
      {
        iss:"tgbot-185@smart-shoreline-321315.iam.gserviceaccount.com",
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://www.googleapis.com/oauth2/v4/token",
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        iat: Math.floor(Date.now() / 1000),
      },
      JSON.parse(process.env.PRIVATE_KEY).KEY,
      { algorithm: "RS256" }
    )

    console.log('21')
    const response = await axios.post(
      "https://www.googleapis.com/oauth2/v4/token",
      {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: token,
      }
    )

    console.log('30', response)
    return response.data.access_token
  }

  async textToSpeech(text) {
    try {
      const url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize"

      const data = {
        input: { text },
        voice: {
          languageCode: "uk-UA",
          name: "uk-UA-Wavenet-A"
        },
        audioConfig: { audioEncoding: "MP3" }
      }

      console.log('text 2 speech method')

      const accessToken = await this.getToken()

      const response = await axios({
        url,
        method: "POST",
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      return Buffer.from(response.data.audioContent, "base64")
    } catch (e) {
      console.log("Error while text 2 speech", e.message)
    }
  }
}

export const textConverter = new TextConverter();
