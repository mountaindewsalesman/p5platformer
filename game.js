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

let game_timer = false;
let game_runningTimer;
let game_time = 0;
let game_lvlID;



function game_initMap(map, type, levelIX, ID){
    game_lvlID = ID;
    game_levelSet = map;
    if(levelIX){
        game_levelIndex = levelIX;
    }else{
        game_levelIndex = 0;
    }
    game_currentLevel = game_levelSet[game_levelIndex];
    frameRate(60);

    game_currentType = type

    game_runningTimer = false;
    if(game_currentType == "real"){
        game_timer = true;
    }
    game_time = 0;

    game_pxV = 0;
    game_pyV = 0;
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
    if(game_currentType == "test"){
        fill(0);
        textAlign(LEFT, TOP);
        strokeWeight(0)
        textSize(12);
        text("Press T to return to editor", 10, sH-72)
        text("Current Level: " + (game_levelIndex+1) + "/" + game_levelSet.length, 10, sH-60)
    }
    game_physics(2, 0.9, 20, 1.5, 32, 23, 4);
    getQR();
}

function game_physics(gravity, friction, jumpHeight, speed, bounceHeight, wallBounce, coyote) {
    let originFPS = 30;
    msDt = Math.min(deltaTime, 50);
    let dt = msDt / (1000 / originFPS);

    //console.log(game_runningTimer)
    if(game_runningTimer){
        game_time += msDt
    }
    

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
        startTimer()
        game_pxV -= speed * dt;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68) || keyIsDown(100)) {
        startTimer()
        game_pxV += speed * dt;
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87) || keyIsDown(119)) {
        startTimer()
        if (game_coyoteTime < coyote) {
            
            game_pyV = -jumpHeight;
            game_coyoteTime = 9999;
        }
    }
    // colisions
    game_moveCollide(bounceHeight, wallBounce, jumpHeight, dt);
    game_pxV *= Math.pow(friction, dt);
}

//updated by an llm
function game_moveCollide(leapHeight, wallBounce, jumpHeight, dt) {
    function death(){
        game_pxV = 0;
        game_pyV = 0;
        game_pX = game_currentLevel.startPos[0];
        game_pY = game_currentLevel.startPos[1];
    }


    let maxIter = Math.ceil(Math.min(Math.abs(game_pyV) * 2 + 10, 200));

    game_pY += game_pyV * dt;
    
    let colY = colliding();
    
    function touchingHardMats(type){
        if(type == "y"){
            return colY[1].includes("ground") || colY[1].includes("tar") || colY[1].includes("wallJump")
        }else if(type == "x"){
            return colX[1].includes("ground") || colX[1].includes("tar") || colX[1].includes("wallJump")
        }

    }

    if (colY[0] && touchingHardMats("y")) {
        let rY = norm(game_pyV) / 2;
        
        // Check if we hit the bottom of a Tar block while moving up
        if (game_pyV < 0 && colY[1].includes("tar")) {
            game_pyV = 0; // Kill upward velocity
            game_coyoteTime = 0; // Allow jumping from the ceiling
            // Optionally: game_pyV = 0.1; // Add a tiny bit of downward force to "stick"
        } else {
            game_pyV = 0;
        }

        let i = 0;
        while (colY[0] && i < maxIter && touchingHardMats("y")) {
            i += 1;
            game_pY -= rY;
            colY = colliding();
        }
        
        if (rY > 0) {
            game_coyoteTime = 0; // Standard ground landing
        }

        game_pY += rY;
        colY = colY.concat(colliding().filter(item => !["die", "wood", "bounce", "end"].includes(item)));
        game_pY -= rY;
    }

    game_pX += game_pxV * dt;
    
    let colX = colliding();

    let globalRX = false;
    if (colX[0] && touchingHardMats("x")) {
        let rX = norm(game_pxV) / 2;
        globalRX = rX;

        // --- ADD THIS WALL JUMP LOGIC HERE ---
        if (colX[1].includes("wallJump")) {
            // Reverse X and boost Y
            // norm(game_pxV) tells us which side we hit: 1 is right, -1 is left
            game_pxV = -norm(game_pxV) * wallBounce; 
            game_pyV = -jumpHeight;
        } else {
            game_pxV = 0; // Only zero out velocity if it's NOT a wallJump
        }
        // -------------------------------------

        let i = 0;
        while (colX[0] && i < maxIter && touchingHardMats("x")) {
            i += 1;
            game_pX -= rX;
            colX = colliding();
        }
        game_pX += rX;
        colX = colX.concat(colliding().filter(item => !["die", "wood", "bounce", "end"].includes(item)));
        game_pX -= rX;
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
                let rY = norm(game_pyV)/2;
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
                game_pyV = -leapHeight;
            }
        }
        if(allCol.includes("end")){
            game_levelIndex += 1
            game_currentLevel = game_levelSet[game_levelIndex]
            game_pX = game_currentLevel.startPos[0]
            game_pY = game_currentLevel.startPos[1]
            game_pxV = 0;
            game_pyV = 0;
            game_camX += (game_pX - (sW / 2 - game_pW / 2) - game_camX)
            game_camY += (game_pY - (sH / 2 - game_pH / 2) - game_camY)
            
            if(game_levelIndex == game_levelSet.length-1){
                game_runningTimer = false
                if (game_currentType === "real") {
                    mapSel_completedLevel(game_lvlID, game_time)
                }
            }
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
        let tarY = 0;
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
                if(platform[4] == "tar"){
                    tarY = by+bh;
                }
            }
        }
        if(allCols.length > 0){
            return [true, allCols, woodY, tarY];
        }else{
            return [false, []]; // <-- always return an array
        }
    }
    
    
    function rectRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return (x1 < x2 + w2 && 
                x1 + w1 > x2 && 
                y1 < y2 + h2 && 
                y1 + h1 > y2);
    }

}

function startTimer(){
    if(game_timer && !game_runningTimer && !(game_levelIndex == game_levelSet.length-1)){
        game_runningTimer = true;
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
    if (platform[4] == "tar") {
        fill(127, 127, 127);
    }
    if (platform[4] == "wallJump") {
        fill(0, 255, 210);
    }
    bx = platform[0]; //-= camX;
    by = platform[1]; //-= camY;
    bw = platform[2];
    bh = platform[3];

    rect(bx - game_camX, by - game_camY, bw, bh);
  }
  fill(0, 0, 255);
  rect(game_pX - game_camX, game_pY - game_camY, game_pW, game_pH);

    if(game_timer){
        textAlign(RIGHT, BOTTOM);
        fill(0);
        strokeWeight(0);
        textSize(26);
        text(msToTime(round(game_time)), sW-10, sH-10-12);

        textSize(12);
        text("Press Q and R to quick reset", sW-10, sH-10);
    }

    if(game_currentType == "real" && game_levelIndex == game_levelSet.length-1){
        if(button(sW-120, sH-70, 110, 18, "View Leaderboard")){
            viewLeaderboard(game_lvlID)
        }
        if(button(sW-240, sH-70, 110, 18, "Return to Levels")){
            mapSel_inGame = false;
        }
    }
}
function getQR(){
    if(keyIsDown(81) && keyIsDown(82) && curScreen == "mapSel" && (game_runningTimer || game_levelIndex == game_levelSet.length-1)){
        game_initMap(game_levelSet, "real", 0, game_lvlID)
    }
}