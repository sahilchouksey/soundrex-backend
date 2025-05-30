#!/usr/bin/env node

const ProxyTester = require('./test-all-proxies');

async function quickTest() {
    console.log('🧪 Quick Proxy Tester Validation');
    console.log('='.repeat(50));

    const tester = new ProxyTester();

    // Test with limited proxies for validation
    const options = {
        protocols: ['http', 'socks5'], // Test two different protocols
        maxProxies: 5, // Only test 5 proxies per protocol
        skipTested: false, // Don't skip for this validation
        batchSize: 3 // Small batch size
    };

    try {
        await tester.runTests(options);

        console.log('\n✅ Quick test completed successfully!');
        console.log('📊 Final Status:', tester.getStatus());

    } catch (error) {
        console.error('❌ Quick test failed:', error.message);
    }
}

if (require.main === module) {
    quickTest();
}
