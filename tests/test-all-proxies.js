#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ProxyTester {
    constructor() {
        this.proxyDir = path.join(__dirname, 'lib', 'proxies');
        this.resultsDir = path.join(this.proxyDir, 'test_results');
        this.testedProxiesFile = path.join(this.resultsDir, 'tested_proxies.json');
        this.workingProxiesFile = path.join(this.resultsDir, 'working_proxies.json');
        this.failedProxiesFile = path.join(this.resultsDir, 'failed_proxies.json');
        this.statsFile = path.join(this.resultsDir, 'test_stats.json');

        this.testedProxies = new Set();
        this.workingProxies = {
            http: [],
            https: [],
            socks4: [],
            socks5: []
        };
        this.failedProxies = {
            http: [],
            https: [],
            socks4: [],
            socks5: []
        };

        this.stats = {
            totalTested: 0,
            totalWorking: 0,
            totalFailed: 0,
            testStartTime: null,
            testEndTime: null,
            lastUpdate: null,
            protocolStats: {
                http: { tested: 0, working: 0, failed: 0 },
                https: { tested: 0, working: 0, failed: 0 },
                socks4: { tested: 0, working: 0, failed: 0 },
                socks5: { tested: 0, working: 0, failed: 0 }
            }
        };

        this.testEndpoints = [
            'http://httpbin.org/ip',
            'https://api.ipify.org?format=json',
            'https://ifconfig.me/ip',
            'http://icanhazip.com',
            'https://checkip.amazonaws.com'
        ];

        this.maxConcurrent = 10;
        this.testTimeout = 8; // seconds
        this.retryCount = 2;

        this.initializeDirectories();
    }

    // Initialize required directories
    initializeDirectories() {
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir, { recursive: true });
        }
    }

    // Load previously tested proxies to avoid retesting
    loadTestedProxies() {
        try {
            if (fs.existsSync(this.testedProxiesFile)) {
                const data = JSON.parse(fs.readFileSync(this.testedProxiesFile, 'utf8'));
                this.testedProxies = new Set(data.tested || []);
                console.log(`📂 Loaded ${this.testedProxies.size} previously tested proxies`);
            }

            if (fs.existsSync(this.workingProxiesFile)) {
                const data = JSON.parse(fs.readFileSync(this.workingProxiesFile, 'utf8'));
                this.workingProxies = { ...this.workingProxies, ...data };
                const workingCount = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
                console.log(`✅ Loaded ${workingCount} previously validated working proxies`);
            }

            if (fs.existsSync(this.failedProxiesFile)) {
                const data = JSON.parse(fs.readFileSync(this.failedProxiesFile, 'utf8'));
                this.failedProxies = { ...this.failedProxies, ...data };
                const failedCount = Object.values(this.failedProxies).reduce((sum, arr) => sum + arr.length, 0);
                console.log(`❌ Loaded ${failedCount} previously failed proxies`);
            }

            if (fs.existsSync(this.statsFile)) {
                const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
                this.stats = { ...this.stats, ...data };
                console.log(`📊 Loaded previous test statistics`);
            }

        } catch (error) {
            console.warn(`⚠️ Error loading previous test data: ${error.message}`);
        }
    }

    // Save test results incrementally
    async saveResults() {
        try {
            // Save tested proxies set
            await fs.promises.writeFile(
                this.testedProxiesFile,
                JSON.stringify({ tested: Array.from(this.testedProxies) }, null, 2)
            );

            // Save working proxies
            await fs.promises.writeFile(
                this.workingProxiesFile,
                JSON.stringify(this.workingProxies, null, 2)
            );

            // Save failed proxies
            await fs.promises.writeFile(
                this.failedProxiesFile,
                JSON.stringify(this.failedProxies, null, 2)
            );

            // Update and save stats
            this.stats.lastUpdate = new Date().toISOString();
            this.stats.totalTested = this.testedProxies.size;
            this.stats.totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
            this.stats.totalFailed = Object.values(this.failedProxies).reduce((sum, arr) => sum + arr.length, 0);

            await fs.promises.writeFile(
                this.statsFile,
                JSON.stringify(this.stats, null, 2)
            );

        } catch (error) {
            console.error(`❌ Error saving results: ${error.message}`);
        }
    }

    // Load proxy lists from files
    loadProxyLists() {
        const protocols = ['http', 'https', 'socks4', 'socks5'];
        const allProxies = {
            http: [],
            https: [],
            socks4: [],
            socks5: []
        };

        for (const protocol of protocols) {
            const filePath = path.join(this.proxyDir, `${protocol}_proxies.txt`);

            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const proxies = content.trim().split('\n')
                        .filter(line => line.trim())
                        .map(line => line.trim());

                    allProxies[protocol] = proxies;
                    console.log(`📁 Loaded ${proxies.length} ${protocol.toUpperCase()} proxies`);
                } else {
                    console.warn(`⚠️ File not found: ${filePath}`);
                }
            } catch (error) {
                console.error(`❌ Error loading ${protocol} proxies: ${error.message}`);
            }
        }

        return allProxies;
    }

    // Filter out already tested proxies
    filterUntestedProxies(allProxies) {
        const untestedProxies = {
            http: [],
            https: [],
            socks4: [],
            socks5: []
        };

        for (const [protocol, proxies] of Object.entries(allProxies)) {
            untestedProxies[protocol] = proxies.filter(proxy => {
                const proxyKey = `${protocol}://${proxy}`;
                return !this.testedProxies.has(proxyKey);
            });

            console.log(`🔍 ${protocol.toUpperCase()}: ${untestedProxies[protocol].length} untested out of ${proxies.length} total`);
        }

        return untestedProxies;
    }

    // Test a single proxy with multiple endpoints for reliability
    async testProxy(proxy, protocol) {
        const proxyKey = `${protocol}://${proxy}`;
        const startTime = Date.now();

        // Try multiple endpoints for better reliability
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            for (const endpoint of this.testEndpoints) {
                try {
                    const result = await this.testProxyWithEndpoint(proxy, protocol, endpoint);
                    if (result.working) {
                        const responseTime = Date.now() - startTime;
                        return {
                            working: true,
                            proxy,
                            protocol,
                            responseTime,
                            returnedIP: result.returnedIP,
                            endpoint: endpoint,
                            attempt: attempt + 1
                        };
                    }
                } catch (error) {
                    // Continue to next endpoint/attempt
                }
            }
        }

        return {
            working: false,
            proxy,
            protocol,
            responseTime: Date.now() - startTime,
            error: 'Failed all endpoints and attempts'
        };
    }

    // Test proxy with specific endpoint
    async testProxyWithEndpoint(proxy, protocol, endpoint) {
        let curlCommand;

        switch (protocol) {
            case 'http':
            case 'https':
                curlCommand = `curl -x http://${proxy} "${endpoint}" -k --connect-timeout ${this.testTimeout} --max-time ${this.testTimeout} -s --user-agent "Mozilla/5.0"`;
                break;
            case 'socks4':
                curlCommand = `curl "${endpoint}" --socks4 ${proxy} --connect-timeout ${this.testTimeout} --max-time ${this.testTimeout} -s --user-agent "Mozilla/5.0"`;
                break;
            case 'socks5':
                curlCommand = `curl "${endpoint}" --socks5 ${proxy} --connect-timeout ${this.testTimeout} --max-time ${this.testTimeout} -s --user-agent "Mozilla/5.0"`;
                break;
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }

        const { stdout, stderr } = await execAsync(curlCommand);

        if (stderr && stderr.trim()) {
            throw new Error(stderr.trim());
        }

        let returnedIP;
        try {
            // Try JSON parse first
            const response = JSON.parse(stdout.trim());
            returnedIP = response.ip || response.origin || response.query;
        } catch (parseError) {
            // Extract IP from text response
            const ipMatch = stdout.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            returnedIP = ipMatch ? ipMatch[0] : null;
        }

        if (!returnedIP) {
            throw new Error('No IP returned from proxy test');
        }

        return {
            working: true,
            returnedIP
        };
    }

    // Format time duration
    formatTime(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    // Test proxies in batches with concurrency control
    async testProxiesInBatches(proxies, protocol, batchSize = null) {
        if (!batchSize) batchSize = this.maxConcurrent;

        const totalProxies = proxies.length;
        let testedCount = 0;
        let workingCount = 0;

        console.log(`\n🧪 Testing ${totalProxies} ${protocol.toUpperCase()} proxies (${batchSize} concurrent)...`);

        for (let i = 0; i < totalProxies; i += batchSize) {
            const batch = proxies.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(totalProxies / batchSize);

            console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Testing ${batch.length} proxies...`);

            const batchStartTime = Date.now();
            const promises = batch.map(proxy => this.testProxy(proxy, protocol));

            try {
                const results = await Promise.allSettled(promises);

                results.forEach((result, index) => {
                    const proxy = batch[index];
                    const proxyKey = `${protocol}://${proxy}`;

                    // Mark as tested
                    this.testedProxies.add(proxyKey);
                    this.stats.protocolStats[protocol].tested++;
                    testedCount++;

                    if (result.status === 'fulfilled' && result.value.working) {
                        // Working proxy
                        this.workingProxies[protocol].push({
                            address: proxy,
                            responseTime: result.value.responseTime,
                            returnedIP: result.value.returnedIP,
                            endpoint: result.value.endpoint,
                            testedAt: new Date().toISOString()
                        });

                        this.stats.protocolStats[protocol].working++;
                        workingCount++;

                        console.log(`   ✅ ${proxy} (${this.formatTime(result.value.responseTime)}) -> ${result.value.returnedIP}`);

                    } else {
                        // Failed proxy
                        const error = result.status === 'fulfilled' ? result.value.error : result.reason.message;
                        this.failedProxies[protocol].push({
                            address: proxy,
                            error: error,
                            testedAt: new Date().toISOString()
                        });

                        this.stats.protocolStats[protocol].failed++;
                        console.log(`   ❌ ${proxy} - ${error}`);
                    }
                });

                const batchDuration = Date.now() - batchStartTime;
                const workingInBatch = results.filter(r => r.status === 'fulfilled' && r.value.working).length;

                console.log(`   📊 Batch complete: ${workingInBatch}/${batch.length} working (${this.formatTime(batchDuration)})`);
                console.log(`   🎯 Progress: ${testedCount}/${totalProxies} (${workingCount} working total)`);

                // Save results after each batch
                await this.saveResults();

                // Small delay between batches to avoid overwhelming
                if (i + batchSize < totalProxies) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

            } catch (error) {
                console.error(`❌ Batch ${batchNum} failed: ${error.message}`);
            }
        }

        console.log(`\n✅ ${protocol.toUpperCase()} testing complete: ${workingCount}/${totalProxies} working`);
        return workingCount;
    }

    // Main test runner
    async runTests(options = {}) {
        const {
            protocols = ['http', 'https', 'socks4', 'socks5'],
            maxProxies = null,
            skipTested = true,
            batchSize = null,
            saveFrequency = 50
        } = options;

        console.log('🚀 COMPREHENSIVE PROXY TESTING');
        console.log('='.repeat(60));
        console.log(`📅 Start Time: ${new Date().toISOString()}`);
        console.log(`🔧 Configuration:`);
        console.log(`   - Protocols: ${protocols.join(', ')}`);
        console.log(`   - Max Concurrent: ${batchSize || this.maxConcurrent}`);
        console.log(`   - Test Timeout: ${this.testTimeout}s`);
        console.log(`   - Skip Previously Tested: ${skipTested}`);
        console.log(`   - Max Proxies per Protocol: ${maxProxies || 'unlimited'}`);

        this.stats.testStartTime = new Date().toISOString();

        // Load previous test data
        if (skipTested) {
            this.loadTestedProxies();
        }

        // Load all proxy lists
        const allProxies = this.loadProxyLists();

        // Filter untested proxies if requested
        const proxiesToTest = skipTested ? this.filterUntestedProxies(allProxies) : allProxies;

        // Limit proxies if specified
        if (maxProxies) {
            for (const protocol of protocols) {
                if (proxiesToTest[protocol].length > maxProxies) {
                    proxiesToTest[protocol] = proxiesToTest[protocol].slice(0, maxProxies);
                    console.log(`⚠️ Limited ${protocol} proxies to ${maxProxies}`);
                }
            }
        }

        const totalToTest = protocols.reduce((sum, protocol) => sum + proxiesToTest[protocol].length, 0);
        console.log(`\n🎯 Total proxies to test: ${totalToTest}`);

        if (totalToTest === 0) {
            console.log('✅ All proxies have already been tested!');
            this.displaySummary();
            return;
        }

        // Test each protocol
        for (const protocol of protocols) {
            if (proxiesToTest[protocol].length > 0) {
                await this.testProxiesInBatches(
                    proxiesToTest[protocol],
                    protocol,
                    batchSize || this.maxConcurrent
                );
            } else {
                console.log(`\n⏭️ Skipping ${protocol.toUpperCase()} - no untested proxies`);
            }
        }

        this.stats.testEndTime = new Date().toISOString();
        await this.saveResults();

        console.log('\n🎉 TESTING COMPLETE!');
        this.displaySummary();
        this.generateWorkingProxyFiles();
    }

    // Display comprehensive summary
    displaySummary() {
        console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
        console.log('='.repeat(60));

        const totalTested = this.testedProxies.size;
        const totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
        const totalFailed = Object.values(this.failedProxies).reduce((sum, arr) => sum + arr.length, 0);
        const successRate = totalTested > 0 ? ((totalWorking / totalTested) * 100).toFixed(2) : '0.00';

        console.log(`🔢 Overall Statistics:`);
        console.log(`   - Total Tested: ${totalTested}`);
        console.log(`   - Working: ${totalWorking} (${successRate}%)`);
        console.log(`   - Failed: ${totalFailed}`);

        console.log(`\n📋 Protocol Breakdown:`);
        for (const [protocol, stats] of Object.entries(this.stats.protocolStats)) {
            const working = this.workingProxies[protocol].length;
            const failed = this.failedProxies[protocol].length;
            const total = working + failed;
            const rate = total > 0 ? ((working / total) * 100).toFixed(1) : '0.0';

            console.log(`   ${protocol.toUpperCase().padEnd(6)}: ${working.toString().padStart(4)} working / ${total.toString().padStart(4)} tested (${rate}%)`);
        }

        if (this.stats.testStartTime && this.stats.testEndTime) {
            const duration = new Date(this.stats.testEndTime) - new Date(this.stats.testStartTime);
            console.log(`\n⏱️ Test Duration: ${this.formatTime(duration)}`);
        }

        console.log(`\n📁 Results saved to: ${this.resultsDir}`);
    }

    // Generate working proxy files for use by other services
    async generateWorkingProxyFiles() {
        console.log('\n📝 Generating working proxy files...');

        for (const [protocol, proxies] of Object.entries(this.workingProxies)) {
            if (proxies.length > 0) {
                const filePath = path.join(this.proxyDir, `${protocol}_working.txt`);
                const proxyList = proxies.map(p => p.address).join('\n');

                await fs.promises.writeFile(filePath, proxyList);
                console.log(`   ✅ ${protocol}_working.txt: ${proxies.length} proxies`);
            }
        }

        // Update working metadata
        const workingMetadata = {
            lastTested: new Date().toISOString(),
            workingCounts: Object.fromEntries(
                Object.entries(this.workingProxies).map(([protocol, list]) => [protocol, list.length])
            ),
            testMode: 'comprehensive',
            successRate: this.stats.totalTested > 0 ?
                ((this.stats.totalWorking / this.stats.totalTested) * 100).toFixed(2) + '%' : '0%'
        };

        await fs.promises.writeFile(
            path.join(this.proxyDir, 'working_metadata.json'),
            JSON.stringify(workingMetadata, null, 2)
        );

        console.log('✅ Working proxy files generated successfully!');
    }

    // Quick status check
    getStatus() {
        const totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
        const totalTested = this.testedProxies.size;

        return {
            totalTested,
            totalWorking,
            totalFailed: totalTested - totalWorking,
            protocolCounts: Object.fromEntries(
                Object.entries(this.workingProxies).map(([protocol, list]) => [protocol, list.length])
            ),
            lastUpdate: this.stats.lastUpdate
        };
    }
}

// CLI interface
if (require.main === module) {
    const tester = new ProxyTester();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
        protocols: ['http', 'https', 'socks4', 'socks5'],
        maxProxies: null,
        skipTested: true,
        batchSize: null
    };

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--protocols':
                options.protocols = args[++i].split(',');
                break;
            case '--max-proxies':
                options.maxProxies = parseInt(args[++i]);
                break;
            case '--no-skip':
                options.skipTested = false;
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i]);
                break;
            case '--quick':
                options.maxProxies = 50;
                options.batchSize = 5;
                break;
            case '--status':
                tester.loadTestedProxies();
                console.log('📊 Current Status:', tester.getStatus());
                process.exit(0);
                break;
            case '--help':
                console.log(`
🧪 Proxy Tester - Comprehensive proxy testing and caching tool

Usage: node test-all-proxies.js [options]

Options:
  --protocols <list>     Comma-separated protocols to test (http,https,socks4,socks5)
  --max-proxies <num>    Maximum proxies to test per protocol
  --batch-size <num>     Number of concurrent proxy tests
  --no-skip             Test all proxies (don't skip previously tested)
  --quick               Quick test mode (50 proxies, 5 concurrent)
  --status              Show current testing status
  --help                Show this help message

Examples:
  node test-all-proxies.js                           # Test all untested proxies
  node test-all-proxies.js --quick                   # Quick test mode
  node test-all-proxies.js --protocols http,https    # Test only HTTP protocols
  node test-all-proxies.js --max-proxies 100         # Test max 100 per protocol
  node test-all-proxies.js --no-skip                 # Re-test all proxies
                `);
                process.exit(0);
                break;
        }
    }

    console.log('🧪 Starting comprehensive proxy testing...');

    tester.runTests(options)
        .then(() => {
            console.log('✅ Testing completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Testing failed:', error);
            process.exit(1);
        });
}

module.exports = ProxyTester;
