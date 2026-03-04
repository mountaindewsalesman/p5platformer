let mapsTable;

let mapSel_mapType = "official"
let mapSel_sortBy = "dateCreated"
let mapSel_sortTypes = {"dateCreated": "Date Created", "name": "Name", "completions": "Completions", "none": "N/A"}
let mapSel_totalMaps = 0;

let mapSel_inGame = false;

let mapSel_pageSize = 50;
let mapSel_lastNodeValue = null;
let mapSel_lastNodeKey = null;   
let mapSel_isLastPage = false; 

let lead;


function mapSel_startup(type){
    mapSel_inGame = false;
    mapSel_mapType = type || "official"
    mapsTable = new p5table(50, 50, sW-100, sH-100, [{"": ""},], 11, 4);
    mapsTextInput = createInput("");
    mapsTextInput.style("position", "absolute");
    mapsTextInput.style("transform", "top left");

    lead = new leaderboard("null", {null: "null"})
    lead.active = false;

    if(mapSel_mapType == "official"){
        mapsTextInput.hide();
    }else if(mapSel_mapType == "community"){
        mapsTextInput.show();
    }else if(mapSel_mapType == "user"){
        mapsTextInput.hide();   
    }
    mapSel_fetchMaps(false, false, mapSel_mapType == "user")

    db.ref("MapsInfo").once("value", snapshot => {
    let totalMaps = snapshot.numChildren();
    mapSel_totalMaps = totalMaps;

    });
}
function mapSel_updateAndDraw() {
    if(mapSel_inGame){
        game_updateAndDraw()
        mapsTextInput.hide();
    }else{
        background(50, 220, 255);
        mapsTable.draw();
        //top UI
        //position text input

        if(button(sW/2-40, 32, 80, 15, "Refresh")) {
            mapSel_fetchMaps(false, false, mapSel_mapType === "user"); 
        }

        if(mapSel_mapType == "official"){
            textAlign(CENTER, TOP);
            textSize(16);
            fill(0);
            strokeWeight(0);
            text("OFFICIAL MAPS", sW/2, 10);
            mapsTextInput.hide();
            
        }
        else if(mapSel_mapType == "user"){
            textAlign(CENTER, TOP);
            textSize(16);
            fill(0);
            strokeWeight(0);
            text("YOUR MAPS", sW/2, 10);
            mapsTextInput.hide();

            if (auth.currentUser && button(sW - (70 + 10), sH - (15 + 10), 70, 15, "Upload Map")) {
                mapSel_uploadSetup();
            }
            
        }
        else if(mapSel_mapType == "community"){
            if (auth.currentUser && button(sW - (70 + 10), sH - (15 + 10), 70, 15, "Upload Map")) {
                mapSel_uploadSetup();
            }

            textAlign(CENTER, TOP);
            textSize(16);
            fill(0);
            text("Find community maps by sorting, or by searching a keyword.", sW/2, 10);

            if(button(50, 32, 150, 16, "Sorting By: " + mapSel_sortTypes[mapSel_sortBy])){
                //cycle through sort types
                let sortKeys = Object.keys(mapSel_sortTypes);
                let currentIndex = sortKeys.indexOf(mapSel_sortBy);
                let nextIndex = (currentIndex + 1) % (sortKeys.length-1);
                mapSel_sortBy = sortKeys[nextIndex];
                mapsTextInput.value("");

                if (mapSel_sortBy !== "none") {
                    mapSel_fetchMaps(false, false, mapSel_mapType == "user"); // false means "Do a sort query"
                }
            }

            const cnv = select('canvas');
            const cnvRect = cnv.elt.getBoundingClientRect();
            mapsTextInput.position(cnvRect.left + 442 * scaleFromOrginal, cnvRect.top + 33 * scaleFromOrginal);
            mapsTextInput.size(150 * scaleFromOrginal, 11 * scaleFromOrginal);
            if(button(600, 32, 50, 16, "Search")){
                mapSel_sortBy = "none"
                mapSel_fetchMaps(true, false, mapSel_mapType == "user");

            }

            if (!mapSel_isLastPage && mapsTable.data.length > 0) {
            // Draw the button below the table
                if (button(sW / 2 - 50, sH - 45, 100, 20, "Load More")) {
                    
                    // Call fetch Maps, passing the current search state, and TRUE for loadMore
                    let isCurrentlySearching = (mapSel_sortBy === "none");
                    mapSel_fetchMaps(isCurrentlySearching, true, mapSel_mapType == "user"); 
                    
                }
            }
        }
    }
    lead.draw();
}

//giant ass function from llm cause i am so tired of firebase
// Added 'isMyMaps' as the third parameter
function mapSel_fetchMaps(isSearch = false, loadMore = false, isMyMaps = false) {
    let mapsRef = db.ref("MapsInfo");
    let query;
    
    // Safely get the user's UID (adjust based on your auth setup)
    let currentUserUID = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

    // 1. Reset cursors if this is a brand new sort, search, or toggle
    if (!loadMore) {
        mapSel_lastNodeValue = null;
        mapSel_lastNodeKey = null;
        mapSel_isLastPage = false;
        mapsTable.data = []; // Clear the table
    }

    if (mapSel_isLastPage) return; 

    // Fetch amount includes +1 when loading more to account for the overlapping cursor
    let fetchAmount = mapSel_pageSize + (loadMore ? 1 : 0); 

    // ==========================================
    // BRANCH 1: SIMPLIFIED "MY MAPS" LOGIC
    // ==========================================
    if (isMyMaps) {
        if (!currentUserUID) {
            console.error("Cannot fetch user maps: No user logged in.");
            return;
        }

        query = mapsRef.orderByChild("creatorUID");

        if (loadMore && mapSel_lastNodeKey !== null) {
            // Paginate: start exactly at this user's UID and the last map ID we saw.
            // endAt ensures we don't accidentally spill over into another user's maps.
            query = query.startAt(currentUserUID, mapSel_lastNodeKey).endAt(currentUserUID).limitToFirst(fetchAmount);
        } else {
            // First page: just grab the first batch of this user's maps
            query = query.equalTo(currentUserUID).limitToFirst(fetchAmount);
        }
    } 
    // ==========================================
    // BRANCH 2: ORIGINAL LOGIC (All Maps, Search, Sort)
    // ==========================================
    else {
        let isDescending = (!isSearch && (mapSel_sortBy === "dateCreated" || mapSel_sortBy === "completions"));

        if (isSearch) {
            let searchTerm = mapsTextInput.value().toLowerCase().trim();
            query = mapsRef.orderByChild("name_lower");
            
            if (loadMore && mapSel_lastNodeValue) {
                query = query.startAt(mapSel_lastNodeValue, mapSel_lastNodeKey).endAt(searchTerm + "\uf8ff");
            } else {
                query = query.startAt(searchTerm).endAt(searchTerm + "\uf8ff");
            }
            query = query.limitToFirst(fetchAmount);

        } else {
            if (mapSel_sortBy === "none") return;
            query = mapsRef.orderByChild(mapSel_sortBy);

            if (isDescending) {
                if (loadMore && mapSel_lastNodeValue !== null) {
                    query = query.endAt(mapSel_lastNodeValue, mapSel_lastNodeKey);
                }
                query = query.limitToLast(fetchAmount);
            } else {
                if (loadMore && mapSel_lastNodeValue !== null) {
                    query = query.startAt(mapSel_lastNodeValue, mapSel_lastNodeKey);
                }
                query = query.limitToFirst(fetchAmount);
            }
        }
    }

    // 2. Fetch the batch!
    query.once("value", snapshot => {
        let fetchedMaps = [];
        
        snapshot.forEach(childSnapshot => {
            let mapData = childSnapshot.val();
            
            // Skip the official/community filter if the user is just looking at their own maps
            if (!isMyMaps) {
                if (mapSel_mapType === "community" && mapData.official === true) return;
                if (mapSel_mapType === "official" && mapData.official !== true) return;
            }
            
            mapData.id = childSnapshot.key;
            fetchedMaps.push(mapData);
        });

        // If we were sorting descending in the "All Maps" view, we need to flip the array
        let isDescendingAllMaps = (!isMyMaps && !isSearch && (mapSel_sortBy === "dateCreated" || mapSel_sortBy === "completions"));
        if (isDescendingAllMaps) fetchedMaps.reverse();

        // 3. Drop the overlapping cursor item if we are loading the next page
        if (loadMore && fetchedMaps.length > 0) fetchedMaps.shift(); 

        // 4. Check if we reached the end of the database
        if (fetchedMaps.length < mapSel_pageSize) {
            mapSel_isLastPage = true;
        }

        // 5. Save the cursor for the NEXT time they click "Load More"
        if (fetchedMaps.length > 0) {
            let lastItem = fetchedMaps[fetchedMaps.length - 1];
            mapSel_lastNodeKey = lastItem.id;
            
            // Set the value cursor (only strictly needed for the original logic, but safe to set)
            if (!isMyMaps) {
                mapSel_lastNodeValue = isSearch ? lastItem.name_lower : lastItem[mapSel_sortBy];
            }
        }

        // 6. Format and append to the existing table data
        let newTableData
        if(mapSel_mapType != "user"){
            newTableData = fetchedMaps.map(m => ({
                "Name": m.name,
                "Creator": m.creator,
                "Completions": m.completions,
                "Date": new Date(m.dateCreated).toLocaleDateString(),
                "Play": {"PLAY MAP": () => mapSel_loadMapByID(m.id)},
                "Leaderboard": m.completions == 0 ? "No Completions" : {"VIEW LEADERBOARD": () => viewLeaderboard(m.id)}
            }));
        }else{
            newTableData = fetchedMaps.map(m => ({
                "Name": m.name,
                "Completions": m.completions,
                "Date": new Date(m.dateCreated).toLocaleDateString(),
                "Download Map": {"DOWNLOAD": () => mapSel_downloadMap(m.id, m.name)},
                "Delete Map": {"DELETE": () => mapSel_deleteMap(m.id)},
                "Leaderboard": m.completions == 0 ? "No Completions" : {"VIEW LEADERBOARD": () => viewLeaderboard(m.id)}
            }));
        }
        

        // Combine the old data with the newly loaded data!
        mapsTable.data = mapsTable.data.concat(newTableData);
    });
}

function mapSel_deleteMap(id){
    confirmation = confirm("Are you sure you want to delete your level off the cloud? It will be gone forever! Download it first if you want to save it!")
    if(!confirmation){return;}

    const updates = {};
    updates["MapsInfo/" + id] = null;
    updates["CommunityMapsData/" + id] = null;
    updates["OfficialMapsData/" + id] = null; // Included just in case an admin is deleting
    updates["MapsLeaderboard/" + id] = null;

    // Execute the deletion
    db.ref().update(updates)
        .then(() => {
            alert("Map successfully deleted!");
            
            // Refresh the table so the deleted map disappears from the screen
            mapSel_fetchMaps(false, false, mapSel_mapType === "user"); 
        })
        .catch((error) => {
            console.error("Error deleting map:", error);
            alert("Error deleting map! Check your permissions or try again later.");
        });
}

//also llm
function mapSel_downloadMap(id, name) {
    let mapRef;
    
    // 1. Point to the right database location based on the current tab
    if (mapSel_mapType === "official") {
        mapRef = db.ref("OfficialMapsData/" + id + "/maps");
    } else {
        mapRef = db.ref("CommunityMapsData/" + id + "/maps");
    }

    // 2. Fetch the data from Firebase
    mapRef.once("value", snapshot => {
        const mapData = snapshot.val();
        
        if (!mapData) {
            alert("Error: Map data not found!");
            return;
        }

        // 3. Ask for the filename (runs only AFTER data is fetched)
        let filename = name
        // Ensure the file has a .json extension
        if (!filename.endsWith(".json")) {
            filename += ".json";
        }

        // 4. Turn the fetched Firebase data into a formatted JSON string
        const json = JSON.stringify(mapData, null, 2);
        
        // 5. Create the downloadable file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        // 6. Trigger the browser download
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // 7. Clean up to prevent memory leaks
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function mapSel_loadMapByID(id){
    let map;
    //get map code
    if (mapSel_mapType === "official") {
        mapRef = db.ref("OfficialMapsData/" + id + "/maps");
    } else {
        mapRef = db.ref("CommunityMapsData/" + id + "/maps");
    }

    mapRef.once("value", snapshot => {
        const mapData = snapshot.val();
        if (!mapData) {
            alert("Map not found!");
            return;
        }

        // Initialize the game with the map
        game_initMap(mapData, "real", 0, id);
        mapSel_inGame = true;
    });

}

function mapSel_uploadSetup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        let mapName = prompt("Enter Map Name:");
        if (!mapName) return;

        let mapType = "community";

        if (mapName.includes("\\OFFICIAL\\")) {
            mapType = "official";
            mapName = mapName.replaceAll("\\OFFICIAL\\", "");
        }

        const file = e.target.files[0];
        if (!file) {
            alert("No file selected!");
            return;
        }
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const mapData = JSON.parse(event.target.result);
                if (mapData) {
                    const mapInfoUpload = {
                        name: mapName,
                        name_lower: mapName.toLowerCase(),
                        creatorUID: auth.currentUser.uid,
                        creator: auth.currentUser.email,
                        dateCreated: Date.now(),
                        completions: 0,
                        official: (mapType === "official"),
                    };
                    const mapDataUpload = { maps: mapData };
                    mapSel_uploadMap(mapInfoUpload, mapDataUpload, mapType);
                } else {
                    alert("Invalid map data!");
                }
            } catch (error) {
                alert("Error reading map file! Make sure it's a valid JSON file.");
                console.error("Parse error:", error);
            }
        };
        reader.readAsText(file);
    };
    input.click(); // <-- call this as soon as possible after user action
}

function mapSel_uploadMap(mapInfo, mapData, mapType) {
    const mapRef = db.ref("MapsInfo").push();
    const mapId = mapRef.key;

    
    const updates = {}
    updates["MapsInfo/" + mapId] = mapInfo;
    if(mapType == "community"){
        updates["CommunityMapsData/" + mapId] = mapData;
    }else if(mapType == "official"){
        updates["OfficialMapsData/" + mapId] = mapData;
    }
    //updates["MapsLeaderboard/" + mapId] = {}; //does nothing
    db.ref().update(updates)
        .then(() => {
            alert("Map uploaded successfully!");
            mapSel_fetchMaps(false, false, mapSel_mapType == "user")
        })
        .catch((error) => {
            console.error("Error uploading map:", error);
            alert("Error uploading map! Try again later.");
        });
}

function mapSel_completedLevel(id, time) {
    // 1. Increment completions
    const infoRef = db.ref("MapsInfo/" + id + "/completions");
    infoRef.transaction(current => (current || 0) + 1);

    // 2. Update leaderboard
    const leaderboardRef = db.ref("MapsLeaderboard/" + id);
    leaderboardRef.once("value", snapshot => {
        let board = snapshot.val() || {};
        // Use email up to the @ as name
        let user = "Anonymous";
        if (auth.currentUser && auth.currentUser.displayName) {
            user = auth.currentUser.displayName;
        }
        // Unique key for each run
        const entryKey = user + "_" + Date.now();
        board[entryKey] = { name: user, time: Math.round(time) };

        // Sort all entries by time ascending
        let entries = Object.values(board).sort((a, b) => a.time - b.time);
        // Keep only top 10
        if (entries.length > 10) entries = entries.slice(0, 10);

        // Rebuild leaderboard object with new unique keys
        const newBoard = {};
        for (let i = 0; i < entries.length; i++) {
            newBoard[entries[i].name + "_" + i] = entries[i];
        }

        leaderboardRef.set(newBoard);
    });
}

async function viewLeaderboard(id){
    const leaderboardRef = db.ref("MapsLeaderboard/" + id);
    const nameRef = db.ref("MapsInfo/" + id + "/name");
    
    try {
        const dataSnapshot = await leaderboardRef.once("value");
        const nameSnapshot = await nameRef.once("value");
        const data = dataSnapshot.val() || {};
        const name = nameSnapshot.val() || "";

        // Show the leaderboard UI
        lead = new leaderboard(name, data);
        lead.active = true;

    } catch (error) {
        console.error("Error loading leaderboard:", error);
    }

    
    


}

class leaderboard {
    constructor(name, data){
        // data: {key: {name, time}}
        this.data = data;
        this.name = name;
        this.x = 150
        this.y = 100
        this.w = sW - 300
        this.h = sH - 290
        this.active = true;
    }
    draw(){
        if(this.active){
            fill(230);
            strokeWeight(0.5);
            rect(this.x, this.y, this.w, this.h);

            strokeWeight(0);
            fill(0);
            textSize(20);
            textAlign(CENTER, TOP);
            text("Leaderboard: " + this.name, this.x + this.w/2, this.y + 10)
            // Sort by time
            const sortedData = Object.values(this.data).sort((a, b) => a.time - b.time);
            let i = 0
            textSize(14);
            for (const entry of sortedData) {
                text(entry.name + ": " + msToTime(entry.time), this.x + this.w/2, this.y + 40 + i*16)
                i++
            }
            if(button(this.x, this.y, 16, 16, "X")){
                this.active = false;
            }
        }
    }
}

function msToTime(duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const milliseconds = duration % 1000;

    return `${minutes}:${seconds.toString().padStart(2, '0')}:${milliseconds
        .toString()
        .padStart(3, '0')}`;
}

