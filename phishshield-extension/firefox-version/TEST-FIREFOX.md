# 🧪 Test Your Firefox Extension

## **Step 1: Load the Extension**
1. Open Firefox → `about:debugging`
2. Click **"This Firefox"** tab
3. Click **"Load Temporary Add-on..."**
4. Select `manifest.json` from this folder
5. Click **"Open"**

## **Step 2: Test the Extension**
1. Go to any website (like `google.com`)
2. Look for the **green banner** at the top
3. Click the **PhishShield icon** in toolbar
4. Click **"Scan Current Site"** button

## **Expected Results:**
- ✅ **Green banner** shows "SAFE site" with scores
- ✅ **Popup opens** without errors
- ✅ **Scan button works** and shows results
- ✅ **No more "Scan failed"** messages

## **If Still Getting Errors:**
- Check Firefox console (F12 → Console)
- Look for red error messages
- Make sure you're using the `firefox-version` folder

**The extension should now work perfectly in Firefox! 🦊**
