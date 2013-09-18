$(document).ready(function() {  
    
    //BEGIN LIBRARY CODE
    var x;
    var y;
    var dx;
    var dy;
    var WIDTH;
    var HEIGHT;
    var ctx;
    var paddlex;
    var paddleh;
    var paddlew;
    var intervalId;
    var rightDown = false;
    var leftDown = false;
    var player2RightDown = false;
    var player2LeftDown = false;
    var radius;
    var paddlexAI;
    var startX;
	var ptsp1=0;
	var ptsp2=0;
    var playerId = 0;
    var multiPlayer = false;
    
    var canvas = document.getElementById( 'myCanvas' );
    $('#single').click(startGame);     
    $('#multi').click(startMultiPlayer);

    function startMultiPlayer() {
        multiPlayer = true;
        connect();
        startGame();
    }
    
    function connect() {
        var socket = io.connect('http://10.230.59.32:8001'); 
        socket.emit('new_player');
                
        socket.on('player_registered', function(player_id){
            playerId = player_id;
        });
        
        socket.on('key_down', function(data){
             if (data.playerId==1) {
                if (data.keyCode == 39) rightDown = true;
                else if (data.keyCode == 37) leftDown = true;
             } else if (data.playerId==2) {
                if (data.keyCode == 39) player2RightDown = true;
                else if (data.keyCode == 37) player2LeftDown = true; 
             }
        });
        
         socket.on('key_up', function(data){
             if (data.playerId==1) {
                if (data.keyCode == 39) rightDown = false;
                else if (data.keyCode == 37) leftDown = false;
             } else if (data.playerId==2) {
                if (data.keyCode == 39) player2RightDown = false;
                else if (data.keyCode == 37) player2LeftDown = false; 
             }
        });
        
    }

                    
    //set rightDown or leftDown if the right or left keys are down
    function onKeyDown(evt) {
        if (evt.keyCode == 39) rightDown = true;
        else if (evt.keyCode == 37) leftDown = true;
        
        else if (evt.keyCode == 83) player2RightDown = true;
        else if (evt.keyCode == 65) player2LeftDown = true;
    
        if (multiPlayer)
            socket.emit('key_down', {'playerId': playerId, 'keyCode': evt.keyCode });    
    }
    
    //and unset them when the right or left key is released
    function onKeyUp(evt) {
        if (evt.keyCode == 39) rightDown = false;
        else if (evt.keyCode == 37) leftDown = false;
        
        else if (evt.keyCode == 83) player2RightDown = false;
        else if (evt.keyCode == 65) player2LeftDown = false;
        
        if (multiPlayer)
            socket.emit('key_up', {'playerId': playerId, 'keyCode': evt.keyCode });  
    }
    
    $(document).keydown(onKeyDown);
    $(document).keyup(onKeyUp);
        
    $(document).bind('touchstart', function(event) {
        var e = event.originalEvent;
        startX = e.targetTouches[0].clientX;
    });
    
    $(document).bind('touchmove', function(event) {
        var e = event.originalEvent;
        if (startX > e.targetTouches[0].clientX) {
            //Sliding to the left
            leftDown = true; rightDown = false;
        } else {
            //Sliding to the right
            leftDown = false; rightDown = true;
        }
    });
    
    $(document).bind('touchend', function(event) {
        leftDown = false; rightDown = false;
    });
    

    function init_paddles() {
        paddlex = WIDTH / 2;
        paddlexAI = paddlex;
		//paddleh = 10;
		paddleh = canvas.height * 0.015;
        // paddlew = 75;
		paddlew = canvas.width * 0.2;
        
    }
    

    function init() {
      ctx = canvas.getContext("2d");  
      WIDTH = canvas.width;
      HEIGHT = canvas.height;
      x = 150;
      y = 150;
      dx = 2;
      dy = 4;
      radius = 10;
      rightDown = false;
      leftDown = false;
      player2RightDown = false;
      player2LeftDown = false;
      intervalId = 0;       
    }
    
    
	function startGame(){
        init();
      intervalId = setInterval(draw, 7);
      init_paddles();
      $("#loginButton").hide();

    }
    
	function players()	{
		ctx.font = 'normal 16pt Arial';
        //ctx.fontStyle = 'white';   
        ctx.fillText('Player 1= ', 20, 60);
        //ctx.fillStyle = 'white';
        ctx.font = 'normal 16pt Arial';
        ctx.fillText('Player 2= ', 190, 580);
        //ctx.fontStyle = 'white';
        //ctx.fillStyle = 'white';
	}
	
    function scored(pts1, pts2)	{
		ctx.font = 'bold 18pt Arial';
		ctx.fillText(pts1, 120, 60);
        
        ctx.font = 'bold 18pt Arial';
		ctx.fillText(pts2, 290, 580);
	}

    function circle(x,y,r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2, true);
      ctx.closePath();
      ctx.fill();
    }

    function rect(x,y,w,h) {
      ctx.beginPath();
      ctx.rect(x,y,w,h);
      ctx.closePath();
      ctx.fill();
    }

    function clear() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
    }

    function followBallAI() {
    
        //randomly pick number beteween 0 and 1
        var delayReaction = Math.random();
        
        //25% chance of reaction delay
        if(delayReaction >= 0.25) {
        
            if(x > paddlexAI + paddlew) {
                if(paddlexAI + paddlew + 5 <= WIDTH) {
                    paddlexAI += 5;
                }
            }
            
            else if(x < paddlexAI) {
                if(paddlexAI - 5 >= 0) {
                    paddlexAI -= 5;
                }
            }
            
            else {
            
                var centerPaddle = Math.random();
            
                //80% chance of better centering the paddle
                //otherwise the paddleAI will most of the times
                //hit the ball in one of its extremities
                if(centerPaddle > 0.2) {
                        
                    //if ball closer to left side of computer paddle
                    if( Math.abs(x - paddlexAI) < Math.abs(x - paddlexAI - paddlew) ) {
                        if(paddlexAI - 5 >= 0) {
                            paddlexAI -= 5;
                        }
                    }
                            
                    else {	
                        if(paddlexAI + paddlew + 5 <= WIDTH) {
                            paddlexAI += 5;
                        }
                    }
                }
            
            }
            
        }
        
    }
    
    function drawSideLines() {
         ctx.beginPath();
         ctx.rect(0,0,10,HEIGHT);
         ctx.closePath();
         ctx.fill();
         
         ctx.beginPath();
         ctx.rect(WIDTH - 10,0,10,HEIGHT);
         ctx.closePath();
         ctx.fill();
    }
    
    //END LIBRARY CODE

    function showDialog(message) {
        // Show a dialog
        var dlg = $("<div />").attr("data-role", "dialog").attr("id", "dialog");
        var content = $("<div />").attr("data-role", "content").append($("<span />").html(message));
        content.append("<a href=\"javascript:$('.ui-dialog').dialog('close'); " 
                + "return false;\" data-role=\"button\" data-rel=\"back\">Close</a>");
        dlg.append(content);
        dlg.appendTo($.mobile.pageContainer);
        $.mobile.changePage(dlg, { role: "dialog" });
    }
    
    function draw() {
          clear();
          circle(x, y, radius);
		  players();
          scored(ptsp2,ptsp1);
          //move the paddle if left or right is currently pressed
          
          if (rightDown) {
            if(paddlex + paddlew + 5 <= WIDTH) {
                paddlex += 5;
            }
          }
          else if (leftDown) {
            if(paddlex - 5 >= 0) {
                paddlex -= 5;
            }
          }
        
          if (player2RightDown) {
            if(paddlexAI + paddlew + 5 <= WIDTH) {
                paddlexAI += 5;
            }
          }
          else if (player2LeftDown) {
            if(paddlexAI - 5 >= 0) {
                paddlexAI -= 5;
            }
          }
        
          if (!multiPlayer) followBallAI();
        
          drawSideLines();
          rect(paddlex, HEIGHT-paddleh, paddlew, paddleh);
          rect(paddlexAI, 0, paddlew, paddleh);
         
          if (x + dx + radius > WIDTH || x + dx - radius < 0)
            dx = -dx;

          //upper lane
          if (y + dy - radius <= 0) {
            
            if (x <= paddlexAI || x >= paddlexAI + paddlew) {
                clearInterval(intervalId);
				//showDialog("You WIN ! :)");
				++ptsp1;
                startGame();
            }
            
            else {
                dy = -dy;
            }
            
          }
          
          //lower lane
          else if (y + dy + radius > HEIGHT) {
            
            if (x > paddlex && x < paddlex + paddlew) {
                dx = 8 * ((x-(paddlex+paddlew/2))/paddlew);
                dy = -dy;
            }
               
            else {
              clearInterval(intervalId);
              //showDialog("You Lose ! :(");
		      ++ptsp2;
              startGame();
            }
          }
          
          x += dx;
          y += dy;
        }

        init();

}); 