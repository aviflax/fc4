Structurizr.decrypt = function(encryptedWorkspace, passphrase) {
    Structurizr.encryptionStrategy.passphrase = passphrase;

    var key = this.generateEncryptionKey();

    var cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encryptedWorkspace.ciphertext)
    });

    var decrypted = CryptoJS.AES.decrypt(
        cipherParams,
        key,
        {
            iv: CryptoJS.enc.Hex.parse(Structurizr.encryptionStrategy.iv)
        });

    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};

Structurizr.encrypt = function(workspace) {
    var key = this.generateEncryptionKey();
    var encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(workspace),
        key,
        {
            iv: CryptoJS.enc.Hex.parse(Structurizr.encryptionStrategy.iv)
        });


    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
};

Structurizr.generateEncryptionKey = function() {
    return CryptoJS.PBKDF2(
        Structurizr.encryptionStrategy.passphrase,
        CryptoJS.enc.Hex.parse(Structurizr.encryptionStrategy.salt),
        {
            keySize: (Structurizr.encryptionStrategy.keySize / 32),
            iterations: Structurizr.encryptionStrategy.iterationCount
        });
};