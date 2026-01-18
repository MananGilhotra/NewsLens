
require('dotenv').config();
const mongoose = require('mongoose');

const checkConnection = async () => {
    // 1. Get URI
    let uri = process.env.MONGODB_URI;

    console.log('\n🔍 MongoDB Diagnostic Tool');
    console.log('---------------------------');

    if (!uri) {
        console.error('❌ MONGODB_URI is missing from .env file');
        process.exit(1);
    }

    // 2. Sanitize
    const originalURI = uri;
    uri = uri.trim().replace(/^["']|["']$/g, '');

    if (uri !== originalURI) {
        console.log('⚠️  URI contained whitespace or quotes (Code will fix this automatically now)');
    }

    // 3. Mask Password
    const maskedURI = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`📡 Connecting to: ${maskedURI}`);

    // 4. Attempt Connection
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ SUCCESS: Connection established!');
        console.log('---------------------------');
        console.log('If this works locally but fails on Render, the issue is definitely the IP WHITELIST.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ CONNECTION FAILED');
        console.error(`Error Type: ${error.name}`);
        console.error(`Message: ${error.message}`);

        if (error.message.includes('bad auth')) {
            console.error('\n💡 DIAGNOSIS: Incorrect Username or Password.');
        } else if (error.message.includes('sockets closed') || error.message.includes('buffering timed out') || error.message.includes('selection timed out')) {
            console.error('\n💡 DIAGNOSIS: Network Block / IP Whitelist Issue.');
        }
        process.exit(1);
    }
};

checkConnection();
