/*
    This script should be only run into the dev console
    More information: https://github.com/mpgn/discord-e2e-encryption
*/

async function generateKey(password, salt, iterations) {
    // Based on https://8gwifi.org/docs/window-crypto-pbkdf.jsp

    // Define the different part for the key
    let saltEncoder = new TextEncoder('utf-8')
    let saltBuffer = saltEncoder.encode(salt)
    let encoder = new TextEncoder('utf-8')
    let passphraseKey = encoder.encode(password)

    let key = await window.crypto.subtle.importKey(
        'raw',
        passphraseKey,
        {name: 'PBKDF2'},
        false,
        ['deriveBits', 'deriveKey']
    )

    return window.crypto.subtle.deriveKey(
        { "name": 'PBKDF2',
          "salt": saltBuffer,
          "iterations": iterations,
          "hash": 'SHA-256'
        },
        key,
        { "name": 'AES-CBC', "length": 256 },
        true,
        [ "encrypt", "decrypt" ]
    )
}

async function exportKey(key) {
    return window.crypto.subtle.exportKey(
        "jwk", //can be "jwk" or "raw"
        key //extractable must be true
    )
}

var key = await generateKey("your password", "your salt", 10000)
exportKey(key).then(function (result) {
    console.log(result)
})
