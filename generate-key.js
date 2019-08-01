/*
    This script should be only run into the dev console
    More information: https://github.com/mpgn/discord-e2e-encryption
*/
async function generateKey(passphrase, salt){
    // Import password as CryptoKey object
    let enc = new TextEncoder()
    let masterkey = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        {name: "PBKDF2"},
        false,
        ["deriveBits", "deriveKey"]
    )

    return window.crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        salt: enc.encode(salt),
        "iterations": 100000,
        "hash": "SHA-256"
      },
      masterkey,
      { "name": "AES-GCM", "length": 256},
      false,
      [ "encrypt", "decrypt" ]
    );
}

async function exportKey(key) {
    return window.crypto.subtle.exportKey(
        "jwk", //can be "jwk" or "raw"
        key //extractable must be true
    )
}

var key = await generateKey("your password", "your salt")
exportKey(key).then(function (result) {
    console.log(result)
})
