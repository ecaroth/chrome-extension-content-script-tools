"use strict";

window.CONTENT_SCRIPT_TOOLS = (function(){

    var _url_matches = {},
        _tab_load_callbacks = [];

    function _register_content_resources_for_url_pattern( match_pattern, scripts, stylesheets, cb ){
        if(typeof(match_pattern) !== 'object') match_pattern = [match_pattern];
        for(var i=0; i<match_pattern.length; i++) {
            var patt = match_pattern[i];
            if (!(patt in _url_matches)) _url_matches[patt] = [];
            _url_matches[patt].push({
                scripts: scripts,
                stylesheets: stylesheets,
                cb: cb
            });
        }
    }

    //load a content script(s) into the specified tab_id and run a callback when all scripts are present/loaded
    function _load_content_scripts_in_tab( content_scripts, tab, cb, run_at_doc_start ){
        if(!content_scripts) return;
        if(typeof(content_scripts) != 'object') content_scripts = [content_scripts];

        var _needed_scripts = content_scripts.length;

        function _script_loaded(){
            _needed_scripts--;
            if(_needed_scripts==0){ //all scripts are loaded
                cb( tab );
            }
        }
        for(var i=0; i<content_scripts.length; i++){
            chrome.tabs.executeScript( tab.id, {
                file: content_scripts[i],
                runAt: run_at_doc_start ? 'document_start' : 'document_end'
            }, _script_loaded );
        }
    }

    //load a stylesheet in the content tab
    function _load_content_stylesheets_in_tab( stylesheets, tab_id ){
        if(!stylesheets) return;
        if(typeof(stylesheets) != 'object') stylesheets = [stylesheets];
        for(var i=0; i<stylesheets.length; i++){
            chrome.tabs.insertCSS( tab_id, {
                file: stylesheets[i],
                runAt: 'document_start'
            });
        }
    }

    //function called any time a tab is fundamentally changed (URL changed, new tab, reloaded)
    function _tab_changed(tab){
        for(var i=0; i<_tab_load_callbacks.length; i++){
            _tab_load_callbacks[i](tab);
        }
        if(tab.url){
            for(var pattern in _url_matches){
                if(tab.url.indexOf(pattern) != -1){
                    console.log("MATCH!"); console.log(pattern);
                    //url matched!
                    for(var j=0; j<_url_matches[pattern].length; j++){

                        //load CSS first
                        _load_content_stylesheets_in_tab( _url_matches[pattern][j].stylesheets, tab.id );
                        _load_content_scripts_in_tab( _url_matches[pattern][j].scripts, tab, _url_matches[pattern][j].cb );
                    }
                }
            }
        }
    }

    //listen for new tabs and fire appropraite url match listeners/sctions
    chrome.tabs.onUpdated.addListener(function(tab_id, info, tab) {
        if(info.status == 'complete'){ //new tab loaded
            _tab_changed(tab);
        }
    });


    return {
        registerContentResourcesForUrlPattern: _register_content_resources_for_url_pattern,
        loadContentScriptsInTab: _load_content_scripts_in_tab,
        addTabChangedCallback: function(cb){ _tab_load_callbacks.push(cb); }
    }
})();