/**
 * Illustrative headlines for the hero wall. Written for the demo - not real stories.
 * verdict: real | fake | unsure, score: credibility 0-100
 */

const HEADLINES = [
    ['Central bank holds rates steady as inflation cools to 2.4%', 'real', 94],
    ['SHOCKING: Doctors don’t want you to know this one trick', 'fake', 6],
    ['Researchers publish peer-reviewed study on coastal flooding', 'real', 91],
    ['Leaked memo PROVES the moon landing was staged!!!', 'fake', 3],
    ['Report suggests new trade deal could double tech jobs', 'unsure', 52],
    ['City council approves budget for three new libraries', 'real', 89],
    ['Miracle fruit melts belly fat overnight, “study they hid”', 'fake', 8],
    ['Health agency updates guidance on seasonal flu vaccines', 'real', 93],
    ['BREAKING: Government to ban cash by next Friday', 'fake', 11],
    ['Exports rise 3% in third quarter, statistics office says', 'real', 90],
    ['Anonymous sources claim merger talks have collapsed', 'unsure', 47],
    ['Celebrities secretly replaced by clones, expert claims', 'fake', 4],
    ['Space agency confirms launch window for lunar cargo mission', 'real', 92],
    ['5G towers linked to bird deaths — share before it’s deleted', 'fake', 7],
    ['Wildfire containment reaches 80%, officials said Tuesday', 'real', 88],
    ['Viral video appears to show flooding in the capital', 'unsure', 44],
    ['You won’t BELIEVE what scientists found inside this volcano', 'fake', 12],
    ['Court sides with consumers in data-privacy complaint', 'real', 87],
    ['Vaccines contain tracking microchips, viral post claims', 'fake', 5],
    ['University team reports progress on low-cost water filters', 'real', 90],
    ['Study of 40 people links coffee to a longer lifespan', 'unsure', 49],
    ['Free phones for everyone who shares this post today', 'fake', 2],
    ['Election commission publishes final turnout figures', 'real', 95],
    ['WATCH: Ancient pyramid discovered under the Atlantic', 'fake', 9],
    ['Scientists record warmest September in 150-year dataset', 'real', 91],
    ['Parliament passes bill expanding paid parental leave', 'real', 92],
    ['Secret island bought by billionaires to escape apocalypse', 'fake', 10],
    ['Transit authority extends late-night service on two lines', 'real', 86]
].map(([text, verdict, score], id) => ({ id, text, verdict, score }));

/** Deterministic rows so both hero layers render identical content. */
export function headlineRows(rowCount = 7, perRow = 6) {
    return Array.from({ length: rowCount }, (_, row) =>
        Array.from({ length: perRow }, (_, i) => HEADLINES[(row * 5 + i * 3) % HEADLINES.length]));
}

export default HEADLINES;
