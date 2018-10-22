var Structurizr = Structurizr || {

    workspace: undefined,
    diagram: undefined,
    encryptionStrategy: undefined,
    features: {
        imageEmbed: false
    }

};

var structurizr = structurizr || {

    scripting: undefined

};

function Stack() {

    this.stack = [];

    this.pop = function(){
        return this.stack.pop();
    };

    this.push = function(item){
        this.stack.push(item);
    };

    this.isEmpty = function() {
        return this.stack.length == 0;
    };

}