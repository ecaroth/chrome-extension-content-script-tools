"use strict";
/* globals chrome */

window.CONTENT_SCRIPT_TOOLS = (() => {

    const   _tab_state = {},
            _url_matches = [],
            _tab_change_callbacks = [];

    //setup a list of scripts/stylesheets that should be loaded when a tab is opened/loaded @ a matching URL pattern
    //NOTE matches can be a string, regex, function that returns true/false (w/ tab passed in) or array of strings/regexes/functions
    //NOTE namespace can also be included to group a set of matches for later unregistrations or logging
    function _register_content_resources_for_tab_urls( matches, scripts, stylesheets, cb, namespace ){
        let match_id = (new Date().getTime())+':'+(Math.floor(Math.random()*(999999-100000+1)+10000)); //id for match pattern group to prevent multiple loading for multi-matches
        if(typeof(matches) !== 'object') matches = [matches];

        function escapeRegExp(string){
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }

        matches.forEach( match => {
            if(!(match instanceof RegExp) && typeof match  !== 'function') {
                match = new RegExp( escapeRegExp(match), 'i' );
            }
            _url_matches.push({
                scripts,
                stylesheets,
                cb,
                match,
                match_id,
                namespace
            });
        });
    }

    //unregister a group of namespaced match sets
    function _unregister_content_resources_by_namespace( namespace ){
        for(let i=_url_matches.length-1; i>=0; i--){
            var match = _url_matches[i];
            
            if( match.namespace && match.namespace===namespace ){
                _url_matches.splice(i, 1);
            }
        }
    }

    //load a content script(s) into the specified tab_id and run a callback when all scripts are present/loaded
    function _load_content_scripts_in_tab( content_scripts, tab, cb, run_at_doc_start, all_frames ){
        if(!content_scripts) return;

        //coerce tab to tabId
        if(typeof tab === 'object') tab = tab.id;

        if(typeof content_scripts !== 'object') content_scripts = [content_scripts];

        let _needed_scripts = content_scripts.length;

        function _script_loaded(){
            _needed_scripts--;
            if(_needed_scripts === 0 && typeof cb === 'function'){
                //all scrips are loaded
                chrome.tabs.get( tab, cb_tab => {
                    cb( cb_tab );
                });
            }
        }

        content_scripts.forEach( cscript => {
            chrome.tabs.executeScript( tab, {
                file: cscript,
                runAt: run_at_doc_start ? 'document_start' : 'document_end',
                allFrames: all_frames ? true : false
            }, _script_loaded );
        });
    }

    //load a stylesheet in the content tab
    function _load_content_stylesheets_in_tab( stylesheets, tab ){
        if(!stylesheets) return;
        //coerce tab to tabId
        if(typeof tab === 'object') tab = tab.id;

        if(typeof(stylesheets) != 'object') stylesheets = [stylesheets];

        stylesheets.forEach( ssheet => {
            chrome.tabs.insertCSS( tab, {
                file: ssheet,
                runAt: 'document_start'
            });
        });
    }

    //load all exisitng matches that are active currently (potentially specified by namespace)
    //NOTE - this funciton is intended to be run after adding listeners that haven't YET been called on existing open tabs
    function _execute_existing_tab_load_matches( namespace ){
        chrome.tabs.query( {}, tabs => {
            tabs.forEach( tab => {
                if(!tab.url) return;
                 _execute_content_script_matching_loads_on_tab( tab, namespace );
            });
        });
    }

    //function called any time a tab is fundamentally changed (URL changed, new tab, reloaded)
    function _tab_changed(tab, closing){
        //determine the type of tab change (load, reload, hash_change, close)
        //NOTE - if closing==true, then tab is just tab.id NOT the whole tab object
        let tab_id = closing ? tab : tab.id,
            change_type = 'load';

        if(closing){

            change_type = 'close';
            delete _tab_state[tab_id];

        }else if(!closing && !(tab_id in _tab_state)){

            change_type = 'load';

        }else if(tab_id in _tab_state){

            if(tab.url ===_tab_state[tab_id]){
                change_type = 'reload';
            }else{
                let orig_url_parts = _tab_state[tab_id].split("#"),
                    new_url_parts = tab.url.split("#");
                if(orig_url_parts[0] === new_url_parts[0]){
                    //same base url
                    if(orig_url_parts.length !== new_url_parts.length || orig_url_parts[1] !== new_url_parts[1]){
                        change_type = 'hash_change';
                    }
                }
            }
        }

        _tab_change_callbacks.forEach( cb => {
            let types = cb[1];
            if(!types || types.indexOf(change_type) !== -1){
                cb[0](tab, change_type);
            }
        });

        if(!closing){
            _execute_content_script_matching_loads_on_tab( tab );
        }
    }

    function _execute_content_script_matching_loads_on_tab( tab, namespace ){
        let matched_ids = [];
        _url_matches.forEach( rule => {

            if(namespace && rule.namespace !== namespace) return;

            if(typeof rule.match === 'function'){
                if(!rule.match(tab)) return;
            }else {
                if (!rule.match.test(tab.url)) return;
            }
            if(matched_ids.indexOf(rule.match_id) !== -1) return;
            matched_ids.push(rule.match_id);

            //load CSS first then JS
            _load_content_stylesheets_in_tab( rule.stylesheets, tab.id );
            _load_content_scripts_in_tab( rule.scripts, tab, rule.cb );
        });
    }

    //listen for new tabs and fire appropraite url match listeners/sctions
    chrome.tabs.onUpdated.addListener( (tab_id, info, tab) => {
        if(info.status === 'complete' && tab.url){ //new tab loaded
            _tab_changed(tab, false);
            if(tab.url) _tab_state[tab_id] = tab.url;
        }
    });
    //listen for tabs closing
    chrome.tabs.onRemoved.addListener( tab_id => {
        _tab_changed(tab_id, true);
    });

    return {
        registerContentResourcesForTabUrls: _register_content_resources_for_tab_urls,
        unregisterContentResourcesByNamespace: _unregister_content_resources_by_namespace,
        executeExitingTabLoadMatches: _execute_existing_tab_load_matches,
        loadContentScriptsInTab: _load_content_scripts_in_tab,
        loadContentStylesheetsInTab: _load_content_stylesheets_in_tab,
        addTabChangedCallback: (cb, types) => {
            if (types && typeof types !== 'object') types = [types];
            _tab_change_callbacks.push([cb, types]);
        }
    };
})();