#!/usr/bin/env node

const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:8080'
);

const scopes = [
  'https://www.googleapis.com/auth/chromewebstore.readonly',
  'https://www.googleapis.com/auth/chromewebstore'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('🔗 Authorize this app by visiting this url:', authUrl);
console.log('\nAfter authorization, you will be redirected to localhost:8080');
console.log('Copy the \'code\' parameter from the URL and paste it below:\n');

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Refresh Token:', tokens.refresh_token);
    console.log('\n📝 Add this to your GitHub secrets as REFRESH_TOKEN');
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
  }
  rl.close();
});
