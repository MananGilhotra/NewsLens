/**
 * Creates (or resets) a demo account for local development.
 *
 *   npm run seed:demo
 *
 * Credentials come from DEMO_EMAIL / DEMO_PASSWORD, defaulting to the values below.
 * Refuses to run with NODE_ENV=production.
 */

const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@newslens.test';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'lens-demo-2026';

async function main() {
    if (config.isProduction) {
        console.error('Refusing to create a demo account in production.');
        process.exit(1);
    }
    await mongoose.connect(config.mongoUri || 'mongodb://localhost:27017/newslens', { serverSelectionTimeoutMS: 5000 });
    let user = await User.findOne({ email: DEMO_EMAIL }).select('+password');
    if (user) {
        user.password = DEMO_PASSWORD;
        await user.save();
        console.log(`Reset password for ${DEMO_EMAIL}`);
    } else {
        user = await User.create({ name: 'Demo Reader', email: DEMO_EMAIL, password: DEMO_PASSWORD });
        console.log(`Created ${DEMO_EMAIL}`);
    }
    await mongoose.disconnect();
}

main().catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
});
