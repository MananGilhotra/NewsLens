/**
 * Verifies the JS model (services/mlModel.js) reproduces scikit-learn exactly:
 * same tokens and the same fake-probability for every sample exported by ml/train_fake_news.py.
 *
 *   npm run test:model
 */

const path = require('path');
const fs = require('fs');
const { predict, tokenize } = require('../services/mlModel');

const samples = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ml', 'parity-samples.json'), 'utf8'));
let failures = 0;
let maxDiff = 0;

for (const [i, sample] of samples.entries()) {
    const tokens = tokenize(sample.text);
    const result = predict(sample.text);
    const diff = Math.abs(result.probFake - sample.probFake);
    maxDiff = Math.max(maxDiff, diff);
    const tokensMatch = tokens.length === sample.tokens.length && tokens.every((t, j) => t === sample.tokens[j]);
    if (!tokensMatch || diff > 1e-9) {
        failures++;
        const firstMismatch = tokens.findIndex((t, j) => t !== sample.tokens[j]);
        console.error(`✗ sample ${i}: diff=${diff.toExponential(2)} tokens ${tokensMatch ? 'ok' : `differ at ${firstMismatch}: js=${tokens[firstMismatch]} py=${sample.tokens[firstMismatch]}`}`);
        console.error(`  ${JSON.stringify(sample.text.slice(0, 120))}`);
    }
}

console.log(`${samples.length - failures}/${samples.length} samples match scikit-learn (max |Δp| = ${maxDiff.toExponential(2)})`);
process.exit(failures ? 1 : 0);
