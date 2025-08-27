# Autodarts Scraper Chrome Extension

This repository contains a Chrome extension that lets you define variables on [Autodarts](https://autodarts.io) pages via CSS selectors. Values are scraped and displayed in a live updating dashboard window.

## Usage

1. Load the extension in Chrome by visiting `chrome://extensions`, enabling *Developer mode*, and clicking **Load unpacked**.
2. Choose this folder.
3. Navigate to an Autodarts page and open the extension popup.
4. Enter a variable name and CSS selector, then click **Variable hinzufügen**.
5. Click **Dashboard öffnen** to view a new window that shows the values in real time.

## Development

Variables and values are stored in `chrome.storage`. A content script watches the selected elements using `MutationObserver` and updates the dashboard whenever changes occur.
