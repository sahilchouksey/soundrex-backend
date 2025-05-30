const ytdl = require("@distube/ytdl-core");
const ProxyService = require("../lib/proxyService");

class ProxyYtdlExtractor {
    constructor() {
        this.proxyService = new ProxyService();
        this.isInitialized = false;
        this.maxRetries = 5;
        this.currentProxy = null;
        this.failedProxies = new Set();
        this.successfulExtractions = 0;
        this.failedExtractions = 0;
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

            // Configure ytdl with proxy
            const ytdlOptions = {
                requestOptions: {
                    client: proxy.agent,
                    timeout: 15000,
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                }
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

            // Retry with different proxy
            return this.extractAudioWithProxy(videoId, retryCount + 1);
        }
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
