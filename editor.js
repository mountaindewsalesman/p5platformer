let editor_levelSet;
let editor_levelIndex = 0;
let editor_currentLevel;

let editor_camX = 0;
let editor_camY = 0;

let editor_camZoom = 1;

let editor_selectedRect = -1;

function editor_loadMap(set){
    frameRate(60) //set so that cam movement is simple and constant
    editor_camZoom = 1;
    

    console.log(set)
    editor_levelSet = set;
    editor_currentLevel = editor_levelSet[editor_levelIndex];

    let x = editor_currentLevel.startPos[0]
    let y = editor_currentLevel.startPos[1]
    editor_camX = (x - (sW / 2 - game_pW / 2) - x)
    editor_camY = (y - (sH / 2 - game_pH / 2) - y)

}

function editor_updateAndDraw(){
    editor_render()
    editor_keyPresses()
}
let editor_btnSize = 10
let editor_offset = editor_btnSize/1.5
function editor_render() {
  background(255);

  //platforms

  stroke(0);
  strokeWeight(0.5);
  let platform = [];
  for (let i = 0; i < editor_currentLevel.rectData.length; i++) {
    platform = editor_currentLevel.rectData[i];
    
    
    
    if (platform[4] == "ground") {
      fill(0, 200, 100);
    }
    if (platform[4] == "die") {
      fill(255, 0, 0);
    }
    if (platform[4] == "wood") {
      fill(160, 70, 40);
    }
    if (platform[4] == "bounce") {
      fill(255, 0, 255);
    }
    if (platform[4] == "end") {
      fill(255, 255, 0);
    }
    bx = platform[0]; //-= camX;
    by = platform[1]; //-= camY;
    bw = platform[2];
    bh = platform[3];

    rect((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom, bw*editor_camZoom, bh*editor_camZoom);    
  }
  for (let i = 0; i < editor_currentLevel.rectData.length; i++) {
    platform = editor_currentLevel.rectData[i];

    bx = platform[0]; //-= camX;
    by = platform[1]; //-= camY;
    bw = platform[2];
    bh = platform[3];

    
    fill(255, 255, 255, 190)
    centerSquare((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom, editor_btnSize)
    lineOff = editor_btnSize/2
    line((bx - editor_camX)*editor_camZoom - lineOff, (by - editor_camY)*editor_camZoom, (bx - editor_camX)*editor_camZoom + lineOff, (by - editor_camY)*editor_camZoom);
    line((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom - lineOff, (bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom + lineOff);
  }
}

function editor_keyPresses(){
    let camSpeed = 10;
    if(keyIsDown(16)){
        camSpeed = 30;
    }
    if (keyIsDown(65) || keyIsDown(97) || keyIsDown(LEFT_ARROW)) { // 'A' or 'a'
        editor_camX -= camSpeed;
    }
    if (keyIsDown(68) || keyIsDown(100) || keyIsDown(RIGHT_ARROW)) { // 'D' or 'd'
        editor_camX += camSpeed;
    }
    if (keyIsDown(87) || keyIsDown(119) || keyIsDown(UP_ARROW)) { // 'W' or 'w'
        editor_camY -= camSpeed;
    }
    if (keyIsDown(83) || keyIsDown(115) || keyIsDown(DOWN_ARROW)) { // 'S' or 's'
        editor_camY += camSpeed;
    }

    let worldCenterX = editor_camX + (sW / 2) / editor_camZoom;
    let worldCenterY = editor_camY + (sH / 2) / editor_camZoom;   
    
    if (keyIsDown(81) || keyIsDown(189)) { // 'S' or 's'
        editor_camZoom *= 0.95;
        
    }
    if (keyIsDown(69) || keyIsDown(187)) { // 'S' or 's'
        editor_camZoom *= 1.05;
    }
    editor_camX = worldCenterX - (sW / 2) / editor_camZoom;
    editor_camY = worldCenterY - (sH / 2) / editor_camZoom;

    //ruler
    let jumpX = 350
    let jumpY = 99
    
    if(keyIsDown(82)){
        mX = mouseX/scaleFromOrginal
        mY = mouseY/scaleFromOrginal
        line(mX, mY, mX+jumpX*editor_camZoom, mY)
        line(mX, mY, mX, mY-jumpY*editor_camZoom)
        rect(mX-game_pW*editor_camZoom, mY, game_pW*editor_camZoom, game_pH*editor_camZoom)
    }
}

function centerSquare(x, y, l){
    square(x-l/2, y-l/2, l)
}