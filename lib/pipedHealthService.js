const { getPipedManager } = require('../helper/extractYoutube');

class PipedHealthService {
    constructor() {
        this.healthCheckInterval = null;
        this.isRunning = false;
        this.intervalTime = 5 * 60 * 1000; // 5 minutes
    }

    start() {
        if (this.isRunning) {
            console.log('Piped health service is already running');
            return;
        }

        console.log('Starting Piped health monitoring service...');
        this.isRunning = true;

        // Run initial health check
        this.performHealthCheck();

        // Set up periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.intervalTime);

        console.log(`Piped health service started with ${this.intervalTime / 1000}s interval`);
    }

    stop() {
        if (!this.isRunning) {
            console.log('Piped health service is not running');
            return;
        }

        console.log('Stopping Piped health monitoring service...');

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        this.isRunning = false;
        console.log('Piped health service stopped');
    }

    async performHealthCheck() {
        try {
            console.log('🔍 Running scheduled Piped health check...');
            const pipedManager = getPipedManager();
            const result = await pipedManager.healthCheck();

            console.log(`✅ Health check completed: ${result.active}/${result.total} instances active`);

            // Auto-reset instances if too many are inactive
            if (result.active < Math.max(3, result.total * 0.3)) {
                console.log('⚠️ Too many inactive instances, attempting reset...');
                pipedManager.resetFailedInstances();
            }

            return result;
        } catch (error) {
            console.error('❌ Error during health check:', error.message);
        }
    }

    setInterval(intervalMs) {
        if (intervalMs < 60000) { // Minimum 1 minute
            throw new Error('Interval must be at least 60 seconds');
        }

        this.intervalTime = intervalMs;

        if (this.isRunning) {
            this.stop();
            this.start();
        }

        console.log(`Health check interval updated to ${intervalMs / 1000}s`);
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            intervalTime: this.intervalTime,
            intervalSeconds: this.intervalTime / 1000
        };
    }
}

// Create singleton instance
const pipedHealthService = new PipedHealthService();

module.exports = pipedHealthService;
