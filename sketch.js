const firebaseConfig = {
  apiKey: "AIzaSyB_7U7Vu4NrBl78d1-qQlwd7HJTITV26bM",
  authDomain: "game-28daa.firebaseapp.com",
  databaseURL: "https://game-28daa-default-rtdb.firebaseio.com",
  projectId: "game-28daa",
  storageBucket: "game-28daa.firebasestorage.app",
  messagingSenderId: "660572522405",
  appId: "1:660572522405:web:e9a6bd85394209fc510a4c",
  measurementId: "G-JFWXB3ZEJF"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const scaleFromOrginal = 1.5;

let mapsTextInput = false;
let editor_radio = false;

let curScreen;
let sW = 700;
let sH = 500;

let materials = [
    "ground", 
    "die",
    "wood",
    "bounce",
    "end",
    "tar",
    "wallJump"
]

let clickedThisFrame = false;
//button thing


function setup() {
    textFont('Times New Roman');
    createCanvas(sW*scaleFromOrginal, sH*scaleFromOrginal);
    curScreen = "menu"

    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in!
            console.log("Welcome back!", user.email);
            // You could automatically jump them to the game here:
            // curScreen = "game"; 
        } else {
            // No user is signed in.
            console.log("User is not logged in.");
        }
    });
    canvas = document.querySelector('canvas');
    canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

}

//

function draw() {
    background(255);
    push();
    scale(scaleFromOrginal);
    

    if(curScreen == "editor"){
        editor_updateAndDraw();    
    }
    if(curScreen == "mapSel"){
        mapSel_updateAndDraw();
    }

    //this should always be last so main menu button renders on top
    if(curScreen == "menu"){
        mainMenu();
    }else{
        if(button(10, 10, 70, 15, "Main Menu")){
            curScreen = "menu"
        }
    }

    //LOGIN BUTTON
    if(auth.currentUser){
        fill(0);
        textAlign(LEFT, BOTTOM);
        textSize(10);
        text("Logged in as: " + auth.currentUser.email, 10, sH-30);

        if(button(10, sH-25, 50, 15, "Log Out")){
            auth.signOut().then(() => {
                    console.log("User successfully logged out!");
                }).catch((error) => {
                    console.error("Error logging out:", error);
                });
        }
    }else{
        fill(255, 0, 0);
        textAlign(LEFT, BOTTOM);
        textStyle(BOLD);
        textSize(10);
        text("You are not logged in! To post levels and get on leaderboard, log in with google!", 10, sH-30);
        textStyle(NORMAL);

        if(button(10, sH-25, 50, 15, "Log in")){
            loginWithGoogle()
        }
    }

    

    //border
    stroke(0);
    strokeWeight(2);
    fill(0, 0, 0, 0);
    rect(0, 0, sW, sH)
    scale(scaleFromOrginal);
    pop();

    //KEEP AT END
    clickedThisFrame = false;
}

function mainMenu(){
    if(editor_radio){
        editor_radio.remove();
        editor_radio.hide()
        
    }
    if(mapsTextInput){
        mapsTextInput.hide();
    }
    background(50, 220, 255);
    textAlign(CENTER, TOP);
    textSize(70);
    fill(0);
    strokeWeight(0);
    text("P5 PLATFORMER", sW/2, 50);
    text("RELEASE 2", sW/2, 130);
    textSize(20);
    text("Level Editor, Cloud Sharing, Leaderboard and Timer, and more...", sW/2, 200);


    bW = 400
    bH = 30
    bX = sW/2 - bW/2
    if(button(bX, 300, bW, bH, "Official Maps")){
        mapSel_startup("official")
        curScreen = "mapSel"

    }
    if(button(bX, 340, bW, bH, "Community Maps")){
        mapSel_startup("community")
        curScreen = "mapSel"

    }
    
    if(button(bX, 380, bW, bH, "Editor")){
        editor_loadMap();
        curScreen = "editor"
    }
}

function mousePressed() {
    // This flips to true for exactly one frame
    clickedThisFrame = true;
}

function button(x, y, w, h, bText, col){
    strokeWeight(0.5)
    mX = mouseX/scaleFromOrginal
    mY = mouseY/scaleFromOrginal

    let pressed = false;

    if(mX > x && mY > y && mX < x+w && mY < y+h ){
        fill(200)
        if(clickedThisFrame){
            pressed = true
        }
        
    }else{
        fill(255)
    }
    
    rect(x, y, w, h)
    
    textAlign(CENTER, CENTER);
    textSize(h*(2/3));
        
    if(col){
        fill(col)
    }else{
        fill(0)
    }
    strokeWeight(0)
    text(bText, x, y+h*0.06, w, h);
    return pressed;
}

async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Tell Google to ALWAYS ask which account to use
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    try {
        const result = await auth.signInWithPopup(provider);
        console.log("Logged in user:", result.user.displayName);
        console.log("User email:", result.user.email);
    } catch (error) {
        console.error("Login failed:", error);
    }
}
