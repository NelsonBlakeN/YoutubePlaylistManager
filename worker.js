const { google } = require('googleapis')
const { OAuth2Client } = require('google-auth-library')
const { Storage } = require('@google-cloud/storage')

const { clientCredentials } = require("./credentials")

// OAuth2 client instance
const oAuth2Client = new OAuth2Client(clientCredentials)

// Initialize storage
const storage = new Storage({
  keyFilename: './youtube-smart-playlists-dc8002e14d1a.json'
})
const bucketName = 'youtube-smart-playlists'
const bucket = storage.bucket(bucketName)

function generateAuthUrl() {
    const authUrl = oAuth2Client.generateAuthUrl({
        scope: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube'
        ],
        access_type: 'offline'
    })
    return authUrl;
}

async function getAccessTokenFromCode(code) {
    const { tokens } = await oAuth2Client.getToken(code)
    console.log(tokens)
    return tokens.access_token
}

async function getRecentSubscribedVideos(apiKey, accessToken) {
    try {
        const youtube = google.youtube({
            version: 'v3',
            auth: apiKey
        })

        // Retrieve the list of subscribed channels
        const subscriptions = await youtube.subscriptions.list({
            part: 'snippet',
            mine: true,
            maxResults: 50,
            access_token: accessToken
        });

        const channelIds = subscriptions.data.items.map(item => item.snippet.resourceId.channelId);

        // Retrieve the most recent videos from each channel
        const videos = []
        for (const channelId of channelIds) {
            const searchResponse = await youtube.search.list({
                part: 'snippet',
                channelId: channelId,
                maxResults: 10,
                order: 'date'
            });

            videos.push(...searchResponse.data.items)
        }

        return videos
    } catch (error) {
        console.error('Error retrieving recent subscribed videos:', error)
        return null
    }
}

const apiKey = require("./credentials")


// Put below logic into a function that generates the URL, asks for the code,
// then pushes it to the cloud storage
// This function should also do the logic of checking the storage location
// If the storage location is empty, generate the URL, get the code, save to cloud storage, then return token
// If location is not empty, create OAuth client using the credentials and check validity
// If the credentials are expired, use the refresh token to get new tokens and save to cloud storage, then return
// Otherwise, just return the token
// Instead of returning the token,
const authUrl = generateAuthUrl();
console.log('Please visit the following URL to authorize the application:');
console.log(authUrl)

const readline = require('readline')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question('Enter the authorization code from the URL: ', async (code) => {
    rl.close();

    let contents = await bucket.file('token-data').download()
    console.log(JSON.parse(contents))

    try {
      contents = {
        'message': 'Test file2'
      }
      await bucket.file('token-data').save(JSON.stringify(contents))
    } catch(e) {
      console.log(e)
    }

    const accessToken = await getAccessTokenFromCode(code);
    if (accessToken) {
        getRecentSubscribedVideos(apiKey, accessToken)
            .then(videos => {
                if (videos) {
                    console.log('Recent subscribed videos:');
                    videos.forEach(video => {
                        console.log(video.snippet.title)
                    })
                }
            })
    }
})

// Have a storage location for access token and refresh token

// If they are empty, have the user get and provide the access code manually
//// access token and refresh token are then fetched and stored in storage location

// If they are not empty, create the OAuth client using the credentials and check if they are expired
// If they are expired, use the refresh token to get a new access token and save to location

// From there, use the api key and access token to fetch and modify data

// This way, on the first execution the user will have to provide the information. After that,
// the function should be able to pull the tokens from storage and either use them or refresh and
// use them
//// This assumes that the refresh token will never expire
