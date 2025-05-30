const axios = require("axios");

class PipedInstance {
    constructor(host) {
        this.host = host;
        this.isActive = true;
        this.lastUsed = null;
        this.failureCount = 0;
        this.maxFailures = 4; // Increased for better tolerance
        this.lastTestTime = null;
        this.consecutiveSuccesses = 0;
    }

    async testConnection() {
        this.lastTestTime = Date.now();

        try {
            // Test with a lightweight endpoint first
            const response = await axios.get(`${this.host}/trending`, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                }
            });

            // Check if response is valid JSON and has expected structure
            if (response.data && response.status === 200) {
                this.isActive = true;
                this.failureCount = Math.max(0, this.failureCount - 1); // Gradually reduce failure count on success
                this.consecutiveSuccesses++;
                return true;
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            this.failureCount++;
            this.consecutiveSuccesses = 0;

            if (this.failureCount >= this.maxFailures) {
                this.isActive = false;
            }

            console.warn(`Connection test failed for ${this.host}: ${error.message}`);
            return false;
        }
    }

    markAsUsed() {
        this.lastUsed = Date.now();
    }

    markAsFailure() {
        this.failureCount++;
        this.consecutiveSuccesses = 0;

        if (this.failureCount >= this.maxFailures) {
            this.isActive = false;
            console.warn(`Instance ${this.host} marked as inactive after ${this.failureCount} failures`);
        }
    }

    resetFailures() {
        this.failureCount = 0;
        this.isActive = true;
        this.consecutiveSuccesses = 0;
        console.log(`Reset failures for instance: ${this.host}`);
    }

    // Get instance health score (0-100)
    getHealthScore() {
        if (!this.isActive) return 0;

        const failureRatio = this.failureCount / this.maxFailures;
        const baseScore = (1 - failureRatio) * 70; // 70% based on failure rate

        const successBonus = Math.min(this.consecutiveSuccesses * 5, 30); // Up to 30% bonus for consecutive successes

        return Math.min(100, Math.max(0, baseScore + successBonus));
    }
}

const defaultPipedInstances = [
    "https://pipedapi.tokhmi.xyz",
    "https://pipedapi.moomoo.me",
    "https://pipedapi.syncpundit.io",
    "https://api-piped.mha.fi",
    "https://piped-api.garudalinux.org",
    "https://pipedapi.rivo.lol",
    "https://pipedapi.aeong.one",
    "https://pipedapi.leptons.xyz",
    "https://piped-api.lunar.icu",
    "https://ytapi.dc09.ru",
    "https://pipedapi.colinslegacy.com",
    "https://yapi.vyper.me",
    "https://pipedapi-libre.kavin.rocks",
    "https://pa.mint.lgbt",
    "https://pa.il.ax",
    "https://api.piped.projectsegfau.lt",
    "https://pipedapi.in.projectsegfau.lt",
    "https://pipedapi.us.projectsegfau.lt",
    "https://watchapi.whatever.social",
    "https://api.piped.privacydev.net",
    "https://pipedapi.palveluntarjoaja.eu",
    "https://pipedapi.smnz.de",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.qdi.fi",
    "https://piped-api.hostux.net",
    "https://pdapi.vern.cc",
    "https://pipedapi.jotoma.de",
    "https://pipedapi.pfcd.me",
    "https://pipedapi.frontendfriendly.xyz",
    "https://api.piped.yt",
    "https://pipedapi.astartes.nl",
    "https://pipedapi.osphost.fi",
    "https://pipedapi.simpleprivacy.fr"
].map(host => new PipedInstance(host));

const OfficialPipedInstance = new PipedInstance("https://pipedapi.kavin.rocks");
defaultPipedInstances.push(OfficialPipedInstance);

class PipedInstanceManager {
    constructor() {
        this.instances = [...defaultPipedInstances];
        this.currentIndex = 0;
        this.maxRetries = 5; // Increased for better reliability
        this.maxInstanceRetries = 2; // Max retries per instance before switching
    }

    getActiveInstances() {
        return this.instances.filter(instance => instance.isActive);
    }

    // Enhanced instance selection with load balancing
    getNextInstance() {
        const activeInstances = this.getActiveInstances();
        if (activeInstances.length === 0) {
            console.warn("No active Piped instances available, attempting to reset failed instances...");
            this.resetFailedInstances();
            const resetActiveInstances = this.getActiveInstances();
            if (resetActiveInstances.length === 0) {
                throw new Error("No Piped instances available after reset attempt");
            }
            return this.selectBestInstance(resetActiveInstances);
        }

        return this.selectBestInstance(activeInstances);
    }

    // Select the best instance based on last used time and failure count
    selectBestInstance(instances) {
        // Sort by failure count (ascending) and last used time (ascending, so oldest gets priority)
        const sortedInstances = instances.sort((a, b) => {
            if (a.failureCount !== b.failureCount) {
                return a.failureCount - b.failureCount;
            }
            return (a.lastUsed || 0) - (b.lastUsed || 0);
        });

        const instance = sortedInstances[0];
        instance.markAsUsed();

        console.log(`Using Piped instance: ${instance.host} (failures: ${instance.failureCount})`);
        return instance;
    }

    markInstanceFailure(instance) {
        instance.markAsFailure();
        console.warn(`Marked Piped instance as failed: ${instance.host} (failures: ${instance.failureCount}/${instance.maxFailures})`);

        // Log when instance becomes inactive
        if (!instance.isActive) {
            console.error(`Piped instance ${instance.host} marked as inactive due to repeated failures`);
        }
    }

    // Reset only instances that have failed but not reached max failures
    resetFailedInstances() {
        const inactiveInstances = this.instances.filter(instance => !instance.isActive);
        inactiveInstances.forEach(instance => {
            if (instance.failureCount < instance.maxFailures) {
                instance.resetFailures();
                console.log(`Reset Piped instance: ${instance.host}`);
            }
        });
    }

    async healthCheck() {
        console.log("Running Piped instances health check...");
        const checkPromises = this.instances.map(async (instance) => {
            const isHealthy = await instance.testConnection();
            if (isHealthy) {
                console.log(`✓ Piped instance healthy: ${instance.host}`);
            } else {
                console.warn(`✗ Piped instance unhealthy: ${instance.host}`);
            }
            return isHealthy;
        });

        await Promise.allSettled(checkPromises);

        const activeCount = this.getActiveInstances().length;
        console.log(`Health check complete. Active instances: ${activeCount}/${this.instances.length}`);

        return {
            total: this.instances.length,
            active: activeCount,
            inactive: this.instances.length - activeCount
        };
    }

    resetAllInstances() {
        this.instances.forEach(instance => instance.resetFailures());
        console.log(`Reset all ${this.instances.length} Piped instances`);
    }

    // Enhanced audio extraction with better error handling and instance switching
    async extractAudioFromPiped(videoId, retryCount = 0) {
        if (retryCount >= this.maxRetries) {
            throw new Error(`Failed to extract audio from Piped after ${this.maxRetries} attempts across multiple instances`);
        }

        let instance;
        try {
            instance = this.getNextInstance();

            console.log(`Attempting to extract audio for ${videoId} from ${instance.host} (attempt ${retryCount + 1}/${this.maxRetries})`);

            const response = await axios.get(`${instance.host}/streams/${videoId}`, {
                timeout: 15000, // Increased timeout for better reliability
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                }
            });

            if (!response.data) {
                throw new Error("Empty response from Piped API");
            }

            if (!response.data.audioStreams || !Array.isArray(response.data.audioStreams)) {
                throw new Error("No audio streams found in response");
            }

            // Filter and sort audio streams by quality preference
            const audioStreams = response.data.audioStreams
                .filter(stream => {
                    return stream.mimeType &&
                        stream.mimeType.startsWith('audio') &&
                        stream.url &&
                        stream.url.startsWith('http');
                })
                .sort((a, b) => {
                    // Prefer higher bitrate, then prefer certain formats
                    const aBitrate = a.bitrate || 0;
                    const bBitrate = b.bitrate || 0;

                    if (aBitrate !== bBitrate) {
                        return bBitrate - aBitrate;
                    }

                    // Prefer opus over other formats for quality
                    const aIsOpus = a.mimeType.includes('opus');
                    const bIsOpus = b.mimeType.includes('opus');

                    if (aIsOpus && !bIsOpus) return -1;
                    if (!aIsOpus && bIsOpus) return 1;

                    return 0;
                });

            if (audioStreams.length === 0) {
                throw new Error("No valid audio streams available after filtering");
            }

            const bestAudio = audioStreams[0];

            // Validate the selected audio stream
            if (!bestAudio.url || !bestAudio.mimeType) {
                throw new Error("Invalid audio stream data");
            }

            const result = {
                url: bestAudio.url,
                mimeType: bestAudio.mimeType,
                bitrate: bestAudio.bitrate || 0,
                contentLength: bestAudio.contentLength,
                container: bestAudio.mimeType?.split('/')[1]?.split(';')[0] || 'webm',
                source: 'piped',
                instance: instance.host,
                quality: bestAudio.quality || 'unknown',
                duration: response.data.duration || null
            };

            console.log(`✓ Successfully extracted audio from ${instance.host} - Quality: ${result.bitrate || 'unknown'}kbps, Format: ${result.container}`);
            return result;

        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
            console.error(`✗ Error with Piped instance ${instance?.host}: ${errorMsg}`);

            if (instance) {
                this.markInstanceFailure(instance);
            }

            // Determine if we should retry
            const shouldRetry = retryCount < this.maxRetries - 1;
            const hasActiveInstances = this.getActiveInstances().length > 0;

            if (shouldRetry && hasActiveInstances) {
                console.log(`Retrying with next available Piped instance...`);
                return this.extractAudioFromPiped(videoId, retryCount + 1);
            } else {
                if (!hasActiveInstances) {
                    throw new Error(`No active Piped instances available. Last error: ${errorMsg}`);
                }
                throw new Error(`Failed to extract audio after ${retryCount + 1} attempts. Last error: ${errorMsg}`);
            }
        }
    }
}

module.exports = {
    PipedInstance,
    PipedInstanceManager,
    defaultPipedInstances,
    OfficialPipedInstance
};
