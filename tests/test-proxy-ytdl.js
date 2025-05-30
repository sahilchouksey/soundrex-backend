#!/usr/bin/env node

const ProxyYtdlExtractor = require('../lib/proxyYtdlExtractor');
const ProxyService = require('../lib/proxyService');

class ProxyYtdlTester {
    constructor() {
        this.proxyYtdlExtractor = new ProxyYtdlExtractor();
        this.proxyService = new ProxyService();
        this.testResults = {
            proxyServiceTests: [],
            ytdlExtractionTests: [],
            overallStats: {}
        };
    }

    // Test video IDs for different scenarios
    getTestVideos() {
        return [
            {
                id: 'dQw4w9WgXcQ',
                title: 'Rick Astley - Never Gonna Give You Up',
                description: 'Popular music video (good for testing)'
            },
            {
                id: 'jNQXAC9IVRw', 
                title: 'Me at the zoo',
                description: 'First YouTube video (short, simple)'
            },
            {
                id: 'kJQP7kiw5Fk',
                title: 'Despacito',
                description: 'Most viewed video (high quality formats)'
            }
        ];
    }

    // Helper to format time
    formatTime(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    // Helper to format bytes
    formatBytes(bytes) {
        if (!bytes) return 'unknown';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    // Test 1: Proxy Service Initialization
    async testProxyServiceInitialization() {
        console.log('\n🧪 TEST 1: Proxy Service Initialization');
        console.log('=' .repeat(60));

        const startTime = Date.now();
        
        try {
            const status = await this.proxyService.initialize();
            const duration = Date.now() - startTime;

            console.log(`✅ Initialization completed in ${this.formatTime(duration)}`);
            console.log('📊 Proxy Service Status:');
            console.log(`   - Total Proxies: ${status.totalProxies}`);
            console.log(`   - Working Proxies: ${status.workingProxies}`);
            console.log(`   - HTTP: ${status.protocolCounts.http}`);
            console.log(`   - HTTPS: ${status.protocolCounts.https}`);
            console.log(`   - SOCKS4: ${status.protocolCounts.socks4}`);
            console.log(`   - SOCKS5: ${status.protocolCounts.socks5}`);
            console.log(`   - Last Update: ${status.lastUpdate}`);

            this.testResults.proxyServiceTests.push({
                test: 'initialization',
                success: true,
                duration,
                status
            });

            return status.workingProxies > 0;

        } catch (error) {
            console.error(`❌ Initialization failed: ${error.message}`);
            this.testResults.proxyServiceTests.push({
                test: 'initialization',
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            });
            return false;
        }
    }

    // Test 2: Manual Proxy Testing (to debug the issue)
    async testManualProxyValidation() {
        console.log('\n🧪 TEST 2: Manual Proxy Validation');
        console.log('=' .repeat(60));

        try {
            // Load some proxies from files
            await this.proxyService.loadProxiesFromFiles();
            
            // Get first few proxies from each protocol
            const protocols = ['http', 'https', 'socks4', 'socks5'];
            const testResults = {};

            for (const protocol of protocols) {
                console.log(`\n🔍 Testing ${protocol.toUpperCase()} proxies...`);
                const proxies = this.proxyService.workingProxies[protocol];
                
                if (!proxies || proxies.length === 0) {
                    console.log(`   ⚠️ No ${protocol} proxies available`);
                    testResults[protocol] = { tested: 0, working: 0, proxies: [] };
                    continue;
                }

                const testProxies = proxies.slice(0, 3); // Test first 3
                const workingProxies = [];

                for (const proxy of testProxies) {
                    console.log(`   🔄 Testing ${proxy}...`);
                    const result = await this.proxyService.testProxy(proxy, protocol);
                    
                    if (result.working) {
                        console.log(`   ✅ Working: ${proxy} (${this.formatTime(result.responseTime)})`);
                        workingProxies.push({
                            address: proxy,
                            responseTime: result.responseTime,
                            returnedIP: result.returnedIP
                        });
                    } else {
                        console.log(`   ❌ Failed: ${proxy} - ${result.error}`);
                    }
                }

                testResults[protocol] = {
                    tested: testProxies.length,
                    working: workingProxies.length,
                    proxies: workingProxies
                };
            }

            this.testResults.proxyServiceTests.push({
                test: 'manual_validation',
                success: true,
                results: testResults
            });

            return testResults;

        } catch (error) {
            console.error(`❌ Manual proxy validation failed: ${error.message}`);
            this.testResults.proxyServiceTests.push({
                test: 'manual_validation',
                success: false,
                error: error.message
            });
            return null;
        }
    }

    // Test 3: Proxy Rotation
    async testProxyRotation() {
        console.log('\n🧪 TEST 3: Proxy Rotation');
        console.log('=' .repeat(60));

        try {
            const proxies = [];
            const maxAttempts = 10;

            for (let i = 0; i < maxAttempts; i++) {
                const proxy = this.proxyService.getNextProxy();
                if (!proxy) {
                    console.log(`   ⚠️ No proxy returned on attempt ${i + 1}`);
                    break;
                }

                proxies.push({
                    attempt: i + 1,
                    address: proxy.address,
                    protocol: proxy.protocol,
                    hasAgent: !!proxy.agent
                });

                console.log(`   🔄 Attempt ${i + 1}: ${proxy.protocol}://${proxy.address} (agent: ${proxy.agent ? '✅' : '❌'})`);
            }

            console.log(`\n📊 Rotation Results:`);
            console.log(`   - Total attempts: ${maxAttempts}`);
            console.log(`   - Proxies returned: ${proxies.length}`);
            console.log(`   - Unique proxies: ${new Set(proxies.map(p => p.address)).size}`);

            this.testResults.proxyServiceTests.push({
                test: 'rotation',
                success: proxies.length > 0,
                proxies
            });

            return proxies.length > 0;

        } catch (error) {
            console.error(`❌ Proxy rotation test failed: ${error.message}`);
            this.testResults.proxyServiceTests.push({
                test: 'rotation',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    // Test 4: YTDL Extractor Initialization
    async testYtdlExtractorInit() {
        console.log('\n🧪 TEST 4: YTDL Extractor Initialization');
        console.log('=' .repeat(60));

        const startTime = Date.now();

        try {
            await this.proxyYtdlExtractor.initialize();
            const duration = Date.now() - startTime;
            const stats = this.proxyYtdlExtractor.getStats();

            console.log(`✅ YTDL Extractor initialized in ${this.formatTime(duration)}`);
            console.log('📊 Extractor Stats:');
            console.log(`   - Initialized: ${stats.isInitialized}`);
            console.log(`   - Failed Proxies: ${stats.failedProxiesCount}`);
            console.log(`   - Current Proxy: ${stats.currentProxy ? `${stats.currentProxy.protocol}://${stats.currentProxy.address}` : 'none'}`);
            console.log(`   - Proxy Service Working: ${stats.proxyService.workingProxies}`);

            this.testResults.ytdlExtractionTests.push({
                test: 'extractor_init',
                success: true,
                duration,
                stats
            });

            return true;

        } catch (error) {
            console.error(`❌ YTDL Extractor initialization failed: ${error.message}`);
            this.testResults.ytdlExtractionTests.push({
                test: 'extractor_init',
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            });
            return false;
        }
    }

    // Test 5: Audio Extraction Tests
    async testAudioExtraction() {
        console.log('\n🧪 TEST 5: Audio Extraction Tests');
        console.log('=' .repeat(60));

        const testVideos = this.getTestVideos();
        const extractionResults = [];

        for (const video of testVideos) {
            console.log(`\n🎵 Testing: ${video.title} (${video.id})`);
            console.log(`   Description: ${video.description}`);

            const startTime = Date.now();

            try {
                const result = await this.proxyYtdlExtractor.extractAudioWithProxy(video.id);
                const duration = Date.now() - startTime;

                console.log(`✅ Extraction successful in ${this.formatTime(duration)}`);
                console.log(`   - URL: ${result.url ? '✅ Available' : '❌ Missing'}`);
                console.log(`   - Bitrate: ${result.bitrate || 'unknown'}kbps`);
                console.log(`   - Container: ${result.container}`);
                console.log(`   - Size: ${this.formatBytes(result.contentLength)}`);
                console.log(`   - Proxy: ${result.proxy.protocol}://${result.proxy.address}`);
                console.log(`   - Title: ${result.videoDetails?.title || 'unknown'}`);
                console.log(`   - Duration: ${result.videoDetails?.duration || 'unknown'}s`);

                extractionResults.push({
                    videoId: video.id,
                    success: true,
                    duration,
                    result: {
                        hasUrl: !!result.url,
                        bitrate: result.bitrate,
                        container: result.container,
                        size: result.contentLength,
                        proxy: result.proxy,
                        title: result.videoDetails?.title
                    }
                });

            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`❌ Extraction failed in ${this.formatTime(duration)}: ${error.message}`);

                extractionResults.push({
                    videoId: video.id,
                    success: false,
                    duration,
                    error: error.message
                });
            }

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        this.testResults.ytdlExtractionTests.push({
            test: 'audio_extraction',
            results: extractionResults
        });

        const successCount = extractionResults.filter(r => r.success).length;
        console.log(`\n📊 Audio Extraction Summary:`);
        console.log(`   - Total tests: ${extractionResults.length}`);
        console.log(`   - Successful: ${successCount}`);
        console.log(`   - Failed: ${extractionResults.length - successCount}`);
        console.log(`   - Success rate: ${((successCount / extractionResults.length) * 100).toFixed(1)}%`);

        return successCount > 0;
    }

    // Test 6: Stress Test
    async testStressScenario() {
        console.log('\n🧪 TEST 6: Stress Test (Multiple Rapid Extractions)');
        console.log('=' .repeat(60));

        const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - reliable test video
        const concurrentRequests = 3;
        const totalRequests = 5;

        console.log(`🚀 Running ${totalRequests} extractions with ${concurrentRequests} concurrent requests...`);

        const allResults = [];
        const startTime = Date.now();

        try {
            for (let batch = 0; batch < Math.ceil(totalRequests / concurrentRequests); batch++) {
                const batchStart = Date.now();
                const batchSize = Math.min(concurrentRequests, totalRequests - batch * concurrentRequests);
                
                console.log(`\n📦 Batch ${batch + 1}: ${batchSize} concurrent requests`);

                const promises = Array.from({ length: batchSize }, (_, i) => {
                    const requestId = batch * concurrentRequests + i + 1;
                    return this.runSingleExtractionTest(testVideoId, requestId);
                });

                const batchResults = await Promise.allSettled(promises);
                const batchDuration = Date.now() - batchStart;

                console.log(`   ⏱️ Batch completed in ${this.formatTime(batchDuration)}`);

                batchResults.forEach((result, index) => {
                    const requestId = batch * concurrentRequests + index + 1;
                    if (result.status === 'fulfilled') {
                        allResults.push(result.value);
                        const success = result.value.success ? '✅' : '❌';
                        console.log(`   ${success} Request ${requestId}: ${this.formatTime(result.value.duration)}`);
                    } else {
                        allResults.push({
                            requestId,
                            success: false,
                            duration: batchDuration,
                            error: result.reason.message
                        });
                        console.log(`   ❌ Request ${requestId}: ${result.reason.message}`);
                    }
                });

                // Delay between batches
                if (batch < Math.ceil(totalRequests / concurrentRequests) - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const totalDuration = Date.now() - startTime;
            const successCount = allResults.filter(r => r.success).length;

            console.log(`\n📊 Stress Test Summary:`);
            console.log(`   - Total requests: ${totalRequests}`);
            console.log(`   - Successful: ${successCount}`);
            console.log(`   - Failed: ${totalRequests - successCount}`);
            console.log(`   - Success rate: ${((successCount / totalRequests) * 100).toFixed(1)}%`);
            console.log(`   - Total time: ${this.formatTime(totalDuration)}`);
            console.log(`   - Average time per request: ${this.formatTime(totalDuration / totalRequests)}`);

            this.testResults.ytdlExtractionTests.push({
                test: 'stress_test',
                totalRequests,
                successCount,
                totalDuration,
                results: allResults
            });

            return successCount > 0;

        } catch (error) {
            console.error(`❌ Stress test failed: ${error.message}`);
            return false;
        }
    }

    // Helper for single extraction test
    async runSingleExtractionTest(videoId, requestId) {
        const startTime = Date.now();
        
        try {
            const result = await this.proxyYtdlExtractor.extractAudioWithProxy(videoId);
            return {
                requestId,
                success: true,
                duration: Date.now() - startTime,
                proxy: result.proxy,
                bitrate: result.bitrate
            };
        } catch (error) {
            return {
                requestId,
                success: false,
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    // Generate comprehensive test report
    generateReport() {
        console.log('\n📋 COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));

        const stats = this.proxyYtdlExtractor.getStats();
        
        console.log('\n🔧 PROXY SERVICE TESTS:');
        this.testResults.proxyServiceTests.forEach(test => {
            const status = test.success ? '✅' : '❌';
            console.log(`   ${status} ${test.test}: ${test.success ? 'PASSED' : 'FAILED'}`);
            if (test.error) console.log(`      Error: ${test.error}`);
            if (test.duration) console.log(`      Duration: ${this.formatTime(test.duration)}`);
        });

        console.log('\n🎵 YTDL EXTRACTION TESTS:');
        this.testResults.ytdlExtractionTests.forEach(test => {
            if (test.test === 'audio_extraction') {
                const successCount = test.results.filter(r => r.success).length;
                const status = successCount > 0 ? '✅' : '❌';
                console.log(`   ${status} ${test.test}: ${successCount}/${test.results.length} successful`);
            } else if (test.test === 'stress_test') {
                const status = test.successCount > 0 ? '✅' : '❌';
                console.log(`   ${status} ${test.test}: ${test.successCount}/${test.totalRequests} successful`);
            } else {
                const status = test.success ? '✅' : '❌';
                console.log(`   ${status} ${test.test}: ${test.success ? 'PASSED' : 'FAILED'}`);
                if (test.error) console.log(`      Error: ${test.error}`);
            }
        });

        console.log('\n📊 FINAL STATISTICS:');
        console.log(`   - Extractor Success Rate: ${stats.successRate}`);
        console.log(`   - Total Extractions: ${stats.successfulExtractions + stats.failedExtractions}`);
        console.log(`   - Failed Proxies: ${stats.failedProxiesCount}`);
        console.log(`   - Working Proxies Available: ${stats.proxyService.workingProxies}`);

        const overallSuccess = this.testResults.proxyServiceTests.some(t => t.success) && 
                              this.testResults.ytdlExtractionTests.some(t => t.success || (t.results && t.results.some(r => r.success)));

        console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ TESTS PASSED' : '❌ TESTS FAILED'}`);
        
        if (!overallSuccess) {
            console.log('\n🔍 TROUBLESHOOTING SUGGESTIONS:');
            console.log('   1. Check internet connectivity');
            console.log('   2. Verify proxy sources are accessible');
            console.log('   3. Test with different proxy protocols');
            console.log('   4. Check for firewall/network restrictions');
            console.log('   5. Try running: curl -x http://proxy:port https://httpbin.org/ip');
        }

        return overallSuccess;
    }

    // Main test runner
    async runAllTests() {
        console.log('🚀 STARTING PROXY YTDL COMPREHENSIVE TESTS');
        console.log('=' .repeat(80));
        console.log(`📅 Test Date: ${new Date().toISOString()}`);
        console.log(`🖥️ Platform: ${process.platform}`);
        console.log(`📦 Node Version: ${process.version}`);

        const testStartTime = Date.now();

        try {
            // Test 1: Proxy Service Initialization
            const proxyServiceOk = await this.testProxyServiceInitialization();
            
            // Test 2: Manual Proxy Validation (debug the issue)
            await this.testManualProxyValidation();
            
            // Test 3: Proxy Rotation
            const rotationOk = await this.testProxyRotation();
            
            // Test 4: YTDL Extractor Initialization
            const extractorOk = await this.testYtdlExtractorInit();
            
            // Only run extraction tests if we have working proxies
            if (proxyServiceOk && rotationOk && extractorOk) {
                // Test 5: Audio Extraction
                await this.testAudioExtraction();
                
                // Test 6: Stress Test
                await this.testStressScenario();
            } else {
                console.log('\n⚠️ Skipping extraction tests due to proxy service issues');
            }

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        }

        const totalDuration = Date.now() - testStartTime;
        console.log(`\n⏱️ Total test duration: ${this.formatTime(totalDuration)}`);

        return this.generateReport();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new ProxyYtdlTester();
    
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = ProxyYtdlTester;
