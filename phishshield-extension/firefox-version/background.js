// background.js - handles service worker logic for PhishShield

chrome.runtime.onInstalled.addListener(() => {
  console.log("🚀 PhishShield background service worker installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "logPhishScan" && message.data) {
    console.log("📄 PhishShield Scan Log:", message.data);
    sendResponse({ status: "received" });
  } else {
    sendResponse({ status: "ignored" });
  }
});

console.log("✅ PhishShield background script loaded.");
