Structurizr.ElementStyle = function (width, height, background, color, fontSize, shape, border, opacity, metadata, description) {
    this.width = width;
    this.height = height;
    this.background = background;
    this.color = color;
    this.fontSize = fontSize;
    this.shape = shape;
    this.border = border;
    this.opacity = opacity;
    this.metadata = metadata;
    this.description = description;

    this.tag = "Element";

    this.toString = function() {
        return "".concat(this.tag, ",", this.width, ",", this.height, ",", this.background, ",", this.color, ",", this.fontSize, ",", this.shape, ",", this.border, ",", this.opacity, ",", this.metadata, ",", this.description);
    };

    this.copyStyleAttributeIfSpecified =  function(source, name) {
        if (source.hasOwnProperty(name)) {
            this[name] = source[name];
        }
    };

};

Structurizr.RelationshipStyle = function(thickness, color, dashed, routing, fontSize, width, position, opacity) {
    this.thickness = thickness;
    this.color = color;
    this.dashed = dashed;
    this.routing = routing;
    this.fontSize = fontSize;
    this.width = width;
    this.position = position;
    this.opacity = opacity;

    this.tag = "Relationship";

    this.toString = function() {
        return "".concat(this.tag, ",", this.thickness, ",", this.color, ",", this.dashed, ",", this.routing, ",", this.fontSize, ",", this.width, ",", this.position, ",", this.opacity)
    };

    this.copyStyleAttributeIfSpecified =  function(source, name) {
        if (source.hasOwnProperty(name)) {
            this[name] = source[name];
        }
    };

};