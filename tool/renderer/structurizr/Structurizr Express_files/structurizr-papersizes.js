Structurizr.PaperSizes = function() {

    var definitions = {};

    definitions['A6_Portrait'] = {
        width: 1240,
        height: 1748
    };

    definitions['A6_Landscape'] = {
        width: 1748,
        height: 1240
    };

    definitions['A5_Portrait'] = {
        width: 1748,
        height: 2480
    };

    definitions['A5_Landscape'] = {
        width: 2480,
        height: 1748
    };

    definitions['A4_Portrait'] = {
        width: 2480,
        height: 3508
    };

    definitions['A4_Landscape'] = {
        width: 3508,
        height: 2480
    };

    definitions['A3_Portrait'] = {
        width: 3508,
        height: 4961
    };

    definitions['A3_Landscape'] = {
        width: 4961,
        height: 3508
    };

    definitions['A2_Portrait'] = {
        width: 4961,
        height: 7016
    };

    definitions['A2_Landscape'] = {
        width: 7016,
        height: 4961
    };

    definitions['Letter_Portrait'] = {
        width: 2550,
        height: 3300
    };

    definitions['Letter_Landscape'] = {
        width: 3300,
        height: 2550
    };

    definitions['Legal_Portrait'] = {
        width: 2550,
        height: 4200
    };

    definitions['Legal_Landscape'] = {
        width: 4200,
        height: 2550
    };

    definitions['Slide_4_3'] = {
        width: 3306,
        height: 2480
    };

    definitions['Slide_16_9'] = {
        width: 3508,
        height: 1973
    };

    this.getDimensions = function(paperSize) {
        return definitions[paperSize];
    }

    var orderedLandscapePaperSizes = [];
    orderedLandscapePaperSizes.push('A2_Landscape');
    orderedLandscapePaperSizes.push('A3_Landscape');
    orderedLandscapePaperSizes.push('A4_Landscape');
    orderedLandscapePaperSizes.push('A5_Landscape');
    orderedLandscapePaperSizes.push('A6_Landscape');

    var orderedPortraitPaperSizes = [];
    orderedPortraitPaperSizes.push('A2_Portrait');
    orderedPortraitPaperSizes.push('A3_Portrait');
    orderedPortraitPaperSizes.push('A4_Portrait');
    orderedPortraitPaperSizes.push('A5_Portrait');
    orderedPortraitPaperSizes.push('A6_Portrait');

    this.getDimensions = function(paperSize) {
        return definitions[paperSize];
    };

    this.getPaperSizeToFit = function(width, height) {
        var orderedPaperSizes;
        if (width < height) {
            orderedPaperSizes = orderedPortraitPaperSizes;
        } else {
            orderedPaperSizes = orderedLandscapePaperSizes;
        }

        var paperSize;
        orderedPaperSizes.forEach(function(key) {
            var dimensions = definitions[key];

            if (dimensions.width > width && dimensions.height > height) {
                paperSize = key;
            }
        });

        if (paperSize === undefined) {
            paperSize = 'A2_Landscape';
        }

        return paperSize;
    };

};