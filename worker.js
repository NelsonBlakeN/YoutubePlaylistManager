const { google } = require('googleapis')
const { OAuth2Client } = require('google-auth-library')
const { Storage } = require('@google-cloud/storage')
const readline = require('readline')

const { clientCredentials, bucketName } = require("./credentials")

// OAuth2 client instance
const oAuth2Client = new OAuth2Client(clientCredentials)

// Initialize storage
const storage = new Storage({
  keyFilename: './youtube-smart-playlists-7a9286547c77.json'
})
const bucket = storage.bucket(bucketName)

function generateAuthUrl() {
    const authUrl = oAuth2Client.generateAuthUrl({
        scope: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube'
        ],
        access_type: 'offline',
        // prompt: 'consent', // Only required if needing to force OAuth to regenerate a refresh token
    })

    return authUrl;
}

async function getAccessTokenFromCode(code) {
    const { tokens } = await oAuth2Client.getToken(code)
    console.log(tokens)

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    }
}

async function getToken() {
  // Get data from storage
  let tokens;
  try {
    // TODO: Test what happens if the file is not there, does this throw an error? Return null? Something else?
    tokens = JSON.parse(await bucket.file('token-data').download())
    console.log(tokens)
  } catch(e) {
    console.log(e)
  }

  tokens = undefined // temp

  if (tokens) { // Or whatever condition is needed for if file/contents are empty
    // Flow to generate and return OAuth client using the refresh token goes here
  }
  else {
    // If the storage location is empty, generate the URL, get the code, save to cloud storage, then return token
    //// TODO: Test what happens if file data is empty (file exists but has not data)
    const authUrl = generateAuthUrl()
    console.log('Please visit the following URL to authorize the application:');
    console.log(authUrl)

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    // TODO: How do I return something from here and guarantee that it's ready when I need it?
    const fetchTokenUsingAuthUrl = () => {
      return new Promise((resolve, reject) => {
        rl.question('Enter the authorization code from the URL: ', async (code) => {
          rl.close()

          const { accessToken, refreshToken } = await getAccessTokenFromCode(code)

          // Save code
          try {
            await bucket.file('token-data').save(JSON.stringify({
              'access_token': accessToken,
              'refresh_token': refreshToken
            }))
          } catch(e) {
            console.log("Data save failed with error:", e)
          }

          resolve(accessToken)
        })
      })
    }

    // Confirm that this returns the value correctly, then update the callback to create the
    // OAuth client instead
    const result = await fetchTokenUsingAuthUrl()
    console.log("Question result:")
    console.log(result)
    return result
  }
}

async function main() {
  await getToken()
}

main().then(() => {
  console.log("Completed")
})
.catch(e => {
  console.log(e)
  console.log("Completed with errors")
})
