let editor_levelSet;
let editor_levelIndex = 0;
let editor_currentLevel;

let editor_camX = 0;
let editor_camY = 0;

let editor_camZoom = 1;

let editor_selectedRect = -1;
let editor_rectEditType = 0;


let editor_testingLevel = false;

let editorGridVal = 1;
function editor_loadMap(){
    frameRate(60) //set so that cam movement is simple and constant
    editor_camZoom = 1;
    
    editor_levelIndex = 0;
    editor_levelSet = editor_defaultLevel;
    editor_currentLevel = editor_levelSet[editor_levelIndex];

    let x = editor_currentLevel.startPos[0]
    let y = editor_currentLevel.startPos[1]
    editor_camX = x - (sW / 2) / editor_camZoom + game_pW / 2;
    editor_camY = y - (sH / 2) / editor_camZoom + game_pH / 2;

    editor_radio = createRadio();
    editor_radio.option('None');
    editor_radio.option('5 pixel');
    editor_radio.option('10 pixel');
    editor_radio.option('20 pixel');
    editor_radio.selected('20 pixel');
    editor_radio.option('40 pixel');
    editor_radio.option('80 pixel');


    editor_radio.style('display', 'flex');
    editor_radio.style('flex-direction', 'column');
    editor_radio.style('width', 'fit-content');

}
function editor_uploadDownloadBtn(){
    if(button(10, 386, 150, 15, "Download level set to computer")){
        let filename = prompt("Save as:")
        const json = JSON.stringify(editor_levelSet, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename || 'levelSet.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    if(button(10, 406, 150, 15, "Upload level set from computer")){
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const uploadedLevelSet = JSON.parse(event.target.result);
                    editor_levelSet = uploadedLevelSet;
                    editor_levelIndex = 0;
                    editor_currentLevel = editor_levelSet[editor_levelIndex];
                    let x = editor_currentLevel.startPos[0]
                    let y = editor_currentLevel.startPos[1]
                    editor_camX = x - (sW / 2) / editor_camZoom + game_pW / 2;
                    editor_camY = y - (sH / 2) / editor_camZoom + game_pH / 2;
                }
                catch (error) {
                    alert("Invalid file format. Please upload a valid level set JSON file.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

function editor_updateAndDraw(){
    if(!editor_testingLevel){
        editor_render()
        editor_editRects()
        editor_keyPresses() //cam movement and ruler
        editor_uploadDownloadBtn()
    }else{
        game_updateAndDraw()
    }
}


function editor_render() {    
    //fw html elements

    const cnv = select('canvas');
    const cnvRect = cnv.elt.getBoundingClientRect();
    editor_radio.position(cnvRect.left + 4 * scaleFromOrginal, cnvRect.top + 40 * scaleFromOrginal);
    editor_radio.style('font-size', (9 * scaleFromOrginal) + 'px');
    editor_radio.style('padding', (2.6 * scaleFromOrginal) + 'px');
    background(255);

    //grid
    let selected = editor_radio.value();
    if (selected !== "None") {
        
        let tileSize = parseInt(selected); // Automatically gets 5, 10, 20, or 40
        editorGridVal = tileSize
        
        stroke(200, 200, 200, 100); // Light gray with some transparency
        strokeWeight(1);

        // Calculate the screen-space width of one tile
        let zoomedTile = tileSize * editor_camZoom;

        // Find the offset so the grid stays "pinned" to world coordinates (0,0)
        // We use modulo to find where the first line just off-screen to the left should be
        let startX = ((-editor_camX * editor_camZoom) % zoomedTile);
        
        // If startX is positive, shift it back one tile to ensure it covers the left edge
        if (startX > 0) startX -= zoomedTile;

        // Draw vertical lines across the width of the screen (sW)
        for (let x = startX; x < sW; x += zoomedTile) {
            line(x, 0, x, sH);
        }
        
        // Optional: Do the same for Horizontal lines to complete the grid
        let startY = ((-editor_camY * editor_camZoom) % zoomedTile);
        if (startY > 0) startY -= zoomedTile;
        
        for (let y = startY; y < sH; y += zoomedTile) {
            line(0, y, sW, y);
        }
    }else{
        editorGridVal = 1
    }

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

        rect((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom, bw*editor_camZoom, bh*editor_camZoom);    
    }
    fill(0, 0, 255)
    square((editor_currentLevel.startPos[0] - editor_camX)*editor_camZoom, (editor_currentLevel.startPos[1] - editor_camY)*editor_camZoom, game_pH*editor_camZoom);

    //Death line
    fill(255, 0, 0, 127)
    rect(0, Math.max((game_deathY- editor_camY)*editor_camZoom, 0), sW, sH)


    if(button(sW/2-20, (game_deathY- editor_camY)*editor_camZoom-14, 40, 12, "+")){
        editor_levelSet[editor_levelIndex].startPos[1] += 80;
        editor_camY += 80;
        for(let i = 0; i < editor_levelSet[editor_levelIndex].rectData.length; i++){
            editor_levelSet[editor_levelIndex].rectData[i][1] += 80;
        }
    }
    else if(button(sW/2-20, (game_deathY- editor_camY)*editor_camZoom+2, 40, 12, "-")){
        editor_levelSet[editor_levelIndex].startPos[1] -= 80;
        editor_camY -= 80;
        for(let i = 0; i < editor_levelSet[editor_levelIndex].rectData.length; i++){
            editor_levelSet[editor_levelIndex].rectData[i][1] -= 80;
        }
    }

    //labels etc
    fill(0);
    textAlign(LEFT, TOP);
    strokeWeight(0)

    textSize(14);
    text("Snap to Grid:", 10, 30)
    text("Editor Controls:", 10, 128)
    textSize(10);
    text("Move camera: WASD/←↑→↓", 10, 144)
    text("Move camera faster: hold [shift]", 10, 156)
    text("Zoom in: Q/-", 10, 168)
    text("Zoom out: E/+", 10, 180)

    text("Move level spawn: X", 10, 200)
    text("Create new platform: P", 10, 212)
    text("Edit platform size/position: Hover mouse on platform, \n and drag buttons/click on platform", 10, 224)

    text("Show Ruler: R", 10, 258)
    text(" - The ruler shows the player's size,  \n    max horizontal jump, \n    and max vertical jump. ", 10, 270)

    text("Next level: >", 10, 316)
    text("Previous level: <", 10, 328)
    text("Test Level: T", 10, 340)

    text("Add new level after current: N", 10, 360)
    text("Delete current level: M", 10, 372)

    textSize(12);
    text("Current Level: " + (editor_levelIndex+1) + "/" + editor_levelSet.length, 10, sH-60)

    if(button(sW-180-10, sH-30, 180, 20, "Full Editor Documentation")){
        window.open("other/tutorial.html", "_blank");
    }

}

function editor_editRects(){
    let btnSize = 10
    for (let i = 0; i < editor_currentLevel.rectData.length; i++) {
        platform = editor_currentLevel.rectData[i];

        bx = platform[0]; //-= camX;
        by = platform[1]; //-= camY;
        bw = platform[2];
        bh = platform[3];
        
        mX = mouseX/scaleFromOrginal
        mY = mouseY/scaleFromOrginal

        worldMX = editor_camX + mX / editor_camZoom;
        worldMY = editor_camY + mY / editor_camZoom;
        if((worldMX > bx-btnSize/2 && worldMX < bx+bw+btnSize/2 && worldMY > by-btnSize/2 && worldMY < by+bh+btnSize/2 && editor_selectedRect == -1) || editor_selectedRect == i){
            fill(255, 255, 255, 190)
            strokeWeight(0.5);
            centerSquare((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom, btnSize)

            if(editor_selectedRect == -1 && mouseIsPressed && mouseCenterSquare((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom, btnSize)){
                editor_selectedRect = i;
                editor_rectEditType = "position"
            }

            lineOff = btnSize/2
            line((bx - editor_camX)*editor_camZoom - lineOff, (by - editor_camY)*editor_camZoom, (bx - editor_camX)*editor_camZoom + lineOff, (by - editor_camY)*editor_camZoom);
            line((bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom - lineOff, (bx - editor_camX)*editor_camZoom, (by - editor_camY)*editor_camZoom + lineOff);

            fill(64, 255, 64)
            circle((bx+bw - editor_camX)*editor_camZoom, (by+bh - editor_camY)*editor_camZoom, btnSize);

            if(editor_selectedRect == -1 && mouseIsPressed && mouseCenterSquare((bx+bw - editor_camX)*editor_camZoom, (by+bh - editor_camY)*editor_camZoom, btnSize)){
                editor_selectedRect = i;
                editor_rectEditType = "scale"
            }

            btnH = 10
            btnW = 40
            if(button((bx+bw/2-(btnW/2)/editor_camZoom - editor_camX)*editor_camZoom, (by+bh/2-(btnH/2)/editor_camZoom - editor_camY)*editor_camZoom - btnH*0.75, btnW, btnH, "Material")){
                editor_currentLevel.rectData[i][4] = materials[(materials.indexOf(editor_currentLevel.rectData[i][4]) + 1) % materials.length];
            }
            if(button((bx+bw/2-(btnW/2)/editor_camZoom - editor_camX)*editor_camZoom, (by+bh/2-(btnH/2)/editor_camZoom - editor_camY)*editor_camZoom + btnH*0.75, btnW, btnH, "Delete", color(255, 0, 0))){
                editor_currentLevel.rectData.splice(i, 1);
            }

        }
    }
    if(editor_selectedRect != -1){
        if(editor_rectEditType == "position"){
            editor_currentLevel.rectData[editor_selectedRect][0] = worldMX;
            editor_currentLevel.rectData[editor_selectedRect][1] = worldMY;
        }else if(editor_rectEditType == "scale"){
            editor_currentLevel.rectData[editor_selectedRect][2] = worldMX-editor_currentLevel.rectData[editor_selectedRect][0];
            editor_currentLevel.rectData[editor_selectedRect][3] = worldMY-editor_currentLevel.rectData[editor_selectedRect][1];
        }
        platform = editor_currentLevel.rectData[editor_selectedRect];
        bx = platform[0]; //-= camX;
        by = platform[1]; //-= camY;
        bw = platform[2];
        bh = platform[3];
        fill(0, 0, 0, 0);
        
        strokeWeight(1)
        if(bw <= 0 || bh <= 0){
            stroke(255, 64, 64)
            
            strokeWeight(0)
            textSize(10);
            textAlign(LEFT, TOP);
            fill(255, 64, 64);
            text("Negitive width or height \nplatforms will be deleted!", mX+10, mY)
            strokeWeight(1)
            fill(0, 0, 0, 0);
        }
        rect((round(bx/editorGridVal)*editorGridVal- editor_camX)*editor_camZoom, (round(by/editorGridVal)*editorGridVal- editor_camY)*editor_camZoom, round(bw/editorGridVal)*editorGridVal*editor_camZoom, round(bh/editorGridVal)*editorGridVal*editor_camZoom)
        stroke(0)
        

        
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
        editor_camZoom *= 0.965;
        
    }
    if (keyIsDown(69) || keyIsDown(187)) { // 'S' or 's'
        editor_camZoom *= 1.035;
    }
    editor_camX = worldCenterX - (sW / 2) / editor_camZoom;
    editor_camY = worldCenterY - (sH / 2) / editor_camZoom;

    //ruler
    let jumpX = 350
    let jumpY = 99
    
    if(keyIsDown(82)){
        strokeWeight(0.5)

        mX = mouseX/scaleFromOrginal
        mY = mouseY/scaleFromOrginal
        line(mX, mY, mX+jumpX*editor_camZoom, mY)
        line(mX, mY, mX, mY-jumpY*editor_camZoom)
        fill(0, 0, 255)
        rect(mX-game_pW*editor_camZoom, mY, game_pW*editor_camZoom, game_pH*editor_camZoom)
    }
    //player spawn
    if (keyIsDown(88)) {
        mX = mouseX/scaleFromOrginal
        mY = mouseY/scaleFromOrginal

        worldMX = editor_camX + mX / editor_camZoom;
        worldMY = editor_camY + mY / editor_camZoom;

        editor_currentLevel.startPos[0] = worldMX-game_pW/2
        editor_currentLevel.startPos[1] = worldMY-game_pH/2
    }
}
function mod(n, m) {
  return ((n % m) + m) % m;
}

function keyPressed() {
    if(curScreen == "editor"){
        if(!editor_testingLevel){
            if(keyIsDown(78)){
                let newLevel = {
                    "startPos": [
                        0,
                        0
                    ],
                    "rectData": [
                        [
                            -40,
                            40,
                            100,
                            20,
                            "ground"
                        ]
                    ]
                }
                editor_levelSet.splice(editor_levelIndex+1, 0, newLevel);
                editor_levelIndex += 1;
                editor_currentLevel = editor_levelSet[editor_levelIndex]
            }
            if(keyIsDown(80)){
                worldMX = editor_camX + mX / editor_camZoom;
                worldMY = editor_camY + mY / editor_camZoom;
                editor_currentLevel.rectData.push([worldMX, worldMY, 80, 80, "ground"])
            }

            if(keyIsDown(77)){
                confirmDelete = confirm("Are you sure you want to delete this level? This action cannot be undone.")
                if(!confirmDelete){
                    return;
                }
                if(editor_levelSet.length <= 1){
                    alert("You must have at least one level!")
                    return;
                }
                editor_levelSet.splice(editor_levelIndex, 1);
                editor_levelIndex = mod(editor_levelIndex, editor_levelSet.length)
                editor_currentLevel = editor_levelSet[editor_levelIndex]
            }
            if(keyIsDown(188)){
                editor_levelIndex = mod(editor_levelIndex - 1, editor_levelSet.length)
                editor_currentLevel = editor_levelSet[editor_levelIndex]
                let x = editor_currentLevel.startPos[0]
                let y = editor_currentLevel.startPos[1]
                editor_camX = x - (sW / 2) / editor_camZoom + game_pW / 2;
                editor_camY = y - (sH / 2) / editor_camZoom + game_pH / 2;
            }
            if(keyIsDown(190)){
                editor_levelIndex = mod(editor_levelIndex + 1, editor_levelSet.length)
                editor_currentLevel = editor_levelSet[editor_levelIndex]
                let x = editor_currentLevel.startPos[0]
                let y = editor_currentLevel.startPos[1]
                editor_camX = x - (sW / 2) / editor_camZoom + game_pW / 2;
                editor_camY = y - (sH / 2) / editor_camZoom + game_pH / 2;
            }
        }
        
        if(keyIsDown(84)){
            editor_testingLevel = !editor_testingLevel;
            if(editor_testingLevel){
                game_initMap(editor_levelSet, "test", editor_levelIndex);
                editor_radio.hide()
            }else{
                editor_radio.show()
                editor_radio.style('display', 'flex');
                editor_radio.style('flex-direction', 'column');
                editor_radio.style('width', 'fit-content');
            }
        }
    }
}

function centerSquare(x, y, l){
    square(x-l/2, y-l/2, l)
}
function mouseReleased(){
    if(editor_selectedRect != -1){ 
        if(bw <= 0 || bh <= 0){
            editor_currentLevel.rectData.splice(editor_selectedRect, 1);
        }

        editor_currentLevel.rectData[editor_selectedRect][0] = round(editor_currentLevel.rectData[editor_selectedRect][0]/editorGridVal)*editorGridVal
        editor_currentLevel.rectData[editor_selectedRect][1] = round(editor_currentLevel.rectData[editor_selectedRect][1]/editorGridVal)*editorGridVal

        editor_currentLevel.rectData[editor_selectedRect][2] = round(editor_currentLevel.rectData[editor_selectedRect][2]/editorGridVal)*editorGridVal
        editor_currentLevel.rectData[editor_selectedRect][3] = round(editor_currentLevel.rectData[editor_selectedRect][3]/editorGridVal)*editorGridVal

        editor_selectedRect = -1;
        editor_rectEditType = 0;
    }
}
function mouseCenterSquare(x, y, l){
    mX = mouseX/scaleFromOrginal;
    mY = mouseY/scaleFromOrginal;
    return(mX>x-l/2 && mX<x+l/2 && mY>y-l/2 && mY<y+l/2);
}