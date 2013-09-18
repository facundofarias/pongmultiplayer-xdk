// Cloud Conductor Component for Pong Multiplayer (taken from http://cgaminglib.com/)

/*********** General Settings ***********/
var LOG_ENABLED = true;

/*************** Internal ***************/
var loginStatus = false;
var playerOptionsMenuEnabled = false;

// Pong credentials
var clientId =      "xmmXAcIXCmQpnK55cymTevbq7sll9BGZ",
	clientSecret =  "UwzbrLjRrYbD9qpq",
	scopes =        "location:basic location:enhanced user:details user:scope profile:full";// profile:external:" + 
                    //clientId + ":read profile:external:" + clientId + ":write billing:confirm";

var selectedStone = "white";

var savedBoard,
    savedStock,
    savedDirection,
    savedPlayers,
    savedPlayerSelection,
    savedPassTurnCounter,
    savedBlockedStock,
    savedStoneDragged,
    savedAllowedPositions,
    formGameBoard;

var map;
var tournamentsMap;
var mapCreated = false;
var tournamentsMapCreated = false;
var mapPlayers = [];
var mapTournaments = [];
var mapPlayersIndex = -1;
var mapTournamentsIndex = -1;
var currentPlayerSemanticLocation = "N/A";
var currentPlayerHighScore = 0;
var currentPlayerCountryCode = "N/A";
var winMatchMessageClosed = true;

var infowindow;
var pubnub;

var gameTags = {
    favoriteStone: "favorite_stone",
    favoriteBoard: "favorite_board"
};

var loginPopup = {
    width: 390,
    height: 600,
    middleLeft: Math.floor((screen.width/2)-(390/2)),
    middleTop: Math.floor((screen.height/2)-(600/2))
};

var mouseOnPlayerProfile = false;

/*************** Framework Body **************/
ccLog = function(message){
	if (LOG_ENABLED) console.log(message);
};

loginLogout = function(){
    playerOptionsMenuEnabled = false;
	if (!isLoggedIn()){
        $("#loginButton").hide();
        $("#playerProfile").fadeIn(300);
        var loadingLoginImg = new Image;
        loadingLoginImg.setAttribute("id", "loadingLoginImg");
        loadingLoginImg.src = 'gfx/ajax-loader.gif';
        document.getElementById("playerProfile").appendChild(loadingLoginImg);

		intel.auth.login({
                environment:    'prod',
				client_id:      clientId,
				secret_id:      clientSecret,
				scope:          scopes,
				redirect_uri:   "urn:intel:identity:oauth:oob:async",
				name:           "Cloud Domino Login",
				specs:          "location=1,status=1,scrollbars=1,width=" + loginPopup.width + ",height=" +
                                loginPopup.height+",top=" + loginPopup.middleTop + ",left=" + loginPopup.middleLeft
			},
			successLoginCallback,
			function(error){
                errorCallback(error);
                intel.auth.logout(
                    function(){
                        loginStatus = false;
                        $("#loadingLoginImg").remove();
                        $("#playerProfile").fadeOut(300);
                        $("#loginButton").show();
                    },
                    errorCallback
                );
            }
		);
	} else {
        closeAnyOtherPanel();
        document.getElementById("playerProfile").innerHTML = "";
        var loadingLogoutImg = new Image;
        loadingLogoutImg.setAttribute("id", "loadingLogoutImg");
        loadingLogoutImg.src = 'gfx/ajax-loader.gif';
        document.getElementById("playerProfile").appendChild(loadingLogoutImg);
		intel.auth.logout(
			function(){
                loginStatus = false;
                $("#loginButton").show();
                $("#loadingLogoutImg").remove();
                $("#playerProfile").fadeOut(300);
                document.getElementById("player1_legend").innerHTML = "Player 1";
                $("#playerOptionsMenu").hide();
                document.getElementById("playerProfile").innerHTML = "";
                setGameDefaultConfig();
				cG.reset();
                endCommChannel();
			},
			errorCallback
		);
	}
};

successLoginCallback = function(data){
    playerOptionsMenuEnabled = true;

    pubnub = PUBNUB.init({
        'publish_key'   : 'pub-c-37cbe164-6f5f-4dc7-a2e1-0b4d68bfc602',
        'subscribe_key' : 'sub-c-899cc5a8-8a75-11e2-bbdf-12313f022c90',
        'origin'        : 'pubsub.pubnub.com',
        'ssl'           : false,
        'uuid'          : PUBNUB.uuid()
    });
    
	ccLog("Login OK!");// - Token: " + data.access_token.token);
	loginStatus = true;
    $("#loadingLoginImg").remove();
    document.getElementById("playerProfile").innerHTML = "";
    var loadingImg = new Image;
    loadingImg.setAttribute("id", "loadingProfileImg");
    loadingImg.src = 'gfx/ajax-loader.gif';
    document.getElementById("playerProfile").appendChild(loadingImg);
	cG.start(
		function(){
            if(cG.player.getName().indexOf('@') === -1) {
                document.getElementById("player1_legend").innerHTML = cG.player.getName();
            } else {
                document.getElementById("player1_legend").innerHTML = cG.player.getName().substr(0, cG.player.getName().indexOf('@'));
            }            
            configureGame();
            
            cG.player.getLocation({semantic: true},
                function(country, city, countryCode){
                    currentPlayerSemanticLocation = country + ", " + city;
                    currentPlayerCountryCode = countryCode;
                },
                function(error){
                    errorCallback(error);
                }
            );
            
            startCommChannel();
		},
		errorCallback
	);
};

errorCallback = function(error){
	ccLog("ERROR:" + JSON.stringify(error));
};

isLoggedIn =  function(){
	return loginStatus;
};

configureGame = function(){
    var img = new Image;
    img.id = "avatarIconImage";
    img.style.display = "inline";

    cG.player.getAvatarIcon(
		function(playerIcon){
            $("#loadingProfileImg").remove();
			ccLog("Player Icon Available");
            img.src = playerIcon;
            $('#playerProfile').append("<div id='settingsLegendDiv' class='settingsLegend'>Settings</div>");
    		document.getElementById("playerProfile").appendChild(img);
		},
		function(error){
            $("#loadingProfileImg").remove();
			ccLog("No player icon available for this player");
            img.src = 'gfx/anonymous.png';
            $('#playerProfile').append("<div id='settingsLegendDiv' class='settingsLegend'>Settings</div>");
            document.getElementById("playerProfile").appendChild(img);
		}
	);
    cG.player.getDataItem(
		{tag: gameTags.favoriteStone},
		function(favStone){
			console.log("Favorite player stone: " + favStone);
            selectStone(favStone);
		},
		function(error){
			console.log("No favorite player stone, using default");
		}
	);
    cG.player.getDataItem(
		{tag: gameTags.favoriteBoard},
		function(board){
			console.log("Favorite player board: " + board);
            selectBoard(board);
		},
		function(error){
			console.log("No favorite player board, using default");
		}
	);
    cG.player.getHighScore(
        function(score){
            currentPlayerHighScore = score;
        },
        function(error){
            console.log("No player highscore available: " + error.message);
        }
    );
    cG.player.getLocation({semantic: false},
        function(position){
            publishPlayerLocation(
                {latitude: position.coords.latitude,
                 longitude: position.coords.longitude}
            );
        },
        errorCallback
   );
};

playerOptionsHandler = function(event){
  if (!playerOptionsMenuEnabled){
    return;
  }
  var ele = document.getElementById("playerProfile");
  var deltaTop = 0;
  var left = 0;

  if (document.getElementById('playerOptionsMenu').style.display == "block"){
    $("#playerOptionsMenu").fadeOut(200);
    return;
  } else {
    while(ele.tagName != "BODY") {
      deltaTop += ele.offsetTop;
      left += ele.offsetLeft;
      ele = ele.offsetParent;
    }

    if (document.getElementById("playerProfile").innerHTML != "Anonymous"){
      $("#playerOptionsMenu").css(
          {position:"absolute",
           top: deltaTop + $("#playerProfile").height() + 10,
           left: left - $("#playerProfile").width() - 5}
      );
      $("#playerOptionsMenu").fadeIn(600);
    }
  }
};

selectAvatarHandler = function(){
    closeAnyOtherPanel();
    $("#playerOptionsMenu").fadeOut(400);
    $("#avatarMenu").fadeIn(800);
};

openPrefsHandler = function(){
    closeAnyOtherPanel();
    $("#playerOptionsMenu").fadeOut(400);
    $("#myGameMenu").fadeIn(800);
};

openWorldPlayersHandler = function(){
    closeAnyOtherPanel();
    $("#playerOptionsMenu").fadeOut(400);
    $("#worldPlayersMenu").fadeIn(800);
    if (!mapCreated){
        drawPlayersMap();
    }
};

openStatsHandler = function(matchResultFlag, anonymousScore){
    closeAnyOtherPanel();
    $("#playerOptionsMenu").fadeOut(400);

    if (matchResultFlag){
        showWonMatchMessage(anonymousScore);
    } else {
        var loadingHighScoreImg = new Image;
        loadingHighScoreImg.setAttribute("id", "loadingHighScoreImg");
        loadingHighScoreImg.src = 'gfx/ajax-loader.gif';
        document.getElementById("myHighscore").appendChild(loadingHighScoreImg);
        
        var loadingLeaderboardImg = new Image;
        loadingLeaderboardImg.setAttribute("id", "loadingLeaderboardImg");
        loadingLeaderboardImg.src = 'gfx/ajax-loader.gif';
        document.getElementById("leaderboard").appendChild(loadingLeaderboardImg);
        
        $("#gameStatsMenu").fadeIn(800);

        cG.player.getHighScore(
            function(score){
                $("#loadingHighScoreImg").remove();
                setHighScoreStat(score);
            },
            function(error){
                $("#loadingHighScoreImg").remove();
                if (anonymousScore){
                    setHighScoreStat(anonymousScore);
                } else {
                    setHighScoreStat("none!");
                }
                console.log("No player highscore available: " + error.message);
            }
        );
        cG.game.getLeaderboard(
            function(leaderboard){
                $("#loadingLeaderboardImg").remove();
                setLeaderboardStat(leaderboard);
            },
            function(error){
                $("#loadingLeaderboardImg").remove();
                setLeaderboardStat("not available");
                console.log("No game leaderboard available: " + error.message);
            }
        );
    }    
};

setAvatarIcon = function(avatarUrl){
    genericMessage.create("Selecting Avatar Icon", "", false, true);
    genericMessage.show();
    $('#avatarMenu').fadeOut(500);
    
    var img = new Image();
    img.onload = function(){
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        try{
            data = canvas.toDataURL();
            cG.player.saveAvatarIcon(
                {dataURL: data},
                function(){
                    console.log("Player icon saved!");
                    $("#avatarIconImage").remove();
                    $("#settingsLegendDiv").remove();
                    var loadingImg = new Image;
                    loadingImg.setAttribute("id", "loadingProfileImg");
                    loadingImg.src = 'gfx/ajax-loader.gif';
                    document.getElementById("playerProfile").appendChild(loadingImg);
                    genericMessage.hide();

                    cG.player.getAvatarIcon(
                        function(playerIcon){
                            var img = new Image;
                            img.setAttribute("id", "avatarIconImage");
                            img.src = playerIcon;
                            $('#playerProfile').append("<div id='settingsLegendDiv' class='settingsLegend'>Settings</div>");
                            document.getElementById("playerProfile").appendChild(img);
                            $("#loadingProfileImg").remove();
                        },
                        function(error){
                            console.log("Oops! There was an error obtaining the player icon");
                            $("#loadingProfileImg").remove();
                        }
                    );
                },
                function(error){
                    genericMessage.setDescription("Oops! Unable to save your avatar icon right now.");
                    genericMessage.clearLoadingAnim();
                    var hideMessage = setTimeout(function(){genericMessage.hide(); clearTimeout(hideMessage)}, 3500);
                    console.log("Oops! There was an error saving the player icon: " + error.message);
                }
            );
        }catch(e){
            genericMessage.setDescription("Oops! Unable to save your avatar icon right now.");
            genericMessage.clearLoadingAnim();
            var hideMessage = setTimeout(function(){genericMessage.hide(); clearTimeout(hideMessage)}, 3500);
            console.log("Oops! There was an error translating image to dataURL");
        }
    }
    try{
        img.src = avatarUrl;
    }catch(e){
        console.log("Ops! There was an error loading image icon");
    }
    
};

drawPlayersMap = function(){
    var maploadingImg = new Image;
    maploadingImg.setAttribute("id", "maploadingImg");
    maploadingImg.src = 'gfx/ajax-loader.gif';
    document.getElementById("worldPlayersMenu").appendChild(maploadingImg);

    var location = new intel.maps.Location();

    location.login({
        client_id: clientId,
        client_secret: clientSecret
    }, function(){
       console.log("World map init [OK]");
       var prefs = {
            mapTypeId: intel.maps.MapTypeId.ROADMAP,
            zoom: 0,
            center: new intel.maps.LatLng(0,0),//45.523428, -122.676945),
            navigationControl: true
       };
       map = new intel.maps.Map(document.getElementById('playersMap'), prefs);
       mapCreated = true;
       
       cG.player.getLocation({semantic: false},
            function(position){
                var latLng = new intel.maps.LatLng(position.coords.latitude, position.coords.longitude);
                var marker = new intel.maps.Marker({position: latLng, map: map});
                map.setCenter(latLng);
                
                infowindow = new intel.maps.InfoWindow();
                addPlayerMarker(
                    position.coords.latitude,
                    position.coords.longitude,
                    cG.player.getId(),
                    cG.player.getName(),
                    currentPlayerCountryCode,
                    currentPlayerHighScore,
                    me = true
                );

                $("#maploadingImg").remove();
            },
            function(error){
                $("#maploadingImg").remove();
                errorCallback(error);
            }
       );
    });
};

addPlayerMarker = function(lat, lon, playerId, playerName, playerLocation, playerHighScore, me){
    mapPlayersIndex++;
    var imgIcon;
    if (me){
        imgIcon = 'gfx/you_icon.png';
    } else {
        imgIcon = 'gfx/mapPlayer.png';
    }
    var marker = new intel.maps.Marker({
        position: new intel.maps.LatLng(lat, lon),
        title: playerName,
        map: map,
        icon: imgIcon
      }
    );

    mapPlayers[mapPlayersIndex] = [marker,
                                   {pId: playerId,
                                    pName: playerName,
                                    pLocation: playerLocation,
                                    pHighScore: playerHighScore}
                                  ];

    intel.maps.event.addListener(marker, 'mouseover', (function(marker, mapPlayersIndex) {
        return function() {
          var pData = mapPlayers[mapPlayersIndex][1];
          //console.log('Country code: ' + pData.pLocation);
          if (pData.pLocation !== "N/A"){
            var isoCountry = pData.pLocation.substr(0,2).toLowerCase();
            var countryHtml = "<img src='gfx/flags_iso/" + isoCountry + ".png'></img></div>";
          } else {
            var countryHtml = "</div>";
          }
          var popupHtml = "<div style='width: 200px; height: 65px;'>" +
                             "<h3>" + pData.pName + "</h3>" +
                             "<div>" + countryHtml +
                             "<div> HighScore: " + pData.pHighScore + "</div>" +
                          "</div>";
          infowindow.setContent(popupHtml);
          infowindow.open(map, marker);
        }
      }
    )(marker, mapPlayersIndex));
};

startCommChannel = function(){
    ccLog("Starting comm channel...");
    pubnub.subscribe({
        channel : "clouddomino_channel",
        message : function(data){
            if (data.playerId !== cG.player.getId()){
                console.log("INCOMING DATA ON CHANNEL: " + JSON.stringify(data));
                var found = false;
                for (i=0; i<mapPlayers.length;i++){
                    if (mapPlayers[i][1].pId == data.playerId){
                        found = true;
                        break;
                    }
                }
                if (!found){
                    if (mapCreated){
                        console.log("A world player connected, adding map marker...");
                        addPlayerMarker(
                            data.lat,
                            data.lon,
                            data.playerId,
                            data.playerName,
                            data.semanticLocation,
                            data.highScore
                        );
                    } else {
                        console.log("Waiting for map to be ready before adding world player map marker...");
                    }
                } else {
                    console.log("Ping from player " + data.playerId + " received.");
                }
            }
        }
    });
};

endCommChannel = function(){
    pubnub.unsubscribe({ channel : 'clouddomino_channel' });
    ccLog("Comm channel closed");
};

publishPlayerLocation = function(options){
    setInterval(
        function(){
            if (isLoggedIn()){
                console.log("Sending player ping [.]");
                pubnub.publish({
                    channel : "clouddomino_channel",
                    message : {
                        playerId: cG.player.getId(),
                        playerName: cG.player.getName(),
                        lat: options.latitude,
                        lon: options.longitude,
                        semanticLocation: currentPlayerCountryCode,
                        highScore: currentPlayerHighScore}
                });
            }
        },
        10000
    );
};

selectStone = function(stoneColor, savePlease){
    selectedStone = stoneColor;
    
    var stoneMatch = false;
    
    switch (stoneColor){
        case 'white':
            $('.Playedv').attr('src', 'gfx/empty_white.png');
            $('.Playedh').attr('src', 'gfx/emptyh_white.png');
            $('.stockFull').attr('src', 'gfx/stock_7full_white.png');
            $( ".HalfTile[id*='-']" ).each(function() {
              if ($(this).attr('src') !== undefined){
                $(this).attr('src', $(this).attr('src').replace('white','black'));
              }
            });
            $( ".HalfTile[id*='_']" ).each(function() {
              if ($(this).attr('src') !== undefined){
                $(this).attr('src', $(this).attr('src').replace('white','black'));
              }
            });
            stoneMatch = true;
            break;
        case 'black':
            $('.Playedv').attr('src', 'gfx/empty_black.png');
            $('.Playedh').attr('src', 'gfx/emptyh_black.png');
            $('.stockFull').attr('src', 'gfx/stock_7full_black.png');
            $( ".HalfTile[id*='-']" ).each(function() {
              if ($(this).attr('src') !== undefined){
                $(this).attr('src', $(this).attr('src').replace('black','white'));
              }
            });
            $( ".HalfTile[id*='_']" ).each(function() {
              if ($(this).attr('src') !== undefined){
                $(this).attr('src', $(this).attr('src').replace('black','white'));
              }
            });
            stoneMatch = true;
            break;
    }
    
    if (stoneMatch && savePlease){
        genericMessage.create("Selecting favorite stone", "", false, true);
        genericMessage.show();

        cG.player.saveDataItem(
            {tag: gameTags.favoriteStone,
             value: selectedStone},
            function(){
                genericMessage.hide();
                console.log("Favorite stone saved");
            },
            function(error){
                console.log("Error saving favorite stone. " + JSON.stringify(error));
            }
        );
    }
};

selectBoard = function(board, savePlease){
    var boardMatch = false;
    switch (board){
        case 'wood':
            $('#main_screen').attr('background', 'gfx/wood_bg.jpg');
            boardMatch = true;
            break;
        case 'paper':
            $('#main_screen').attr('background', 'gfx/paper_bg.jpg');
            boardMatch = true;
            break;
        case 'neutral':
            $('#main_screen').attr('background', 'gfx/neutral_bg.jpg');
            boardMatch = true;
            break;
        case 'metal':
            $('#main_screen').attr('background', 'gfx/dark-perforated-metal_bg.jpg');
            boardMatch = true;
            break;
        case 'waves':
            $('#main_screen').attr('background', 'gfx/waves_bg.jpg');
            boardMatch = true;
            break;
        case 'orange':
            $('#main_screen').attr('background', 'gfx/wavy-orange-design_bg.jpg');
            boardMatch = true;
            break;
    }
    
    if (boardMatch && savePlease){
        genericMessage.create("Selecting favorite board", "", false, true);
        genericMessage.show();

        cG.player.saveDataItem(
            {tag: gameTags.favoriteBoard,
             value: board},
            function(){
                genericMessage.hide();
                console.log("Favorite board saved");
            },
            function(){
                console.log("Error saving favorite board");
            }
        );
    }    
};

openStoreHandler = function(){
    closeAnyOtherPanel();
    $("#playerOptionsMenu").fadeOut(400);
    $("#storeMenu").fadeIn(500);
};

purchaseItem = function(item){
    switch (item){
        case 'ebook':
            myCart = new intel.commerce.Cart({});
            cartLineId = myCart.addItem(
                {
                    name: 'Be a Domino Master eBook',
                    externalProductCode: 'ebook001',
                    quantity: 1,
                    actualPrice: 20.00,
                    commodityCode: '551115',
                    listPrice: 20.00
                }
            );
            console.log("Selected ebook...");
            break;
        case 'video':
            myCart = new intel.commerce.Cart();
            cartLineId = myCart.addItem(
                {
                    name: 'Domino Video Lesson',
                    externalProductCode: 'vid001',
                    quantity: 1,
                    actualPrice: 17,
                    commodityCode: '55111510.120',
                    listPrice: 17
                }
            );
            console.log("Selected video...");
            break;
    }
    
    if (myCart){
        genericMessage.create("Purchase", "We are processing your purchase request...", false, true);
        genericMessage.show();
        $("#storeMenu").fadeOut(300);
        
        myCart.save(
            function(){
                console.log("Cart saved, going for purchase...");
                intel.commerce.getBillingProfile(
                    function(billingProfile){
                        if (billingProfile.data.items.length > 0){
                            genericMessage.setDescription("Your billing info is valid, purchasing...");
                            myCart.purchase(
                                function(data){
                                    genericMessage.clearLoadingAnim();
                                    genericMessage.addCloseButton();
                                    genericMessage.setDescription("Thanks! Your purchase was made! </br> Order total: <b>" +
                                                                  data.data.currencyType + " " + data.data.orderTotal + 
                                                                  "</b></br> Your order number is: </br>" + JSON.stringify(data.data.orderId));
                                },
                                function(error){
                                    genericMessage.clearLoadingAnim();
                                    genericMessage.setDescription("We were unable to complete your purchase request. Try again later.");
                                    var hideMessage = setTimeout(function(){genericMessage.hide(); clearTimeout(hideMessage);}, 3500);
                                    console.log("Error purchasing item: " + error.desc);
                                }
                            );
                        } else {
                            intel.commerce.manageBillingProfile(
                                {specs: "location=1,status=1,scrollbars=1,width=616,height=600" + ",top=" +
                                        Math.floor((screen.height/2)-(600/2)) + ",left=" + Math.floor((screen.width/2)-(616/2))},
                                function(){
                                    genericMessage.setDescription("Your billing info is valid, purchasing...");
                                    myCart.purchase(
                                        function(data){
                                            genericMessage.clearLoadingAnim();
                                            genericMessage.addCloseButton();
                                            genericMessage.setDescription("Thanks! Your purchase was made! </br> Order total: <b>" +
                                                                          data.data.currencyType + " " + data.data.orderTotal + 
                                                                          "</b></br> Your order number is: </br>" + JSON.stringify(data.data.orderId));
                                        },
                                        function(error){
                                            genericMessage.clearLoadingAnim();
                                            genericMessage.setDescription("We were unable to complete your purchase request. Try again later.");
                                            var hideMessage = setTimeout(function(){genericMessage.hide(); clearTimeout(hideMessage);}, 3500);
                                            console.log("Error purchasing item: " + error.desc);
                                        }
                                    );
                                },
                                function(error){
                                    genericMessage.clearLoadingAnim();
                                    genericMessage.setDescription("You need to configure your billing profile please.");
                                    var hideMessage = setTimeout(function(){genericMessage.hide(); clearTimeout(hideMessage);}, 3500);
                                    console.log("No billing profile configured");
                                }
                            );
                        }
                    },
                    function(error){
                        genericMessage.clearLoadingAnim();
                        genericMessage.setDescription("We were unable to complete your purchase request. Try again later.");
                        var hideMessage = setTimeout(function(){genericMessage.hide(); clearTimeout(hideMessage);}, 3500);
                        console.log("Error getting billing profile: " + error.desc);
                    }
                );
            },
            function(error){
                genericMessage.clearLoadingAnim();
                genericMessage.setDescription("We were unable to complete your purchase request. Try again later.");
                setTimeout(function(){genericMessage.hide();}, 3500);
                console.log("Error saving item to a cart: " + error.desc);
            }
        );
    } else {
        console.log("Invalid store item. Nothing to purchase?");
    }
};

saveMatchResults = function(playerScore, playerWins){
    if (playerScore > 0){        
        cG.player.saveHighScore(
            {score: playerScore},
            function(){
                console.log("Highscore saved [OK]");
            },
            errorCallback
        );
        
        cG.game.updateLeaderboard(
            {score: playerScore},
            function(){
                console.log("Leaderboard updated [OK]");
            },
            errorCallback
        );
    } else {
        console.log('score is 0, skipping');
    }    
};

openTournamentsHandler = function(){
    closeAnyOtherPanel();
    $("#playerOptionsMenu").fadeOut(400);
    $("#tournamentsMenu").fadeIn(800);
    if (!tournamentsMapCreated){
        drawTournamentsMap();
    }
};

drawTournamentsMap = function(){
    var maptourloadingImg = new Image;
    maptourloadingImg.setAttribute("id", "maptourloadingImg");
    maptourloadingImg.src = 'gfx/ajax-loader.gif';
    document.getElementById("tournamentsMenu").appendChild(maptourloadingImg);

    var location = new intel.maps.Location();

    location.login({
        client_id: clientId,
        client_secret: clientSecret
    }, function(){
       console.log("Tournaments map init [OK]");
       var prefs = {
            mapTypeId: intel.maps.MapTypeId.ROADMAP,
            zoom: 0,
            center: new intel.maps.LatLng(0,0),
            navigationControl: true
       };
       tournamentsMap = new intel.maps.Map(document.getElementById('tournamentsMap'), prefs);
       tournamentsMapCreated = true;

       infowindow = new intel.maps.InfoWindow();
       
       addTournamentMarker(31.309062, -86.483173, "World Championship Domino Tournament", "July 12, 2013", "http://www.worlddomino.com/index.htm");
       addTournamentMarker(28.567638, -81.377106, "X Fid Domino World Championship", "June 2013", "http://www.mundialdomino.com/index.html");
       addTournamentMarker(10.426365, -75.534439, "X Fid Domino World Championship Colombia", "November 2013", "http://dominosusa.centralfldesigns.com/index.php?option=com_content&view=article&id=34&Itemid=34");
       addTournamentMarker(36.696778, -6.132774, "X Fid Domino World Championship Spain", "June 2013", "http://dominosusa.centralfldesigns.com/index.php?option=com_content&view=article&id=34&Itemid=34");
       addTournamentMarker(-15.731457, -47.91687, "X Fid Domino World Championship Brasil", "September 2014", "http://dominosusa.centralfldesigns.com/index.php?option=com_content&view=article&id=34&Itemid=34");
       addTournamentMarker(40.736852, -74.010773, "World Domino Championship of Champions", "April 2013", "http://www.worlddominopromotions.com/Tournaments.html");
       
       $("#maptourloadingImg").remove();
    });
};

addTournamentMarker = function(lat, lon, name, date, link){
    mapTournamentsIndex++;
    var imgIcon;
    imgIcon = 'gfx/domino_icon_black.png';
    var marker = new intel.maps.Marker({
        position: new intel.maps.LatLng(lat, lon),
        title: name,
        map: tournamentsMap,
        icon: imgIcon
      }
    );

    mapTournaments[mapTournamentsIndex] = [marker,
                                          {pName: name,
                                           pDate: date,
                                           pLink: link}
                                           ];

    intel.maps.event.addListener(marker, 'mouseover', (function(marker, mapTournamentsIndex) {
        return function() {
          var pData = mapTournaments[mapTournamentsIndex][1];
          var popupHtml = "<div>" +
                             "<h3>" + pData.pName + "</h3>" +
                             "<div>" + pData.pDate + "</div>" +
                             "<a href='#' onclick=\"window.open('" + pData.pLink + "')\"> See Event </a>"
                          "</div>";
          infowindow.setContent(popupHtml);
          infowindow.open(tournamentsMap, marker);
        }
      }
    )(marker, mapTournamentsIndex));
};

/** Helpers **/

genericMessage.create = function(title, description, closeButton, loadingAnim){
    // Restore genericMessage shape just in case it was used as "You won the match" fireworks message
    $("#genericMessage").css({width: '40em', height: '23em', marginTop: '-9em', marginLeft: '-15em'});
    
    $("#genericMessage_title").html(title);
    $("#genericMessage_description").html(description);
    if (closeButton){
        genericMessage.addCloseButton();
    }else{
        genericMessage.clearCloseButton();
    }
    genericMessage.clearLoadingAnim();
    if (loadingAnim){
        genericMessage.addLoadingAnim();
    }
};

genericMessage.addLoadingAnim = function(){
    var loadingImg = new Image;
    loadingImg.setAttribute("id", "gm_loadingImg");
    loadingImg.src = 'gfx/ajax-loader.gif';
    document.getElementById("genericMessage").appendChild(loadingImg);
};

genericMessage.clearLoadingAnim = function(){
    $("#gm_loadingImg").remove();
};

genericMessage.show = function(ms){
    var time = ms || 300;
    $("#genericMessage").fadeIn(time);
};

genericMessage.hide = function(ms){
    var time = ms || 300;
    $("#genericMessage").fadeOut(time);
};

genericMessage.setDescription = function (description){
    $("#genericMessage_description").html(description);
};

genericMessage.addCloseButton = function(){
    $("#genericMessage_closeButton").show();
};

genericMessage.clearCloseButton = function(){
    $("#genericMessage_closeButton").hide();
};

closeAnyOtherPanel = function(){
    $("#avatarMenu").hide();
    $("#myGameMenu").hide();
    $("#storeMenu").hide();
    $("#gameStatsMenu").hide();
    $("#worldPlayersMenu").hide();
    $("#tournamentsMenu").hide();
    $("#genericMessage").hide();
};

setHighScoreStat = function(score){
    $('#myHighscore').html("<b>" + score + "</b>");
};

setLeaderboardStat = function(leaderboard){
    if (leaderboard.leaders !== undefined){
        $('#gameStatsMenu').css({height: '550px'});
        var leaders = leaderboard.leaders;
        
        var interchanged;
        
        do {
            interchanged = false;
            for (var i = 0; i < leaders.length - 1; i++) {
                if (leaders[i].highscore < leaders[i+1].highscore) {
                    var temp = leaders[i];
                    leaders[i] = leaders[i+1];
                    leaders[i+1] = temp;
                    interchanged = true;
                }
            }
        } while (interchanged);
        
        $('#leaderboard').html("");
        for (i = 0; i < leaders.length; i++){
            $('#leaderboard').append("<li class='leaderItem'>" + leaders[i].name + " - " + leaders[i].highscore + " points</li>");
        }
    } else {
        $('#leaderboard').html("");
        $('#gameStatsMenu').css({height: '265px'});
    }
};

setGameDefaultConfig = function(){
    $('#main_screen').attr('background', 'gfx/wavy-orange-design_bg.jpg');
    selectStone('white');
    $('#playersMap').fadeOut(600);
};

initEventListeners = function(){
    document.getElementById("playerProfile").addEventListener("click", playerOptionsHandler, false);

    $("#playerProfile").hover(function(){
       mouseOnPlayerProfile = true;
    }, function(){
       mouseOnPlayerProfile = false;
    });
    
    $('body').click(function() {
       if (!mouseOnPlayerProfile){
        $("#playerOptionsMenu").fadeOut(200);
       }
    });
};

doFireworks = function(score){
    var canvas = document.getElementById('fireworks');
    var c = canvas.getContext('2d');
    
    var particles = [];
    var spareParticles = [];
    
    var multiplier = 0.99;
    var gravity = 0.5;
    var dimensionLimit = 250;

    var SCREEN_WIDTH = 380;
    var SCREEN_HEIGHT = 300;

    var HALF_WIDTH = SCREEN_WIDTH / 2;
    var HALF_HEIGHT = SCREEN_HEIGHT / 2;
    
    var img = new Image();
    img.src = "gfx/star_icon.png";
    
    function Vector3(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.tx = 0;
        this.tz = 0;
        this.cosRY = 0;
        this.sinRY = 0;

        this.reset = function(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        this.plusEq = function(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
        }

        this.multiplyEq = function(s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
        }
    }
    
    function Particle() {
        this.pos = new Vector3(0, 0, 0);
        this.vel = new Vector3(0, 0, 0);
        this.enabled = true;

        this.reset = function() {
            this.pos.reset(0, -100, 0);
            this.vel.reset((Math.random() * 20) - 10, Math.random() * -5, (Math.random() * 20) - 10);
            this.enabled = true;
        }

        this.reset();
        this.update = function() {
            if (this.enabled) {
                this.pos.plusEq(this.vel);
                this.vel.multiplyEq(multiplier);
                this.vel.y += gravity;
            }
        }
    }
    
    function render() {
        var particle;
        
        for (var i = 0; i < 4; i++) {
            if (spareParticles.length == 0) {
                particle = new Particle();
                particles.push(particle);
           } else {
                particle = spareParticles.shift();
                particle.reset();
            }
        }        

        c.fillStyle = "rgba(255,255,255,0.1)";
        c.fillRect(0, 0, 500, 500);
        c.fillStyle = "rgba(80,137,235,0.6)";
        c.font = "bold 24px verdana";
        c.fillText("SCORE " + score + " points!", 30, 100);

        particles.sort(compareZPos);

        for (i = 0; i < particles.length; i++) {
            particle = particles[i];

            particle.update();
            if (particle.enabled && (particle.pos.y > 250)) {
                particle.enabled = false;
                spareParticles.push(particle);
            }

            if (particle.enabled) draw3Din2D(particle);
        }
    }
    
    function draw3Din2D(particle) {
        x3d = particle.pos.x;
        y3d = particle.pos.y;
        z3d = particle.pos.z;
        var scale = dimensionLimit / (dimensionLimit + z3d);
        var x2d = (x3d * scale) + HALF_WIDTH;
        var y2d = (y3d * scale) + HALF_HEIGHT;

        scale *= 6;
        if (scale > 0) {
            c.drawImage(img, x2d - scale, y2d - scale, scale * 2, scale * 2);
        }
    }
    
    function compareZPos(a, b) {
        return (b.pos.z - a.pos.z)
    }
    
    var loop = setInterval(function() {
        if (!winMatchMessageClosed) {
            render();
        } else {
            ccLog("Fireworks loop end");
            clearInterval(loop);
        }
    }, 50);
};

showWonMatchMessage = function(score){
    winMatchMessageClosed = false;    
    $('#congratulationsMessage_title').html("Congratulations!"); 
    $('#congratulationsMessage_description').html("<h2>You won the match!</h2>" +
                          "<canvas id='fireworks' style='width:780px; height:380px;'></canvas>"); 
    $('#congratulationsMessage').show();
    doFireworks(score);
};

onCongratulationsMessageClose = function(){
   $('#congratulationsMessage').hide();
   winMatchMessageClosed = true;
   if (isLoggedIn()){
      openStatsHandler();
   }
};

/***************** EOF **************/