#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Chrome Web Store API Setup Guide');
console.log('=====================================\n');

console.log('📋 Step 1: Create Google Cloud Project');
console.log('1. Go to https://console.cloud.google.com/');
console.log('2. Create a new project or select existing one');
console.log('3. Note down your Project ID\n');

console.log('📋 Step 2: Enable Chrome Web Store API');
console.log('1. In Google Cloud Console, go to "APIs & Services" > "Library"');
console.log('2. Search for "Chrome Web Store API"');
console.log('3. Click on it and press "Enable"\n');

console.log('📋 Step 3: Create OAuth 2.0 Credentials');
console.log('1. Go to "APIs & Services" > "Credentials"');
console.log('2. Click "Create Credentials" > "OAuth 2.0 Client IDs"');
console.log('3. Application type: Web application');
console.log('4. Add these authorized redirect URIs:');
console.log('   - http://localhost:8080');
console.log('   - https://oauth2.googleapis.com/token');
console.log('5. Note down your Client ID and Client Secret\n');

console.log('📋 Step 4: Get Extension ID');
console.log('1. Go to https://chrome.google.com/webstore/devconsole/');
console.log('2. Create a new item or select existing one');
console.log('3. Note down your Extension ID\n');

console.log('📋 Step 5: Generate Refresh Token');
console.log('1. Install the required package:');
console.log('   npm install googleapis');
console.log('2. Use this script to generate refresh token:');
console.log('   node scripts/generate-refresh-token.js');
console.log('3. Follow the authentication flow');
console.log('4. Note down your Refresh Token\n');

console.log('📋 Step 6: Set GitHub Secrets');
console.log('1. Go to your GitHub repository');
console.log('2. Settings > Secrets and variables > Actions');
console.log('3. Add these secrets:');
console.log('   - EXTENSION_ID: Your extension ID');
console.log('   - CLIENT_ID: Your OAuth client ID');
console.log('   - CLIENT_SECRET: Your OAuth client secret');
console.log('   - REFRESH_TOKEN: Your refresh token\n');

console.log('🎉 Setup Complete!');
console.log('You can now use the automated publishing pipeline.');
console.log('See PUBLISHING.md for detailed instructions.\n');

// Create a template for the refresh token generator
const refreshTokenScript = `#!/usr/bin/env node

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
console.log('\\nAfter authorization, you will be redirected to localhost:8080');
console.log('Copy the 'code' parameter from the URL and paste it below:\\n');

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\\n✅ Refresh Token:', tokens.refresh_token);
    console.log('\\n📝 Add this to your GitHub secrets as REFRESH_TOKEN');
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
  }
  rl.close();
});
`;

const scriptPath = path.join(__dirname, 'generate-refresh-token.js');
if (!fs.existsSync(scriptPath)) {
  fs.writeFileSync(scriptPath, refreshTokenScript);
  console.log('📝 Created scripts/generate-refresh-token.js template');
  console.log(
    'Edit this file with your CLIENT_ID and CLIENT_SECRET before using'
  );
}
