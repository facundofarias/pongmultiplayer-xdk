/*********** General Settings ***********/
var LOG_ENABLED = true;

/*************** Internal ***************/
var loginStatus = false;
var playerOptionsMenuEnabled = false;

// Pong credentials
var clientId =      "JKGY74r9sCa9iCW2U283Lr9wWcZeccLg",
	clientSecret =  "Ii058gLcz7sOAfIy",
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
		intel.auth.logout(
			function(){
                loginStatus = false;
                $("#loginButton").show();
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

/*    pubnub = PUBNUB.init({
        'publish_key'   : 'pub-c-37cbe164-6f5f-4dc7-a2e1-0b4d68bfc602',
        'subscribe_key' : 'sub-c-899cc5a8-8a75-11e2-bbdf-12313f022c90',
        'origin'        : 'pubsub.pubnub.com',
        'ssl'           : false,
        'uuid'          : PUBNUB.uuid()
    });*/
    
	ccLog("Login OK! Access Token: " + data.access_token.token);// - Token: " + data.access_token.token);
	loginStatus = true;
    document.getElementById("playerProfile").innerHTML = "";
	cG.start();
};

successCallback = function(msg){
	ccLog("SUCCESS:" + JSON.stringify(msg)); 
};

errorCallback = function(error){
	ccLog("ERROR:" + JSON.stringify(error)); 
};

isLoggedIn =  function(){
	return loginStatus;
};