Structurizr.getWorkspaceFromLocalStorage = function(id) {
    return localStorage.getItem("workspace/" + id);
};

Structurizr.putWorkspaceInLocalStorage = function(id, workspace) {
    localStorage.setItem("workspace/" + id, workspace);
};

Structurizr.removeWorkspaceFromLocalStorage = function(id) {
    localStorage.removeItem("workspace/" + id);
};

Structurizr.getWorkspaceEncryptionPassphraseFromLocalStorage = function(id) {
    return localStorage.getItem("workspace/" + id + "/passphrase");
};

Structurizr.removeWorkspaceEncryptionPassphraseFromLocalStorage = function(id) {
    return localStorage.removeItem("workspace/" + id + "/passphrase");
};

Structurizr.putWorkspaceEncryptionPassphraseInLocalStorage = function(id, passphrase) {
    return localStorage.setItem("workspace/" + id + "/passphrase", passphrase);
};