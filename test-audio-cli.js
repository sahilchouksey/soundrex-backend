#!/usr/bin/env node

const {
  extractFromProxyYtdl,
  extractFromPipeDaAPI,
  extractFromYtdlCore,
  extractFromInvidious,
  extractFromBeatbump,
  extractFromYoutubeRaw,
  extractFromAlltube249,
  extractFromAlltube250,
  extractFromAlltube251,
  getProxyYtdlStats,
  getPipedInstancesStatus,
  pipedHealthCheck
} = require('./helper/extractYoutube');

// CLI argument parsing
const args = process.argv.slice(2);

// Available extractors
const extractors = {
  'proxy': { name: 'Proxy YTDL', func: extractFromProxyYtdl, timeout: 20000 },
  'piped': { name: 'Piped API', func: extractFromPipeDaAPI, timeout: 15000 },
  'ytdl': { name: 'YTDL Core', func: extractFromYtdlCore, timeout: 15000 },
  'invidious': { name: 'Invidious', func: extractFromInvidious, timeout: 20000 },
  'beatbump': { name: 'Beatbump', func: extractFromBeatbump, timeout: 15000 },
  'raw': { name: 'YouTube Raw', func: extractFromYoutubeRaw, timeout: 15000 },
  'allsongs249': { name: 'Allsongs 249', func: extractFromAlltube249, timeout: 15000 },
  'allsongs250': { name: 'Allsongs 250', func: extractFromAlltube250, timeout: 15000 },
  'allsongs251': { name: 'Allsongs 251', func: extractFromAlltube251, timeout: 15000 }
};

// Default test video IDs
const testVideos = {
  'rickroll': 'dQw4w9WgXcQ',
  'short': 'jNQXAC9IVRw', // Me at the zoo (short video)
  'music': 'kJQP7kiw5Fk', // Luis Fonsi - Despacito
  'live': '21X5lGlDOfg', // NASA Live stream (if available)
  'old': 'hFZFjoX2cGg'  // Older video
};

function printUsage() {
  console.log('🎵 SoundRex Audio Extraction CLI Tester');
  console.log('=====================================\n');
  
  console.log('Usage:');
  console.log('  node test-audio-cli.js [command] [options]\n');
  
  console.log('Commands:');
  console.log('  test <extractor> <videoId>    - Test specific extractor with video ID');
  console.log('  testall <videoId>             - Test all extractors with video ID');
  console.log('  quick                         - Quick test with default video (Rick Roll)');
  console.log('  status                        - Show proxy and piped service status');
  console.log('  health                        - Check health of all services');
  console.log('  list                          - List available extractors\n');
  
  console.log('Available Extractors:');
  Object.keys(extractors).forEach(key => {
    console.log(`  ${key.padEnd(12)} - ${extractors[key].name}`);
  });
  
  console.log('\nPredefined Video IDs:');
  Object.keys(testVideos).forEach(key => {
    console.log(`  ${key.padEnd(10)} - ${testVideos[key]}`);
  });
  
  console.log('\nExamples:');
  console.log('  node test-audio-cli.js test invidious rickroll');
  console.log('  node test-audio-cli.js testall dQw4w9WgXcQ');
  console.log('  node test-audio-cli.js quick');
  console.log('  node test-audio-cli.js status');
}

async function testSingleExtractor(extractorKey, videoId) {
  const extractor = extractors[extractorKey];
  if (!extractor) {
    console.error(`❌ Unknown extractor: ${extractorKey}`);
    console.log('Available extractors:', Object.keys(extractors).join(', '));
    return;
  }

  // Resolve video ID if it's a predefined key
  const resolvedVideoId = testVideos[videoId] || videoId;
  
  console.log(`🧪 Testing ${extractor.name}`);
  console.log(`🎵 Video ID: ${resolvedVideoId}`);
  console.log(`⏱️ Timeout: ${extractor.timeout}ms`);
  console.log('─'.repeat(50));

  try {
    const startTime = Date.now();
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${extractor.timeout}ms`)), extractor.timeout);
    });

    console.log('🔄 Starting extraction...');
    const result = await Promise.race([
      extractor.func(resolvedVideoId, 'audio'),
      timeoutPromise
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n✅ SUCCESS! (${duration}ms)`);
    console.log('📋 Result Details:');
    console.log(`   Source: ${result.source || 'unknown'}`);
    console.log(`   Format: ${result.mimeType || result.container || 'unknown'}`);
    console.log(`   Bitrate: ${result.bitrate || 'unknown'}`);
    console.log(`   Quality: ${result.quality || 'unknown'}`);
    console.log(`   Content Length: ${result.contentLength || 'unknown'}`);
    console.log(`   Has URL: ${!!result.url || !!result.downloadUrl}`);
    
    // Additional details for specific sources
    if (result.proxy) {
      console.log(`   Proxy Used: ${result.proxy.protocol}://${result.proxy.address}`);
    }
    if (result.instance) {
      console.log(`   Instance: ${result.instance}`);
    }
    if (result.videoDetails) {
      console.log(`   Title: ${result.videoDetails.title || 'unknown'}`);
      console.log(`   Duration: ${result.videoDetails.duration || 'unknown'}s`);
    }

    // Audio-only validation
    if (result.mimeType) {
      const isAudioOnly = result.mimeType.toLowerCase().includes('audio') && 
                         !result.mimeType.toLowerCase().includes('video');
      console.log(`   Audio-Only: ${isAudioOnly ? '✅ YES' : '❌ NO'}`);
    }

    // URL preview (first 100 characters)
    if (result.url) {
      console.log(`   URL Preview: ${result.url.substring(0, 100)}...`);
    }

  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    
    // Additional error context
    if (error.message.includes('bot')) {
      console.log('💡 Tip: This might be YouTube bot detection. Try proxy or Invidious.');
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      console.log('💡 Tip: Extraction timed out. Server might be slow or unavailable.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      console.log('💡 Tip: Network connectivity issue. Check your internet connection.');
    }
  }
}

async function testAllExtractors(videoId) {
  const resolvedVideoId = testVideos[videoId] || videoId;
  
  console.log('🧪 Testing All Audio Extraction Methods');
  console.log('======================================');
  console.log(`🎵 Video ID: ${resolvedVideoId}\n`);

  const results = { successful: [], failed: [] };
  const extractorKeys = Object.keys(extractors);

  for (let i = 0; i < extractorKeys.length; i++) {
    const key = extractorKeys[i];
    const extractor = extractors[key];
    
    console.log(`${i + 1}/${extractorKeys.length}. Testing ${extractor.name}...`);

    try {
      const startTime = Date.now();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${extractor.timeout}ms`)), extractor.timeout);
      });

      const result = await Promise.race([
        extractor.func(resolvedVideoId, 'audio'),
        timeoutPromise
      ]);

      const endTime = Date.now();

      if (result && (result.url || result.downloadUrl)) {
        console.log(`   ✅ SUCCESS (${endTime - startTime}ms)`);
        results.successful.push({ name: extractor.name, time: endTime - startTime, key });
      } else {
        console.log(`   ❌ FAILED - No URL returned`);
        results.failed.push({ name: extractor.name, error: 'No URL returned', key });
      }
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`);
      results.failed.push({ name: extractor.name, error: error.message, key });
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ Successful: ${results.successful.length}/${extractorKeys.length}`);
  results.successful.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.name} (${result.time}ms)`);
  });

  console.log(`\n❌ Failed: ${results.failed.length}/${extractorKeys.length}`);
  results.failed.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.name} - ${result.error}`);
  });

  if (results.successful.length > 0) {
    console.log('\n🎉 SUCCESS! At least one extraction method is working!');
    
    // Provide recommendations
    const fastestSuccessful = results.successful.reduce((prev, current) => 
      prev.time < current.time ? prev : current
    );
    console.log(`🚀 Fastest method: ${fastestSuccessful.name} (${fastestSuccessful.time}ms)`);
  } else {
    console.log('\n⚠️ WARNING: No extraction methods are working!');
    console.log('🔧 Check network connectivity and service availability.');
  }
}

async function showStatus() {
  console.log('📊 Service Status');
  console.log('================\n');

  try {
    // Proxy service status
    console.log('🔄 Proxy Service Status:');
    const proxyStats = getProxyYtdlStats();
    console.log(`   Initialized: ${proxyStats.isInitialized ? '✅' : '❌'}`);
    console.log(`   Success Rate: ${proxyStats.successRate}`);
    console.log(`   Successful Extractions: ${proxyStats.successfulExtractions}`);
    console.log(`   Failed Extractions: ${proxyStats.failedExtractions}`);
    console.log(`   Failed Proxies: ${proxyStats.failedProxiesCount}`);
    if (proxyStats.currentProxy) {
      console.log(`   Current Proxy: ${proxyStats.currentProxy.protocol}://${proxyStats.currentProxy.address}`);
    }
    if (proxyStats.proxyService) {
      console.log(`   Total Proxies: ${proxyStats.proxyService.totalProxies}`);
      console.log(`   Working Proxies: ${proxyStats.proxyService.workingProxies}`);
    }
  } catch (error) {
    console.log(`   ❌ Error getting proxy stats: ${error.message}`);
  }

  try {
    // Piped service status
    console.log('\n🔄 Piped Service Status:');
    const pipedStatus = getPipedInstancesStatus();
    console.log(`   Total Instances: ${pipedStatus.total}`);
    console.log(`   Active Instances: ${pipedStatus.active}`);
    console.log(`   Instance Details:`);
    pipedStatus.instances.forEach((instance, index) => {
      const status = instance.isActive ? '✅' : '❌';
      console.log(`     ${index + 1}. ${status} ${instance.host} (failures: ${instance.failureCount})`);
    });
  } catch (error) {
    console.log(`   ❌ Error getting piped stats: ${error.message}`);
  }
}

async function healthCheck() {
  console.log('🏥 Health Check');
  console.log('==============\n');

  console.log('🔄 Running Piped health check...');
  try {
    const healthResult = await pipedHealthCheck();
    console.log('✅ Piped health check completed');
    console.log(`   Results: ${JSON.stringify(healthResult, null, 2)}`);
  } catch (error) {
    console.log(`❌ Piped health check failed: ${error.message}`);
  }

  console.log('\n🧪 Testing extraction with default video...');
  await testSingleExtractor('invidious', 'rickroll');
}

async function quickTest() {
  console.log('⚡ Quick Test with Rick Roll');
  console.log('===========================\n');
  
  // Test the most reliable extractors first
  const quickExtractors = ['invidious', 'piped', 'proxy'];
  
  for (const extractorKey of quickExtractors) {
    console.log(`Testing ${extractors[extractorKey].name}...`);
    await testSingleExtractor(extractorKey, 'rickroll');
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

function listExtractors() {
  console.log('📋 Available Audio Extractors');
  console.log('============================\n');
  
  Object.entries(extractors).forEach(([key, extractor]) => {
    console.log(`${key.padEnd(12)} - ${extractor.name.padEnd(20)} (timeout: ${extractor.timeout}ms)`);
  });
  
  console.log('\n📼 Predefined Test Videos');
  console.log('========================\n');
  
  Object.entries(testVideos).forEach(([key, videoId]) => {
    console.log(`${key.padEnd(10)} - ${videoId}`);
  });
}

// Main CLI logic
async function main() {
  if (args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'test':
      if (args.length < 3) {
        console.error('❌ Usage: test <extractor> <videoId>');
        console.log('Available extractors:', Object.keys(extractors).join(', '));
        return;
      }
      await testSingleExtractor(args[1], args[2]);
      break;

    case 'testall':
      if (args.length < 2) {
        console.error('❌ Usage: testall <videoId>');
        return;
      }
      await testAllExtractors(args[1]);
      break;

    case 'quick':
      await quickTest();
      break;

    case 'status':
      await showStatus();
      break;

    case 'health':
      await healthCheck();
      break;

    case 'list':
      listExtractors();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
  }
}

// Handle uncaught errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the CLI
main().catch(console.error);
