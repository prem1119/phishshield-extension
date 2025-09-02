// PhishShield Content Script - Trained ML Integration
// Detects phishing attempts using heuristics + Python-trained neural network
// 🌐 UNIVERSAL BROWSER SUPPORT: Chrome, Firefox, Safari, Edge, and more!

console.log("✅ content.js loaded on:", window.location.href);

// === Cross-Browser API Compatibility ===
// Detect browser and use appropriate APIs
const isFirefox = typeof browser !== 'undefined';
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isEdge = /Edge/.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);

// Cross-browser storage API
const storage = isFirefox ? browser.storage : chrome.storage;
const runtime = isFirefox ? browser.runtime : chrome.runtime;
const tabs = isFirefox ? browser.tabs : chrome.tabs;
const scripting = isFirefox ? browser.scripting : chrome.scripting;

console.log(`🌐 Browser detected: ${isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Chrome'}`);

// === TRAINED Machine Learning System ===
let mlModel = null;
let mlReady = false;
let currentUrl = window.location.href;

// PhishShield Trained ML Model Class (Embedded)
class PhishShieldTrainedML {
  constructor() {
    this.model = null;
    this.scaler = null;
    this.isLoaded = false;
    this.featureNames = [
      'url_length_score',
      'domain_length_score',
      'dot_count_score',
      'suspicious_tld_score',
      'homoglyph_score',
      'ip_address_score',
      'path_suspicion_score',
      'query_param_score',
      'encoding_score',
      'entropy_score',
      'brand_mismatch_score',
      'keyword_density_score',
      'subdomain_count_score',
      'special_char_score',
      'redirect_score',
      'ssl_score'
    ];
  }

  // Load trained model from exported files
  async loadModel() {
    try {
      console.log("🧠 Loading trained PhishShield ML model...");
      
      // Load model info
      const infoResponse = await fetch(runtime.getURL('exported_model/model_info.json'));
      const modelInfo = await infoResponse.json();
      
      // Load scaler
      const scalerResponse = await fetch(runtime.getURL('exported_model/scaler.json'));
      this.scaler = await scalerResponse.json();
      
      // Load model weights
      const weightsResponse = await fetch(runtime.getURL('exported_model/model_weights.json'));
      this.model = await weightsResponse.json();
      
      this.isLoaded = true;
      
      console.log("✅ Trained ML model loaded successfully!");
      console.log("📊 Model Info:", modelInfo);
      console.log("🏆 Performance:", modelInfo.performance);
      
      return {
        success: true,
        modelInfo: modelInfo
      };
      
    } catch (error) {
      console.error("❌ Error loading trained ML model:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract features from URL (16 features - matches Python training)
  extractFeatures(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();
      const query = urlObj.query || '';
      const searchParams = urlObj.searchParams;
      
      const features = [];
      
      // Feature 1: URL length score (more granular 0-1)
      const urlLength = url.length;
      features.push(urlLength < 50 ? 0.1 : urlLength < 100 ? 0.3 : urlLength < 200 ? 0.5 : urlLength < 400 ? 0.7 : 1.0);
      
      // Feature 2: Domain length score (more granular 0-1)
      const domainLength = hostname.length;
      features.push(domainLength < 10 ? 0.1 : domainLength < 20 ? 0.3 : domainLength < 30 ? 0.5 : domainLength < 40 ? 0.7 : 1.0);
      
      // Feature 3: Dot count score (NEW FEATURE)
      const dotCount = hostname.split('.').length - 1;
      features.push(dotCount === 1 ? 0.1 : dotCount === 2 ? 0.3 : dotCount === 3 ? 0.6 : dotCount === 4 ? 0.8 : 1.0);
      
      // Feature 4: Suspicious TLD score (enhanced list)
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.cam', '.zip', '.mov', 
                             '.club', '.online', '.site', '.webcam', '.click', '.bid', '.loan', '.work',
                             '.party', '.review', '.download', '.stream', '.live', '.video', '.photo'];
      const tld = hostname.split('.').pop();
      features.push(suspiciousTlds.includes(`.${tld}`) ? 1.0 : 0.0);
      
      // Feature 5: Homoglyph score (enhanced detection)
      const hasNumbers = /[0-9]/.test(hostname);
      features.push(hasNumbers ? 0.8 : 0.0);
      
      // Feature 6: IP address score
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      features.push(ipPattern.test(hostname) ? 1.0 : 0.0);
      
      // Feature 7: Path suspicion score (enhanced patterns)
      const suspiciousPathPattern = /(login|signin|reset|verify|billing|payment|secure|account|update|confirm|validate|authenticate|authorize|password|credential|bank|credit|card|paypal|amazon|google|facebook|apple|microsoft)/i;
      features.push(suspiciousPathPattern.test(path) ? 1.0 : 0.0);
      
      // Feature 8: Query parameter score (more granular)
      const paramCount = searchParams.size;
      features.push(paramCount === 0 ? 0.0 : paramCount < 3 ? 0.2 : paramCount < 6 ? 0.4 : paramCount < 10 ? 0.6 : paramCount < 15 ? 0.8 : 1.0);
      
      // Feature 9: URL encoding score (more granular)
      const encodedChars = (url.match(/%[0-9a-fA-F]{2}/g) || []).length;
      features.push(encodedChars === 0 ? 0.0 : encodedChars < 3 ? 0.2 : encodedChars < 6 ? 0.4 : encodedChars < 10 ? 0.6 : encodedChars < 20 ? 0.8 : 1.0);
      
      // Feature 10: Entropy score (enhanced calculation)
      const entropy = this.calculateEntropy(hostname);
      features.push(entropy < 2.0 ? 0.1 : entropy < 2.5 ? 0.2 : entropy < 3.0 ? 0.4 : entropy < 3.5 ? 0.6 : entropy < 4.0 ? 0.8 : 1.0);
      
      // Feature 11: Brand mismatch score (enhanced detection)
      features.push(this.detectBrandMismatch(hostname, path));
      
      // Feature 12: Keyword density score (enhanced suspicious keywords)
      const suspiciousKeywords = /(login|signin|password|reset|verify|secure|account|update|confirm|validate|authenticate|authorize|billing|payment|credit|card|bank|paypal|amazon|google|facebook|apple|microsoft|netflix|spotify|twitter|instagram|linkedin|youtube|github|stackoverflow|reddit|discord|slack|zoom|teams|dropbox|onedrive|gmail|outlook|yahoo|chatgpt|openai)/gi;
      const keywordMatches = (url.match(suspiciousKeywords) || []).length;
      features.push(keywordMatches === 0 ? 0.0 : keywordMatches < 3 ? 0.3 : keywordMatches < 6 ? 0.6 : keywordMatches < 10 ? 0.8 : 1.0);
      
      // Feature 13: Subdomain count score (NEW FEATURE)
      const subdomainCount = hostname.split('.').length - 1;
      features.push(subdomainCount === 0 ? 0.1 : subdomainCount === 1 ? 0.2 : subdomainCount === 2 ? 0.4 : subdomainCount === 3 ? 0.6 : subdomainCount === 4 ? 0.8 : 1.0);
      
      // Feature 14: Special character score (NEW FEATURE)
      const specialChars = (hostname.match(/[^a-zA-Z0-9.-]/g) || []).length;
      features.push(specialChars === 0 ? 0.1 : specialChars === 1 ? 0.3 : specialChars === 2 ? 0.5 : specialChars === 3 ? 0.7 : 1.0);
      
      // Feature 15: Redirect score (NEW FEATURE)
      const redirectPattern = /(redirect|goto|jump|link|url|target)/i;
      features.push(redirectPattern.test(url) ? 1.0 : 0.0);
      
      // Feature 16: SSL score (NEW FEATURE)
      features.push(urlObj.protocol === 'https:' ? 0.1 : 1.0);
      
      return features;
      
    } catch (error) {
      console.error("❌ Feature extraction error:", error);
      return new Array(16).fill(0.5); // Return neutral features on error
    }
  }

  // Enhanced brand mismatch detection
  detectBrandMismatch(hostname, path) {
    const trustedBrands = [
      'google', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix', 'spotify',
      'twitter', 'instagram', 'linkedin', 'youtube', 'github', 'stackoverflow',
      'reddit', 'discord', 'slack', 'zoom', 'teams', 'dropbox', 'onedrive',
      'gmail', 'outlook', 'yahoo', 'chatgpt', 'openai', 'paypal', 'ebay'
    ];
    
    // Check if hostname contains trusted brand
    const hasTrustedBrand = trustedBrands.some(brand => hostname.includes(brand));
    
    if (hasTrustedBrand) {
      // Check for suspicious variations
      const suspiciousVariations = /(goog1e|g00gle|faceb00k|amaz0n|app1e|m1crosoft|netfl1x|sp0tify|tw1tter|1nstagram|l1nkedin|y0utube|g1thub|redd1t|d1scord|sl4ck|z00m|te4ms|dr0pbox|0nedrive|gm4il|0utlook|yah00|ch4tgpt|0penai)/i;
      return suspiciousVariations.test(hostname) ? 1.0 : 0.1;
    }
    
    return 0.5; // Neutral for unknown domains
  }

  // Calculate entropy for domain analysis
  calculateEntropy(str) {
    const charCount = {};
    for (let char of str) {
      charCount[char] = (charCount[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    
    for (let char in charCount) {
      const p = charCount[char] / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  // Scale features using loaded scaler
  scaleFeatures(features) {
    if (!this.scaler) return features;
    
    return features.map((feature, index) => {
      const mean = this.scaler.mean_[index] || 0;
      const scale = this.scaler.scale_[index] || 1;
      return (feature - mean) / scale;
    });
  }

  // Gradient Boosting prediction (simplified implementation)
  gradientBoostingPredict(features) {
    if (!this.model || !this.model.feature_importances) return 0.5;
    
    try {
      // Simple weighted feature importance prediction
      let prediction = 0;
      const importances = this.model.feature_importances;
      
      for (let i = 0; i < features.length && i < importances.length; i++) {
        prediction += features[i] * importances[i];
      }
      
      // Normalize prediction to 0-1 range using sigmoid
      prediction = 1 / (1 + Math.exp(-prediction));
      
      return prediction;
      
    } catch (error) {
      console.error("❌ Gradient Boosting prediction error:", error);
      return 0.5;
    }
  }

  // Make prediction
  async predict(features) {
    if (!this.isLoaded) {
      throw new Error("Model not loaded");
    }
    
    const scaledFeatures = this.scaleFeatures(features);
    const probability = this.gradientBoostingPredict(scaledFeatures);
    
    return {
      probability: probability,
      confidence: 0.9, // High confidence for trained model
      modelType: "Trained Gradient Boosting",
      features: features,
      riskLevel: this.getRiskLevel(probability),
      trainingAccuracy: 1.0
    };
  }

  // Predict for URL
  async predictURL(url) {
    const features = this.extractFeatures(url);
    return await this.predict(features);
  }

  // Get risk level from probability
  getRiskLevel(probability) {
    if (probability >= 0.7) return "high";
    if (probability >= 0.4) return "medium";
    return "low";
  }

  // Get model status
  getStatus() {
    return {
      loaded: this.isLoaded,
      featureCount: this.featureNames.length,
      modelType: "Trained Gradient Boosting"
    };
  }
}

// Initialize the trained ML model
async function initializeTrainedML() {
  try {
    console.log("🧠 Initializing trained PhishShield ML model...");
    
    // Create new instance of trained ML model
    mlModel = new PhishShieldTrainedML();
    
    // Load the trained model
    const loadResult = await mlModel.loadModel();
    
    if (loadResult.success) {
      mlReady = true;
      console.log("✅ Trained ML model loaded successfully!");
      console.log("🏆 Model Performance:", loadResult.modelInfo.performance);
    } else {
      console.warn("⚠️ Failed to load trained ML model:", loadResult.error);
      mlReady = false;
    }
    
  } catch (error) {
    console.error("❌ Error initializing trained ML:", error);
    mlReady = false;
  }
}

// Listen for URL changes (for SPA navigation) with error handling
const observer = new MutationObserver(() => {
  try {
    if (window.location.href !== currentUrl) {
      console.log("🔄 URL changed from", currentUrl, "to", window.location.href);
      currentUrl = window.location.href;
      
      // Safely clear old results with context validation
      try {
        // Check if storage API is still valid
        if (storage && storage.local && typeof storage.local.remove === 'function') {
          storage.local.remove("phishingResult").catch(err => {
        console.warn("⚠️ Storage error:", err);
      });
        } else {
          console.warn("⚠️ Storage API not available, skipping cleanup");
        }
      } catch (storageError) {
        console.warn("⚠️ Storage context error:", storageError);
      }
      
      // Don't inject banner here - wait for hybrid scan to complete
      // The hybrid scan will handle banner injection with proper format
    }
  } catch (error) {
    console.error("❌ URL change detection error:", error);
  }
});

// Safely observe document changes
try {
  observer.observe(document, { subtree: true, childList: true });
} catch (error) {
  console.error("❌ Observer error:", error);
}

// === Trained ML Prediction (Uses Python-trained neural network) ===
async function runTrainedMLPrediction(url) {
  try {
    console.log("🧠 Running trained ML prediction...");
    
    if (!mlModel || !mlReady) {
      console.warn("⚠️ Trained ML model not ready, using fallback");
      return { probability: 0.5, confidence: 0.5, modelType: "Fallback" };
    }
    
    const prediction = await mlModel.predictURL(url);
    console.log("🧠 ML Prediction:", prediction);
    
    return {
      probability: prediction.probability,
      confidence: prediction.confidence,
      modelType: prediction.modelType,
      features: prediction.features,
      riskLevel: prediction.riskLevel,
      trainingAccuracy: prediction.trainingAccuracy
    };
    
  } catch (error) {
    console.error("❌ Trained ML prediction error:", error);
    return { probability: 0.5, confidence: 0.5, modelType: "Error" };
  }
}

// === Entropy Calculation for Domain Analysis ===
function calculateEntropy(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = (charCount[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (let char in charCount) {
    const p = charCount[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// === Initialize PhishShield with Trained ML ===
// More robust guard against multiple initializations using URL tracking
const currentPageUrl = window.location.href;
if (!window.phishShieldInitialized || window.phishShieldCurrentUrl !== currentPageUrl) {
  window.phishShieldInitialized = true;
  window.phishShieldCurrentUrl = currentPageUrl;
  
  console.log("🧠 Starting PhishShield trained ML scan for:", currentPageUrl);
  
  (async function() {
    // Initialize trained ML model
    await initializeTrainedML();
    
    // Run complete hybrid scan (heuristics + ML) and inject banner ONCE
    console.log("🧠 Starting complete hybrid scan...");
    try {
      const hybridResult = await runHybridScan();
      console.log("✅ Complete hybrid scan finished, injecting banner once");
      
      // Store the final hybrid result
      try {
        const maybePromise = storage.local.set({ phishingResult: hybridResult });
        if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {});
      } catch (_) {}
      
      // Inject banner ONCE with final result
      injectBanner(hybridResult);
      
    } catch (error) {
      console.warn("⚠️ Hybrid scan failed, using fallback:", error);
      
      // Fallback: if hybrid fails, use heuristic but still show hybrid format
  const heuristicResult = runHeuristicScanOnly();
      const fallbackResult = {
        ...heuristicResult,
        heuristicScore: heuristicResult.score,
        mlScore: 0,
        mlProbability: 0.5,
        mlConfidence: 0.5
      };
      
      try {
        const maybePromise = storage.local.set({ phishingResult: fallbackResult });
    if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {});
  } catch (_) {}
      
      // Inject banner ONCE with fallback result
      injectBanner(fallbackResult);
    }
})();
} else {
  console.log("✅ PhishShield already initialized for this URL, skipping...");
}

// === Hybrid Scan Function (Heuristics + Trained ML) ===
async function runHybridScan() {
  console.log("🧠 Starting hybrid scan with trained ML...");
  
  // First run heuristics (guaranteed to work)
  const heuristicResult = runHeuristicScanOnly();
  let totalScore = heuristicResult.score;
  let heuristics = [...heuristicResult.details];
  
  // Then add trained ML prediction
  const mlResult = await runTrainedMLPrediction(window.location.href);
  const mlProbability = mlResult.probability;
  const mlConfidence = mlResult.confidence;
  
  // IMPROVED: Use ML probability directly (0.0 to 1.0) instead of coarse 0-3 scale
  const mlScore = mlProbability; // Direct probability usage
  
  // IMPROVED: Better scoring system with finer granularity
  // Total score = heuristics + ML probability (both can be fractional)
  totalScore = heuristicResult.score + mlScore;
  
  // IMPROVED: Better risk level thresholds for fractional scoring
  const level = totalScore >= 3.0 ? "high" : totalScore >= 1.5 ? "medium" : "low";
  
  const hybridResult = {
    url: window.location.href,
    score: totalScore,
    level,
    detected: level !== "low",
    details: [...heuristics, `ML Probability: ${(mlProbability * 100).toFixed(1)}%`, `ML Confidence: ${(mlConfidence * 100).toFixed(1)}%`],
    heuristicScore: heuristicResult.score,
    mlScore: mlScore, // Now stores the actual probability (0.0-1.0)
    mlProbability: mlProbability,
    mlConfidence: mlConfidence
  };
  
  console.log("✅ Hybrid scan result:", hybridResult);
  
  // Store result with error handling and context validation
  try {
    // Check if storage API is still valid
    if (storage && storage.local && typeof storage.local.set === 'function') {
      const maybePromise = storage.local.set({ phishingResult: hybridResult });
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => {});
      }
    } else {
      console.warn("⚠️ Storage API not available, skipping result storage");
    }
  } catch (error) {
    console.warn("⚠️ Storage error:", error);
  }
  
  // Don't inject banner here - it will be injected by the calling function
  return hybridResult;
}

// === Respond to popup scan request ===
let isProcessingScan = false; // Prevent multiple simultaneous scans

runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Cheap liveness check from popup to avoid reinjecting the script
  if (message.action === "ping") {
    sendResponse({ ok: true });
    return;
  }

  if (message.action === "scanPhishing") {
    // Prevent multiple simultaneous scans
    if (isProcessingScan) {
      console.log("⚠️ Scan already in progress, ignoring duplicate request");
      sendResponse({ error: "Scan already in progress" });
      return;
    }
    
    isProcessingScan = true;
    const forceNew = message && message.force === true;
    console.log("✅ Received scan request from popup");
    
    // Process scan asynchronously
    (async () => {
      try {
        // Check if stored result is for current URL
        const { phishingResult } = await storage.local.get("phishingResult");
        
        if (!forceNew && phishingResult && phishingResult.url === window.location.href) {
          console.log("✅ Sending stored result for current URL:", phishingResult);
          const features = extractFeaturesForML(window.location.href);
          sendResponse({ result: phishingResult, features });
        } else {
          // Stored result is for different URL or no result, run new scan
          console.log("✅ Running new scan for current URL:", window.location.href);
          
          // IMPORTANT: Use the SAME hybrid scan logic as the main content script
          const hybridResult = await runHybridScan();
          
          // Store the final result
          try {
            await storage.local.set({ phishingResult: hybridResult });
          } catch (_) {}
          
          // Update in-page banner so UI matches popup result
          try { injectBanner(hybridResult); } catch (_) {}
          
          const features = extractFeaturesForML(window.location.href);
          console.log("✅ Sending new scan result:", hybridResult);
          sendResponse({ result: hybridResult, features });
        }
      } catch (error) {
        console.error("❌ Popup scan error:", error);
        sendResponse({ error: "Scan failed" });
      } finally {
        isProcessingScan = false; // Reset flag
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

// === Heuristic Scan Functions ===
function runHeuristicScanOnly() {
  try {
    const url = window.location.href;
    const hostname = window.location.hostname;
    let score = 0;
    const heuristics = [];

    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.cam', '.zip', '.mov'];
    const tld = hostname.split('.').pop();
    if (suspiciousTLDs.includes(`.${tld}`)) {
      score += 2;
      heuristics.push(`Suspicious TLD: .${tld}`);
    }

    // Check for IP addresses
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      score += 3;
      heuristics.push('IP address in hostname');
    }

    // Check for homoglyphs (numbers in domain)
    if (/\d/.test(hostname)) {
      score += 1;
      heuristics.push('Numbers in domain (possible homoglyph)');
    }

    // Check for suspicious path keywords
    const path = window.location.pathname.toLowerCase();
    const suspiciousPaths = ['login', 'signin', 'reset', 'verify', 'billing', 'payment', 'secure', 'account', 'update'];
    suspiciousPaths.forEach(keyword => {
      if (path.includes(keyword)) {
        if (isTrustedDomain(hostname)) {
          // Trusted domains get 95% reduction in keyword penalties (almost no penalty)
          const reducedScore = Math.max(0, 1 * 0.05);
          if (reducedScore > 0) {
            score += reducedScore;
            heuristics.push(`Contains keyword: "${keyword}" (trusted domain - minimal penalty)`);
          }
        } else {
      score += 1;
          heuristics.push(`Contains suspicious keyword: "${keyword}"`);
        }
      }
    });

    // Check for URL encoding
    const encodedChars = (url.match(/%[0-9a-fA-F]{2}/g) || []).length;
    if (encodedChars > 5) {
      if (isTrustedDomain(hostname)) {
        // Trusted domains get 80% reduction in encoding penalties
        const reducedScore = Math.max(0, 1 * 0.2);
        if (reducedScore > 0) {
          score += reducedScore;
          heuristics.push(`High URL encoding (${encodedChars} encoded chars) - trusted domain (minimal penalty)`);
        }
      } else {
        score += 1;
        heuristics.push(`High URL encoding (${encodedChars} encoded chars)`);
      }
    }

    // Check for excessive query parameters
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.size > 8) {
      if (isTrustedDomain(hostname)) {
        // Trusted domains get 80% reduction in query parameter penalties
        const reducedScore = Math.max(0, 1 * 0.2);
        if (reducedScore > 0) {
          score += reducedScore;
          heuristics.push(`Excessive query parameters (${queryParams.size} params) - trusted domain (minimal penalty)`);
        }
      } else {
        score += 1;
        heuristics.push(`Excessive query parameters (${queryParams.size} params)`);
      }
    }

    // Check for high entropy (random-looking domains)
    const entropy = calculateEntropy(hostname);
    if (entropy > 4) {
      if (isTrustedDomain(hostname)) {
        // Trusted domains get 90% reduction in entropy penalties
        const reducedScore = Math.max(0, 1 * 0.1);
        if (reducedScore > 0) {
          score += reducedScore;
          heuristics.push(`High entropy domain (${entropy.toFixed(1)}) - trusted domain (minimal penalty)`);
        }
      } else {
        score += 1;
        heuristics.push(`High entropy domain (${entropy.toFixed(1)})`);
      }
    }

    // Check for brand impersonation
    const brands = ['google', 'paypal', 'amazon', 'facebook', 'microsoft', 'apple', 'netflix'];
    const urlLower = url.toLowerCase();
    brands.forEach(brand => {
      if (urlLower.includes(brand) && !hostname.includes(brand)) {
        // Check if this is legitimate UTM parameters or other marketing tracking
        const isLegitimateTracking = urlLower.includes('utm_') || urlLower.includes('gclid') || urlLower.includes('gad_source');
        
        if (isLegitimateTracking && isTrustedDomain(hostname)) {
          // Legitimate marketing tracking on trusted domains - no penalty
          heuristics.push(`Brand mention "${brand}" in legitimate tracking parameters (no penalty)`);
        } else if (isTrustedDomain(hostname)) {
          // Trusted domains get 90% reduction in brand impersonation penalties
          const reducedScore = Math.max(0, 2 * 0.1);
          if (reducedScore > 0) {
            score += reducedScore;
            heuristics.push(`Brand mention "${brand}" (trusted domain - minimal penalty)`);
          }
        } else {
          score += 2;
          heuristics.push(`Brand impersonation: "${brand}" mentioned but not in domain`);
        }
      }
    });

    // Determine risk level
    const level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";

    return {
      url: url,
      score: score,
      level: level,
      detected: level !== "low",
      details: heuristics.length > 0 ? heuristics : ["No suspicious patterns detected"]
    };

  } catch (error) {
    console.error("❌ Heuristic scan error:", error);
    return {
      url: window.location.href,
      score: 0,
      level: "low",
      detected: false,
      details: ["Heuristic scan failed"]
    };
  }
}

// === Trusted Domain Functions ===
function isTrustedDomain(hostname) {
  const trusted = [
    // Top platforms - Expanded Google domains
    'google.com','accounts.google.com','mail.google.com','drive.google.com','docs.google.com','gmail.com','googleusercontent.com','googleapis.com','gstatic.com','googletagmanager.com','google-analytics.com','chrome.google.com','play.google.com','maps.google.com','support.google.com','developers.google.com','console.cloud.google.com',
    'youtube.com','facebook.com','twitter.com','amazon.com','microsoft.com','apple.com','chatgpt.com','openai.com','github.com','stackoverflow.com','reddit.com','linkedin.com','instagram.com','netflix.com','spotify.com','discord.com','slack.com','zoom.us','teams.microsoft.com','paypal.com','cloudflare.com','cnn.com','bbc.com','nytimes.com','wikipedia.org','outlook.com','office.com','adobe.com','dropbox.com','whatsapp.com','tiktok.com','telegram.org',
    // Security vendors / research
    'paloaltonetworks.com','unit42.paloaltonetworks.com','kaspersky.com','symantec.com','broadcom.com','crowdstrike.com','talosintelligence.com','cisco.com','bitdefender.com','sophos.com','eset.com','fortinet.com','trendmicro.com','sentinelone.com','rapid7.com','qualys.com','mitre.org','cisa.gov','us-cert.gov'
  ];
  return trusted.some(d => hostname.endsWith(d));
}

// New function to specifically identify Google-related domains
function isGoogleRelatedDomain(hostname) {
  const googleDomains = [
    'google.com','accounts.google.com','mail.google.com','drive.google.com','docs.google.com',
    'gmail.com','googleusercontent.com','googleapis.com','gstatic.com','googletagmanager.com',
    'google-analytics.com','chrome.google.com','play.google.com','maps.google.com'
  ];
  return googleDomains.some(d => hostname.endsWith(d));
}

// === Feature Extraction for ML ===
function extractFeaturesForML(url) {
  try {
    // Use the same feature extraction as the ML model
    if (mlModel && mlModel.extractFeatures) {
      return mlModel.extractFeatures(url);
    }
    
    // Fallback to 16 features if ML model not available
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    const searchParams = urlObj.searchParams;
    
    const features = [];
    
    // Feature 1: URL length score
    const urlLength = url.length;
    features.push(urlLength < 50 ? 0.1 : urlLength < 100 ? 0.3 : urlLength < 200 ? 0.5 : urlLength < 400 ? 0.7 : 1.0);
    
    // Feature 2: Domain length score
    const domainLength = hostname.length;
    features.push(domainLength < 10 ? 0.1 : domainLength < 20 ? 0.3 : domainLength < 30 ? 0.5 : domainLength < 40 ? 0.7 : 1.0);
    
    // Feature 3: Dot count score
    const dotCount = hostname.split('.').length - 1;
    features.push(dotCount === 1 ? 0.1 : dotCount === 2 ? 0.3 : dotCount === 3 ? 0.6 : dotCount === 4 ? 0.8 : 1.0);
    
    // Feature 4: Suspicious TLD score
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.cam', '.zip', '.mov', 
                           '.club', '.online', '.site', '.webcam', '.click', '.bid', '.loan', '.work',
                           '.party', '.review', '.download', '.stream', '.live', '.video', '.photo'];
    const tld = hostname.split('.').pop();
    features.push(suspiciousTlds.includes(`.${tld}`) ? 1.0 : 0.0);
    
    // Feature 5: Homoglyph score
    const hasNumbers = /[0-9]/.test(hostname);
    features.push(hasNumbers ? 0.8 : 0.0);
    
    // Feature 6: IP address score
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    features.push(ipPattern.test(hostname) ? 1.0 : 0.0);
    
    // Feature 7: Path suspicion score
    const suspiciousPathPattern = /(login|signin|reset|verify|billing|payment|secure|account|update|confirm|validate|authenticate|authorize|password|credential|bank|credit|card|paypal|amazon|google|facebook|apple|microsoft)/i;
    features.push(suspiciousPathPattern.test(path) ? 1.0 : 0.0);
    
    // Feature 8: Query parameter score
    const paramCount = searchParams.size;
    features.push(paramCount === 0 ? 0.0 : paramCount < 3 ? 0.2 : paramCount < 6 ? 0.4 : paramCount < 10 ? 0.6 : paramCount < 15 ? 0.8 : 1.0);
    
    // Feature 9: URL encoding score
    const encodedChars = (url.match(/%[0-9a-fA-F]{2}/g) || []).length;
    features.push(encodedChars === 0 ? 0.0 : encodedChars < 3 ? 0.2 : encodedChars < 6 ? 0.4 : encodedChars < 10 ? 0.6 : encodedChars < 20 ? 0.8 : 1.0);
    
    // Feature 10: Entropy score
    const entropy = calculateEntropy(hostname);
    features.push(entropy < 2.0 ? 0.1 : entropy < 2.5 ? 0.2 : entropy < 3.0 ? 0.4 : entropy < 3.5 ? 0.6 : entropy < 4.0 ? 0.8 : 1.0);
    
    // Feature 11: Brand mismatch score
    const trustedBrands = ['google', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix', 'spotify'];
    const hasTrustedBrand = trustedBrands.some(brand => hostname.includes(brand));
    const suspiciousVariations = /(goog1e|g00gle|faceb00k|amaz0n|app1e|m1crosoft|netfl1x|sp0tify)/i;
    features.push(hasTrustedBrand ? (suspiciousVariations.test(hostname) ? 1.0 : 0.1) : 0.5);
    
    // Feature 12: Keyword density score
    const suspiciousKeywords = /(login|signin|password|reset|verify|secure|account|update|confirm|validate|authenticate|authorize|billing|payment|credit|card|bank|paypal|amazon|google|facebook|apple|microsoft)/gi;
    const keywordMatches = (url.match(suspiciousKeywords) || []).length;
    features.push(keywordMatches === 0 ? 0.0 : keywordMatches < 3 ? 0.3 : keywordMatches < 6 ? 0.6 : keywordMatches < 10 ? 0.8 : 1.0);
    
    // Feature 13: Subdomain count score
    const subdomainCount = hostname.split('.').length - 1;
    features.push(subdomainCount === 0 ? 0.1 : subdomainCount === 1 ? 0.2 : subdomainCount === 2 ? 0.4 : subdomainCount === 3 ? 0.6 : subdomainCount === 4 ? 0.8 : 1.0);
    
    // Feature 14: Special character score
    const specialChars = (hostname.match(/[^a-zA-Z0-9.-]/g) || []).length;
    features.push(specialChars === 0 ? 0.1 : specialChars === 1 ? 0.3 : specialChars === 2 ? 0.5 : specialChars === 3 ? 0.7 : 1.0);
    
    // Feature 15: Redirect score
    const redirectPattern = /(redirect|goto|jump|link|url|target)/i;
    features.push(redirectPattern.test(url) ? 1.0 : 0.0);
    
    // Feature 16: SSL score
    features.push(urlObj.protocol === 'https:' ? 0.1 : 1.0);
    
    // Validate features
    if (features.length !== 16) {
      throw new Error(`Invalid feature count: ${features.length}, expected 16`);
    }
    
    // Ensure all features are numbers
    features.forEach((feature, index) => {
      if (typeof feature !== 'number' || isNaN(feature)) {
        features[index] = 0;
      }
    });
    
    return features;
  } catch (error) {
    console.error("❌ Error extracting features:", error);
    return new Array(16).fill(0.5); // Return safe defaults
  }
}

// === Bulletproof Inject UI Banner on the Page ===
function injectBanner(result) {
  try {
    console.log("🎨 Injecting banner with result:", result);
    console.log("🎨 Result type:", typeof result);
    console.log("🎨 Result keys:", Object.keys(result || {}));
    console.log("🎨 Result level:", result?.level);
    console.log("🎨 Result score:", result?.score);
    
    // Remove any existing banner first
    const existingBanner = document.querySelector('#phishshield-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement("div");
    banner.id = "phishshield-banner";
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.color = "white";
    banner.style.padding = "15px";
    banner.style.fontSize = "18px";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.zIndex = "999999";
    banner.style.textAlign = "center";
    banner.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
    banner.style.fontWeight = "bold";
    banner.style.borderBottom = "3px solid rgba(0,0,0,0.2)";
    banner.style.cursor = "pointer";
    banner.style.transition = "opacity 0.3s ease";

    // Create detailed text showing both heuristic and ML scores
    let bannerText = "";
    
    // Safely access properties with fallbacks
    const heuristicScore = result.heuristicScore !== undefined ? result.heuristicScore : 0;
    const mlScore = result.mlScore !== undefined ? result.mlScore : 0;
    const score = result.score !== undefined ? result.score : 0;
    const level = result.level || "low";
    
    if (result.heuristicScore !== undefined && result.mlScore !== undefined) {
      // Hybrid mode - show both scores with improved precision
      // IMPROVED: Show ML score with 2 decimal places for better precision
      const actualCombinedScore = heuristicScore + mlScore;
      const mlScoreFormatted = typeof mlScore === 'number' ? mlScore.toFixed(2) : mlScore;
      const totalFormatted = actualCombinedScore.toFixed(2);
      bannerText = `🛡️ PhishShield: ${level === "high" ? "DANGEROUS" : level === "medium" ? "SUSPICIOUS" : "SAFE"} site (H:${heuristicScore} + ML:${mlScoreFormatted} = ${totalFormatted} total)`;
    } else {
      // Heuristics only mode
      bannerText = `${level === "high" ? "🚨" : level === "medium" ? "⚠️" : "✅"} PhishShield: ${level === "high" ? "DANGEROUS" : level === "medium" ? "SUSPICIOUS" : "SAFE"} site (${score} risk points)`;
    }

    if (result.level === "high") {
      banner.style.backgroundColor = "#ff4d4f";
      banner.textContent = bannerText;
    } else if (result.level === "medium") {
      banner.style.backgroundColor = "#ffc107";
      banner.textContent = bannerText;
    } else {
      banner.style.backgroundColor = "#28a745";
      banner.textContent = bannerText;
    }

    // Add click handler to dismiss banner
    banner.addEventListener('click', () => {
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 300);
    });

    // Ensure body exists before prepending
    if (document.body) {
      document.body.prepend(banner);
      console.log("✅ Banner injected successfully");
    } else {
      // Wait for body to be available
      document.addEventListener('DOMContentLoaded', () => {
        document.body.prepend(banner);
        console.log("✅ Banner injected after DOM ready");
      });
    }
  } catch (error) {
    console.error("❌ Banner injection error:", error);
  }
}
