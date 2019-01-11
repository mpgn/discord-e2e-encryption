/*
    This script should be only run into the dev console
    More information: https://github.com/mpgn/discord-e2e-encryption
*/

async function generateKey() {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    )
}

async function exportKey(key) {
    return window.crypto.subtle.exportKey(
        "jwk", //can be "jwk" or "raw"
        key //extractable must be true
    )
}

var key = await generateKey();
exportKey(key).then(function (result) {
    console.log(result)
});
