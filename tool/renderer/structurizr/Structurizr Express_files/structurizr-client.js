Structurizr.ApiClient = function(apiUrl, apiKey, apiSecret, version) {

    this.getWorkspace = function(workspaceId, callback) {
        var contentMd5 = CryptoJS.MD5("");
        var v = contentMd5.toString(CryptoJS.enc.Hex);
        var contentType = '';
        var nonce = new Date().getTime();

        var content = "GET" + "\n" + getPath() + "/workspace/" + workspaceId + "\n" + contentMd5 + "\n" + contentType + "\n" + nonce + "\n";
        var hmac = CryptoJS.HmacSHA256(content, apiSecret).toString(CryptoJS.enc.Hex);

        $.ajax({
            url: apiUrl + "/workspace/" + workspaceId + (version !== undefined && version.trim().length > 0 ? '?version=' + version : ''),
            type: "GET",
            cache: false,
            headers: {
                'Content-Type': contentType,
                'Content-MD5': btoa(contentMd5),
                'Nonce': nonce,
                'X-Authorization': apiKey + ":" + btoa(hmac)
            },
            dataType: 'json'
        })
        .done(function (json) {
            callback(json);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            logError(jqXHR, textStatus, errorThrown);
            alert(createUserErrorMessage(jqXHR, workspaceId, "loaded"));
        });
    };

    this.putWorkspace = function(workspaceId, workspace, callback) {
        version = undefined; // reset the version ID, so that future GETs with this client object use the latest version
        workspace.lastModifiedDate = new Date().toISOString();

        var jsonAsString = JSON.stringify(workspace);
        var contentMd5 = CryptoJS.MD5(jsonAsString);
        var v = contentMd5.toString(CryptoJS.enc.Hex);
        var contentType = 'application/json; charset=UTF-8';
        var nonce = new Date().getTime();

        var content = "PUT" + "\n" + getPath() + "/workspace/" + workspaceId + "\n" + contentMd5 + "\n" + contentType + "\n" + nonce + "\n";
        var hmac = CryptoJS.HmacSHA256(content, apiSecret).toString(CryptoJS.enc.Hex);

        $.ajax({
            url: apiUrl + "/workspace/" + workspaceId,
            type: "PUT",
            contentType: contentType,
            cache: false,
            headers: {
                'Content-Type': contentType,
                'Content-MD5': btoa(contentMd5),
                'Nonce': nonce,
                'X-Authorization': apiKey + ":" + btoa(hmac)
            },
            dataType: 'json',
            data: jsonAsString
        })
        .done(function(data, textStatus, jqXHR) {
            if (callback) {
                callback();
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            logError(jqXHR, textStatus, errorThrown);
            alert(createUserErrorMessage(jqXHR, workspaceId, "saved"));
        });
    };

    this.putImage = function(workspaceId, diagramKey, imageAsBase64EncodedDataUri, callback) {
        var contentMd5 = CryptoJS.MD5(imageAsBase64EncodedDataUri);
        var v = contentMd5.toString(CryptoJS.enc.Hex);
        var contentType = 'text/plain';
        var nonce = new Date().getTime();

        var content = "PUT" + "\n" + getPath() + "/workspace/" + workspaceId + "/images/" + encodeURIComponent(diagramKey) + "\n" + contentMd5 + "\n" + contentType + "\n" + nonce + "\n";
        var hmac = CryptoJS.HmacSHA256(content, apiSecret).toString(CryptoJS.enc.Hex);

        $.ajax({
            url: apiUrl + "/workspace/" + workspaceId + "/images/" + encodeURIComponent(diagramKey),
            type: "PUT",
            contentType: contentType,
            cache: false,
            headers: {
                'Content-Type': contentType,
                'Content-MD5': btoa(contentMd5),
                'Nonce': nonce,
                'X-Authorization': apiKey + ":" + btoa(hmac)
            },
            dataType: 'json',
            data: imageAsBase64EncodedDataUri
        })
        .done(function(data, textStatus, jqXHR) {
            callback(diagramKey);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            callback(diagramKey);
            status[diagramKey] = true;
            logError(jqXHR, textStatus, errorThrown);
        });
    };

    this.getUrl = function() {
        return apiUrl;
    };

    function getPath() {
        var path = apiUrl;
        if (path.slice(-1) === "/") { // String.endsWith() doesn't work on IE
            path = path.substr(0, path.length()-1);
        }

        path = path.replace("http://", "");
        path = path.replace("https://", "");

        var index = path.indexOf("/");
        if (index == -1) {
            path = "";
        } else {
            path = path.substr(index);
        }

        return path;
    }

    function createUserErrorMessage(jqXHR, workspaceId, action) {
        var responseMessage = "";
        try {
            responseMessage = JSON.parse(jqXHR.responseText).message;
        }
        catch(err) {
        }

        return "Workspace " + workspaceId + " could not be " + action + " using the API at " + apiUrl + "\n\nStatus: " + jqXHR.status + " - " + jqXHR.statusText + "\nMessage: " + responseMessage + "\n\nThe JavaScript/developer console in your web browser may have more information about this error. Please try again or contact help@structurizr.com for assistance.";
    }

    function logError(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
        console.log(jqXHR.status);
        console.log("Text status: " + textStatus);
        console.log("Error thrown: " + errorThrown);
    }

};