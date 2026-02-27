let game_levelIndex;
let game_levelSet;

let game_pX = 0;
let game_pY = 0;
let game_pxV = 0;
let game_pyV = 0;
let game_pW = 20;
let game_pH = 20;

let game_camX = 0;
let game_camY = 0;

let game_deathY = 500;
let game_coyoteTime = 99999;



function game_initMap(map, type){
    game_levelSet = map;
    game_levelIndex = 0;
    game_currentLevel = game_levelSet[game_levelIndex];
    frameRate(60);

    game_currentType = type
    //test or real
    //test allows you to hit esc to escape the game and go back to editor for making levels
    //real starts a clock that ends on the final level

    game_pX = game_currentLevel.startPos[0]
    game_pY = game_currentLevel.startPos[1]
    game_camX += (game_pX - (sW / 2 - game_pW / 2) - game_camX)
    game_camY += (game_pY - (sH / 2 - game_pH / 2) - game_camY)
    
}

function game_updateAndDraw(){
    game_render()
    game_physics(2, 0.9, 20, 1.5, 32, 4);
}

function game_physics(gravity, friction, jumpHeight, speed, bounceHeight, coyote) {
    let originFPS = 30;
    let dt = deltaTime / (1000 / originFPS);

    function death(){
        game_pxV = 0;
        game_pyV = 0;
        game_pX = game_currentLevel.startPos[0];
        game_pY = game_currentLevel.startPos[1];
    }
    //frame indipendent cam smoothing
    let camSmoothing = 2 / 3; 
    let targetCamX = game_pX - (sW / 2 - game_pW / 2);
    let targetCamY = game_pY - (sH / 2 - game_pH / 2);
    
    game_camX += (targetCamX - game_camX) * (1 - Math.pow(camSmoothing, dt));
    game_camY += (targetCamY - game_camY) * (1 - Math.pow(camSmoothing, dt));
    
    if (game_pY >= game_deathY) {
        death();
    }

    // gravity
    //coyote time counts up and is set to 0 when touching ground
    game_coyoteTime += dt;
    game_pyV += gravity * dt;
    

    //key presses
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65) || keyIsDown(97)) {
        game_pxV -= speed * dt;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68) || keyIsDown(100)) {
        game_pxV += speed * dt;
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87) || keyIsDown(119)) {
        if (game_coyoteTime < coyote) {
            
            game_pyV = -jumpHeight;
            game_coyoteTime = 9999;
        }
    }
    // colisions
    game_moveCollide(bounceHeight, dt);
    game_pxV *= Math.pow(friction, dt);
}

//updated by an llm
function game_moveCollide(leapHeight, dt) {
    function death(){
        game_pxV = 0;
        game_pyV = 0;
        game_pX = game_currentLevel.startPos[0];
        game_pY = game_currentLevel.startPos[1];
    }


    let maxIter = 40
    
    game_pY += game_pyV * dt;
    
    let colY = colliding();
    
    if(colY[0] && colY[1].includes("ground")){
        let rY = norm(game_pyV)/2;
        game_pyV = 0

        let i = 0
        while(colY[0] && i < maxIter && colY[1].includes("ground")){
            i += 1
            game_pY -= rY;
            colY = colliding();
        }

        if(rY > 0){
            game_coyoteTime = 0
        }
    }

    game_pX += game_pxV * dt;
    
    let colX = colliding();
    
    if(colX[0] && colX[1].includes("ground")){
        let rX = norm(game_pxV)/2;
        game_pxV = 0

        let i = 0
        while(colX[0] && i < maxIter && colX[1].includes("ground")){
            i += 1
            game_pX -= rX;
            colX = colliding();
        }
    }

    //non-ground cases
    if(colX[0] || colY[0]){
        allCol = colX[1].concat(colY[1])
        if(allCol.includes("die")){
            death();
        }
        if(allCol.includes("wood")){

            //-game_pyV to check if you position last frame could clear it
            let extraCautionary = 8
            if(game_pyV >= 0 && game_pY + game_pH - game_pyV-extraCautionary < colX[2]){
                let rY = norm(game_pyV);
                game_pyV = 0
                let i = 0
                while(colY[0] && i < maxIter && colY[1].includes("wood")){
                    i += 1
                    game_pY -= rY;
                    colY = colliding();
                }
                game_coyoteTime = 0;
            }
        }
        if(allCol.includes("bounce")){
            if(!(game_pX == game_currentLevel.startPos[0] && game_pY == game_currentLevel.startPos[1])){
                game_pyV = -leapHeight
            }
        }
        if(allCol.includes("end")){
            game_levelIndex += 1
            game_currentLevel = game_levelSet[game_levelIndex]
            game_pX = game_currentLevel.startPos[0]
            game_pY = game_currentLevel.startPos[1]
            game_camX += (game_pX - (sW / 2 - game_pW / 2) - game_camX)
            game_camY += (game_pY - (sH / 2 - game_pH / 2) - game_camY)
        }
    }

    function norm(x){
        if (x<0){
            return -1;
        }else{
            return 1;
        }
    }
    function colliding() {
        let allCols = []
        let woodY = 0;
        for (let i = 0; i < game_currentLevel.rectData.length; i++) {
            platform = game_currentLevel.rectData[i];
            bx = platform[0];
            by = platform[1];
            bw = platform[2];
            bh = platform[3];
            if (rectRect(game_pX, game_pY, game_pW, game_pH, bx, by, bw, bh)) {
                allCols.push(platform[4])
                if(platform[4] == "wood"){
                    woodY = by
                }
            }
        }
        if(allCols.length > 0){
                return [true, allCols, woodY];
        }else{
            return [false, "null"];
        }
    }
    
    function rectRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return (x1 < x2 + w2 && 
                x1 + w1 > x2 && 
                y1 < y2 + h2 && 
                y1 + h1 > y2);
    }

}



function game_render() {
  background(50, 220, 255);
  
  //clouds
  fill(180, 250, 255);
  noStroke();
  randomSeed(game_levelIndex + game_currentLevel.rectData.length);
  let cloudSpread = 3000;
  let offset = cloudSpread / 2;
  let cloudsNum = 100;
  for (let i = 0; i < cloudsNum; i++) {
    let x = random();
    let y = random();

    
    rect(
      x * cloudSpread - game_camX / 2 - offset,
      y * cloudSpread - game_camY / 2 - offset,
      100,
      50
    );
  }
  //platforms
  

  stroke(0);
  strokeWeight(0.5)
  
  let platform = [];
  for (let i = 0; i < game_currentLevel.rectData.length; i++) {
    platform = game_currentLevel.rectData[i];
    

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

    rect(bx - game_camX, by - game_camY, bw, bh);
  }
  fill(0, 0, 255);
  rect(game_pX - game_camX, game_pY - game_camY, game_pW, game_pH);
}