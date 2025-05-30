#!/usr/bin/env node

// Test script for improved audio extraction with proper server rotation
const {
    extractFromProxyYtdl,
    extractFromPipeDaAPI,
    extractFromYtdlCore,
    extractFromInvidious,
    extractFromBeatbump,
    extractFromYoutubeRaw
} = require('../helper/extractYoutube');

const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - reliable for testing

async function testAudioExtraction() {
    console.log('🧪 Testing Improved Audio Extraction with Server Rotation');
    console.log('=========================================================');
    console.log(`🎵 Test video: ${testVideoId}`);
    console.log('');

    const extractors = [
        { name: 'Proxy YTDL', func: extractFromProxyYtdl },
        { name: 'Piped API', func: extractFromPipeDaAPI },
        { name: 'YTDL Core', func: extractFromYtdlCore },
        { name: 'Invidious', func: extractFromInvidious },
        { name: 'Beatbump', func: extractFromBeatbump },
        { name: 'YouTube Raw', func: extractFromYoutubeRaw }
    ];

    const results = {
        successful: [],
        failed: []
    };

    for (let i = 0; i < extractors.length; i++) {
        const extractor = extractors[i];
        console.log(`\n${i + 1}. Testing ${extractor.name}...`);

        try {
            const startTime = Date.now();
            const result = await extractor.func(testVideoId, 'audio');
            const endTime = Date.now();

            if (result && (result.url || result.downloadUrl)) {
                console.log(`✅ ${extractor.name} SUCCESS (${endTime - startTime}ms)`);
                console.log(`   URL: ${result.url || result.downloadUrl || 'Generated'}`);
                results.successful.push({
                    name: extractor.name,
                    time: endTime - startTime,
                    result: result
                });
            } else {
                console.log(`❌ ${extractor.name} FAILED - No valid URL returned`);
                results.failed.push({
                    name: extractor.name,
                    error: 'No valid URL returned'
                });
            }
        } catch (error) {
            console.log(`❌ ${extractor.name} FAILED - ${error.message}`);
            results.failed.push({
                name: extractor.name,
                error: error.message
            });
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS:');
    console.log('='.repeat(60));

    console.log(`\n✅ Successful extractions: ${results.successful.length}/${extractors.length}`);
    results.successful.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name} (${result.time}ms)`);
    });

    console.log(`\n❌ Failed extractions: ${results.failed.length}/${extractors.length}`);
    results.failed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name} - ${result.error}`);
    });

    if (results.successful.length > 0) {
        console.log('\n🎉 At least one extraction method is working!');
        console.log('🔄 The audio controller will now properly cycle through working methods.');
    } else {
        console.log('\n⚠️  All extraction methods failed. Please check network connectivity and API availability.');
    }
}

// Run the test
testAudioExtraction().catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
});
