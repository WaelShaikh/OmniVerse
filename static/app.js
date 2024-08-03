var socket = io();
socket.on('connect', function() {
    socket.emit('log', "connected");
});

messages = []

socket.on('aiMessage', function(data) {
    addChatMessage("ai", data);
});

socket.on('streamEnd', function() {
    var textInputButton = document.getElementById("textInputButton");
    textInputButton.disabled = false;
})

function sendTextInput() {
    var textInputButton = document.getElementById("textInputButton");
    textInputButton.disabled = true;
    var userInput = document.getElementById("textInputBox").value;
    if(userInput.trim() != "") {
        document.getElementById("textInputBox").value = "";
        messages.push({"role": "user", "content": userInput});
        id = messages.length;
        addChatMessage("user", {content: userInput, id: id});
        socket.emit('userMessage', {userInput: userInput, id: id});
    }
    return false;
}

function addChatMessage(sender, message) {
    existing = document.getElementById("msg"+message.id);
    var carousel = document.getElementById("messagesCarousel");
    var shouldScroll = false;
    if(carousel.scrollTop + carousel.clientHeight >= carousel.scrollHeight)
        shouldScroll = true;

    if(existing == null) {
        var messageContainerDiv = document.createElement("div");
        messageContainerDiv.classList.add("messageContainer");

        var userMessageDiv = document.createElement("div");
        userMessageDiv.classList.add(sender + "Message");
        userMessageDiv.id = "msg"+message.id;
        userMessageDiv.textContent = message.content;

        messageContainerDiv.appendChild(userMessageDiv);
        carousel.appendChild(messageContainerDiv);
    } else {
        existing.textContent += message.content;
    }

    if(sender == "user") {
        carousel.scrollTo(0, carousel.scrollHeight);
    }
    else {
        if(shouldScroll)
            carousel.scrollTo(0, carousel.scrollHeight);
    }    
}

function sendImageInput() {
    var userInput = document.getElementById("textInputBox").value;
    if(userInput.trim() != "") {
        document.getElementById("placeholder").style.display = "block";
        document.getElementById("fetchedimg").style.display = "none";
        var textInputButton = document.getElementById("textInputButton");
        textInputButton.disabled = true;
        document.getElementById("generatedImage").classList.add("blink-anim");
        document.getElementById("textInputBox").value = "";
        socket.emit('generateImage', {userInput: userInput});
    }
    return false;
}

socket.on('generatedImage', function(data) {
    var textInputButton = document.getElementById("textInputButton");
    textInputButton.disabled = false;
    console.log(data["image"]);
    document.getElementById("generatedImage").classList.remove("blink-anim");
    var arrayBufferView = new Uint8Array(data['image']);
    var blob = new Blob( [ arrayBufferView ], { type: "image/png" } );
    var img_url = URL.createObjectURL(blob);
    console.log(img_url);
    document.getElementById("generatedImage").style.backgroundImage = img_url;
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("fetchedimg").src = img_url;
    document.getElementById("fetchedimg").style.display = "block";
});

function sendAudioInput() {
    var userInput = document.getElementById("textInputBox").value;
    if(userInput.trim() != "") {
        document.getElementById("placeholder").style.display = "inline-block";
        document.getElementById("fetchedaudioplayer").style.display = "none";
        document.getElementById("generatedAudio").style.backgroundColor = "#111111";
        var textInputButton = document.getElementById("textInputButton");
        textInputButton.disabled = true;
        document.getElementById("textInputBox").value = "";
        document.getElementById("generatedAudio").classList.add("blink-anim");
        socket.emit('generateAudio', {userInput: userInput});
    }
    return false;
}

socket.on('generatedAudio', function(data) {
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("fetchedaudioplayer").style.display = "block";
    document.getElementById("generatedAudio").style.backgroundColor = "#0000";
    var textInputButton = document.getElementById("textInputButton");
    textInputButton.disabled = false;
    document.getElementById("generatedAudio").classList.remove("blink-anim");

    url = data["url"];

    const audioElement = document.getElementById("fetchedaudioplayer");
    audioElement.addEventListener("loadedmetadata", function () {
        // audioElement.play();
    });
    audioElement.setAttribute("src", url + "?cb=" + new Date().getTime());
    audioElement.load();
});
