#Chrome Extension Content Script Tools

The Chrome Extension APIs for interacting with tabs are great, but fall short on providing advanced tracking of tab state, change, and convenient event binding/listeners. Additionally, working with content scripts in a dynamic manner is possible but not as easy or convenient as would be ideal.

This script is a collection of useful utilities and tools for Chrome Extensions to help fill those gaps, complex handling of content scripts, allowing loading customized scripts and executing actions onload, in additional to advanced tab state bindings.

*Authored by* [Evan Carothers](https://github.com/ecaroth)

Usage
------

Simply include the file content_script_tools.js in your extension manifest for background scripts, and you can access the object at the `CONTENT_SCRIPT_TOOLS` variable in the global namespace.

Internally, the script keeps a reference of the full set of tabs open in the browser and allows hooking into them via API to bind callbacks to various tab state change events/types and dynamically load content scripts on a page depending on custom checks.

API
------

####.addTabChangedCallback( types, callback )
This function allows you to bind a listener to change events on all tabs in the browser, including specificity for the change types you wish to listen for

`types` (string or array of strings) specific change events you wish to bind the listener to. Options include "_load_", "_close_", "_reload_", and "_hash_change_"

`callback` (function) callback function for when bound events occur, which takes 2 paremeters: _tab_ and _change_type_. _change_type_ is one of types above, and tab is a reference to the Chrome (TODO ADD URL LINK) tab. _PLEASE NOTE_ that when change_type is 'close', tab is an integer of the tab id that was closed (tab.tabId) rather than the full tab, as obviously the tab no longer exists.


####.registerContentResourcesForTabUrls( matches, scripts, stylesheets, callback, namespace )
This function allows you to setup advanced rules for loading resources (scripts & stylesheets) on a tab page, including callback functionality and namespace binding. You setup a group of resources and a set of matches for when those resources should be included on the page, with a callback function that's called when all resources are loaded.

`matches` (string, regex, function or array of these) match conditions for determining if the resources should be loaded on the page. These can include simple strings that are matched to see if they are present in the tab URL, regexes that can match agains the tab URL, or functions that take a single parameter (tab) and return a boolean to determine if they resources should be loaded. You can mix/match these as needed for your use case.

`scripts` (string or array of strings) scripts you wish to load in the tab. _NOTE_ that these should be URLs relative to the extension root dir (and should all start with a leading slash). Also, array ordering is respected when the scripts are loaded on the page.

`stylesheets` (string or array of strings) stylesheets you wish to load in the tab. _NOTE_ that these should be URLs relative to the extension root dir (and should all start with a leading slash). Also, array ordering is respected when the stylesheets are loaded on the page.

`callback` (function) callback you wish to call when loading of all scripts is complete. It takes a single parameter _tab_, which is a refernce to the chrome tab you passed in to load the scripts on

`namespace` (string, optional) an optional namespace you wish to use when registering the watcher. This is used for easy unbinding later (see the API function _unregisterContentResourcesByNamespace_ below)

####.unregisterContentResourcesByNamespace( namespace )
Unbind existing listeners bound with _registerContentResourcesForTabUrls_

`namespace` (string) namespace for listeners that wish to unbind

####.executeExitingTabLoadMatches( namespace )
Execute contente resource watchers bound with _registerContentResourcesForTabUrls_ on existing tabs. This is needed because matches for the listeners are only evaluated on tab load/reload, so if you want your extensions functionality to work on existing pages right at install time you need to bind the watchers you want, then call this function.

`namespace` (string, optional) namespace of specific watchers you want to match 


####.loadContentScriptsInTab( scripts, tab_or_id, callback, run_at_doc_start, all_frames )
This function allows you to load multiple scrips in an existing tab with various options. Under the hood it leverages `chrome.tabs.executeScript` (TODO LINK) but provides advanced functionality including callbacks.

`scripts` (string or array of strings) scripts you wish to load in the tab. _NOTE_ that these should be URLs relative to the extension root dir (and should all start with a leading slash). Also, array ordering is respected when the scripts are loaded on the page.

`tab_or_id` (Tab or ID of tab TODO LINK) chrome tab you want to load the scripts in

`callback` (function) callback you wish to call when loading of all scripts is complete. It takes a single parameter _tab_, which is a refernce to the chrome tab you passed in to load the scripts on

`run_at_doc_start` (boolean, default false) should the scrips be loaded at _document_start_? If false, they are loaded at _document_end_. See the Chrome extension docs for more info TODO LINK

`all_frames` (boolean, default false) should the content scripts be loaded into all frames of the tab (including iframes). See the Chrome etension docs for more info TODO LINK

####.loadContentStylesheetsInTab( stylesheets, tab_or_id )
This function loads stylesheet(s) into a specified tab.

`stylesheets` (string or array of strings) stylesheets you wish to load in the tab. _NOTE_ that these should be URLs relative to the extension root dir (and should all start with a leading slash). Also, array ordering is respected when the stylesheets are loaded on the page.

`tab_or_id` (Tab or ID of tab TODO LINK) chrome tab you want to load the stylesheets in