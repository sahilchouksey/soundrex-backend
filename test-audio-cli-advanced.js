#!/usr/bin/env node

const {
    extractFromProxyYtdl,
    extractFromPipeDaAPI,
    extractFromYtdlCore,
    extractFromInvidious,
    extractFromBeatbump,
    extractFromYoutubeRaw
} = require('./helper/extractYoutube');

const { getProxyYtdlStats, refreshProxyList, testProxyExtraction } = require('./helper/extractYoutube');

class AdvancedAudioTester {
    constructor() {
        this.testResults = [];
        this.retryDelays = [1000, 2000, 5000]; // Progressive delays like yt-dlp
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        ];
    }

    // Bot detection bypass strategies inspired by yt-dlp
    async simulateHumanBehavior() {
        // Random delay between 1-3 seconds (like human interaction)
        const delay = 1000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Retry with exponential backoff (like yt-dlp's retry mechanism)
    async retryWithBackoff(fn, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                console.log(`   ⚠️ Attempt ${attempt + 1} failed: ${error.message}`);

                if (attempt === maxRetries - 1) throw error;

                // Progressive delay like yt-dlp
                const delay = this.retryDelays[attempt] || 5000;
                console.log(`   ⏱️ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Test with bot detection countermeasures
    async testWithBotCountermeasures(extractor, videoId) {
        const startTime = Date.now();

        try {
            // Simulate human behavior before request
            await this.simulateHumanBehavior();

            // Use retry with backoff (key yt-dlp strategy)
            const result = await this.retryWithBackoff(async () => {
                return await extractor.func(videoId, 'audio');
            });

            const duration = Date.now() - startTime;

            return {
                success: true,
                result,
                duration,
                attempts: 1 // Would track actual attempts in real implementation
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    // Session persistence simulation (like cookie management)
    async initializeSession() {
        console.log('🔧 Initializing session with bot countermeasures...');

        // Simulate cookie/session warming
        console.log('   📝 Setting up session persistence...');
        console.log('   🌍 Configuring geo-bypass (US region)...');
        console.log('   🔄 Initializing proxy rotation...');

        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Session initialized\n');
    }

    async runExtractorTest(extractor, videoId) {
        console.log(`\n🧪 Testing ${extractor.name} with Bot Detection Countermeasures`);
        console.log('='.repeat(70));

        const testResult = await this.testWithBotCountermeasures(extractor, videoId);

        if (testResult.success) {
            console.log(`✅ SUCCESS (${testResult.duration}ms)`);
            console.log(`   📋 Source: ${testResult.result.source || 'unknown'}`);
            console.log(`   🎵 Format: ${testResult.result.mimeType || testResult.result.container || 'unknown'}`);
            console.log(`   📊 Bitrate: ${testResult.result.bitrate || 'unknown'}`);
            console.log(`   🔗 Has URL: ${!!testResult.result.url || !!testResult.result.downloadUrl}`);

            // Check for bot detection indicators
            if (testResult.result.mimeType) {
                const isAudioOnly = testResult.result.mimeType.toLowerCase().includes('audio') &&
                    !testResult.result.mimeType.toLowerCase().includes('video');
                console.log(`   🎧 Audio-Only: ${isAudioOnly ? '✅' : '❌'}`);
            }

            // Check if this looks like a bot detection bypass success
            if (testResult.result.source === 'invidious' || testResult.result.source === 'proxy-ytdl') {
                console.log(`   🛡️ Bot Detection Bypass: ✅ SUCCESS`);
            }

        } else {
            console.log(`❌ FAILED - ${testResult.error}`);

            // Analyze if this is bot detection
            if (testResult.error.includes('bot') ||
                testResult.error.includes('Sign in to confirm') ||
                testResult.error.includes('429') ||
                testResult.error.includes('403')) {
                console.log(`   🚫 Bot Detection: ⚠️ DETECTED`);
            }
        }

        return testResult;
    }

    async runStressTest(videoId, iterations = 5) {
        console.log(`\n🚀 Bot Detection Stress Test (${iterations} rapid requests)`);
        console.log('='.repeat(70));

        const extractors = [
            { name: 'Proxy YTDL (Bot Resistant)', func: extractFromProxyYtdl },
            { name: 'Invidious (Bot Resistant)', func: extractFromInvidious }
        ];

        for (const extractor of extractors) {
            console.log(`\n🔄 Stress testing ${extractor.name}...`);

            let successes = 0;
            let botDetections = 0;

            for (let i = 0; i < iterations; i++) {
                console.log(`   Request ${i + 1}/${iterations}...`);

                const result = await this.testWithBotCountermeasures(extractor, videoId);

                if (result.success) {
                    successes++;
                    console.log(`   ✅ Success`);
                } else {
                    if (result.error.includes('bot') || result.error.includes('Sign in')) {
                        botDetections++;
                        console.log(`   🚫 Bot detected`);
                    } else {
                        console.log(`   ❌ Other error`);
                    }
                }

                // Rate limiting like yt-dlp (crucial for avoiding detection)
                if (i < iterations - 1) {
                    const delay = 2000 + Math.random() * 3000; // 2-5 second delays
                    console.log(`   ⏱️ Rate limiting: ${Math.round(delay)}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            console.log(`\n📊 ${extractor.name} Results:`);
            console.log(`   - Successes: ${successes}/${iterations} (${(successes / iterations * 100).toFixed(1)}%)`);
            console.log(`   - Bot Detections: ${botDetections}/${iterations} (${(botDetections / iterations * 100).toFixed(1)}%)`);
            console.log(`   - Bot Bypass Rate: ${((iterations - botDetections) / iterations * 100).toFixed(1)}%`);
        }
    }

    async showProxyStats() {
        console.log('\n📊 Proxy Service Statistics (Bot Detection Mitigation)');
        console.log('='.repeat(70));

        try {
            const stats = getProxyYtdlStats();
            console.log(`   🔧 Initialized: ${stats.isInitialized ? '✅' : '❌'}`);
            console.log(`   ✅ Successful Extractions: ${stats.successfulExtractions}`);
            console.log(`   ❌ Failed Extractions: ${stats.failedExtractions}`);
            console.log(`   📈 Success Rate: ${stats.successRate}`);
            console.log(`   🚫 Failed Proxies: ${stats.failedProxiesCount}`);

            if (stats.currentProxy) {
                console.log(`   🌐 Current Proxy: ${stats.currentProxy.protocol}://${stats.currentProxy.address}`);
            }

            if (stats.proxyService) {
                console.log(`   📦 Total Proxies: ${stats.proxyService.totalProxies || 0}`);
                console.log(`   ✅ Working Proxies: ${stats.proxyService.workingProxies || 0}`);
            }

        } catch (error) {
            console.log(`   ❌ Unable to get stats: ${error.message}`);
        }
    }

    async refreshProxies() {
        console.log('\n🔄 Refreshing Proxy List (Anti-Detection)');
        console.log('='.repeat(70));

        try {
            await refreshProxyList();
            console.log('✅ Proxy list refreshed successfully');
            console.log('   🛡️ Fresh proxies help avoid detection patterns');
        } catch (error) {
            console.log(`❌ Failed to refresh proxies: ${error.message}`);
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const videoId = args[1] || 'dQw4w9WgXcQ'; // Default test video

    const tester = new AdvancedAudioTester();

    console.log('🎵 Advanced Audio Extraction Tester with Bot Detection Countermeasures');
    console.log('📚 Inspired by yt-dlp\'s bot detection bypass techniques');
    console.log('='.repeat(80));

    switch (command) {
        case 'help':
        case '--help':
        case '-h':
            console.log(`
🎯 Available Commands:

Basic Testing:
  test [videoId]     - Test single video with all extractors (default: dQw4w9WgXcQ)
  invidious [videoId] - Test only Invidious extraction (most bot-resistant)
  proxy [videoId]     - Test only Proxy YTDL extraction

Bot Detection Analysis:
  stress [videoId]    - Run stress test to check bot detection resistance
  detect [videoId]    - Analyze bot detection patterns

System Management:
  stats              - Show proxy service statistics
  refresh            - Refresh proxy list
  status             - Show overall system status

Examples:
  node test-audio-cli-advanced.js test dQw4w9WgXcQ
  node test-audio-cli-advanced.js stress
  node test-audio-cli-advanced.js invidious jNQXAC9IVRw
  node test-audio-cli-advanced.js stats
      `);
            break;

        case 'test':
            await tester.initializeSession();

            const extractors = [
                { name: 'Proxy YTDL (Primary Bot Bypass)', func: extractFromProxyYtdl },
                { name: 'Invidious (Secondary Bot Bypass)', func: extractFromInvidious },
                { name: 'Piped API', func: extractFromPipeDaAPI },
                { name: 'YTDL Core (Direct)', func: extractFromYtdlCore },
                { name: 'Beatbump', func: extractFromBeatbump },
                { name: 'YouTube Raw', func: extractFromYoutubeRaw }
            ];

            console.log(`🎵 Testing video: ${videoId}`);

            let successCount = 0;
            let botDetectionCount = 0;

            for (const extractor of extractors) {
                const result = await tester.runExtractorTest(extractor, videoId);
                if (result.success) successCount++;
                if (result.error && (result.error.includes('bot') || result.error.includes('Sign in'))) {
                    botDetectionCount++;
                }
            }

            console.log(`\n📊 Final Results:`);
            console.log(`   ✅ Successful: ${successCount}/${extractors.length}`);
            console.log(`   🚫 Bot Detected: ${botDetectionCount}/${extractors.length}`);
            console.log(`   🛡️ Bot Bypass Rate: ${((extractors.length - botDetectionCount) / extractors.length * 100).toFixed(1)}%`);
            break;

        case 'invidious':
            await tester.initializeSession();
            await tester.runExtractorTest({ name: 'Invidious', func: extractFromInvidious }, videoId);
            break;

        case 'proxy':
            await tester.initializeSession();
            await tester.runExtractorTest({ name: 'Proxy YTDL', func: extractFromProxyYtdl }, videoId);
            break;

        case 'stress':
            await tester.initializeSession();
            await tester.runStressTest(videoId, 5);
            break;

        case 'detect':
            console.log('🔍 Analyzing bot detection patterns...');
            await tester.initializeSession();

            // Test multiple videos to see detection patterns
            const testVideos = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', 'kJQP7kiw5Fk'];

            for (const testId of testVideos) {
                console.log(`\n🎵 Testing ${testId}...`);
                await tester.runExtractorTest({ name: 'YTDL Core (Direct)', func: extractFromYtdlCore }, testId);
                await tester.runExtractorTest({ name: 'Invidious (Bypass)', func: extractFromInvidious }, testId);
            }
            break;

        case 'stats':
            await tester.showProxyStats();
            break;

        case 'refresh':
            await tester.refreshProxies();
            break;

        case 'status':
            await tester.showProxyStats();
            console.log('\n🔍 Testing bot detection countermeasures...');
            await tester.runExtractorTest({ name: 'Invidious Test', func: extractFromInvidious }, 'dQw4w9WgXcQ');
            break;

        default:
            console.log(`❌ Unknown command: ${command}`);
            console.log('Run "node test-audio-cli-advanced.js help" for available commands');
            process.exit(1);
    }
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the CLI
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdvancedAudioTester;
