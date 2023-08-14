const { google } = require('googleapis')
const { OAuth2Client } = require('google-auth-library')

/**
 * P0 requirements:
 * After reviewing the code below, maybe we don't need the web app part and can just use this CLI utility
 * to save the token to a cloud storage location
 * Therefore, step 1 can be skipped and moved to a P1 scenario (or P2, whichever priority I make for pyublic availability),
 * and jump to 2 having this utility save the token to cloud storage, and then create the app for fetching the token and
 * organizing the videos from the subscriptions.
 * The organization may take some planning as well to determine how to do the search and determination
 */

// Client credentials obtained from the Google Cloud Console
const clientCredentials = {
    clientId: '971882161290-54tr39ch89jf8vcd93ab0lr0c3tntn33.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUri: 'https://www.example.com'
}

// OAuth2 client instance
const oAuth2Client = new OAuth2Client(clientCredentials)

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

// Usage example
const apiKey = require("./credentials")

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
