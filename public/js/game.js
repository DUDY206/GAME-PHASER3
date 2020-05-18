var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 }
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    } 
  };
   
var game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
}
function addPlayer(self,playerInfo){
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    
    if (playerInfo.team === 'blue') {
        self.ship.setTint(0x0000ff);
    } else {
        self.ship.setTint(0xff0000);
    }
    
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
    if (playerInfo.team === 'blue') {
        otherPlayer.setTint(0x0000ff);
    } else {
        otherPlayer.setTint(0xff0000);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on('currentPlayers', function (players) {
        // console.log(players);
        Object.keys(players).forEach(function (id) {
        if (players[id].playerId === self.socket.id) {
            addPlayer(self, players[id]);
        }else {
            addOtherPlayers(self, players[id]);
          }
        });
    });
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
            otherPlayer.destroy();
            }
        });
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
          if (playerInfo.playerId === otherPlayer.playerId) {
            otherPlayer.setRotation(playerInfo.rotation);
            otherPlayer.setPosition(playerInfo.x, playerInfo.y);
          }
        });
    });


    this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
    this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });
    this.winner = this.add.text(292, 16, '', { fontSize: '32px', fill: '#FFFF00' });
    
    this.socket.on('scoreUpdate', function (scores) {
        self.blueScoreText.setText('Blue: ' + scores.blue);
        self.redScoreText.setText('Red: ' + scores.red);
        const maxpoint = 20;
        if(scores.red == maxpoint || scores.blue == maxpoint  ){
            self.socket.emit('EndGame');
            if(scores.red == maxpoint ){
                document.body.style.background = "#FF0000";
            }else{
                document.body.style.background = "#0000FF";
            }
            self.winner.setText('TIE');
            self.blueScoreText.setText('Blue: 0' );
            self.redScoreText.setText('Red: 0');
        }else if(scores.blue>scores.red){
            self.winner.setText('Winner: BLUE');
        }else if(scores.blue == scores.red){
            self.winner.setText('TIE');
        }else{
            self.winner.setText('Winner: RED');

        }
    });


    this.socket.on('starLocation', function (starLocation) {
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
        self.physics.add.overlap(self.ship, self.star, function () {
        this.socket.emit('starCollected');
        }, null, self);
    });
}

function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(150);
        } else {
            this.ship.setAngularVelocity(0);
        }
      
        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation +1.5, 100, this.ship.body.acceleration);
        } else {
            this.ship.setAcceleration(0);
        }
        
        if(this.ship.x <= 0){
            this.ship.x = 0;
        }
        if(this.ship.y <= 0){
            this.ship.y = 0;
        }
        if(this.ship.x >= 800){
            this.ship.x = 800;
        }
        if(this.ship.y >= 600){
            this.ship.y = 600;
        }
        
        
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        // emit player movement
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', {
                    x: this.ship.x,
                    y: this.ship.y,
                    rotation: this.ship.rotation });
        }
        
        // save old position data
        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };
    }
    
}