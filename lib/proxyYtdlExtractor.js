const ytdl = require("@distube/ytdl-core");
const ProxyService = require("../lib/proxyService");
const fs = require('fs');
const path = require('path');

class ProxyYtdlExtractor {
    constructor() {
        this.proxyService = new ProxyService();
        this.isInitialized = false;
        this.maxRetries = 10; // Increased retries like Python code
        this.currentProxy = null;
        this.failedProxies = new Set();
        this.successfulExtractions = 0;
        this.failedExtractions = 0;

        // Bot detection bypass configurations
        this.cookieFile = path.join(__dirname, '../tmp/youtube_cookies.txt');
        this.retryDelay = 2000; // 2 seconds like Python code
        this.socketTimeout = 15000; // 15 seconds timeout
        this.fragmentRetries = 10;

        // Initialize cookie file for YouTube consent
        this.initializeCookies();
    }

    // Initialize YouTube cookies for bot detection bypass
    initializeCookies() {
        try {
            // Ensure tmp directory exists
            const tmpDir = path.dirname(this.cookieFile);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            // Create YouTube consent cookie if it doesn't exist
            if (!fs.existsSync(this.cookieFile)) {
                const cookieContent = `# Netscape HTTP Cookie File
# This is a generated file! Do not edit.

.youtube.com	TRUE	/	FALSE	0	CONSENT	YES+cb.20210328-17-p0.en+FX+1
.youtube.com	TRUE	/	FALSE	0	VISITOR_INFO1_LIVE	fPQ4jCL6EiE
.youtube.com	TRUE	/	FALSE	0	YSC	DnKzFNEZlRs
youtube.com	FALSE	/	FALSE	0	PREF	f4=4000000&hl=en-US
`;
                fs.writeFileSync(this.cookieFile, cookieContent);
                console.log('✅ YouTube cookies initialized for bot detection bypass');
            }
        } catch (error) {
            console.warn('⚠️ Failed to initialize cookies:', error.message);
        }
    }

    async initialize() {
        if (!this.isInitialized) {
            console.log('🔧 Initializing Proxy YTDL Extractor...');

            // Try quick start first (uses cached proxies)
            const quickStartSuccess = await this.proxyService.quickStart();

            if (!quickStartSuccess) {
                console.warn('⚠️ Quick start failed, falling back to full initialization...');
                await this.proxyService.initialize();
            }

            this.isInitialized = true;
            console.log('✅ Proxy YTDL Extractor initialized');
        }
    }

    // Get next working proxy, avoiding failed ones
    getNextWorkingProxy() {
        const maxAttempts = 10;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const proxy = this.proxyService.getNextProxy();

            if (!proxy) {
                console.warn('⚠️ No proxies available');
                return null;
            }

            const proxyKey = `${proxy.protocol}://${proxy.address}`;
            if (!this.failedProxies.has(proxyKey)) {
                return proxy;
            }

            attempts++;
        }

        // If all proxies are marked as failed, clear the failed list and try again
        console.log('🔄 All proxies marked as failed, clearing failed list...');
        this.failedProxies.clear();
        return this.proxyService.getNextProxy();
    }

    // Mark proxy as failed
    markProxyAsFailed(proxy) {
        if (proxy) {
            const proxyKey = `${proxy.protocol}://${proxy.address}`;
            this.failedProxies.add(proxyKey);
            console.warn(`❌ Marked proxy as failed: ${proxyKey}`);
        }
    }

    // Extract audio using proxy rotation
    async extractAudioWithProxy(videoId, retryCount = 0) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (retryCount >= this.maxRetries) {
            this.failedExtractions++;
            throw new Error(`Failed to extract audio after ${this.maxRetries} attempts with different proxies`);
        }

        const proxy = this.getNextWorkingProxy();
        if (!proxy) {
            throw new Error('No working proxies available for audio extraction');
        }

        console.log(`🔄 Attempting audio extraction for ${videoId} using ${proxy.protocol} proxy ${proxy.address} (attempt ${retryCount + 1}/${this.maxRetries})`);

        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            // Enhanced ytdl configuration with bot detection bypass
            const ytdlOptions = {
                requestOptions: {
                    client: proxy.agent,
                    timeout: this.socketTimeout,
                    family: 4, // Force IPv4 like Python code
                },
                // Enhanced headers for bot detection bypass
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    // Add consent cookie directly in headers
                    'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+1; VISITOR_INFO1_LIVE=fPQ4jCL6EiE; YSC=DnKzFNEZlRs; PREF=f4=4000000&hl=en-US'
                },
                // Additional bot detection bypass options
                lang: 'en-US',
                skipMixedFormat: false,
                filterByCodec: ['aac', 'opus', 'mp4a'],
                retries: this.fragmentRetries,
                // Add geographic bypass simulation
                geo_bypass: true,
                geo_bypass_country: 'US'
            };

            console.log(`📡 Getting video info for ${videoId} via proxy ${proxy.address}...`);
            const info = await ytdl.getInfo(videoUrl, ytdlOptions);

            if (!info || !info.formats) {
                throw new Error('No video info or formats found');
            }

            // Filter for audio-only formats
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

            if (!audioFormats || audioFormats.length === 0) {
                throw new Error('No audio formats available');
            }

            // Select the best audio format
            const bestAudio = this.selectBestAudioFormat(audioFormats);

            if (!bestAudio) {
                throw new Error('No suitable audio format found');
            }

            const result = {
                url: bestAudio.url,
                mimeType: bestAudio.mimeType || bestAudio.type,
                bitrate: bestAudio.bitrate || bestAudio.audioBitrate,
                contentLength: bestAudio.contentLength,
                container: bestAudio.container || this.extractContainer(bestAudio.mimeType),
                quality: bestAudio.quality || 'unknown',
                source: 'ytdl-proxy',
                proxy: {
                    address: proxy.address,
                    protocol: proxy.protocol
                },
                videoDetails: {
                    title: info.videoDetails?.title,
                    duration: info.videoDetails?.lengthSeconds,
                    author: info.videoDetails?.author?.name
                }
            };

            this.successfulExtractions++;
            this.currentProxy = proxy;

            console.log(`✅ Successfully extracted audio for ${videoId} via ${proxy.protocol} proxy ${proxy.address}`);
            console.log(`   - Quality: ${result.bitrate || 'unknown'}kbps`);
            console.log(`   - Container: ${result.container}`);
            console.log(`   - Success rate: ${this.successfulExtractions}/${this.successfulExtractions + this.failedExtractions}`);

            return result;

        } catch (error) {
            console.error(`❌ Error extracting audio via proxy ${proxy.address}: ${error.message}`);

            // Mark proxy as failed if it's a connection/proxy-related error
            if (this.isProxyRelatedError(error)) {
                this.markProxyAsFailed(proxy);
            }

            // Special handling for bot detection errors
            if (this.isBotDetectionError(error)) {
                console.warn(`🤖 Bot detection detected for proxy ${proxy.address}, adding extra delay...`);
                await this.sleep(this.retryDelay * 2); // Double delay for bot detection
            } else {
                // Normal retry delay
                await this.sleep(this.retryDelay);
            }

            // Retry with different proxy
            return this.extractAudioWithProxy(videoId, retryCount + 1);
        }
    }

    // Check if error is bot detection related
    isBotDetectionError(error) {
        const botDetectionKeywords = [
            'sign in to confirm',
            'confirm you\'re not a bot',
            'unusual traffic',
            'suspicious activity',
            'verification',
            'captcha',
            'blocked',
            'forbidden',
            '403',
            'bot detection'
        ];

        const errorMessage = error.message.toLowerCase();
        return botDetectionKeywords.some(keyword => errorMessage.includes(keyword));
    }

    // Sleep utility function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if error is proxy-related
    isProxyRelatedError(error) {
        const proxyErrorKeywords = [
            'ECONNREFUSED',
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNABORTED',
            'socket hang up',
            'connect timeout',
            'proxy',
            'tunnel'
        ];

        const errorMessage = error.message.toLowerCase();
        return proxyErrorKeywords.some(keyword => errorMessage.includes(keyword));
    }

    // Select best audio format from available formats
    selectBestAudioFormat(audioFormats) {
        // Sort by bitrate (descending) and prefer certain containers
        return audioFormats.sort((a, b) => {
            // Prefer higher bitrate
            const aBitrate = a.bitrate || a.audioBitrate || 0;
            const bBitrate = b.bitrate || b.audioBitrate || 0;

            if (aBitrate !== bBitrate) {
                return bBitrate - aBitrate;
            }

            // Prefer certain containers
            const containerPriority = { 'webm': 3, 'mp4': 2, 'm4a': 1 };
            const aContainer = a.container || 'unknown';
            const bContainer = b.container || 'unknown';

            return (containerPriority[bContainer] || 0) - (containerPriority[aContainer] || 0);
        })[0];
    }

    // Extract container from mimeType
    extractContainer(mimeType) {
        if (!mimeType) return 'unknown';

        const match = mimeType.match(/audio\/([^;]+)/);
        return match ? match[1] : 'unknown';
    }

    // Refresh proxy list
    async refreshProxies() {
        console.log('🔄 Refreshing proxy list...');
        await this.proxyService.refresh();
        this.failedProxies.clear(); // Clear failed proxies on refresh
        console.log('✅ Proxy list refreshed');
    }

    // Get extractor statistics
    getStats() {
        const proxyStatus = this.proxyService.getStatus();

        return {
            isInitialized: this.isInitialized,
            successfulExtractions: this.successfulExtractions,
            failedExtractions: this.failedExtractions,
            successRate: this.successfulExtractions + this.failedExtractions > 0
                ? (this.successfulExtractions / (this.successfulExtractions + this.failedExtractions) * 100).toFixed(2) + '%'
                : '0%',
            failedProxiesCount: this.failedProxies.size,
            currentProxy: this.currentProxy ? {
                address: this.currentProxy.address,
                protocol: this.currentProxy.protocol
            } : null,
            proxyService: proxyStatus
        };
    }

    // Test extraction with a sample video
    async testExtraction(testVideoId = 'dQw4w9WgXcQ') {
        console.log(`🧪 Testing audio extraction with video: ${testVideoId}`);

        try {
            const result = await this.extractAudioWithProxy(testVideoId);
            console.log('✅ Test extraction successful!');
            return {
                success: true,
                result: {
                    hasUrl: !!result.url,
                    bitrate: result.bitrate,
                    container: result.container,
                    proxy: result.proxy
                }
            };
        } catch (error) {
            console.error('❌ Test extraction failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ProxyYtdlExtractor;
