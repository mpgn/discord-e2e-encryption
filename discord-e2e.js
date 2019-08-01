// ==UserScript==
// @name         discord-e2e
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Discord End2End encryption
// @author       @mpgn_x64 https://github.com/mpgn
// @match        https://discordapp.com/channels/*
// @grant        none
// ==/UserScript==

var keyStorage = [
    {
        'channel':'/channels/495699373863338003/533030226402476032',
        'key': 'Y0zt37HgOx-BY7SQjYVmrqhPkO44Ii2Jcb9yydUDPfE'
    },
    {
        'channel':'/channels/495699373863338003/533248362879778818',
        'key': 'Ql_hbv0KXrp3QbvPpDoXj9m1E6zCa_nWYd841g9unZc'
    }
]

async function importKey(key) {
    return window.crypto.subtle.importKey(
        "jwk",
        {
            kty: "oct",
            k: key,
            alg: "A256GCM",
            ext: true,
        },
        {
            name: "AES-GCM",
        },
        false,
        ["encrypt", "decrypt"]
    )
}

async function encrypt(data, key, iv) {
    return window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
            tagLength: 128,
        },
        key,
        data
    )
}

async function decrypt(data, key, iv) {
    return window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
            tagLength: 128,
        },
        key,
        data
    )
}

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function userSend(e){
    e = e || window.event;
    var keyCode = e.which || e.keyCode;
    var charStr = String.fromCharCode(keyCode);
    // getting the text of the textarea
    text += charStr
    // user ENTER to send the message
    if (keyCode === 13) {
        if (!encrypted && !spaced) {
            console.log("[+] Enter pressed ")
            console.log("[+] Cleartext: " + document.querySelector('textarea').value)
            // ciphertext = b64(enc(plaintext))
            var enc = new TextEncoder();
            var data = enc.encode(document.querySelector('textarea').value)
            var iv = window.crypto.getRandomValues(new Uint8Array(12))
            encrypt(data, key, iv).then(function(result) {
                console.log("[+] Encrypted: " + result)
                console.log("[+] Press SPACE and ENTER on the keyboard")
                document.querySelector('textarea').value = _arrayBufferToBase64(iv) + '|' + _arrayBufferToBase64(result)
                encrypted = 1
            })
        } else if (encrypted && spaced) {
            console.log("[+] Message send")
            encrypted = 0
            spaced = 0
            send = 1
            return true
        }
        // cancel all action to avoid submit cleartext if not encrypted and spaced
        e.cancelBubble = true;
        e.returnValue = false;
        e.stopPropagation();
        e.preventDefault();
    }
    // check if after encrypt the message, user submit SPACE to save the new message into Discord client message variable
    if (encrypted && keyCode === 32) {
        spaced = 1
    }
}

// decrypt all data visible by the user on Discord chat
function decryptMessages() {
    console.log("[+] Message decrypted... ")
  	let compact = 0
    if (document.querySelector('.containerCompactBounded-cYR5cW') !== null) {
      compact = 1
    }
    var messages = document.getElementsByClassName("markup-2BOw-j")
    //console.log(document.getElementsByClassName("markup-2BOw-j").length)
    for (let i = 0; i < messages.length; i++) {
        // console.log(i, messages[i])
        if (messages[i].childNodes.length > compact) {
            //console.log(b64DecodeUnicode(messages[i].childNodes[1].textContent))
            try {
                var iv = _base64ToArrayBuffer(messages[i].childNodes[compact].textContent.split('|')[0])
                var data = _base64ToArrayBuffer(messages[i].childNodes[compact].textContent.split('|')[1])
                // console.log(data)
                decrypt(data, key, iv).then(function(result) {
                    var enc = new TextDecoder("utf-8");
                    messages[i].childNodes[compact].textContent = enc.decode(result)
                    // console.log("decrypt" + enc.decode(result))
                })
            } catch(e) { }
        }
    }
}

// Decrypt last message send by user or last message receive
function decryptLastMessages(last) {
    console.log("[+] Last Message decrypted... ")
  	let compact = 0
    if (document.querySelector('.containerCompactBounded-cYR5cW') !== null) {
      compact = 1
    }
    var message = document.getElementsByClassName("markup-2BOw-j")[last-1]
    var enc = new TextDecoder("utf-8");
    // console.log(message.childNodes[compact].textContent)
    if (message.childNodes.length > compact) {
        // console.log(_base64ToArrayBuffer(message.childNodes[1].textContent))
        var data = _base64ToArrayBuffer(message.childNodes[compact].textContent)
        decrypt(data, key, iv).then(function(result) {
            message.childNodes[compact].textContent = enc.decode(result)
            // console.log("decrypt" + enc.decode(result))
        })
    }
}

// var for crypto
var key = ""
var iv = ""
var watched = false
async function loadKeys() {
    let data = keyStorage.find(function(element) {
        return element.channel === window.location.pathname;
    });
    if (data) {
        console.log("[+] Key and IV found for this channel")
        key = await importKey(data.key);
        iv = data.iv;
        watched = true;
        (new MutationObserver(checkTextareaLoaded)).observe(document, {childList: true, subtree: true});
        (new MutationObserver(checkMessagesLoaded)).observe(document, {childList: true, subtree: true});
    } else {
        console.log("[-] No Key and IV found for this channel")
        watched = false;
        (new MutationObserver(checkTextareaLoaded)).observe(document, {childList: true, subtree: true});
    }
}
console.log("[+] Starting ...")
loadKeys()

// var for messages
var text = '';
var encrypted = 0;
var spaced = 0;
var send = 0;
var observerScroll = new MutationObserver(checkUserScroll);
function addObserverIfDesiredNodeAvailable() {
    // var composeBox = document.getElementsByClassName("messages-3amgkR")[0];
    var composeBox = document.getElementsByClassName("messagesWrapper-3lZDfY")[0];
    var config = {attributes: true,
  childList: true,
  subtree: true,
  characterData: true};
    console.log("event fire")
    observerScroll.observe(composeBox,config);
}

// check if user switch channel
var observerChannel = new MutationObserver(reloadKey);
function addObserverIfDesiredNodeAvailable2() {
    var composeBox = document.getElementsByClassName("base-3dtUhz")[0];
    var config = {childList: true, subtree: true, characterData: true};
    observerChannel.observe(composeBox,config);
}

function reloadKey(changes, observer) {
    // console.log(changes, observer)
    loadKeys()
    observerChannel.disconnect()
}

function checkTextareaLoaded(changes, observer) {
    if(document.querySelector('form')) {
        observer.disconnect();
        console.log("Loaded")
        if(watched) {
            encrypted = 0;
            spaced = 0;
            send = 0;
            document.querySelector('form').onkeypress = userSend
        } else {
            document.querySelector('form').onkeypress = null
        }
        addObserverIfDesiredNodeAvailable2();
    }
}

function checkMessagesLoaded(changes, observer) {
    if(document.getElementsByClassName("markup-2BOw-j").length) {
        decryptMessages()
        observer.disconnect();
        console.log("Messages loaded")
        addObserverIfDesiredNodeAvailable();

    }
}

function checkUserScroll(changes, observer) {
    // console.log("event ", changes, observer)
		if (typeof event == "undefined" || event.type == "scroll") {
        // console.log("scroll")
        // dirty but working
        setTimeout(function() { decryptMessages(); }, 1500);
    } else if(event.type === "message" || event.type === "readystatechange") {
        decryptLastMessages(document.getElementsByClassName("markup-2BOw-j").length)
    }
}
