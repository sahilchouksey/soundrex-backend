const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ProxyService {
    constructor() {
        this.proxyDir = path.join(__dirname, 'proxies');
        this.workingProxies = {
            http: [],
            https: [],
            socks4: [],
            socks5: []
        };
        this.currentProxyIndex = 0;
        this.maxRetries = 3;
        this.proxyTestTimeout = 5000;
        this.lastUpdate = null;
        this.updateInterval = 30 * 60 * 1000; // 30 minutes
        this.workingProxiesCache = null;
        this.lastWorkingProxiesTest = null;
        this.workingProxiesTestInterval = 6 * 60 * 60 * 1000; // 6 hours
        this.quickInitMode = true; // Start with quick initialization

        // Initialize proxy directory
        this.initializeProxyDir();
    }

    initializeProxyDir() {
        if (!fs.existsSync(this.proxyDir)) {
            fs.mkdirSync(this.proxyDir, { recursive: true });
        }
    }

    // Proxy sources for different protocols
    getProxySources() {
        return {
            http: [
                'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/http.txt',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/http.txt',
                'https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/protocols/http/data.txt',
                'https://raw.githubusercontent.com/zebbern/Proxy-Scraper/refs/heads/main/http.txt',
                'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/refs/heads/main/http_checked.txt',
                'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/refs/heads/master/http.txt',
                'https://raw.githubusercontent.com/dpangestuw/Free-Proxy/refs/heads/main/http_proxies.txt',
                'https://raw.githubusercontent.com/clarketm/proxy-list/refs/heads/master/proxy-list-raw.txt',
                'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/refs/heads/master/http.txt'
            ],
            https: [
                'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/https.txt',
                'https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/protocols/https/data.txt',
                'https://raw.githubusercontent.com/zebbern/Proxy-Scraper/refs/heads/main/https.txt',
                'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/refs/heads/master/https.txt',
                'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/refs/heads/master/https.txt'
            ],
            socks4: [
                'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/socks4.txt',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/socks4.txt',
                'https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/protocols/socks4/data.txt',
                'https://raw.githubusercontent.com/zebbern/Proxy-Scraper/refs/heads/main/socks4.txt',
                'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/refs/heads/main/socks4_checked.txt',
                'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/refs/heads/master/socks4.txt',
                'https://raw.githubusercontent.com/dpangestuw/Free-Proxy/refs/heads/main/socks4_proxies.txt'
            ],
            socks5: [
                'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/socks5.txt',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/socks5.txt',
                'https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/protocols/socks5/data.txt',
                'https://raw.githubusercontent.com/hookzof/socks5_list/refs/heads/master/proxy.txt',
                'https://raw.githubusercontent.com/zebbern/Proxy-Scraper/refs/heads/main/socks5.txt',
                'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/refs/heads/main/socks5_checked.txt',
                'https://raw.githubusercontent.com/dpangestuw/Free-Proxy/refs/heads/main/socks5_proxies.txt'
            ]
        };
    }

    // Download proxies from multiple sources
    async downloadProxies() {
        console.log('🔄 Downloading fresh proxy lists...');
        const sources = this.getProxySources();
        const allProxies = {
            http: new Set(),
            https: new Set(),
            socks4: new Set(),
            socks5: new Set()
        };

        for (const [protocol, urls] of Object.entries(sources)) {
            console.log(`📥 Downloading ${protocol.toUpperCase()} proxies from ${urls.length} sources...`);

            for (const url of urls) {
                try {
                    const response = await axios.get(url, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
                        }
                    });

                    const proxies = this.parseProxyList(response.data);
                    proxies.forEach(proxy => allProxies[protocol].add(proxy));

                    console.log(`✅ Downloaded ${proxies.length} ${protocol} proxies from ${url}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to download from ${url}: ${error.message}`);
                }
            }
        }

        // Convert sets to arrays and save
        Object.keys(allProxies).forEach(protocol => {
            allProxies[protocol] = Array.from(allProxies[protocol]);
            console.log(`📊 Total unique ${protocol.toUpperCase()} proxies: ${allProxies[protocol].length}`);
        });

        await this.saveProxiesToFiles(allProxies);
        return allProxies;
    }

    // Parse proxy list from text content
    parseProxyList(content) {
        const lines = content.split('\n');
        const proxies = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
                continue;
            }

            // Match IP:PORT format
            const match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})$/);
            if (match) {
                const [, ip, port] = match;
                if (this.isValidIP(ip) && parseInt(port) > 0 && parseInt(port) <= 65535) {
                    proxies.push(`${ip}:${port}`);
                }
            }
        }

        return proxies;
    }

    // Validate IP address
    isValidIP(ip) {
        const parts = ip.split('.');
        return parts.length === 4 && parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }

    // Save proxies to files
    async saveProxiesToFiles(proxies) {
        for (const [protocol, proxyList] of Object.entries(proxies)) {
            const filePath = path.join(this.proxyDir, `${protocol}_proxies.txt`);
            await fs.promises.writeFile(filePath, proxyList.join('\n'));
            console.log(`💾 Saved ${proxyList.length} ${protocol} proxies to ${filePath}`);
        }

        // Save metadata
        const metadata = {
            lastUpdate: new Date().toISOString(),
            counts: Object.fromEntries(
                Object.entries(proxies).map(([protocol, list]) => [protocol, list.length])
            )
        };

        await fs.promises.writeFile(
            path.join(this.proxyDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
    }

    // Load proxies from files
    async loadProxiesFromFiles() {
        const protocols = ['http', 'https', 'socks4', 'socks5'];

        for (const protocol of protocols) {
            const filePath = path.join(this.proxyDir, `${protocol}_proxies.txt`);

            try {
                if (fs.existsSync(filePath)) {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    this.workingProxies[protocol] = content.trim().split('\n').filter(line => line.trim());
                    console.log(`📁 Loaded ${this.workingProxies[protocol].length} ${protocol} proxies from file`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load ${protocol} proxies: ${error.message}`);
            }
        }
    }

    // Test a single proxy using curl (much faster than HTTP agents)
    async testProxy(proxy, protocol) {
        const startTime = Date.now();

        try {
            let curlCommand;
            const timeout = 5; // 5 second timeout for curl

            // Try multiple test endpoints for better reliability
            const testEndpoints = [
                'http://ipinfo.io/ip',
                'http://icanhazip.com',
                'http://ident.me',
                'https://api.ipify.org'
            ];

            // Build curl command based on protocol
            const testUrl = testEndpoints[0]; // Start with the most reliable one

            switch (protocol) {
                case 'http':
                case 'https':
                    curlCommand = `curl -x http://${proxy} "${testUrl}" --connect-timeout ${timeout} --max-time ${timeout} -s -L`;
                    break;
                case 'socks4':
                    curlCommand = `curl "${testUrl}" --socks4 ${proxy} --connect-timeout ${timeout} --max-time ${timeout} -s -L`;
                    break;
                case 'socks5':
                    curlCommand = `curl "${testUrl}" --socks5 ${proxy} --connect-timeout ${timeout} --max-time ${timeout} -s -L`;
                    break;
                default:
                    throw new Error(`Unsupported protocol: ${protocol}`);
            }

            const { stdout, stderr } = await execAsync(curlCommand);

            let finalOutput = stdout;

            if (stderr && stderr.trim()) {
                // Try a fallback endpoint if the first one fails
                const fallbackUrl = testEndpoints[1];
                let fallbackCommand;

                switch (protocol) {
                    case 'http':
                    case 'https':
                        fallbackCommand = `curl -x http://${proxy} "${fallbackUrl}" --connect-timeout ${timeout} --max-time ${timeout} -s -L`;
                        break;
                    case 'socks4':
                        fallbackCommand = `curl "${fallbackUrl}" --socks4 ${proxy} --connect-timeout ${timeout} --max-time ${timeout} -s -L`;
                        break;
                    case 'socks5':
                        fallbackCommand = `curl "${fallbackUrl}" --socks5 ${proxy} --connect-timeout ${timeout} --max-time ${timeout} -s -L`;
                        break;
                }

                try {
                    const { stdout: fallbackStdout, stderr: fallbackStderr } = await execAsync(fallbackCommand);
                    if (!fallbackStderr || !fallbackStderr.trim()) {
                        finalOutput = fallbackStdout;
                    } else {
                        throw new Error(stderr.trim());
                    }
                } catch (fallbackError) {
                    throw new Error(stderr.trim());
                }
            }

            // Parse response to get IP
            let returnedIP;
            const cleanOutput = finalOutput.trim();

            if (!cleanOutput) {
                throw new Error('Empty response from proxy test');
            }

            try {
                // Try JSON parsing first (for ipify.org)
                const response = JSON.parse(cleanOutput);
                returnedIP = response.ip || response.origin;
            } catch (parseError) {
                // If JSON parsing fails, assume it's plain text IP
                const ipMatch = cleanOutput.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
                returnedIP = ipMatch ? ipMatch[0] : cleanOutput.split('\n')[0].trim();
            }

            // Validate IP format
            if (!returnedIP || !this.isValidIP(returnedIP)) {
                throw new Error(`Invalid IP returned: ${returnedIP}`);
            }

            const responseTime = Date.now() - startTime;

            return {
                working: true,
                responseTime,
                returnedIP,
                proxy,
                protocol
            };

        } catch (error) {
            return {
                working: false,
                error: error.message,
                proxy,
                protocol,
                responseTime: Date.now() - startTime
            };
        }
    }

    // Test multiple proxies concurrently
    async testProxies(maxConcurrent = 5, maxProxiesPerProtocol = 20, quickMode = false) {
        console.log(`🧪 Testing proxy connectivity... (${quickMode ? 'Quick' : 'Full'} mode)`);
        const workingProxies = {
            http: [],
            https: [],
            socks4: [],
            socks5: []
        };

        try {
            // Check if we have any proxies to test
            if (!this.workingProxies || Object.keys(this.workingProxies).length === 0) {
                console.log('⚠️ No proxies available for testing');
                await this.saveWorkingProxies(workingProxies);
                return workingProxies;
            }

            // In quick mode, test only a small subset with lower concurrency
            const testLimit = quickMode ? 5 : maxProxiesPerProtocol;
            const concurrentLimit = quickMode ? 3 : Math.min(maxConcurrent, 5); // Max 5 concurrent

            for (const [protocol, proxies] of Object.entries(this.workingProxies)) {
                if (!Array.isArray(proxies) || proxies.length === 0) continue;

                console.log(`Testing ${protocol.toUpperCase()} proxies... (max ${testLimit}, ${concurrentLimit} concurrent)`);
                const testProxies = proxies.slice(0, testLimit);

                // Test in small batches to avoid overwhelming the system
                for (let i = 0; i < testProxies.length; i += concurrentLimit) {
                    const batch = testProxies.slice(i, i + concurrentLimit);
                    console.log(`  📦 Testing batch ${Math.floor(i / concurrentLimit) + 1}/${Math.ceil(testProxies.length / concurrentLimit)} (${batch.length} proxies)`);

                    const promises = batch.map(proxy => this.testProxy(proxy, protocol));

                    const results = await Promise.allSettled(promises);

                    results.forEach((result, index) => {
                        if (result.status === 'fulfilled' && result.value.working) {
                            workingProxies[protocol].push({
                                address: result.value.proxy,
                                responseTime: result.value.responseTime,
                                returnedIP: result.value.returnedIP
                            });
                            console.log(`✅ ${protocol} proxy ${result.value.proxy} - ${result.value.responseTime}ms`);
                        } else if (result.status === 'fulfilled') {
                            // Proxy failed, but no need to log every failure
                        }
                    });

                    // In quick mode, stop after finding a few working proxies per protocol
                    if (quickMode && workingProxies[protocol].length >= 2) {
                        console.log(`⚡ Quick mode: Found ${workingProxies[protocol].length} working ${protocol} proxies, moving to next protocol`);
                        break;
                    }

                    // Small delay between batches to avoid overwhelming
                    if (i + concurrentLimit < testProxies.length) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                console.log(`📊 Working ${protocol.toUpperCase()} proxies: ${workingProxies[protocol].length}/${testProxies.length}`);
            }

            // Update working proxies
            this.workingProxies = workingProxies;

            // Save working proxies
            await this.saveWorkingProxies(workingProxies);

            return workingProxies;
        } catch (error) {
            console.error('❌ Error during proxy testing:', error.message);
            // Ensure we always save some result, even if empty
            await this.saveWorkingProxies(workingProxies);
            return workingProxies;
        }
    }

    // Save working proxies to separate files
    async saveWorkingProxies(workingProxies) {
        // Check if workingProxies is valid
        if (!workingProxies || typeof workingProxies !== 'object') {
            console.log('⚠️ No working proxies to save (empty or invalid data)');
            // Create empty working files to prevent errors
            const emptyProxies = { http: [], https: [], socks4: [], socks5: [] };
            workingProxies = emptyProxies;
        }

        for (const [protocol, proxies] of Object.entries(workingProxies)) {
            const filePath = path.join(this.proxyDir, `${protocol}_working.txt`);
            const proxyList = Array.isArray(proxies) ? proxies.map(p => p.address).join('\n') : '';
            await fs.promises.writeFile(filePath, proxyList);
        }

        const workingMetadata = {
            lastTested: new Date().toISOString(),
            workingCounts: Object.fromEntries(
                Object.entries(workingProxies).map(([protocol, list]) => [protocol, Array.isArray(list) ? list.length : 0])
            ),
            testMode: this.quickInitMode ? 'quick' : 'full'
        };

        await fs.promises.writeFile(
            path.join(this.proxyDir, 'working_metadata.json'),
            JSON.stringify(workingMetadata, null, 2)
        );

        this.lastWorkingProxiesTest = Date.now();
    }

    // Load working proxies from cache
    async loadWorkingProxiesCache() {
        try {
            const metadataPath = path.join(this.proxyDir, 'working_metadata.json');
            if (!fs.existsSync(metadataPath)) {
                return false;
            }

            const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
            const lastTested = new Date(metadata.lastTested).getTime();
            const now = Date.now();

            // Use cached working proxies if they're less than 6 hours old
            if (now - lastTested < this.workingProxiesTestInterval) {
                console.log('📂 Loading cached working proxies...');

                for (const protocol of ['http', 'https', 'socks4', 'socks5']) {
                    const filePath = path.join(this.proxyDir, `${protocol}_working.txt`);
                    if (fs.existsSync(filePath)) {
                        const content = await fs.promises.readFile(filePath, 'utf8');
                        const proxies = content.trim().split('\n').filter(p => p.trim());
                        this.workingProxies[protocol] = proxies.map(address => ({ address }));
                    }
                }

                const totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
                console.log(`✅ Loaded ${totalWorking} working proxies from cache`);
                this.lastWorkingProxiesTest = lastTested;

                // Only return true if we actually have working proxies
                if (totalWorking > 0) {
                    return true;
                } else {
                    console.log('⚠️ Cache contains 0 working proxies, need to test fresh proxies');
                    return false;
                }
            }

            return false;
        } catch (error) {
            console.error('❌ Error loading working proxies cache:', error.message);
            return false;
        }
    }

    // Get next working proxy for rotation
    getNextProxy(preferredProtocol = 'http') {
        const protocols = [preferredProtocol, 'https', 'socks5', 'socks4'];

        for (const protocol of protocols) {
            const proxies = this.workingProxies[protocol];
            if (proxies && proxies.length > 0) {
                const proxy = proxies[this.currentProxyIndex % proxies.length];
                this.currentProxyIndex++;

                return {
                    address: proxy.address || proxy,
                    protocol,
                    agent: this.createProxyAgent(proxy.address || proxy, protocol)
                };
            }
        }

        return null;
    }

    // Create appropriate proxy agent
    createProxyAgent(proxy, protocol) {
        if (protocol === 'http' || protocol === 'https') {
            return new HttpsProxyAgent(`http://${proxy}`);
        } else if (protocol === 'socks4') {
            return new SocksProxyAgent(`socks4://${proxy}`);
        } else if (protocol === 'socks5') {
            return new SocksProxyAgent(`socks5://${proxy}`);
        }
        return null;
    }

    // Initialize the proxy service
    async initialize() {
        console.log('🚀 Initializing Proxy Service...');

        // Try to load cached working proxies first
        const hasWorkingCache = await this.loadWorkingProxiesCache();

        if (hasWorkingCache) {
            console.log('⚡ Using cached working proxies for fast initialization');
            this.quickInitMode = false; // Don't need quick mode if we have cache
            this.lastUpdate = Date.now();
            console.log('✅ Proxy Service initialized successfully (from cache)');
            return this.getStatus();
        }

        // Load existing proxies from files
        await this.loadProxiesFromFiles();

        // Check if we need to download fresh proxies
        const shouldUpdate = await this.shouldUpdateProxies();

        if (shouldUpdate) {
            console.log('🔄 Downloading fresh proxy lists...');
            await this.downloadProxies();
            await this.loadProxiesFromFiles();
        }

        // Test proxies in quick mode for fast startup
        console.log('⚡ Quick initialization mode - testing small subset of proxies with curl...');
        await this.testProxies(3, 10, true); // Quick mode: 3 concurrent, 10 max per protocol

        const totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);

        if (totalWorking === 0) {
            console.warn('⚠️ No working proxies found in quick mode, trying a few more...');
            await this.testProxies(3, 20, true); // Try a bit more but still quick

            const retryTotal = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
            if (retryTotal === 0) {
                console.warn('⚠️ Still no working proxies found, will continue with empty list and retry later');
            }
        } else {
            console.log(`✅ Quick initialization complete with ${totalWorking} working proxies`);

            // Schedule background test in 30 seconds to find more proxies
            setTimeout(() => {
                this.backgroundFullProxyTest();
            }, 30000); // Test more proxies after 30 seconds
        }

        this.lastUpdate = Date.now();
        console.log('✅ Proxy Service initialized successfully');
        return this.getStatus();
    }

    // Background full proxy testing
    async backgroundFullProxyTest() {
        try {
            console.log('🔄 Running background proxy test...');

            // Load all proxies again
            await this.loadProxiesFromFiles();

            // Test more proxies in background, but still conservatively
            await this.testProxies(5, 30, false); // More testing but not overwhelming

            const totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
            console.log(`✅ Background proxy test complete with ${totalWorking} total working proxies`);

        } catch (error) {
            console.error('❌ Background proxy test failed:', error.message);
        }
    }

    // Check if proxies need updating
    async shouldUpdateProxies() {
        try {
            const metadataPath = path.join(this.proxyDir, 'metadata.json');
            if (!fs.existsSync(metadataPath)) {
                return true;
            }

            const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
            const lastUpdate = new Date(metadata.lastUpdate);
            const now = new Date();

            return (now - lastUpdate) > this.updateInterval;
        } catch (error) {
            return true;
        }
    }

    // Get service status
    getStatus() {
        const workingProxiesCounts = Object.fromEntries(
            Object.entries(this.workingProxies).map(([protocol, proxies]) => [
                protocol,
                proxies?.length || 0
            ])
        );

        const totalWorking = Object.values(workingProxiesCounts).reduce((sum, count) => sum + count, 0);

        // Calculate total proxies from files
        const totalProxies = Object.values(this.workingProxies).reduce((sum, proxies) => {
            if (Array.isArray(proxies)) {
                return sum + proxies.length;
            }
            return sum;
        }, 0);

        return {
            isInitialized: this.lastUpdate !== null,
            lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : null,
            totalProxies,
            workingProxies: totalWorking,
            protocolCounts: workingProxiesCounts,
            currentProxyIndex: this.currentProxyIndex,
            hasWorkingProxies: totalWorking > 0
        };
    }

    // Alias for getStatus() - used by external code
    getStats() {
        return this.getStatus();
    }

    // Refresh proxies (download and test new ones)
    async refresh() {
        console.log('🔄 Refreshing proxy lists...');
        await this.downloadProxies();
        await this.loadProxiesFromFiles();
        await this.testProxies(20, 50, false); // Full test on manual refresh
        this.lastUpdate = Date.now();
        return this.getStatus();
    }

    // Quick check if we have any working proxies available
    hasWorkingProxies() {
        const totalWorking = Object.values(this.workingProxies).reduce((sum, arr) => sum + arr.length, 0);
        return totalWorking > 0;
    }

    // Get a few working proxies for immediate use
    async quickStart() {
        console.log('⚡ Quick start mode - loading cached proxies only...');

        const hasCache = await this.loadWorkingProxiesCache();
        if (hasCache && this.hasWorkingProxies()) {
            console.log('✅ Quick start successful with cached proxies');
            return true;
        }

        console.log('⚠️ No cached proxies available, running quick initialization...');
        await this.initialize();
        return this.hasWorkingProxies();
    }
}

module.exports = ProxyService;
