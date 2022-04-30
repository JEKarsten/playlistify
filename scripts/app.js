const REDIRECT_URI = "http://127.0.0.1:5500/index.html";

var ACCESS_TOKEN = null;
var REFRESH_TOKEN = null;
var SEED_SONG_ID = null;

const NUM_SEARCH_TERMS = 10;
const NUM_PLAYLIST_SONGS = 27;
const METADATA_DECIMAL_PLACES = 3;

const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token";



// **********************************************************
// API REQUEST FUNCTIONS
// **********************************************************

function sendAPIGetRequest(url, method) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + ACCESS_TOKEN);
    xhr.send();
    xhr.onload = function() {
        if (xhr.status == 200) method(xhr.responseText);
        else if (xhr.status == 400 && method == parseSong) alert("Please enter a search parameter!");
        else if (xhr.status == 401) refreshAccessToken();
        else alert(xhr.responseText);
    };
}

function sendAPIPostRequest(url, body, method) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(CLIENT_ID + ":" + CLIENT_SECRET));
    xhr.send(body);
    xhr.onload = function() {
        if (xhr.status == 200) method(xhr.responseText);
        else alert(xhr.responseText);
    };
}

function send2APIGetRequests(url1, url2, method) {
    let xhr1 = new XMLHttpRequest();
    xhr1.open("GET", url1, true);
    xhr1.setRequestHeader('Content-Type', 'application/json');
    xhr1.setRequestHeader('Authorization', 'Bearer ' + ACCESS_TOKEN);
    xhr1.send();
    xhr1.onload = function() {
        let xhr2 = new XMLHttpRequest();
        xhr2.open("GET", url2, true);
        xhr2.setRequestHeader('Content-Type', 'application/json');
        xhr2.setRequestHeader('Authorization', 'Bearer ' + ACCESS_TOKEN);
        xhr2.send();
        xhr2.onload = function() {
            if (xhr1.status == 200 && xhr2.status == 200) method(xhr1.responseText, xhr2.responseText);
            else if (xhr1.status == 401 || xhr2.status == 401) refreshAccessToken();
            else if (xhr1.status != 200) alert(xhr1.responseText);
            else alert(xhr2.responseText);
        };
    };
}



// **********************************************************
// GENERAL FUNCTIONS
// **********************************************************

function onPageLoad() {
    // localStorage.clear();
    if (window.location.search.length > 0) {
        console.log(window.location.search);
        handleRedirect();
    } else {
        ACCESS_TOKEN = localStorage.getItem("access_token");
        if (ACCESS_TOKEN == null) document.getElementById("tokenSection").style.display = 'block';  
        else {
            document.getElementById("searchSection").style.display = 'block';
            var input = document.getElementById("searchSection");
            input.addEventListener("keyup", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    document.getElementById("searchButton").click();
                }
            });
        }
    }
}

function handleRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');
    getAccessToken(code);
    window.history.pushState("", "", REDIRECT_URI);
}

function resetDisplay() {
    clearSearch();
    document.getElementById("searchGeneral").value = "";
    document.getElementById("searchTrack").value = "";
    document.getElementById("searchArtist").value = "";
    document.getElementById("searchAlbum").value = "";
}



// **********************************************************
// AUTHORIZATION FUNCTIONS
// **********************************************************

function requestAuthorization() {
    let url = AUTHORIZE;
    url += "?client_id=" + CLIENT_ID;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(REDIRECT_URI);
    url += "&show_dialog=true";
    url += "&scope=user-read-private";
    window.location.href = url;
}

function getAccessToken(code) {
    let body = "grant_type=authorization_code";
    body += "&code=" + code; 
    body += "&redirect_uri=" + encodeURI(REDIRECT_URI);
    body += "&client_id=" + CLIENT_ID;
    body += "&client_secret=" + CLIENT_SECRET;
    sendAPIPostRequest(TOKEN, body, handleAuthorizationResponse);
}

function refreshAccessToken() {
    REFRESH_TOKEN = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + REFRESH_TOKEN;
    body += "&client_id=" + CLIENT_ID;
    sendAPIPostRequest(TOKEN, body, handleAuthorizationResponse);
}

function handleAuthorizationResponse(response) {
    var data = JSON.parse(response);
    console.log(data);
    if (data["access_token"] != undefined) {
        ACCESS_TOKEN = data["access_token"];
        localStorage.setItem("access_token", ACCESS_TOKEN);
    }
    onPageLoad();
}



// **********************************************************
// SEARCH FUNCTIONS
// **********************************************************

function clearSearch() {
    document.getElementById("searchResults").innerHTML = null;
    document.getElementById("playlistTracks").innerHTML = null;
    window.scroll(top);
}

function searchSong() {
    clearSearch();
    let termGeneral = document.getElementById("searchGeneral").value;
    let termTrack = document.getElementById("searchTrack").value;
    let termArtist = document.getElementById("searchArtist").value;
    let termAlbum = document.getElementById("searchAlbum").value;

    let url = "https://api.spotify.com/v1/search?";
    url += "type=track&";
    url += "limit=" + NUM_SEARCH_TERMS + "&";
    url += "q=" + termGeneral;
    if (termTrack != "") url += "+track:" + termTrack;
    if (termArtist != "") url += "+artist:" + termArtist;
    if (termAlbum != "") url += "+album:" + termAlbum;
    
    sendAPIGetRequest(url, parseSong);
}

function parseSong(response) { // async
    let data = JSON.parse(response);
    let trackList = data["tracks"]["items"];

    for (const track of trackList) {
        let node = document.createElement("div");
        let nodeTrack = document.createElement("div");
        let nodeArtist = document.createElement("div");
        let nodeCover = document.createElement("img");

        node.className = "searchResult"
        node.onclick = function() {getSongInfoFeatures(this.id)};
        node.id = track["id"];

        nodeTrack.className = "track";
        nodeTrack.innerHTML = track["name"];

        nodeArtist.className = "artist";
        let artistText = "";
        for (const artist of track.artists) {
            artistText += artist["name"] + ", ";
        }
        nodeArtist.innerHTML = artistText.substring(0, artistText.length-2);

        nodeCover.className = "cover";
        nodeCover.src = track["album"]["images"][0]["url"];

        node.appendChild(nodeCover);
        node.appendChild(nodeTrack);
        node.appendChild(nodeArtist);
        document.getElementById("searchResults").appendChild(node);
    }
}



// **********************************************************
// RECOMMENDATION  FUNCTIONS
// **********************************************************

function getSongInfoFeatures(trackId) {
    SEED_SONG_ID = trackId;
    let urlI = "https://api.spotify.com/v1/tracks/" + trackId;
    let urlF = "https://api.spotify.com/v1/audio-features/" + trackId;
    send2APIGetRequests(urlI, urlF, getRecs);
}

function getRecs(infoResponse, featuresResponse) {
    let info = JSON.parse(infoResponse);
    let features = JSON.parse(featuresResponse);

    let url = "https://api.spotify.com/v1/recommendations?";
    url += "seed_artists=" + info["artists"][0]["id"] + "&";
    url += "seed_genres=" + "pop" + "&";
    url += "seed_tracks=" + info["id"] + "&";
    url += "limit=" + NUM_PLAYLIST_SONGS + "&";

    url += "target_danceability=" + features["danceability"] + "&";
    url += "min_danceability=" + (features["danceability"] - 0.15) + "&";
    url += "max_danceability=" + (features["danceability"] + 0.15) + "&";

    url += "target_energy=" + features["energy"] + "&";
    url += "min_energy=" + (features["energy"] - 0.08) + "&";
    url += "max_energy=" + (features["energy"] + 0.08) + "&";

    url += "target_acousticness=" + features["acousticness"] + "&";
    url += "min_acousticness=" + (features["acousticness"] - 0.1) + "&";
    url += "max_acousticness=" + (features["acousticness"] + 0.1) + "&";

    url += "target_tempo=" + features["tempo"] + "&";
    url += "min_tempo=" + (features["tempo"] - 15) + "&";
    url += "max_tempo=" + (features["tempo"] + 15) + "&";

    url += "target_valence=" + features["valence"] + "&";
    url += "min_valence=" + (features["valence"] - .2) + "&";
    url += "max_valence=" + (features["valence"] + .2) + "&";
    
    sendAPIGetRequest(url, displayPlaylist);
}

function displayPlaylist(response) {
    clearSearch();
    let data = JSON.parse(response);
    console.log(data)
    let tracks = data["tracks"];
    for (const track of tracks) {
        let node = document.createElement("div");
        let nodeMetadata = document.createElement("div");
        let nodeTrack = document.createElement("div");
        let nodeArtist = document.createElement("div");
        let nodeCover = document.createElement("img");

        node.className = "item";
        node.onclick = function() {collectFeatureData(this.id)};
        node.id = track["id"];

        nodeMetadata.className = "metadata";

        nodeTrack.className = "track";
        nodeTrack.innerHTML = track["name"];

        nodeArtist.className = "artist";
        let artistText = "";
        for (const artist of track.artists) {
            artistText += artist["name"] + ", ";
        }
        nodeArtist.innerHTML = artistText.substring(0, artistText.length-2);

        nodeCover.className = "cover";
        nodeCover.src = track["album"]["images"][0]["url"];

        nodeMetadata.appendChild(nodeTrack);
        nodeMetadata.appendChild(nodeArtist);
        node.appendChild(nodeCover);
        node.appendChild(nodeMetadata);
        document.getElementById("playlistTracks").appendChild(node);
    }
}



// **********************************************************
// METADATA  FUNCTIONS
// **********************************************************

function collectFeatureData(trackId) {
    let urlSeed = "https://api.spotify.com/v1/audio-features/" + SEED_SONG_ID;
    let urlRec = "https://api.spotify.com/v1/audio-features/" + trackId;
    send2APIGetRequests(urlSeed, urlRec, parseFeatureData);
}

function parseFeatureData(featuresResponseSeed, featuresResponseRec) {
    let featuresSeed = JSON.parse(featuresResponseSeed);
    let featuresRec = JSON.parse(featuresResponseRec);
    console.log(featuresSeed);
    console.log(featuresRec);

    let node = document.createElement("div");
    node.id = "popupTrackDataContent";

    let nodeHeadingDif = document.createElement("div");
    nodeHeadingDif.className = "heading";
    nodeHeadingDif.innerHTML = "Difference between songs";
    node.appendChild(nodeHeadingDif);

    let acousticnessDif = findDistance(featuresRec["acousticness"], featuresSeed["acousticness"]);
    let danceabilityDif = findDistance(featuresRec["danceability"], featuresSeed["danceability"]);
    let energyDif = findDistance(featuresRec["energy"], featuresSeed["energy"]);
    let instrumentalnessDif = findDistance(featuresRec["instrumentalness"], featuresSeed["instrumentalness"]);
    let keyDif = findDistance(featuresRec["key"], featuresSeed["key"]);
    let livenessDif = findDistance(featuresRec["liveness"], featuresSeed["liveness"]);
    let loudnessDif = findDistance(featuresRec["loudness"], featuresSeed["loudness"]);
    let modeDif = findDistance(featuresRec["mode"], featuresSeed["mode"]);
    let speechinessDif = findDistance(featuresRec["speechiness"], featuresSeed["speechiness"]);
    let tempoDif = findDistance(featuresRec["tempo"], featuresSeed["tempo"]);
    let timeSignatureDif = findDistance(featuresRec["time_signature"], featuresSeed["time_signature"]);
    let valenceDif = findDistance(featuresRec["valence"], featuresSeed["valence"]);

    node.innerHTML += "Acousticness: " + acousticnessDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Danceability: " + danceabilityDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Energy: " + energyDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Instrumentalness: " + instrumentalnessDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Key: " + keyDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Liveness: " + livenessDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Loudness: " + loudnessDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Mode: " + modeDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Speechiness: " + speechinessDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Tempo: " + tempoDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Time signature: " + timeSignatureDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    node.innerHTML += "Valence: " + valenceDif.toFixed(METADATA_DECIMAL_PLACES) + "<br>";
    
    let nodeHeadingDistance = document.createElement("div");
    nodeHeadingDistance.className = "heading";
    nodeHeadingDistance.innerHTML = "Normalized distance between songs";
    node.appendChild(nodeHeadingDistance);

    normalizedDistance = acousticnessDif + danceabilityDif + energyDif + instrumentalnessDif + (keyDif/12) + livenessDif + (loudnessDif/60) + modeDif + speechinessDif + (tempoDif/200) + (timeSignatureDif/4) + valenceDif;
    normalizedDistance /= 12;
    node.innerHTML += normalizedDistance.toFixed(METADATA_DECIMAL_PLACES);

    document.getElementById("popupTrackData").appendChild(node);
    displayPopup();
}

function findDistance(x, y) {
    return Math.abs(x - y);
}

function displayPopup() {
    document.getElementById("popup").style.display = "block";
}

function clearPopup() {
    document.getElementById("popupTrackDataContent").remove();
    document.getElementById("popup").style.display = "none";
}





function test() {
    let urlSeed = "https://api.spotify.com/v1/audio-features/" + "39LLxExYz6ewLAcYrzQQyP";
    let urlRec = "https://api.spotify.com/v1/audio-features/" + "017PF4Q3l4DBUiWoXk4OWT";
    send2APIGetRequests(urlSeed, urlRec, parseFeatureData);
}