let mapsTable;
let mapsTextInput;

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
        mapSel_fetchMaps()
    }else{
        mapsTextInput.show();
        mapSel_fetchMaps()
    }
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
        if(mapSel_mapType == "official"){
            textAlign(CENTER, TOP);
            textSize(16);
            fill(0);
            strokeWeight(0);
            text("OFFICIAL MAPS", sW/2, 10);
            mapsTextInput.hide();
            
        }
        if(mapSel_mapType == "community"){
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
                    mapSel_fetchMaps(false); // false means "Do a sort query"
                }
            }

            const cnv = select('canvas');
            const cnvRect = cnv.elt.getBoundingClientRect();
            mapsTextInput.position(cnvRect.left + 442 * scaleFromOrginal, cnvRect.top + 33 * scaleFromOrginal);
            mapsTextInput.size(150 * scaleFromOrginal, 11 * scaleFromOrginal);
            if(button(600, 32, 50, 16, "Search")){
                mapSel_sortBy = "none"
                mapSel_fetchMaps(true);

            }

            if (!mapSel_isLastPage && mapsTable.data.length > 0) {
            // Draw the button below the table
                if (button(sW / 2 - 50, sH - 45, 100, 20, "Load More")) {
                    
                    // Call fetch Maps, passing the current search state, and TRUE for loadMore
                    let isCurrentlySearching = (mapSel_sortBy === "none");
                    mapSel_fetchMaps(isCurrentlySearching, true); 
                    
                }
            }
        }
    }
    lead.draw();
}

//giant ass function from llm cause i am so tired of firebase
function mapSel_fetchMaps(isSearch = false, loadMore = false) {
    let mapsRef = db.ref("MapsInfo");
    let query;

    // 1. Reset cursors if this is a brand new sort or search
    if (!loadMore) {
        mapSel_lastNodeValue = null;
        mapSel_lastNodeKey = null;
        mapSel_isLastPage = false;
        mapsTable.data = []; // Clear the table
    }

    if (mapSel_isLastPage) return; // Stop if there are no more maps to load

    // Firebase only sorts ascending (A-Z, 1-100). We must use limitToLast to get the "highest" numbers.
    let isDescending = (!isSearch && (mapSel_sortBy === "dateCreated" || mapSel_sortBy === "completions"));
    let fetchAmount = mapSel_pageSize + (loadMore ? 1 : 0); // Grab 1 extra if loading more to account for the cursor

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
            // Descending logic (Newest/Highest)
            if (loadMore && mapSel_lastNodeValue !== null) {
                query = query.endAt(mapSel_lastNodeValue, mapSel_lastNodeKey);
            }
            query = query.limitToLast(fetchAmount);
        } else {
            // Ascending logic (Oldest/Lowest/A-Z)
            if (loadMore && mapSel_lastNodeValue !== null) {
                query = query.startAt(mapSel_lastNodeValue, mapSel_lastNodeKey);
            }
            query = query.limitToFirst(fetchAmount);
        }
    }

    // 2. Fetch the batch!
    query.once("value", snapshot => {
        let fetchedMaps = [];
        
        snapshot.forEach(childSnapshot => {
            let mapData = childSnapshot.val();
            // Filter
            if (mapSel_mapType === "community" && mapData.official === true) return;
            if (mapSel_mapType === "official" && mapData.official !== true) return;
            
            mapData.id = childSnapshot.key;
            fetchedMaps.push(mapData);
        });

        // Firebase always gives us the list ascending, so flip it if we wanted descending
        if (isDescending) fetchedMaps.reverse();

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
            mapSel_lastNodeValue = isSearch ? lastItem.name_lower : lastItem[mapSel_sortBy];
        }

        // 6. Format and append to the existing table data
        let newTableData = fetchedMaps.map(m => ({
            "Name": m.name,
            "Creator": m.creator,
            "Completions": m.completions,
            "Date": new Date(m.dateCreated).toLocaleDateString(),
            "Play": {"PLAY MAP": () => mapSel_loadMapByID(m.id)},
            "Leaderboard": m.completions == 0 ? "No Completions" : {"VIEW LEADERBOARD": () => viewLeaderboard(m.id)}
        }));

        // Combine the old data with the newly loaded data!
        mapsTable.data = mapsTable.data.concat(newTableData);
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
        if (auth.currentUser && auth.currentUser.email) {
            user = auth.currentUser.email.split("@")[0];
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
        this.h = sH - 250
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

