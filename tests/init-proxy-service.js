#!/usr/bin/env node

// Initialize and test the proxy service properly
const ProxyService = require('../lib/proxyService');

async function initializeProxyService() {
    console.log('🚀 Initializing and testing proxy service...');
    
    const proxyService = new ProxyService();
    
    try {
        // Download fresh proxies if needed
        console.log('📥 Downloading fresh proxy lists...');
        await proxyService.downloadProxies();
        
        // Test the proxies
        console.log('🧪 Testing proxy connectivity...');
        await proxyService.testProxies(5, 10, false); // Test up to 10 proxies per protocol with 5 concurrent
        
        // Get stats
        const stats = proxyService.getStats();
        console.log('📊 Proxy service stats:', stats);
        
        // Save working proxies
        await proxyService.saveWorkingProxies();
        
        console.log('✅ Proxy service initialization complete!');
        
    } catch (error) {
        console.error('❌ Proxy service initialization failed:', error.message);
        throw error;
    }
}

// Run the initialization
initializeProxyService().catch(error => {
    console.error('💥 Failed to initialize proxy service:', error);
    process.exit(1);
});
