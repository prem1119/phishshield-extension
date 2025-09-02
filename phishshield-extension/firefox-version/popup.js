console.log("✅ popup.js loaded");

// === Cross-Browser API Compatibility ===
const isFirefox = typeof browser !== 'undefined';
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isEdge = /Edge/.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);

// Cross-browser APIs
const storage = isFirefox ? browser.storage : chrome.storage;
const runtime = isFirefox ? browser.runtime : chrome.runtime;
const tabs = isFirefox ? browser.tabs : chrome.tabs;
const scripting = isFirefox ? browser.scripting : chrome.scripting;

console.log(`🌐 Popup: Browser detected: ${isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Chrome'}`);

function runPhishShieldPopup() {
  document.addEventListener("DOMContentLoaded", () => {
    const statusBox = document.getElementById("status");
    const scanBtn = document.getElementById("scanBtn");
    const statsDiv = document.getElementById("stats");
    const detailsDiv = document.getElementById("details");
    const detailList = document.getElementById("detailList");
    const heuristicScoreEl = document.getElementById("heuristicScore");
    const mlScoreEl = document.getElementById("mlScore");
    const totalScoreEl = document.getElementById("totalScore");

    console.log("✅ Popup initialized");



    function updateStatus(result) {
      console.log("🔄 Updating popup status with result:", result);
      
      if (!result || !result.level) {
        console.log("⚠️ No valid result, showing unknown status");
        statusBox.textContent = "Status: Unknown";
        statusBox.className = "unknown";
        statsDiv.style.display = "none";
        detailsDiv.style.display = "none";
        return;
      }

      console.log("📊 Result details - Level:", result.level, "Score:", result.score, "HeuristicScore:", result.heuristicScore, "MLScore:", result.mlScore);

      // Show hybrid detection results if available
      if (result.heuristicScore !== undefined && result.mlScore !== undefined) {
        // Show stats for hybrid mode with 2 decimal precision
        statsDiv.style.display = "flex";
        heuristicScoreEl.textContent = result.heuristicScore;
        mlScoreEl.textContent = typeof result.mlScore === 'number' ? result.mlScore.toFixed(2) : result.mlScore;
        totalScoreEl.textContent = typeof result.score === 'number' ? result.score.toFixed(2) : result.score;
        
        if (result.level === "high") {
          const mlFormatted = typeof result.mlScore === 'number' ? result.mlScore.toFixed(2) : result.mlScore;
          const totalFormatted = typeof result.score === 'number' ? result.score.toFixed(2) : result.score;
          statusBox.textContent = `🚨 Dangerous site (H:${result.heuristicScore} + ML:${mlFormatted} = ${totalFormatted})`;
          statusBox.className = "phishing";
        } else if (result.level === "medium") {
          const mlFormatted = typeof result.mlScore === 'number' ? result.mlScore.toFixed(2) : result.mlScore;
          const totalFormatted = typeof result.score === 'number' ? result.score.toFixed(2) : result.score;
          statusBox.textContent = `⚠️ Suspicious site (H:${result.heuristicScore} + ML:${mlFormatted} = ${totalFormatted})`;
          statusBox.className = "unknown";
        } else {
          const mlFormatted = typeof result.mlScore === 'number' ? result.mlScore.toFixed(2) : result.mlScore;
          const totalFormatted = typeof result.score === 'number' ? result.score.toFixed(2) : result.score;
          statusBox.textContent = `✅ Safe site (H:${result.heuristicScore} + ML:${mlFormatted} = ${totalFormatted})`;
          statusBox.className = "safe";
        }
      } else {
        // Heuristics only mode
        statsDiv.style.display = "none";
        if (result.level === "high") {
          statusBox.textContent = `🚨 Dangerous site (${result.score} risk points)`;
          statusBox.className = "phishing";
        } else if (result.level === "medium") {
          statusBox.textContent = `⚠️ Suspicious site (${result.score} risk points)`;
          statusBox.className = "unknown";
        } else {
          statusBox.textContent = "✅ Safe site";
          statusBox.className = "safe";
        }
      }
      
      // Show detection details
      if (result.details && result.details.length > 0) {
        detailsDiv.style.display = "block";
        detailList.innerHTML = "";
        result.details.forEach(detail => {
          const detailItem = document.createElement("div");
          detailItem.className = "detail-item";
          detailItem.textContent = detail;
          detailList.appendChild(detailItem);
        });
      } else {
        detailsDiv.style.display = "none";
      }
      
      console.log("✅ Popup status updated to:", statusBox.textContent);
    }

    // Always run a fresh scan when popup opens to ensure consistency
    let isScanning = false; // Prevent multiple simultaneous scans
    
    async function loadCurrentStatus() {
      if (isScanning) {
        console.log("⚠️ Scan already in progress, skipping...");
        return;
      }
      
      isScanning = true;
      
      try {
        const tabsResult = await tabs.query({ active: true, currentWindow: true });
        const tab = tabsResult[0];
        const tabId = tab.id;
        
        console.log("🔍 Current page URL:", tab.url);
        console.log("🔍 Tab ID:", tabId);
        
        // Check if content script can run on this page
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') || 
            tab.url.startsWith('file://') ||
            tab.url.startsWith('about:') ||
            tab.url.startsWith('moz-extension://')) {
          console.log("⚠️ Content script cannot run on this page type:", tab.url);
          statusBox.textContent = "❌ Cannot scan this page type";
          statusBox.className = "unknown";
          statsDiv.style.display = "none";
          detailsDiv.style.display = "none";
          isScanning = false;
          return;
        }
        
        // Firefox-specific content script handling
        if (isFirefox) {
          // Firefox doesn't support scripting.executeScript, so we rely on content script being already loaded
          console.log("🦊 Firefox detected - content script should already be running");
          // Wait a bit for content script to be ready
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Chrome/Edge content script injection
          try {
            // First try to ping existing content script
            let isAlive = false;
            try {
              isAlive = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 1000);
                // Use correct API for Firefox vs Chrome
                const messageAPI = isFirefox ? browser.tabs : chrome.tabs;
                messageAPI.sendMessage(tabId, { action: 'ping' }, (res) => {
                  clearTimeout(timeout);
                  resolve(res && res.ok === true);
                });
              });
            } catch (_) {}
            
            if (!isAlive) {
              // Inject content script if not alive
              await scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              });
              console.log("✅ Content script injected (was not alive)");
              // Wait for content script to initialize
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log("✅ Content script already running");
              // Still wait a bit to ensure it's fully ready
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (injectError) {
            console.warn("⚠️ Content script injection failed:", injectError);
          }
        }
        
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Scan timeout - content script may not be ready"));
          }, 5000); // Increased timeout

          // Use correct API for Firefox vs Chrome
          const messageAPI = isFirefox ? browser.tabs : chrome.tabs;
          const runtimeAPI = isFirefox ? browser.runtime : chrome.runtime;
          
          messageAPI.sendMessage(tabId, { action: "scanPhishing", force: true }, (result) => {
            clearTimeout(timeout);
            if (runtimeAPI.lastError) {
              reject(new Error(runtimeAPI.lastError.message));
            } else {
              resolve(result);
            }
          });
        });

        if (response?.result) {
          console.log("📊 Fresh scan result:", response.result);
          updateStatus(response.result);
        } else {
          console.log("⚠️ No fresh result");
          statusBox.textContent = "⚠️ No scan result - try refreshing the page";
          statusBox.className = "unknown";
          statsDiv.style.display = "none";
          detailsDiv.style.display = "none";
        }
      } catch (error) {
        console.error("❌ Error loading current status:", error);
        
        // Simple error handling
        statusBox.textContent = "⚠️ Page not ready - try refreshing";
        statusBox.className = "unknown";
        statsDiv.style.display = "none";
        detailsDiv.style.display = "none";
        
        // Try to use stored result as fallback
        try {
          storage.local.get("phishingResult", ({ phishingResult }) => {
            if (phishingResult) {
              console.log("📊 Using stored result as fallback:", phishingResult);
              updateStatus(phishingResult);
            }
          });
        } catch (storageError) {
          console.warn("⚠️ Could not load stored result:", storageError);
        }
      } finally {
        isScanning = false; // Reset flag
      }
    }

    // Load current status when popup opens
    loadCurrentStatus();

    scanBtn.addEventListener("click", async () => {
      if (isScanning) {
        console.log("⚠️ Scan already in progress, ignoring click...");
        return;
      }
      
      isScanning = true;
      statusBox.textContent = "Scanning…";
      statusBox.className = "unknown";
      statsDiv.style.display = "none";
      detailsDiv.style.display = "none";

      try {
        const tabsResult = await tabs.query({ active: true, currentWindow: true });
        const tab = tabsResult[0];
        const tabId = tab.id;

        // Check if content script can run on this page
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') || 
            tab.url.startsWith('file://') ||
            tab.url.startsWith('about:') ||
            tab.url.startsWith('moz-extension://')) {
          console.log("⚠️ Content script cannot run on this page type:", tab.url);
          statusBox.textContent = "❌ Cannot scan this page type";
          statusBox.className = "unknown";
          statsDiv.style.display = "none";
          detailsDiv.style.display = "none";
          return;
        }
        
        // Firefox-specific content script handling for scan
        if (isFirefox) {
          // Firefox doesn't support scripting.executeScript, so we rely on content script being already loaded
          console.log("🦊 Firefox detected for scan - content script should already be running");
          // Wait a bit for content script to be ready
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Chrome/Edge content script injection for scan
          try {
            // First try to ping existing content script
            let isAlive = false;
            try {
              isAlive = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 1000);
                // Use correct API for Firefox vs Chrome
                const messageAPI = isFirefox ? browser.tabs : chrome.tabs;
                messageAPI.sendMessage(tabId, { action: 'ping' }, (res) => {
                  clearTimeout(timeout);
                  resolve(res && res.ok === true);
                });
              });
            } catch (_) {}
            
            if (!isAlive) {
              // Inject content script if not alive
              await scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              });
              console.log("✅ Content script injected for scan (was not alive)");
              // Wait for content script to initialize
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log("✅ Content script already running for scan");
              // Still wait a bit to ensure it's fully ready
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (injectError) {
            console.warn("⚠️ Content script injection failed:", injectError);
          }
        }

        // Single scan attempt with better error handling
        let response = null;
        
        try {
          response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Scan timeout - content script may not be ready"));
            }, 5000); // 5 second timeout

            // Use correct API for Firefox vs Chrome
            const messageAPI = isFirefox ? browser.tabs : chrome.tabs;
            const runtimeAPI = isFirefox ? browser.runtime : chrome.runtime;
            
            messageAPI.sendMessage(tabId, { action: "scanPhishing", force: true }, (result) => {
              clearTimeout(timeout);
              if (runtimeAPI.lastError) {
                reject(new Error(runtimeAPI.lastError.message));
              } else {
                resolve(result);
              }
            });
          });

          console.log("📡 Scan response received:", response);
        } catch (scanError) {
          console.warn("⚠️ Scan failed:", scanError.message);
          // Don't retry, just show error
        }

        if (response?.result) {
          console.log("💾 Storing new result:", response.result);
          try {
            await storage.local.set({ phishingResult: response.result });
          } catch (storageError) {
            console.warn("⚠️ Storage error:", storageError);
          }
          updateStatus(response.result);
        } else if (response?.error) {
          console.error("❌ Scan returned error:", response.error);
          statusBox.textContent = "Scan error: " + response.error;
          statusBox.className = "unknown";
        } else {
          console.log("⚠️ No response from content script");
          statusBox.textContent = "⚠️ Scan failed - try refreshing the page";
          statusBox.className = "unknown";
          statsDiv.style.display = "none";
          detailsDiv.style.display = "none";
        }
      } catch (error) {
        console.error("❌ Scan error:", error);
        
        // Simple error message
        statusBox.textContent = "⚠️ Scan failed - try refreshing the page";
        statusBox.className = "unknown";
        statsDiv.style.display = "none";
        detailsDiv.style.display = "none";
      } finally {
        isScanning = false; // Reset flag
      }
    });
  });
}

// Initialize popup
runPhishShieldPopup();