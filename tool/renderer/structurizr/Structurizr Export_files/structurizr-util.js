Structurizr.util = Structurizr.util || {};

Structurizr.util.truncateArray = function(array, numberOfElements) {
    if (array && numberOfElements) {
        if (array.length > numberOfElements) {
            array.splice(numberOfElements, array.length - numberOfElements);
        }
    }

    return array;
};

Structurizr.util.selectText = function(id) {
    if (window.getSelection()) {
        var range = document.createRange();
        range.selectNode(document.getElementById(id));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
};

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
        return this.substr(position || 0, searchString.length) === searchString;
    };
}