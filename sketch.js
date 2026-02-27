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




let curScreen;
let sW = 700;
let sH = 500;

let clickedThisFrame = false;
//button thing

function setup() {
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
}

//

function draw() {
    background(255);
    push();
    scale(scaleFromOrginal);
    

    if(curScreen == "game"){
        game_updateAndDraw();    
    }
    if(curScreen == "editor"){
        editor_updateAndDraw();    
    }

    //this should always be last so main menu button renders on top
    if(curScreen == "menu"){
        mainMenu()
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
    background(50, 220, 255);
    bW = 200
    bH = 20
    bX = sW/2 - bW/2
    if(button(bX, 50, bW, bH, "Leagcy old game test")){
        game_initMap(testMap);
        curScreen = "game"
    }
    if(button(bX, 80, bW, bH, "Editor")){
        editor_loadMap(testMap);
        curScreen = "editor"
    }
}

function mousePressed() {
    // This flips to true for exactly one frame
    clickedThisFrame = true;
}

function button(x, y, w, h, bText, label){
    strokeWeight(0.5)
    mX = mouseX/scaleFromOrginal
    mY = mouseY/scaleFromOrginal
    if(label){
        fill(0, 0, 0, 0)
        strokeWeight(0)
    }else{
        if(mX > x && mY > y && mX < x+w && mY < y+h ){
            fill(200)
            if(clickedThisFrame){
                return true;
            }
        }else{
            fill(255)
        }

        rect(x, y, w, h)
    }
    
    
    textAlign(CENTER, CENTER);
    textSize(h*(2/3));
    fill(0)
    strokeWeight(0)
    text(bText, x, y, w, h);
    return false;
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
