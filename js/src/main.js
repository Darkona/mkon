$(window).on('gesturechange', function(e){ 
    MKON.LAYOUT.resize();
});

$(window).resize(function() {
    MKON.LAYOUT.resize();
});


$(window).load(function() {

    $('body').fadeIn('slow');
    MKON.init();
    //MKON.LAYOUT.openList();

    alertify.set({ buttonReverse: true });

    // Add Modules Open Button
    $('#openList').fastClick(function() {

        if (MKON.LAYOUT.locked) {
            MKON.LAYOUT.unlock();

        }
        MKON.LAYOUT.closeMenu();
        MKON.LAYOUT.openList();

        return false;

    });

    // Add Modules Close Button
    $('#closeButton').fastClick(function() {
        MKON.LAYOUT.closeList();
        return false;
    });

    // Import/Export Button
    $('#exportModules').fastClick(function() {

        MKON.LAYOUT.serialize();
        MKON.LAYOUT.openOverlay();

        alertify.set({ labels: {
            ok     : "IMPORT",
            cancel : "CANCEL"
        } });

        alertify.prompt("<i class=\"fa fa-long-arrow-down\"></i><i class=\"fa fa-long-arrow-up\"></i> &nbsp; IMPORT / EXPORT", function (e,str) {
            if (e) {
                MKON.LAYOUT.closeOverlay();   

                // check if a valid input
                if (str != '' && typeof str !== 'undefined') {                     
                    MKON.LAYOUT.generate(JSON.parse(str));  
                }        


            } else {
                MKON.LAYOUT.closeOverlay();
            }
        }, JSON.stringify(MKON.LAYOUT.currentLayout) );

        alertify.set({ labels: {
            ok     : "OK",
            cancel : "CANCEL"
        } });

        return false;
    });

    // Clear button
    $('#clearModules').fastClick(function() {

        MKON.LAYOUT.initGridster();

        if (MKON.CONTENT.activeModules.length > 0) {          

            // confirm dialog
            MKON.LAYOUT.openOverlay();

            alertify.confirm("<i class=\"fa-times-circle fa\"></i> &nbsp; Clear ALL modules?", function (e) {

                if (e) {
                    MKON.LAYOUT.clear();
                    MKON.LAYOUT.save();
                    
                } else {}
                MKON.LAYOUT.closeOverlay();

            });
        

        } else {
            alertify.alert('No modules!');
        }

        return false;

    });

    // Mobile Menu Toggle
    $('#mobileMenu').fastClick(function() {
        MKON.LAYOUT.toggleMenu();     
    });

    // Lock/Unlock Button Toggle
    $('#lockUnlock').fastClick(function() {

        if (MKON.LAYOUT.locked) { 
            MKON.LAYOUT.unlock();   


        } else {
            MKON.LAYOUT.lock();
        }

        return false;

    });

    // Add buttons for modules in gui
    $('#moduleContainer .addButton').fastClick(function(e) {

        e.preventDefault(); // if you want to cancel the event flow
        var button = $(e.target).parent();
        var moduleName = button.data('link');
        MKON.CONTENT.retrieveModule(moduleName);
        return false;

    });
     
    // Search Filter list for AddModule Overlay
    $("#filterButton").on("change", function() {  
        var moduleContainer = $('#moduleContainer');
        var val = this.value;      
        moduleContainer.removeClass();
        switch(val)
        {
            case "all":            
            break;

            case "buttons":
            moduleContainer.addClass('show-button');           
            break;

            case "screens":
            moduleContainer.addClass('show-screen');
            break;

            case "resources":
            moduleContainer.addClass('show-resource');
            break;

            case "dials":
            moduleContainer.addClass('show-dial');
            break;

            case "scales":
            moduleContainer.addClass('show-scale');
            break;

            default:
            
        }
    });

    // Remove buttons on active modules
    $('#gridster').on('fastClick', '.remove', function (e) {       
            var parent = $(e.target).closest('li');
            MKON.CONTENT.removeModule(parent);
            MKON.LAYOUT.save();

            return false;
    }); 

    // Triggers control functions on module buttons
    $('#gridster').on('fastClick', '.button', function (e) {   

            var button = $(e.target);

            e.preventDefault(); // if you want to cancel the event flow

            if (!(button.hasClass('no-toggle')) || !(button.hasClass('action') || !(button.hasClass('abort'))) )  {

                button.toggleClass('gray');   

                var com = button.closest('li').attr('data-com') || false;

                if (!com) {} else {
                    MKON.COMMS.command(com);
                }
            
            }      

            return false;
    });

});

var isMobile = false;

if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
    isMobile = true;
    document.write('<script src="http://jsconsole.com/remote.js?A347700A-FD65-4F75-88B1-9E5E2AD4E7EB"></script>');    
}

Storage.prototype.setObj = function(key, obj) {
    var o = obj || 'Null';
    return this.setItem(key, JSON.stringify(o))
}

Storage.prototype.getObj = function(key) {
    return JSON.parse(this.getItem(key))
}


var MKON = new Object();

MKON = { 

    // Comms config
    debug: true,
    controls: true, // set to false to disable remote control
    rate: 50,
    localStorageSupport: false,
    cacheString: 'MKON',
    datalink:  "ws://" + window.location.host + "/datalink",  
    defaults: { 
        "+": ['v.name', 'p.paused'],
        "rate": this.rate
    },

    init: function() {      

        this.COMMS.init(this.datalink, this.defaults);
        this.LAYOUT.init();
    },

    module: function(name, type, id, req, handle, command) {    
            this.name = name;
            this.type = type;
            this.id = id;
            this.req = req || [''];
            this.handleData = handle;    
            this.url = '';
            this.col = "100";
            this.row = "100";
    },

     // Server Interactions (websockets w/fallback)
    COMMS: {

        ws: '',
        active: false,
        paused: false,
        received: false,   
        overflowList: [],   
        overflowActive: false,                   

        init: function(datalink, defaults) {        

            //ws = $.gracefulWebSocket(this.datalink);
            if ("WebSocket" in window) {
                
                try {

                    ws = $.gracefulWebSocket(datalink);
        
                    if (MKON.debug) { console.log('Websockets supported!'); };

                    ws.onopen = function(evt) {

                        if (MKON.debug) { console.log('Connection established!'); };

                        ws.send(JSON.stringify(defaults));  
                    };

                    ws.onmessage = function(evt) {

                        if (MKON.debug) { 
                            // only enable if you like spam
                            //console.log("Received Data" + evt.data); 
                        };

                        MKON.CONTENT.filterData(evt.data);
                        MKON.COMMS.active = true;
                    };  

                    ws.onerror = function(err) {

                        console.log("Error: " + err.data);

                        MKON.COMMS.active = false;

                    };

                    ws.onclose = function(evt) { if (MKON.debug) { console.log("Connection closed."); };  MKON.COMMS.active = false; };

                    
                } 
                catch (error) {
                    console.log(error);
                    return false;
                }


            } else {

                console.log('Websockets not supported');
            }        

        },

        // sets the data rate
        rate: function(v) {

            if (this.active) {
                
                if (MKON.debug) { console.log('Changing rate to:' + v); };

                ws.send(JSON.stringify({
                        "rate": v
                }));

                MKON.currentRate = v;

            } else {
                this.overflow(v,'rate');
            }

        },

        subscribe: function (v) {

            if (this.active) {
                
                if (MKON.debug) {  console.log('subscribing:' + v); };

                ws.send(JSON.stringify({
                        "+": v
                }));
            } else {
                this.overflow(v,'+');
            }
        },

        unsubscribe: function (v) {

            if (this.active) {

                if (MKON.debug) {  console.log('unsubscribing:' + v); };

                ws.send(JSON.stringify({
                        "-": v
                }));
            }  else {
                this.overflow(v,'-');
            }
        },

        command: function (c) { 
            
            if (MKON.controls) {
                if (MKON.LAYOUT.locked && this.active) {

                    this.active = false; // wait for at least one reply per command    

                    ws.send(JSON.stringify({
                        "run": [ c ]
                    }));
                } else {
                    this.overflow(c,'run');
                }
            }
        },

        // For stacking commands if the websocket server drops out
        overflow: function(data, type) {
          
            var entry = [ type, data ];

            this.overflowList.push(entry);

            if (this.overflowList.length > 0 && !this.overflowActive) {

                if (MKON.debug) { console.log('Overflow Active'); };

                this.overflowActive = true;  

                function waitUntilActive() {

                    if (MKON.COMMS.active){
                        MKON.COMMS.clearOverflow();  
                        MKON.COMMS.overflowActive = false;        
                    } else {
                        setTimeout(waitUntilActive, MKON.rate[0]);
                    }
                }

                waitUntilActive(); 
            }
        },

        // Sends all cached commands
        clearOverflow: function() {

            if (MKON.debug) { console.log('Overflow Deactivated. '); };

            for (var i = 0; i< this.overflowList.length; i++) {

                var c = this.overflowList[i][0];
                var v = this.overflowList[i][1];
                if (c == "+") {
                    this.subscribe(v);
                } else if (c == "-") {
                    this.unsubscribe(v);
                } else if (c == "run") {
                    this.command(v);
                } else if (c == "rate") {
                    this.rate(v);
                }
            }

            this.overflowList = [];
        }



    },

    // Save, setup templates and ui interactions (key binding etc)
    LAYOUT: {

        locked: false,
        gridster:'',
        gridMargins: 4, // 4
        gridWidth: 112, // 112
        defaultCol: 100, // 100
        defaultRow: 100, // 100
        startCol: 100, // 100
        startRow: 100, // 100
        lockUnlockWrapper: $( document.getElementById('lockUnlockWrapper') ),
        lockUnlockBtnIcon: $( document.getElementById('lockUnlockBtnIcon') ), 
        overlayWrapper: $( document.getElementById("overlayWrapper") ),
        moduleList: $( document.getElementById("moduleList") ),
        logo:$(document.getElementById("logo") ),
        menu:$(document.getElementById("menu") ),
        header: $( $('header') ),
        currentLayout: [],
        prevLayout: false,

        init: function() {

            // Resize the gridster ul according to window size        
            this.resize();
            this.gridster = $("#gridster").gridster().data('gridster'); 
            this.setup();
            this.unlock();          

        },

        resize: function() {

            // Offset fix for gridster's crappy margin config
            var windowWidth = $(window).width();
            var cols = (Math.floor(windowWidth/this.gridWidth) ) -1;
            var totalWidth = cols * this.gridWidth;
            var margins = (this.gridMargins*2) * cols;
            var offsetX = windowWidth - (margins + totalWidth);
            $('#gridsterWrapper').css('left', Math.abs(offsetX/2) + 'px');

            this.initGridster();    
        },

        setup: function() {
        
            var urlLayout = window.location.hash.substring(1);                 

            // Check if url layout available
            if (urlLayout) {
                this.prevLayout = JSON.parse(urlLayout);
                this.generate(this.prevLayout);
                //console.log('layout:' + prevLayout);
            } else {
                this.prevLayout = false;
            }

            // If localstorage available
            if(typeof(Storage)!=="undefined") {   

                if (MKON.debug) {  console.log('LocalStorage supported'); };
                MKON.localStorageSupport = true; 


                try { 

                    if (!this.prevLayout) {
                        this.prevLayout = localStorage.getObj(MKON.cacheString);      
                        if (MKON.debug) { console.log('Cache found. [' + this.prevLayout + ']'); };    
                    }
                               
                    if (this.prevLayout != null) {

                        function waitUntil() {
                            if (MKON.COMMS.active){
                                MKON.LAYOUT.generate( MKON.LAYOUT.prevLayout );            
                            } else {
                                setTimeout(waitUntil, MKON.rate);
                            }
                        }

                        //waitUntil();                           

                        MKON.LAYOUT.generate( MKON.LAYOUT.prevLayout );    

                        if (MKON.debug) { console.log('Generating layout.'); };
                    }  

                } catch (error) {
                    console.log('Error getting cache. [' + error + ']');
                }

            }

        },

        initGridster: function() {

            // Gridster Config
            $(".gridster ul").gridster({

                widget_selector: "li",
                widget_margins: [this.gridMargins, this.gridMargins],
                widget_base_dimensions: [this.gridWidth, 112],
                draggable: {
                        start: function(event, ui){ 

                        },
                        stop: function(event, ui){ 

                            
                            var el = $(event.target).parent();

                            var id = el.attr('id');
                            var col = el.attr('data-col');
                            var row = el.attr('data-row'); 

                            //console.log(id + ' ' + col + ' ' + row);
                           
                            MKON.CONTENT.updateModule( id, col, row );

                            setTimeout(function() { MKON.LAYOUT.save(); }, 100);
                        }
                },
                resize: {
                    enabled: true
                },
                min_cols: 3,
                serialize_params: function($w, wgd) {
                    return {
                        c: wgd.col,
                        r: wgd.row,
                        u: $($w).attr('data-link')
                    }
                }

            });

        },

        remove: function(target) {

            this.gridster.remove_widget(target);

       
        },

        add: function(content) {
           
            this.gridster.add_widget(content.html, content.x, content.y, content.col, content.row); 

        

        },

        save: function() {

           

            if (MKON.localStorageSupport) {

                this.serialize();  
                if (MKON.debug) {  console.log('Saving...'); };

                try {
                    localStorage.setObj(MKON.cacheString, this.currentLayout);
                    if (MKON.debug) { console.log('Layout save successful.'); }
                }
                catch (error) {

                    if (MKON.debug) { console.log('Error saving. [' + error + ']'); };
                }
                
            }

        },

        clear: function() {

            this.gridster.remove_all_widgets(); 

            MKON.CONTENT.activeModules = [];

            for (var i=0; i<MKON.CONTENT.activeVariables.length; i++) {

                MKON.COMMS.unsubscribe( MKON.CONTENT.activeVariables[i][0] );
                console.log(MKON.CONTENT.activeVariables[i][0]);

            }

            this.checkLogo();
            
            MKON.CONTENT.activeVariables = [];
        },

        serialize: function() {

            this.currentLayout = this.gridster.serialize();

            for (var item in this.currentLayout) {
                if (this.currentLayout.hasOwnProperty(item)) {     
                    var u = this.currentLayout[item].u;
                    var c = this.currentLayout[item].c;
                    var r = this.currentLayout[item].r;
                    //console.log(u + ' ' +c + ' ' + r);
                }
            }
        },

        generate: function(data) {

            this.clear();
           
            for (var item in data) {

                if (data.hasOwnProperty(item)) {     
                    var u = data[item].u;
                    var c = data[item].c;
                    var r = data[item].r;
                    MKON.CONTENT.retrieveModule(u, c, r);   
                }
            }

            this.unlock();

        },

        checkLogo: function() {

            var len = MKON.CONTENT.activeModules.length;  

            if (len < 1 || !(this.locked) ) { 

                if( this.logo.css("display") == 'none' ) {
                    this.logoAnimation('show');
                }

            } else {  

                if( this.logo.css("display") == 'block' ) {  
                    this.logoAnimation('hide');
                }
            }
        },
        
        lockAnimation: function(mode) {

            var wrapper = this.lockUnlockWrapper;
            var icon = this.lockUnlockIcon;
            var btn = this.lockUnlockBtnIcon;

            // Icon switch
            if (mode == 'lock') {
                wrapper.addClass('locked');
                btn.removeClass('fa-unlock').addClass('fa-lock');

            } else if (mode == 'unlock') {
                wrapper.removeClass('locked');
                btn.addClass('fa-unlock').removeClass('fa-lock');
            }
            
            // Animation
            wrapper.addClass('fadeIn').removeClass('fadeOut');

            wrapper.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',   
                function(e) {                
                    wrapper.removeClass('fadeIn').addClass('fadeOut');                
                }
            );
        },

        lock: function() {

            this.lockAnimation('lock');
            this.locked = true;

            this.checkLogo();

            this.lockAnimation('hide');

            $('header').addClass('locked').css('marginTop', '-60px');
            $('#menu').removeClass('expand');
            

            setTimeout(function() {
                 $('header').css('marginTop', '0px');
            }, 300);



            $('#gridsterWrapper').addClass('locked');
            this.gridster.disable();
        },

        unlock: function() {

            this.lockAnimation('unlock');
            this.locked = false;

            this.checkLogo();

            $('header').removeClass('locked');
            

            $('#gridsterWrapper').removeClass('locked');
            this.gridster.enable();

        },

        headerAnimation: function() {

            if (this.locked) {
                this.header.addClass('locked').css('marginTop', '-60px');
            }

            else {

            }

        },

        launchAnimation: function(target, classes, hide) {

            // Animation
            var hide = hide || false;
            target.addClass(classes);
            target.show();

            target.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',   
            function(e) {   

                target.removeClass(classes);    
                if (hide) {     
                    target.hide();
                }                       
            });
        },

        listAnimation: function(direction) {   

            if (direction == 'open') {
                this.header.css('marginTop', '-60px');
                this.launchAnimation(this.moduleList, 'animated-med bounceInUp', false);
            } else if (direction == 'close') {
                this.header.css('marginTop', '0px');
                this.launchAnimation(this.moduleList, 'animated bounceOutDown', true);   
       
            }
        },

        logoAnimation: function(direction) {     

            if (direction == 'show') {
                this.launchAnimation(this.logo, 'fadeInUp', false); 

            } else if (direction == 'hide') {
               this.launchAnimation(this.logo, 'fadeOutDown', true); 
            }

        },   

        closeList: function() {
            this.listAnimation('close');
            this.closeOverlay();
        },

        openList: function() {        
            this.listAnimation('open');
            this.openOverlay();
        },

        openOverlay: function(content) {
            this.overlayWrapper.fadeIn('fast');     
        },

        closeOverlay: function() {
            this.overlayWrapper.fadeOut('fast');   
        },

        closeMenu: function() {
            if (this.menu.hasClass('expand')) {
                this.menu.removeClass('expand');
            }
        },

        toggleMenu:function () {        
             this.menu.toggleClass('expand');       
        }
        
    },

    // Active variables and modules that make up the current layout
    CONTENT: {

        freezeData: false,
        activeModules: [],
        activeVariables: [],
        rawData: [],
        newData: [],

        // Loops through received data and determines what has changed
        filterData: function(data) {

            this.newData = $.parseJSON(data);

            this.rawData = this.newData;

            MKON.COMMS.paused = (this.rawData['p.paused'] == 1) ? true : false;   

            MKON.CONTENT.handleData();

        },

        // Loops through active modules and triggers handleData events for each
        handleData: function() {

            if (MKON.COMMS.active && this.activeModules.length > 0) {
            
                for(var item in this.activeModules) {

                    if (this.activeModules.hasOwnProperty(item)) {            
                        this.activeModules[item].handleData();
                    };
                }
            }
        },

        // Adds a keyboard event to track
        addHook: function(id, key, fnc) {

            // Prevent keyboard hooks being added to mobile devices
            if (!isMobile) {

                Mousetrap.bind(key, fnc);

                var target = $('#'+id);

                target.on('remove', function() {       
                    Mousetrap.unbind(key);
                });
               
            }

        },

        removeHook: function(hook) {

        },

        getVariable: function(v) {
            //console.log(rawData);
            return this.rawData[v];
        },

        // Adds a specified variable request
        addVariable: function(v) {

            var pos = -1;

            for (var i = 0; i<this.activeVariables.length; i++) {

                if (this.activeVariables[i][0] == v)
                {
                    // it already exists
                    pos = i;
                    break;
                } 
            }

            if (pos != -1) {
                if (MKON.debug) { console.log('already tracked'); };
                // if it is already being tracked, increase the track count
                var count = parseFloat( this.activeVariables[pos][1] );
                count++;
                this.activeVariables[pos][1] = count;

            } else {
                if (MKON.debug) { console.log('not yet tracked'); };
                // it's not being tracked, so add a new entry to the array & subscribe
                // var arr = [v, 1];      
                this.activeVariables.push( [v[0], 1] );     
                MKON.COMMS.subscribe( v ); 

                if (!isMobile) { // Desktop only due to performance

                    // dynamically adjust data rate based off of variables
                    var len = this.activeVariables.length;
                    var cur = MKON.currentRate;

                    var ratio = Math.round( len/10 ) - 1;

                    ratio = (ratio < 0) ? 0 : ratio;
                    ratio = (ratio > MKON.rate.length) ? MKON.rate.length : ratio;                

                    // if the calculated rate is not the current one...
                    if (MKON.currentRate != MKON.rate[ratio]) {
                        // change to the new rate
                        MKON.COMMS.rate(MKON.rate[ratio]);
                    }     
                }

            }


         
        },

        removeVariable: function(v) {

            for (var i = 0; i<this.activeVariables.length; i++) {

                if (this.activeVariables[i][0] == v)
                {
                    
                    var count = parseFloat( this.activeVariables[i][1] );  

                    if (count == 1) {

                        if (MKON.debug) { console.log('its the last one'); };
                        this.activeVariables.splice(i,1);
                        MKON.COMMS.unsubscribe(v);

                    } else {
                        count--;    
                        if (MKON.debug) { console.log(count + 'more to go!');  };                                   
                        this.activeVariables[i][1] = count;
                    }

                    break;
                } 
            }

        },

        // Adds a retrieved module to the activeModules list
        addModule: function(mod, content) {

            this.activeModules.push(mod);

            for (var i=0; i<mod.req.length; i++) {

                if (mod.req[i] != '') {
                    this.addVariable( [ mod.req[i] ] );
                }
            }

            MKON.LAYOUT.add(content);

        },

        // Removes the specified module from the activeModules list
        removeModule: function(target) {

            var targetID = target.attr('id');
            var r = [];

            // Remove from activeModules
            for(var item in this.activeModules) {

                 if (this.activeModules.hasOwnProperty(item)) {   

                    if (this.activeModules[item].id == targetID) {

                        mod = this.activeModules[item]; // get vars module needed

                        for (var i=0; i<mod.req.length; i++) {

                            this.removeVariable( [ mod.req[i] ] );

                        }

                        this.activeModules.splice(item, 1);    
                     
                        break;
                    }
                };
            }

            var ind = $(target).index();
            MKON.LAYOUT.remove( $('#gridster li').eq(ind) );

        },

        // Updates grid coords for an activeModule
        updateModule: function(id, newCol, newRow) {

            var id = id;

            for(var i = 0; i<this.activeModules.length; i++) {

                if (this.activeModules[i].id == id) {           
                    this.activeModules[i].col = newCol;
                    this.activeModules[i].row = newRow;
                    break;
                }
            }
        },

        // Imports a module from the default module folder
        retrieveModule: function(url, col, row) {

            var urlString = url;
            var startCol = col || MKON.LAYOUT.defaultCol;
            var startRow = row || MKON.LAYOUT.defaultRow;    

            $.ajax({
                type: "GET",
                url: urlString,
                dataType: "script",
                success: function(data) { 

                    try {
                        init(startCol,startRow, urlString);

                        //MKON.runScript(data);

                        // var last = this.activeModules[this.activeModules.length-1];
                        // this.activeModules[this.activeModules.length-1].url = urlString; 

                        // console.log('url string ' + urlString);
                        // $('#' + last.id).attr('data-link', last.url);  

                        MKON.LAYOUT.save();
                    }
                    catch (error) {
                        console.log('Error Initializing Module [' + error + ']');
                    }              

                },
                error: function (request, status, error) {
                    console.log(error);
                },
                async:false,
                cache: true
            });  

        }

    },

        // Miscellaneous Math & Utility Functions
    FNC: {

        zeroPad: function(num, places) {

            var zero = places - num.toString().length + 1;
            return Array(+(zero > 0 && zero)).join("0") + num;
        },

        toFixed: function(value, precision) {

            var precision = precision || 0,
            neg = value < 0, power = Math.pow(10, precision),
            value = Math.round(value * power),
            integral = String((neg ? Math.ceil : Math.floor)(value / power)),
            fraction = String((neg ? -value : value) % power),
            padding = new Array(Math.max(precision - fraction.length, 0) + 1).join('0');
            return precision ? integral + '.' +  padding + fraction : integral;
        },

        randomString: function (len, charSet) {

            charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var randomString = '';

            for (var i = 0; i < len; i++) {
                var randomPoz = Math.floor(Math.random() * charSet.length);
                randomString += charSet.substring(randomPoz,randomPoz+1);
            }

            return randomString;
        },

        formatters: {

            velocity: function (v) {
                f = this.formatScale(v, 1000, ["Too Large", "m/s", "Km/s", "Mm/s", "Gm/s", "Tm/s"]);
                return this.fix(f.value) + " " + f.unit;
            },

            distance: function (v) {
                f = this.formatScale(v, 1000, ["Too Large", "m", "Km", "Mm", "Gm", "Tm"]);
                return this.fix(f.value) + " " + f.unit;
            },

            formatScale: function (v, s, u) {
                var i = 1;
                var isNeg = v < 0;

                v = Math.abs(v);

                while (v > s) {
                    v = v / s;
                    i = i + 1;
                }

                if (i >= u.length) {
                    i = 0;
                }

                if (isNeg) {
                    v = v * -1;
                }

                return { "value": v, "unit": u[i] };
            },

            unitless: function (v) {

                return FNC.formatters.fix(v);
            },

            time: function (v) {

                f = [86400, 3600, 60, 60];
                u = ["d", "h", "m", "s"];
                vprime = [0, 0, 0, 0]

                v = Math.floor(v);

                for (var i = 0; i < f.length; i++) {
                    vprime[i] = Math.floor(v / f[i]);
                    v %= f[i];
                }
                vprime[f.length - 1] = v;


                for (var i = 1; i < f.length; i++) {
                    if (vprime[i] < 10) {
                        vprime[i] = "0" + vprime[i];
                    }
                }

                var formatted = "";
                for (var i = 0; i < f.length; i++) {
                    formatted = formatted + vprime[i] + u[i] + " ";
                }

                if (formatted == "") {
                    formatted = 0 + u[u.length - 1];
                }

                return formatted;
            },

            date: function (v) {
              year = ((v / (365 * 24 * 3600)) | 0) + 1
              v %= (365 * 24 * 3600)
              day = ((v / (24 * 3600)) | 0) + 1
              v %= (24 * 3600)
              return "Year " + year + ", day " + day + " at " + this.hourMinSec(v)
            },

            hourMinSec: function (v) {
              hour = (v / 3600) | 0
              v %= 3600
              min = (v / 60) | 0
              if (min < 10) { min = "0" + min }
              sec = (v % 60).toFixed()
              if (sec < 10) { sec = "0" + sec }

              hour = MKON.FNC.zeroPad(hour, 2);
              return "" + hour + ":" + min + ":" + sec;
            },

            deg: function (v) {
                return FNC.formatters.fix(v) + '\xB0';
            },

            fix: function (v) {
                if (v === undefined) {
                    return 0;
                } else {
                    return v.toPrecision(6).replace(/((\.\d*?[1-9])|\.)0+($|e)/, '$2$3');
                }
            },

            pad: function (v) {
                return ("\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0" +
                    v).slice(-30)
            },

            sigFigs: function (n, sig) {

                if (n != 0) {
                    var m = false;

                    if (n < 0) {
                        m = true;
                        n = Math.abs(n);
                    }

                    var mult = Math.pow(10,
                        sig - Math.floor(Math.log(n) / Math.LN10) - 1);

                    if (m) {
                        n = n * -1;
                    }

                    return Math.round(n * mult) / mult;
                } else {
                    return 0;
                }
            }
        }

    }

};





