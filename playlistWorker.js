const { google } = require('googleapis')
const { OAuth2Client } = require('google-auth-library')
const { Storage } = require('@google-cloud/storage')

const { clientCredentials, bucketName } = require("./credentials")

// Initialize storage
const storage = new Storage({
  keyFilename: './youtube-smart-playlists-7a9286547c77.json'
})
const bucket = storage.bucket(bucketName)

async function getRecentSubscribedVideos(oauthClient) {
  try {
      // Create the Youtube API client (without auth), and use OAuth client as auth
      // to fetch  subscriptions list
      const youtube = google.youtube({
          version: 'v3'
      })

      // Retrieve the list of subscribed channels
      const subscriptions = await youtube.subscriptions.list({
          part: 'snippet',
          mine: true,
          maxResults: 50,
          auth: oauthClient
      });
      console.log(subscriptions)

      return

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

async function main() {
  // OAuth2 client instance
  const oAuth2Client = new OAuth2Client(clientCredentials)

  // Fetch token data from storage and create OAuth account
  let contents = JSON.parse(await bucket.file('token-data').download())

  oAuth2Client.setCredentials({
    refresh_token: contents.refresh_token
  })

  await getRecentSubscribedVideos(oAuth2Client)

  // Create static list of which subscriptions should go into which playlist

  // For each video found, determine the playlist they go to and push it there
  //     if (accessToken) {
  //         getRecentSubscribedVideos(apiKey, accessToken)
  //             .then(videos => {
  //               console.log("Videos:", videos)
  //                 if (videos) {
  //                     console.log('Recent subscribed videos:');
  //                     videos.forEach(video => {
  //                         console.log(video.snippet.title)
  //                     })
  //                 }
  //             })
  //     }
}

main().then(() => {
  console.log("Completed.")
})
.catch(e => {
  console.log("Completed with errors:", e)
})