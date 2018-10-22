Structurizr.shadeColor = function(color, percentAsInteger) {
    var percent = 0;
    if (percentAsInteger === 0) {
        percent = 0;
    } else {
        if (percentAsInteger > 90) {
            percent = 0.9; // let's cap how much we shade the colour, so it doesn't become white
        } else {
            percent = percentAsInteger / 100;
        }
    }
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
};

Structurizr.shadeColorLighterOrDarker = function(color, percentAsInteger) {
    var relativeLuminance = Structurizr.calculateRelativeLuminance(color);

    if (relativeLuminance > 0.7) {
        return Structurizr.shadeColor(color, -percentAsInteger);
    } else {
        return Structurizr.shadeColor(color, percentAsInteger);
    }
};

Structurizr.calculateRelativeLuminance = function(color) {
    var redConstant = 0.2126;
    var greenConstant = 0.7152;
    var blueConstant = 0.0722;

    // this assumes a #RRGGBB string
    var r = parseInt(color.substring(1,3),16) / 255;
    var g = parseInt(color.substring(3,5),16) / 255;
    var b = parseInt(color.substring(5,7),16) / 255;

    // https://en.wikipedia.org/wiki/Relative_luminance
    return (redConstant * r) + (greenConstant * g) + (blueConstant * b);
};