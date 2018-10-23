Structurizr.Diagram = function(theWorkspace, diagramIsEditable, animationsEnabled) {

    var workspace = theWorkspace;
    var express = false;

    var diagramWidth = 0;
    var diagramHeight = 0;
    var gridSize = 5;
    var pageHeaderHeight = 50;
    var horizontalPadding = 0;
    var verticalPadding = 0;
    var scrollBarWidth = getScrollBarWidth();
    var nameFontSizeDifference = +10;
    var metaDataFontSizeDifference = -5;
    var navigationFontSizeDifference = 0;
    var darkenPercentage = -10;
    var navigationPercentage = 25;
    var lineHeight = '1.2em';

    var diagramSelectorHeight = 54;

    var editable = diagramIsEditable;
    var shapesEnabled = true;
    var dynamicDiagramsEnabled = false;
    var deploymentDiagramsEnabled = false;
    var watermarked = false;
    var embedded = false;
    var navigationEnabled = true;

    var keyboardShortcutsEnabled = true;

    var presentationMode = false;
    var diagramTitle;
    var diagramDescription;
    var diagramMetadata;
    var diagramMetadataVisible = true;
    var brandingLogo;
    var watermark;
    var boundary;
    var boundaryElement;
    var mapOfIdToBox = {};
    var mapOfIdToLine = {};
    var selectedElements = [];
    var highlightedLink = undefined;
    var linesToAnimate;
    var animationSteps;
    var animationIndex;
    var animationDelay = 2000;

    var currentView;
    var currentFilter;

    var unsavedChanges = false;
    var previousPositions = [];

    var undoStack;

    var tooltipEnabled = false;
    var elementLimit = 500;
    var relationshipLimit = 200;

    var lassoMouseMove = function(event) {
        if (lassoEnd !== undefined) {
            lassoEnd.clientX = event.pageX;
            lassoEnd.clientY = event.pageY;
            repositionLasso();
        }
    };
    var lassoStart;
    var lassoEnd;

    var graph = new joint.dia.Graph;
    var scale = 0.5;
    var paper = new joint.dia.Paper({
        el: $('#diagramCanvas'),
        width: diagramWidth,
        height: diagramHeight,
        model: graph,
        gridSize: gridSize,
        scale: scale,
        interactive: editable,
        linkConnectionPoint: (editable ? undefined : shapePerimeterConnectionPoint)
    });

    var cells;
    var cellsByElementId;

    var layoutAlgorithms = [
        'TB', 'TB', 'BT', 'BT', 'LR', 'LR', 'RL', 'RL'
    ];
    var currentLayoutAlgorithmIndex = 0;

    this.setWorkspace = function(theWorkspace) {
        workspace = theWorkspace;
        currentView = undefined;
    };

    this.setExpress = function(bool) {
        express = bool;
    };

    function shapePerimeterConnectionPoint(linkView, view, magnet, reference) {
        var bbox;
        var spot;

        if (!magnet) {
            var elements = view.$('.structurizrEllipse');
            if (elements) {
                magnet = elements[0];
            }
        }

        if (magnet) {
            spot = V(magnet).findIntersection(reference, linkView.paper.viewport);
            if (!spot) {
                bbox = g.rect(V(magnet).bbox(false, linkView.paper.viewport));
            }

        } else {

            bbox = view.model.getBBox();
            spot = bbox.intersectionWithLineFromCenterToPoint(reference);
        }
        return spot || bbox.center();
    }

    var defaultElementStyle = new Structurizr.ElementStyle(450, 300, '#dddddd', '#000000', 24, 'Box', 'Solid', 100, true, true);
    var defaultElementStyleForPerson = new Structurizr.ElementStyle(400, 400, '#dddddd', '#000000', 24, 'Person', 'Solid', 100, true, true);
    var defaultElementStyleForMobileDevicePortrait = new Structurizr.ElementStyle(300, 450, '#dddddd', '#000000', 24, 'MobileDevicePortrait', 'Solid', 100, true, true);
    var defaultRelationshipStyle = new Structurizr.RelationshipStyle(2, '#707070', true, 'Direct', 24, 200, 50, 100);

    this.changeView = function(view, callback) {
        if (currentView != undefined && view.key === currentView.key) {
            if (callback) {
                callback();
            }
            return;
        }

        graph.stopListening();
        graph.clear();
        currentLayoutAlgorithmIndex = 0;

        if (view.type === "Filtered") {
            currentFilter = view;
            view = workspace.getViewByKey(view.baseViewKey);
        } else {
            currentFilter = undefined;
        }
        currentView = view;

        mapOfIdToBox = {};
        cells = [];
        cellsByElementId = {};
        selectedElements = [];
        boundary = undefined;
        linesToAnimate = undefined;
        animationSteps = undefined;
        animationStarted = false;

        undoStack = new Stack();
        toggleUndoButton();

        var showShapesWarning = false;

        if (!view) {
            return;
        }

        this.setPaperSize(view);
        resetDiagramKey();
        hideTooltip();

        if (view.type === "Dynamic" && !dynamicDiagramsEnabled) {
            var diagramInformation = $("#diagramInformation");
            diagramInformation.empty();
            diagramInformation.append("<p>This is a <a href='/help/dynamic-diagrams' target='_blank'>dynamic diagram</a>, which isn't included in the Free Plan. To prevent this message from appearing, please remove this diagram from the workspace.</p>");

            $('#diagramInformationModal').modal('show');

            return;
        }

        if (view.type === "Deployment" && !deploymentDiagramsEnabled) {
            var diagramInformation = $("#diagramInformation");
            diagramInformation.empty();
            diagramInformation.append("<p>This is a <a href='/help/deployment-diagrams' target='_blank'>deployment diagram</a>, which isn't included in the Free Plan. To prevent this message from appearing, please remove this diagram from the workspace.</p>");

            $('#diagramInformationModal').modal('show');

            return;
        }

        if (view.elements && view.elements.length > elementLimit) {
            var diagramInformation = $("#diagramInformation");
            diagramInformation.empty();
            diagramInformation.append('<p>This diagram has too many elements to be rendered - please consider creating multiple smaller diagrams <a href="https://structurizr.com/help/faq#diagramTooLarge" target="_blank">as described in the FAQ</a>, or the <a href="https://structurizr.com/help/explorations" target="_blank">explorations</a>.</p>');

            $('#diagramInformationModal').modal('show');

            return;
        }

        if (view.relationships && view.relationships.length > relationshipLimit) {
            var diagramInformation = $("#diagramInformation");
            diagramInformation.empty();
            diagramInformation.append('<p>This diagram has too many relationships to be rendered - please consider creating multiple smaller diagrams <a href="https://structurizr.com/help/faq#diagramTooLarge" target="_blank">as described in the FAQ</a>, or the <a href="https://structurizr.com/help/explorations" target="_blank">explorations</a>.</p>');

            $('#diagramInformationModal').modal('show');

            return;
        }

        if (view.type === "Container") {
            boundaryElement = workspace.findElement(view.softwareSystemId);
            boundary = createBoundary(boundaryElement.name, getHumanReadableElementType(boundaryElement));
        } else if (view.type === "Component") {
            boundaryElement = workspace.findElement(view.containerId);
            boundary = createBoundary(boundaryElement.name, getHumanReadableElementType(boundaryElement));
        } else if (view.type === "Dynamic") {
            if (view.elementId) {
                boundaryElement = workspace.findElement(view.elementId);
                boundary = createBoundary(boundaryElement.name, getHumanReadableElementType(boundaryElement));
            }
        }

        var autolayout = true;

        if (view.elements) {
            for (var i = 0; i < view.elements.length; i++) {
                var positionX;
                var positionY;
                var element = workspace.findElement(view.elements[i].id);

                if (!includeOnDiagram(element) || element.type === 'DeploymentNode') {
                    continue;
                }

                var configuration = workspace.findElementStyle(element, defaultElementStyle);

                var box;

                if (view.elements[i].x) {
                    positionX = Math.floor(view.elements[i].x);
                    autolayout = false;
                } else {
                    positionX = Math.floor((Math.random() * 400) + 1);
                    view.elements[i].x = positionX;
                }
                if (view.elements[i].y) {
                    positionY = Math.floor(view.elements[i].y);
                    autolayout = false;
                } else {
                    positionY = Math.floor((Math.random() * 400) + 1);
                    view.elements[i].y = positionY;
                }

                if (configuration.shape === 'Cylinder') {
                    box = createCylinder(view, element, positionX, positionY);
                } else if (configuration.shape === 'Person') {
                    box = createPerson(view, element, positionX, positionY);
                } else if (configuration.shape === 'Robot') {
                    box = createRobot(view, element, positionX, positionY);
                } else if (configuration.shape === 'RoundedBox') {
                    box = createBox(view, element, positionX, positionY, 20);
                } else if (configuration.shape === 'Folder') {
                    box = createFolder(view, element, positionX, positionY);
                } else if (configuration.shape === 'Circle') {
                    box = createEllipse(view, element, positionX, positionY, true);
                } else if (configuration.shape === 'Ellipse') {
                    box = createEllipse(view, element, positionX, positionY, false);
                } else if (configuration.shape === 'Hexagon') {
                    box = createHexagon(view, element, positionX, positionY);
                } else if (configuration.shape === 'Pipe') {
                    box = createPipe(view, element, positionX, positionY);
                } else if (configuration.shape === 'WebBrowser') {
                    box = createWebBrowser(view, element, positionX, positionY);
                } else if (configuration.shape === 'MobileDevicePortrait') {
                    box = createMobileDevicePortrait(view, element, positionX, positionY);
                } else if (configuration.shape === 'MobileDeviceLandscape') {
                    box = createMobileDeviceLandscape(view, element, positionX, positionY);
                } else {
                    box = createBox(view, element, positionX, positionY, 1);
                }

                cells.push(box);
                cellsByElementId[element.id] = box;

                box.elementInView = view.elements[i];
                box.positionCalculated = false;

                if (view.type === 'SystemLandscape' || view.type === 'SystemContext' || (view.type === "Dynamic" && !view.elementId)) {
                    if (element.location && element.location === 'Internal' && view.enterpriseBoundaryVisible !== false) {
                        if (!boundary) {
                            var enterprise = workspace.getWorkspace().model.enterprise;
                            var boundaryName = (enterprise && enterprise.name) ? enterprise.name : 'Enterprise';

                            boundary = createBoundary(boundaryName, workspace.getTerminologyForEnterprise());

                            boundaryElement = {
                                name: boundaryName,
                                type: 'Enterprise'
                            }
                        }
                        boundary.embed(box);
                    }
                }

                if (view.type === 'SystemContext' && element.id === view.softwareSystemId) {
                    if (!view.elements[i].x) {
                        centreCell(box);
                    }
                } else if ((view.type === "Container" && element.type === "Container" && element.parentId === view.softwareSystemId) ||
                           (view.type === "Component" && element.type === "Component" && element.parentId === view.containerId)) {
                    boundary.embed(box);
                    if (!view.elements[i].x) {
                        centreCell(box);
                        moveElement(box, 400 - Math.floor((Math.random() * 800) + 1), 400 - Math.floor((Math.random() * 800) + 1))
                    }
                }

                if (view.type === "Dynamic") {
                    if (boundaryElement && boundary) {
                        if (boundaryElement.type === "SoftwareSystem" && element.type === "Container") {
                            boundary.embed(box);
                        } else if (boundaryElement.type === "Container" && element.type === "Component") {
                            boundary.embed(box);
                        }
                    }
                }

                // add some functions called by the double-click handler
                var cellView = paper.findViewByModel(box);
                if (editable === true) {
                    $('#' + cellView.id).attr('style', 'cursor: move !important');
                } else {
                    $('#' + cellView.id).attr('style', 'cursor: default !important');
                }

                if (navigationEnabled === true) {
                    if (element.type === "SoftwareSystem") {
                        if (currentView.type === 'SystemLandscape' || currentView.softwareSystemId !== element.id) {
                            var systemContextViewForSoftwareSystem = workspace.findFirstSystemContextViewForSoftwareSystem(element);
                            if (systemContextViewForSoftwareSystem) {
                                cellView.systemContextViewForSoftwareSystem = systemContextViewForSoftwareSystem;
                                cellView.zoomFromDoubleClick = function() {
                                    window.location.hash = encodeURIComponent(this.systemContextViewForSoftwareSystem.key)
                                };
                            } else {
                                var containerViewForSoftwareSystem = workspace.findFirstContainerViewForSoftwareSystem(element);
                                if (containerViewForSoftwareSystem) {
                                    cellView.containerViewForSoftwareSystem = containerViewForSoftwareSystem;
                                    cellView.zoomFromDoubleClick = function () {
                                        window.location.hash = encodeURIComponent(this.containerViewForSoftwareSystem.key)
                                    };
                                }
                            }
                        } else if (currentView.type === 'SystemContext') {
                            var containerViewForSoftwareSystem = workspace.findFirstContainerViewForSoftwareSystem(element);
                            if (containerViewForSoftwareSystem) {
                                cellView.containerViewForSoftwareSystem = containerViewForSoftwareSystem;
                                cellView.zoomFromDoubleClick = function () {
                                    window.location.hash = encodeURIComponent(this.containerViewForSoftwareSystem.key)
                                };
                            }
                        }
                    } else if (element.type === "Container") {
                        var componentViewForContainer = workspace.findFirstComponentViewForContainer(element);
                        if (componentViewForContainer) {
                            cellView.componentViewForContainer = componentViewForContainer;
                            cellView.zoomFromDoubleClick = function () {
                                window.location.hash = encodeURIComponent(this.componentViewForContainer.key)
                            };
                        }
                    } else if (element.type === "Component") {
                        var url = element.sourcePath;
                        if (!url && element.code) {
                            element.code.forEach(function (codeElement) {
                                if (codeElement.role === "Primary" && codeElement.url) {
                                    url = codeElement.url;
                                }
                            })
                        }

                        if (url) {
                            cellView.urlToNavigateTo = url;
                            cellView.openUrlFromDoubleClick = function () {
                                window.open(this.urlToNavigateTo);
                            };
                        }
                    }

                    if (element.url) {
                        cellView.urlToNavigateTo = element.url;
                        cellView.openUrlFromDoubleClick = function () {
                            window.open(this.urlToNavigateTo);
                        };
                    }
                    if (cellView.zoomFromDoubleClick && cellView.openUrlFromDoubleClick) {
                        cellView.model.attr('.structurizrNavigation/text', '+#');
                        $('#' + cellView.id + " .structurizrNavigation").attr('display', 'block');

                        if (editable === false) {
                            $('#' + cellView.id).attr('style', 'cursor: zoom-in !important');
                        }
                    } else if (cellView.zoomFromDoubleClick) {
                        cellView.model.attr('.structurizrNavigation/text', '+');
                        $('#' + cellView.id + " .structurizrNavigation").attr('display', 'block');

                        if (editable === false) {
                            $('#' + cellView.id).attr('style', 'cursor: zoom-in !important');
                        }
                    } else if (cellView.openUrlFromDoubleClick) {
                        cellView.model.attr('.structurizrNavigation/text', '#');
                        $('#' + cellView.id + " .structurizrNavigation").attr('display', 'block');

                        if (editable === false) {
                            $('#' + cellView.id).attr('style', 'cursor: pointer !important');
                        }
                    }
                }
            }
        }

        if (view.type === 'Deployment') {
            // this first loop creates deployment nodes and container instances
            if (view.elements) {
                view.elements.forEach(function (elementView) {
                    var element = workspace.findElement(elementView.id);

                    if (element.type === 'DeploymentNode') {
                        var deploymentNodeCell = createDeploymentNode(element);
                        deploymentNodeCell.elementInView = elementView;
                        deploymentNodeCell.positionCalculated = true;

                        cellsByElementId[element.id] = deploymentNodeCell;

                        if (element.containerInstances && element.containerInstances.length > 0) {
                            element.containerInstances.forEach(function (containerInstance) {
                                // find the container on the diagram
                                var containerBox = cellsByElementId[containerInstance.id];
                                if (containerBox !== undefined) {
                                    deploymentNodeCell.embed(containerBox);
                                } else {
                                    console.log('The container instance with ID ' + containerInstance.id + ' is missing from the diagram.');
                                }
                            });
                        }
                    }
                });

                // this second loop ensures that all cells are correctly embedded and stacked (back to front)
                view.elements.forEach(function (elementView) {
                    var element = workspace.findElement(elementView.id);
                    var cell = cellsByElementId[element.id];

                    if (element.type === 'DeploymentNode') {
                        if (element.parentId !== undefined) {
                            var parentBox = cellsByElementId[element.parentId];
                            parentBox.embed(cell);
                            parentBox.toBack();
                        }

                        var parentId = cell.get('parent');
                        while (parentId) {
                            var parentCell = graph.getCell(parentId);
                            parentCell.toBack();
                            parentId = parentCell.get('parent');
                        }
                    }
                });

                // and this third loop ensures everything is positioned correctly
                view.elements.forEach(function (elementView) {
                    var element = workspace.findElement(elementView.id);
                    var cell = cellsByElementId[element.id];

                    if (element.type === 'ContainerInstance') {
                        var parentId = cell.get('parent');
                        while (parentId) {
                            var parentCell = graph.getCell(parentId);
                            reposition(parentCell);
                            parentId = parentCell.get('parent');
                        }
                    }
                });
            }
        }

        if (view.relationships) {
            for (var i = 0; i < view.relationships.length; i++) {
                createLine(view.relationships[i]);
            }
        }

        createDiagramKey();
        createEmbedCode();
        reposition(boundary);

        if (this.currentViewIsDynamic() || this.currentViewHasAnimation()) {
            $('.dynamicDiagramButton').removeClass("hidden");

            $('.stepBackwardAnimationButton').attr("disabled", true);
            $('.startAnimationButton').attr("disabled", false);
            $('.stopAnimationButton').attr("disabled", true);
            $('.stepForwardAnimationButton').attr("disabled", false);
        } else {
            $('.dynamicDiagramButton').addClass("hidden");
        }

        addEventHandlers();

        if (embedded) {
            this.zoomFitWidth();
        } else if (presentationMode) {
            this.zoomForPresentationMode();
        } else {
            this.zoomToWidthOrHeight();
        }

        if (showShapesWarning) {
            var diagramInformation = $("#diagramInformation");
            diagramInformation.empty();
            diagramInformation.append("<p><a href='/help/shapes' target='_blank'>Shapes</a> are used in this diagram but they aren't included in the Free Plan. To prevent this message from appearing, please change the element styles to remove the shapes.</p>");

            $('#diagramInformationModal').modal('show');
        }

        createDiagramMetadata(callback);
        // createWatermark();

        // a little easter egg :-)
        try {
            if (window.location.search && window.location.search.indexOf('theme=RationalRose') > -1) {
                applyRationalRoseTheme();
            }
        } catch (e) {
            // it doesn't matter
        }

        if (autolayout) {
            this.layout(true);
        }
    };

    this.getCurrentView = function() {
        return currentView;
    };

    this.getCurrentViewOrFilter = function() {
        if (currentFilter) {
            return currentFilter;
        } else {
            return currentView;
        }
    };

    this.isEditable = function() {
        return editable;
    };

    this.setEmbedded = function(bool) {
        embedded = bool;
        if (bool) {
            pageHeaderHeight = 0;
            horizontalPadding = 0;
            verticalPadding = 0;
        }
    };

    this.setNavigationEnabled = function(bool) {
        navigationEnabled = bool;
    };

    this.isNavigationEnabled = function() {
        return navigationEnabled;
    };

    this.setDynamicDiagramsEnabled = function(bool) {
        dynamicDiagramsEnabled = bool;
    };

    this.setDeploymentDiagramsEnabled = function(bool) {
        deploymentDiagramsEnabled = bool;
    };

    this.setWatermarked = function(bool) {
        watermarked = bool;
    };

    this.isEmbedded = function() {
        return embedded;
    };

    this.setPresentationMode = function(bool) {
        presentationMode = bool;
    };

    this.isPresentationMode = function() {
        return presentationMode;
    };

    this.setPageSize = function(width, height) {
        diagramWidth = width;
        diagramHeight = height;
        paper.setDimensions(width, height);

        this.resize();
        repositionDiagramMetadata();
        centreWatermark();
    };

    function calculateElementPadding(configuration) {
        return configuration.width * 0.07;
    }

    function createBox(view, element, x, y, cornerRadius) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = configuration.height;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Box({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrBox': {
                    fill: fill,
                    stroke: borderColor,
                    width: configuration.width,
                    height: height,
                    rx: cornerRadius,
                    ry: cornerRadius
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrBox']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createEllipse(view, element, x, y, circle) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        if (circle) {
            configuration.height = configuration.width;
        }

        var config = {
            width: configuration.width * 0.8,
            height: configuration.height,
            fontSize: configuration.fontSize
        };
        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, config, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, config, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, config, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = configuration.height;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Ellipse({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrEllipse': {
                    fill: fill,
                    stroke: borderColor,
                    cx: configuration.width/2,
                    cy: configuration.height/2,
                    rx: configuration.width/2,
                    ry: configuration.height/2
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference,
                    'ref-y': circle ? 0.92 : 0.90
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrEllipse']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createHexagon(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        var config = {
            width: configuration.width * 0.8,
            height: configuration.height,
            fontSize: configuration.fontSize
        };
        var elementPadding = calculateElementPadding(configuration) * 3;
        var nameLabel = formatName(element, config, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, config, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, config, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = Math.floor((configuration.width/2) * Math.sqrt(3));
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var points =    (configuration.width/4) + ",0 " +
                        (3*(configuration.width/4)) + ",0 " +
                        configuration.width + "," + (height/2) + " " +
                        (3*(configuration.width/4)) + "," + height + " " +
                        (configuration.width/4) + "," + height + " " +
                        "0," + (height/2);

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Hexagon({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: height
            },
            attrs: {
                '.structurizrHexagon': {
                    fill: fill,
                    stroke: borderColor,
                    points: points
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrHexagon']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createPerson(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyleForPerson);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = configuration.width - (configuration.width/2.5);
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Person({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.width
            },
            attrs: {
                '.structurizrPersonHead': {
                    fill: fill,
                    stroke: borderColor,
                    cx: configuration.width/2,
                    cy: configuration.width/4.5,
                    r: configuration.width/4.5
                },
                '.structurizrPersonBody': {
                    fill: fill,
                    stroke: borderColor,
                    x: 0,
                    y: configuration.width/2.5,
                    width: configuration.width,
                    height: height
                },
                '.structurizrPersonRightArm': {
                    stroke: borderColor,
                    x1: configuration.width/5,
                    y1: configuration.width/1.5,
                    x2: configuration.width/5,
                    y2: configuration.width
                },
                '.structurizrPersonLeftArm': {
                    stroke: borderColor,
                    x1: configuration.width-(configuration.width/5),
                    y1: configuration.width/1.5,
                    x2: configuration.width-(configuration.width/5),
                    y2: configuration.width
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + nameFontSizeDifference) + 'px',
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize + 'px',
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + metaDataFontSizeDifference) + 'px',
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrPersonHead']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPersonBody']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPersonRightArm']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPersonLeftArm']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createRobot(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyleForPerson);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = configuration.width - (configuration.width/2.5);
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Robot({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.width
            },
            attrs: {
                '.structurizrRobotHead': {
                    fill: fill,
                    stroke: borderColor,
                    x: (configuration.width - configuration.width/2.25)/2,
                    y: 0,
                    width: configuration.width/2.25,
                    height: configuration.width/2.25
                },
                '.structurizrRobotEars': {
                    fill: fill,
                    stroke: borderColor,
                    x: (configuration.width - configuration.width/1.8)/2,
                    y: (configuration.width/2.25 - configuration.width/10)/2,
                    width: configuration.width/1.8,
                    height: configuration.width/10
                },
                '.structurizrRobotBody': {
                    fill: fill,
                    stroke: borderColor,
                    x: 0,
                    y: configuration.width/2.5,
                    width: configuration.width,
                    height: height
                },
                '.structurizrRobotRightArm': {
                    stroke: borderColor,
                    x1: configuration.width/5,
                    y1: configuration.width/1.5,
                    x2: configuration.width/5,
                    y2: configuration.width
                },
                '.structurizrRobotLeftArm': {
                    stroke: borderColor,
                    x1: configuration.width-(configuration.width/5),
                    y1: configuration.width/1.5,
                    x2: configuration.width-(configuration.width/5),
                    y2: configuration.width
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + nameFontSizeDifference) + 'px',
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize + 'px',
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + metaDataFontSizeDifference) + 'px',
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrPersonHead']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPersonBody']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPersonRightArm']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPersonLeftArm']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createCylinder(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var ry = 30;
        var verticalOffset = ry/2;
        var height = configuration.height-(2*ry);
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Cylinder({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrCylinderFace': {
                    fill: fill,
                    stroke: borderColor,
                    width: configuration.width,
                    height: height,
                    x: 0,
                    y: ry
                },
                '.structurizrCylinderFaceFull': {
                    fill: fill,
                    stroke: 'none',
                    width: configuration.width,
                    height: configuration.height-ry,
                    x: 0,
                    y: ry
                },
                '.structurizrCylinderTop': {
                    fill: fill,
                    stroke: borderColor,
                    cx: configuration.width/2,
                    cy: ry,
                    rx: configuration.width/2,
                    ry: ry
                },
                '.structurizrCylinderBottom': {
                    fill: fill,
                    stroke: borderColor,
                    cx: configuration.width/2,
                    cy: configuration.height-ry,
                    rx: configuration.width/2,
                    ry: ry
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + nameFontSizeDifference) + 'px',
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize + 'px',
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + metaDataFontSizeDifference) + 'px',
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrCylinderFace']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrCylinderTop']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrCylinderBottom']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createPipe(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);
        var rx = 30;

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding + (2 * rx), elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding + (2 * rx), elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding + (2 * rx), elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var horizontalOffset = rx/2;
        var width = configuration.width - (2*rx);
        var height = configuration.height;
        var verticalOffset = 0;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Pipe({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrPipeFace': {
                    fill: fill,
                    stroke: borderColor,
                    width: width,
                    height: height,
                    x: rx,
                    y: 0
                },
                '.structurizrPipeFaceFull': {
                    fill: fill,
                    stroke: 'none',
                    width: configuration.width-rx,
                    height: configuration.height,
                    x: rx,
                    y: 0
                },
                '.structurizrPipeLeft': {
                    fill: fill,
                    stroke: borderColor,
                    cx: rx,
                    cy: configuration.height/2,
                    rx: rx,
                    ry: configuration.height/2
                },
                '.structurizrPipeRight': {
                    fill: fill,
                    stroke: borderColor,
                    cx: configuration.width-rx,
                    cy: configuration.height/2,
                    rx: rx,
                    ry: configuration.height/2
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + nameFontSizeDifference) + 'px',
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize + 'px',
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': (configuration.fontSize + metaDataFontSizeDifference) + 'px',
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrPipeFace']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPipeLeft']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrPipeRight']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createFolder(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var tabHeight = configuration.height/8;
        var tabWidth = configuration.width/3;
        var verticalOffset = 0;
        var height = configuration.height - tabHeight;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.Folder({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrFolderTab': {
                    fill: fill,
                    stroke: borderColor,
                    x: 10,
                    y: 0,
                    width: tabWidth,
                    height: tabHeight*2,
                    rx: 10,
                    ry: 10
                },
                '.structurizrFolder': {
                    fill: fill,
                    stroke: borderColor,
                    x: 0,
                    y: tabHeight,
                    width: configuration.width,
                    height: height,
                    rx: 5,
                    ry: 5
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrFolderTab']['stroke-dasharray'] = "10,10";
            cell.attributes.attrs['.structurizrFolder']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createWebBrowser(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 20;
        var height = configuration.height;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var cell = new joint.shapes.org.WebBrowser({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrWebBrowser': {
                    fill: borderColor,
                    stroke: borderColor,
                    width: configuration.width,
                    height: height,
                    rx: 10,
                    ry: 10
                },
                '.structurizrWebBrowserPanel': {
                    fill: fill,
                    stroke: borderColor,
                    width: configuration.width - 20,
                    height: height - 50,
                    x: 10,
                    y: 40,
                    rx: 10,
                    ry: 10
                },
                '.structurizrWebBrowserUrlBar': {
                    fill: fill,
                    width: configuration.width - 110,
                    height: 20,
                    x: 100,
                    y: 10,
                    rx: 10,
                    ry: 10
                },
                '.structurizrWebBrowserButton1': {
                    fill: fill,
                    cx: 20,
                    cy: 20,
                    rx: 10,
                    ry: 10
                },
                '.structurizrWebBrowserButton2': {
                    fill: fill,
                    cx: 50,
                    cy: 20,
                    rx: 10,
                    ry: 10
                },
                '.structurizrWebBrowserButton3': {
                    fill: fill,
                    cx: 80,
                    cy: 20,
                    rx: 10,
                    ry: 10
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrWebBrowser']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createMobileDevicePortrait(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyleForMobileDevicePortrait);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = configuration.height;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var speakerLength = 50;

        var cell = new joint.shapes.org.MobileDevice({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrMobileDevice': {
                    fill: borderColor,
                    stroke: borderColor,
                    width: configuration.width,
                    height: height,
                    rx: 20,
                    ry: 20
                },
                '.structurizrMobileDeviceDisplay': {
                    fill: fill,
                    stroke: borderColor,
                    width: configuration.width - 20,
                    height: configuration.height - 80,
                    x: 10,
                    y: 40,
                    rx: 5,
                    ry: 5
                },
                '.structurizrMobileDeviceButton': {
                    fill: fill,
                    cx: (configuration.width/2),
                    cy: (height-20),
                    rx: 10,
                    ry: 10
                },
                '.structurizrMobileDeviceSpeaker': {
                    stroke: fill,
                    x1: (configuration.width - speakerLength) / 2,
                    y1: 20,
                    x2: configuration.width - ((configuration.width - speakerLength) / 2),
                    y2: 20
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrMobileDevice']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createMobileDeviceLandscape(view, element, x, y) {
        var configuration = workspace.findElementStyle(element, defaultElementStyle);

        var elementPadding = calculateElementPadding(configuration);
        var nameLabel = formatName(element, configuration, elementPadding, elementPadding);
        var metaDataLabel = formatMetaData(element, configuration, elementPadding, elementPadding);
        var descriptionLabel = formatDescription(element, configuration, elementPadding, elementPadding);

        var heightOfNameLabel = calculateHeight(nameLabel, configuration.fontSize, nameFontSizeDifference, false);
        var heightOfMetaDataLabel = calculateHeight(metaDataLabel, configuration.fontSize, metaDataFontSizeDifference, true);
        var heightOfDescriptionLabel = calculateHeight(descriptionLabel, configuration.fontSize, 0, false);
        var totalHeightOfLabels = heightOfNameLabel + heightOfMetaDataLabel + heightOfDescriptionLabel;

        var verticalOffset = 0;
        var height = configuration.height;
        var nameRefY = (verticalOffset + ((height - totalHeightOfLabels) / 2)) / height;
        var metaDataRefY = (verticalOffset + heightOfNameLabel + ((height - totalHeightOfLabels) / 2)) / height;
        var descriptionRefY = (verticalOffset + heightOfNameLabel + heightOfMetaDataLabel + ((height - totalHeightOfLabels) / 2)) / height;

        var fill = Structurizr.shadeColor(configuration.background, 100-configuration.opacity);
        var textColor = Structurizr.shadeColor(configuration.color, 100-configuration.opacity);
        var borderColor = Structurizr.shadeColor(fill, darkenPercentage);

        var speakerLength = 50;

        var cell = new joint.shapes.org.MobileDevice({
            position: {
                x: x,
                y: y
            },
            size: {
                width: configuration.width,
                height: configuration.height
            },
            attrs: {
                '.structurizrMobileDevice': {
                    fill: borderColor,
                    stroke: borderColor,
                    width: configuration.width,
                    height: height,
                    rx: 20,
                    ry: 20
                },
                '.structurizrMobileDeviceDisplay': {
                    fill: fill,
                    stroke: borderColor,
                    width: configuration.width - 80,
                    height: height - 20,
                    x: 40,
                    y: 10,
                    rx: 5,
                    ry: 5
                },
                '.structurizrMobileDeviceButton': {
                    fill: fill,
                    cx: 20,
                    cy: (height/2),
                    rx: 10,
                    ry: 10
                },
                '.structurizrMobileDeviceSpeaker': {
                    stroke: fill,
                    x1: configuration.width - 20,
                    y1: (configuration.height - speakerLength) / 2,
                    x2: configuration.width - 20,
                    y2: configuration.height - ((configuration.height - speakerLength) / 2)
                },
                '.structurizrName': {
                    text: nameLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+nameFontSizeDifference,
                    'ref-y': nameRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrDescription': {
                    text: descriptionLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize,
                    'ref-y': descriptionRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrMetaData': {
                    text: metaDataLabel,
                    'font-family': workspace.getFont().name,
                    fill: textColor,
                    'font-size': configuration.fontSize+metaDataFontSizeDifference,
                    'ref-y': metaDataRefY,
                    'lineHeight': lineHeight
                },
                '.structurizrNavigation': {
                    'font-family': workspace.getFont().name,
                    fill: Structurizr.shadeColorLighterOrDarker(configuration.background, navigationPercentage),
                    'font-size': configuration.fontSize+navigationFontSizeDifference
                }
            },
            element: element
        });

        if (configuration.border === 'Dashed') {
            cell.attributes.attrs['.structurizrMobileDevice']['stroke-dasharray'] = "10,10";
        }

        graph.addCell(cell);
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = fill;
        cell._computedStyle.foreground = textColor;
        cell._computedStyle.borderStyle = configuration.border;
        cell._computedStyle.borderColor = borderColor;

        return cell;
    }

    function createWatermark() {
        // Commented out by Avi Flax <avi.flax@fundingcircle.com> in October 2018
        // while embedding this program into fc4-tool.
        // if (watermarked) {
        //     watermark = new joint.shapes.org.DiagramWatermark({
        //         attrs: {
        //             '.structurizrDiagramWatermark': {
        //                 text: "Structurizr",
        //                 'font-weight': 'bolder',
        //                 fill: '#fdfdfd',
        //                 stroke: '#fcfcfc',
        //                 'stroke-width': '2px'
        //             }
        //         }});
        // 
        //     graph.addCell(watermark);
        //     watermark.toBack();
        // 
        //     centreWatermark();
        // }
    }

    function centreWatermark() {
        // Commented out by Avi Flax <avi.flax@fundingcircle.com> in October 2018
        // while embedding this program into fc4-tool.
        // if (watermark) {
        //     var fontSize = diagramWidth / 6;
        //     var angle = 60 - (Math.floor(Math.random() * 120));
        //     watermark.attr({
        //         '.structurizrDiagramWatermark': {
        //             'font-size': fontSize + 'px',
        //             'transform': 'rotate(' + angle + ')'
        //         }
        //     });
        // 
        //     var offset = Math.floor(Math.random() * (diagramHeight-fontSize));
        //     centreElement(watermark, offset);
        // }
    }

    function getDiagramMetadataPlacement() {
        var configuration = workspace.getViewConfiguration();
        if (configuration.metadata) {
            return configuration.metadata;
        } else {
            return "Bottom";
        }
    }

    function createDiagramMetadata(callback) {
        var metadataPlacement = getDiagramMetadataPlacement();
        if (metadataPlacement != "None") {
            var title = workspace.getTitleForView(currentView);

            diagramTitle = new joint.shapes.org.DiagramTitle({
                attrs: {
                    '.structurizrDiagramTitle': {
                        text: title,
                        'font-family': workspace.getFont().name
                    }
                }});
            graph.addCell(diagramTitle);
            diagramTitle.toBack();

            var description = '';
            if (currentFilter && currentFilter.description) {
                description = currentFilter.description;
            } else if (currentView.description) {
                description = currentView.description;
            }

            diagramDescription = new joint.shapes.org.DiagramDescription({
                attrs: {
                    '.structurizrDiagramDescription': {
                        text: description,
                        'font-family': workspace.getFont().name
                    }
                }});

            graph.addCell(diagramDescription);
            diagramDescription.toBack();

            var metadata;

            if (express === true) {
                if (watermarked) {
                    metadata = 'Diagram powered by Structurizr and FC4';
                    diagramMetadataVisible = true;
                } else {
                    diagramMetadataVisible = false;
                }
            } else {
                var lastModified = workspace.getLastModifiedDate();
                if (lastModified) {
                    metadata = 'Workspace last modified: ' + new Date(lastModified);
                }

                var version = workspace.getVersion();
                if (version) {
                    if (metadata) {
                        metadata += ' | ';
                    } else {
                        metadata = '';
                    }
                    metadata += 'Version: ' + version;
                }

                if (watermarked) {
                    metadata = 'Diagram powered by Structurizr and FC4 | ' + metadata;
                }
            }

            diagramMetadata = new joint.shapes.org.DiagramMetadata({
                attrs: {
                    '.structurizrDiagramMetadata': {
                        text: metadata,
                        'font-family': workspace.getFont().name
                    }
                }});
            graph.addCell(diagramMetadata);
            diagramMetadata.toBack();

            repositionDiagramMetadata();

            var branding = workspace.getBranding();

            if (watermarked) {
                branding.logo = 'https://structurizr.com/static/img/structurizr-logo.png'
            }

            if (branding.logo) {
                var image = new Image();
                image.addEventListener('load', function() {
                    var ratio = this.naturalHeight / 100;
                    var scaledWidth = this.naturalWidth / ratio;

                    brandingLogo = new joint.shapes.org.BrandingImage({
                        size: { width: scaledWidth, height: 100 },
                        attrs: {
                            image: {
                                'xlink:href': branding.logo,
                                width: scaledWidth,
                                height: 100
                            }
                        }
                    });
                    graph.addCell(brandingLogo);
                    brandingLogo.toBack();

                    repositionDiagramMetadata();

                    if (callback) {
                        callback();
                    }
                });
                image.addEventListener('error', function() {
                    // there was an error loading the image, so ignore and continue
                    console.log("There was an error loading the branding logo.");
                    repositionDiagramMetadata();

                    if (callback) {
                        callback();
                    }
                });

                image.src = branding.logo;
            } else {
                if (callback) {
                    callback();
                }
            }
        }
    }

    function repositionDiagramMetadata() {
        if (diagramTitle) {
            var x = 40;
            if (brandingLogo) {
                brandingLogo.set({ position: { x: 40, y: getDiagramTitleVerticalOffset() }});
                x = brandingLogo.get('size').width + 60;
            }
            diagramTitle.set({ position: { x: x, y: getDiagramTitleVerticalOffset() }});
            diagramDescription.set({ position: { x: x, y: getDiagramTitleVerticalOffset() + 46 }});
            diagramMetadata.set({ position: { x: x, y: getDiagramTitleVerticalOffset() + 75 }});
        }
    }

    function getDiagramTitleVerticalOffset() {
        if (diagramMetadataVisible === true) {
            return diagramHeight - 120;
        } else {
            return diagramHeight - 91;
        }
    }

    function centreElement(element, y) {
        if (element) {
            var width = element.get('size').width;
            var x = (diagramWidth - width) / 2;

            element.set({ position: { x: x, y: y }});
        }
    }

    function calculateHeight(text, fontSize, fontSizeDelta, addPadding) {
        var lineSpacing = 1.25;
        if (text) {
            text = text.trim();

            if (text.length === 0) {
                return 0;
            } else {
                var numberOfLines = text.split("\n").length;
                if (addPadding) {
                    numberOfLines++;
                }
                return (numberOfLines * ((fontSize * lineSpacing) + fontSizeDelta));
            }
        } else {
            return 0;
        }
    }

    function formatName(element, configuration, horizontalPadding, verticalPadding) {
        return breakText(element.name ? element.name : "", Math.max(0, configuration.width-horizontalPadding), workspace.getFont().name, (configuration.fontSize + nameFontSizeDifference));
    }

    function formatDescription(element, configuration, horizontalPadding, verticalPadding) {
        if (configuration.description !== undefined && configuration.description === false) {
            return '';
        } else {
            return breakText(element.description ? element.description : "", Math.max(0, configuration.width - horizontalPadding), workspace.getFont().name, configuration.fontSize);
        }
    }

    function getHumanReadableElementType(element) {
        if (element.type === "SoftwareSystem") {
            return workspace.getTerminologyForSoftwareSystem();
        } else if (element.type === "Person") {
            return workspace.getTerminologyForPerson();
        } else if (element.type === "Container" || element.type === "ContainerInstance") {
            return workspace.getTerminologyForContainer();
        } else if (element.type === "Component") {
            return workspace.getTerminologyForComponent();
        } else if (element.type === "DeploymentNode") {
            return workspace.getTerminologyForDeploymentNode();
        } else if (element.type === "Enterprise") {
            return workspace.getTerminologyForEnterprise();
        }

        return '';
    }

    function calculateMetaData(element) {
        if (element.technology) {
            return "[" + getHumanReadableElementType(element) + ": " + element.technology + "]";
        } else {
            return "[" + getHumanReadableElementType(element) +"]";
        }
    }

    function formatMetaData(element, configuration, horizontalPadding, verticalPadding) {
        if (configuration.metadata !== undefined && configuration.metadata === false) {
            return '';
        } else {
            var metadata = breakText(calculateMetaData(element), configuration.width - horizontalPadding, workspace.getFont().name, (configuration.fontSize + metaDataFontSizeDifference));

            if (currentView.type === "Container" && element.type === "Container" && element.parentId !== currentView.softwareSystemId) {
                var parentElement = workspace.findElement(element.parentId);
                metadata = "from " + parentElement.name + "\n" + metadata;
            }

            return metadata;
        }
    }

    function formatTechnology(element) {
        if (element.technology) {
            return "[" + element.technology + "]";
        } else {
            return "";
        }
    }

    function breakText(text, width, font, fontSize) {
        var characterWidth = fontSize * 0.75;
        if (text && (text.length * characterWidth > width)) {
            return joint.util.breakText(text,
                {
                    width: width
                },
                {
                    'font': font,
                    'font-size': fontSize + 'px'
                }
            );
        } else {
            return text;
        }
    }

    function calculateStrokeDashArray(thickness) {
        return (15 * thickness) + " " + (15 * thickness);
    }

    function calculateArrowHead(thickness) {
        // e.g. M 30 0 L 0 15 L 30 30 z
        return 'M ' + (thickness * 10) + ' 0 L 0 ' + (thickness * 5) + ' L ' + (thickness * 10) + ' ' + (thickness * 10) + ' z';
    }

    function includeOnDiagram(elementOrRelationship) {
        if (currentFilter) {
            var tags = elementOrRelationship.tags.split(",");

            if (currentFilter.mode === "Include") {
                var include = false;
                currentFilter.tags.forEach(function(tag) {
                    tag = tag.trim();
                    include = include || tags.indexOf(tag) > -1;
                });

                return include;
            } else {
                var exclude = false;
                currentFilter.tags.forEach(function(tag) {
                    tag = tag.trim();
                    exclude = exclude || tags.indexOf(tag) > -1;
                });

                return !exclude;
            }
        } else {
            return true;
        }
    }

    function createLine(relationshipInView) {
        var relationship = workspace.findRelationship(relationshipInView.id);

        if (!includeOnDiagram(relationship)) {
            return;
        }

        if (mapOfIdToBox[relationship.sourceId] && mapOfIdToBox[relationship.destinationId]) {
            var configuration = workspace.findRelationshipStyle(relationship, defaultRelationshipStyle);

            var strokeDashArray;
            if (configuration.dashed !== undefined && configuration.dashed) {
                strokeDashArray = calculateStrokeDashArray(configuration.thickness);
            }
            var triangle = calculateArrowHead(configuration.thickness);

            var description = "";
            if (relationshipInView.description) {
                description = relationshipInView.description;
            } else if (relationship.description) {
                description = relationship.description;
            }

            if (currentView.type === "Dynamic" && relationshipInView.order) {
                description = relationshipInView.order + ": " + description;
            }

            var descriptionLabel = breakText(description, configuration.width, workspace.getFont().name, configuration.fontSize);

            var technologyLabel = formatTechnology(relationship);
            var numberOfLineBreaksInDescription = descriptionLabel.split("\n").length;
            var technologyLabelOffset = configuration.fontSize * 1.3;
            technologyLabelOffset += (numberOfLineBreaksInDescription - 1) * (0.5 * configuration.fontSize);

            if (window.navigator.userAgent.indexOf("Edge") > -1) {
                // add some padding ... because Edge renders the white rect behind the labels too large for some reason
                technologyLabelOffset += (configuration.fontSize * 0.4);
            }

            var fill = Structurizr.shadeColor(configuration.color, 100 - configuration.opacity);

            var routing = configuration.routing;
            if (relationshipInView.routing !== undefined) {
                routing = relationshipInView.routing;
            }

            var position = configuration.position;
            if (relationshipInView.position !== undefined) {
                position = relationshipInView.position;
            }

            var link = new joint.shapes.org.Relationship({
                source: {
                    id: mapOfIdToBox[relationship.sourceId].id
                },
                target: {
                    id: mapOfIdToBox[relationship.destinationId].id
                },
                labels: [
                    {
                        position: {
                            distance: position / 100,
                            offset: { x: 0, y: 0 }
                        },
                        attrs: {
                            rect: {
                                fill: '#ffffff',
                                stroke: '#ffffff',
                                'stroke-width': '20px',
                                'pointer-events': 'none'
                            },
                            text: {
                                text: descriptionLabel,
                                fill: fill,
                                'font-family': workspace.getFont().name,
                                'font-weight': 'bold',
                                'font-size': configuration.fontSize + 'px',
                                'pointer-events': 'none',
                                'lineHeight': lineHeight
                            }
                        }
                    },
                    {
                        position: {
                            distance: position / 100,
                            offset: { x: 0, y: technologyLabelOffset }
                        },
                        attrs: {
                            rect: {
                                fill: '#ffffff',
                                'pointer-events': 'none'
                            },
                            text: {
                                text: technologyLabel,
                                fill: fill,
                                'font-family': workspace.getFont().name,
                                'font-weight': 'normal',
                                'font-size': configuration.fontSize + metaDataFontSizeDifference + 'px',
                                'pointer-events': 'none',
                                'lineHeight': lineHeight
                            }
                        }
                    }
                ]
            });

            if (configuration.dashed !== undefined && configuration.dashed === true) {
                link.attr({
                    '.connection': { stroke: fill, 'stroke-width': configuration.thickness, 'stroke-dasharray': strokeDashArray, 'fill': 'none' },
                    '.connection-wrap': { fill: 'none' },
                    '.marker-target': { stroke: fill, fill: fill, d: triangle },
                    '.link-tools': { display: 'none' },
                    '.marker-arrowheads': { display: 'none' }
                });
            } else {
                link.attr({
                    '.connection': { stroke: fill, 'stroke-width': configuration.thickness, 'fill': 'none' },
                    '.connection-wrap': { fill: 'none' },
                    '.marker-target': { stroke: fill, fill: fill, d: triangle },
                    '.link-tools': { display: 'none' },
                    '.marker-arrowheads': { display: 'none' }
                });
            }

            link.set('connector', { name: 'rounded' });
            if (routing === 'Orthogonal') {
                link.set('router', { name: 'orthogonal' });
            } else {
                link.unset('router');
            }

            link.relationshipInView = relationshipInView;

            if (relationshipInView.vertices) {
                link.set('vertices', relationshipInView.vertices);
            }

            link.on('change:vertices', function () {
                Structurizr.workspace.setUnsavedChanges(true);

                var vertices = link.get('vertices');
                if (vertices) {
                    link.relationshipInView.vertices = vertices;
                }
            });

            graph.addCell(link);

            link._computedStyle = {};
            link._computedStyle.color = fill;
            if (configuration.dashed !== undefined && configuration.dashed === true) {
                link._computedStyle.lineStyle = 'Dashed';
            } else {
                link._computedStyle.lineStyle = 'Solid';
            }

            var linkView = paper.findViewByModel(link);
            $('#' + linkView.id + ' .connection-wrap').attr('style', 'cursor: ' + (editable === true ? 'move' : 'default') + ' !important');

            mapOfIdToLine[relationshipInView.id] = link;

            return link;
        } else {
            console.log("Not rendering relationship " + relationship.id + ' (' + workspace.findElement(relationship.sourceId).name + ' -> ' + workspace.findElement(relationship.destinationId).name + ') because the source and destination elements are not on the diagram.');
        }
    }

    function createBoundary(name, metadata) {
        var configuration = workspace.findElementStyle({'tags': 'Element, Boundary'}, defaultElementStyle);

        if (configuration.metadata !== undefined && configuration.metadata === false) {
            metadata = ''
        } else {
            metadata = '[' + metadata + ']';
        }

        var boundary = new joint.shapes.org.Boundary({
            attrs: {
                '.structurizrName': {
                    text: name,
                    'font-family': workspace.getFont().name,
                    'font-weight': 'bold',
                    'font-size': configuration.fontSize + 'px'
                },
                '.structurizrMetaData': {
                    text: metadata,
                    'font-family': workspace.getFont().name,
                    'font-weight': 'normal',
                    'font-size': configuration.fontSize + metaDataFontSizeDifference + 'px'
                }
            }
        });

        graph.addCell(boundary);
        boundary.toBack();

        boundary._computedStyle = {};
        boundary._computedStyle.background = '#ffffff';
        boundary._computedStyle.foreground = '#444444';
        boundary._computedStyle.borderStyle = 'Dashed';
        boundary._computedStyle.borderColor = '#444444';
        boundary._computedStyle.fontSize = configuration.fontSize;

        var cellView = paper.findViewByModel(boundary);
        $('#' + cellView.id).attr('style', 'cursor: ' + (editable === true ? 'move' : 'default') + ' !important');

        return boundary;
    }

    function createDeploymentNode(element) {
        var configuration = workspace.findElementStyle({'tags': 'Element, Deployment Node'}, defaultElementStyle);

        var instanceCount = '';
        if (element.instances && element.instances > 1) {
            instanceCount = 'x' + element.instances;
        }

        var metadata = '';
        if (configuration.metadata !== undefined && configuration.metadata === false) {
            metadata = ''
        } else {
            metadata = '[' + getHumanReadableElementType(element) + (element.technology ? ': ' + element.technology : '') + ']';
        }

        var cell = new joint.shapes.org.DeploymentNode({
            attrs: {
                '.structurizrName': {
                    text: element.name,
                    'font-family': workspace.getFont().name,
                    'font-weight': 'bold',
                    'font-size': configuration.fontSize + 'px'
                },
                '.structurizrMetaData': {
                    text: metadata,
                    'font-family': workspace.getFont().name,
                    'font-weight': 'normal',
                    'font-size': configuration.fontSize + metaDataFontSizeDifference + 'px'
                },
                '.structurizrInstanceCount': {
                    text: instanceCount,
                    'font-family': workspace.getFont().name
                }
            }
        });

        graph.addCell(cell);
        cell.toBack();
        mapOfIdToBox[element.id] = cell;

        cell._computedStyle = {};
        cell._computedStyle.background = '#ffffff';
        cell._computedStyle.foreground = '#000000';
        cell._computedStyle.borderStyle = 'Solid';
        cell._computedStyle.borderColor = '#000000';
        cell._computedStyle.fontSize = configuration.fontSize;

        var cellView = paper.findViewByModel(cell);
        $('#' + cellView.id).attr('style', 'cursor: ' + (editable === true ? 'move' : 'default') + ' !important');

        if (element.url) {
            cellView.urlToNavigateTo = element.url;
            cellView.openUrlFromDoubleClick = function() {
                window.open(this.urlToNavigateTo);
            };

            if (editable === false) {
                $('#' + cellView.id).attr('style', 'cursor: pointer !important');
            }
            $('#' + cellView.id + " .structurizrNavigation").attr('display', 'block');
        }

        return cell;
    }

    function centreCell(cell) {
        var width = cell.get('size').width;
        var height = cell.get('size').height;
        var x = (diagramWidth - width) / 2;
        var y = (diagramHeight - height) / 2;

        cell.set({ position: { x: x, y: y }});
    }

    this.setPaperSize = function(view) {
        if (view.paperSize === undefined) {
            view.paperSize = 'A5_Landscape';
        }

        this.changePaperSize(view.paperSize);
    };

    this.changePaperSize = function(paperSize) {
        currentView.paperSize = paperSize;
        $('#pageSize option#' + paperSize).prop('selected',true);

        var pageSize = $('#pageSize').val();
        var dimensions = pageSize.split("x");
        this.setPageSize(dimensions[0], dimensions[1]);
    };

    function changeGridSize() {
        var gridSize = $('#gridSize').val();
        alert(paper.get('gridSize'));
        paper.gridSize = gridSize;
    }

    function reposition(parentCell) {
        var padding;
        var metadataText;
        var fontSize;

        if (parentCell) {
            metadataText = parentCell.attr('.structurizrMetaData').text;
            fontSize = parentCell._computedStyle.fontSize;

            if (parentCell.elementInView) {
                // this is an element from the model
                var element = workspace.findElement(parentCell.elementInView.id);
                if (element.type === 'DeploymentNode') {
                    padding = { top: 50, right: 50, bottom: 50, left: 50 };
                }
            } else {
                // this is a boundary box
                padding = { top: 20, right: 20, bottom: 50, left: 20 };
            }

            if (metadataText && metadataText.length > 0) {
                padding.bottom = padding.bottom + fontSize + fontSize + metaDataFontSizeDifference;
            } else {
                padding.bottom = padding.bottom + fontSize;
            }

            var minX = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE;
            var minY = Number.MAX_VALUE;
            var maxY = Number.MIN_VALUE;

            var embeddedCells = parentCell.getEmbeddedCells();
            for (var i = 0; i < embeddedCells.length; i++) {
                var cell = embeddedCells[i];
                var x = cell.get('position').x;
                var y = cell.get('position').y;
                var width = cell.get('size').width;
                var height = cell.get('size').height;

                if (cell.elementInView) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x + width);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y + height);
                }
            }

            padding = {
                top: padding.top,
                right: padding.right,
                bottom: padding.bottom,
                left: padding.left
            };

            var newWidth = maxX - minX + padding.left + padding.right;
            var newHeight = maxY - minY + padding.top + padding.bottom;
            var newX = minX - padding.left;
            var newY = minY - padding.top;

            var refX = (10 / newWidth);

            parentCell.position(newX, newY);
            parentCell.attr({ rect: { width: newWidth, height: newHeight }});
            parentCell.resize(newWidth, newHeight);

            if (metadataText && metadataText.length > 0) {
                parentCell.attr({
                    '.structurizrName': {
                        'ref-x': refX,
                        'y': newHeight - (15 + fontSize)
                    },
                    '.structurizrMetaData': {
                        'ref-x': refX,
                        'y': newHeight - 15
                    },
                    '.structurizrInstanceCount': {
                        'y': newHeight - 15
                    }
                });
            } else {
                parentCell.attr({
                    '.structurizrName': {
                        'ref-x': refX,
                        'y': newHeight - 15
                    },
                    '.structurizrMetaData': {
                        'ref-x': refX,
                        'y': newHeight - 15
                    },
                    '.structurizrInstanceCount': {
                        'y': newHeight - 15
                    }
                });
            }
        }
    }

    this.makeLinkableHashDiagramUrl = function() {
        if (window.location.href.indexOf('diagram=') === -1 && window.location.href.indexOf('type=') === -1) {
            if (currentView) {
                if (currentFilter) {
                    window.location.hash = encodeURIComponent(currentFilter.key);
                } else if (currentView.key) {
                    window.location.hash = encodeURIComponent(currentView.key);
                } else {
                    window.location.hash = currentView.number;
                }
            }
        }
    };

    function getTags(taggedItems) {
        var tags = [];

        for (var i = 0; i < taggedItems.length; i++) {
            if (taggedItems[i].tags) {
                var splitTags = taggedItems[i].tags.split(",");
                for (var j = 0; j < splitTags.length; j++) {
                    var tag = splitTags[j];
                    tag = tag.trim();
                    if (tags.indexOf(tag) === -1) {
                        tags.push(tag);
                    }
                }
            }
        }

        return tags;
    }

    this.gatherElementsOnCanvas = function() {
        var previousPositions = [];

        // check and move all elements
        for (var i = 0; i < graph.getElements().length; i++) {
            var cell = graph.getElements()[i];
            var x = cell.get('position').x;
            var y = cell.get('position').y;
            var width = cell.get('size').width;
            var height = cell.get('size').height;

            var maxX = diagramWidth - width;
            var maxY = diagramHeight - height;

            if (x < 0 || x > maxX || y < 0 || y > maxY) {
                previousPositions.push(getCurrentElementPositions([paper.findViewByModel(cell)])[0]);
            }

            x = Math.min(Math.max(0, x), maxX);
            y = Math.min(Math.max(0, y), maxY);

            cell.set(
                {
                    position: {
                        x: x,
                        y: y
                    }
                }
            );
        }

        // and repeat for links
        var links = graph.getLinks();
        if (links) {
            links.forEach(function(link) {
                var oldVertices = link.get('vertices');
                var newVertices = [];
                var moved = false;
                if (oldVertices) {
                    oldVertices.forEach(function(vertex) {
                        var x = Math.min(Math.max(0, vertex.x), diagramWidth);
                        var y = Math.min(Math.max(0, vertex.y), diagramHeight);

                        if (x !== vertex.x || y !== vertex.y) {
                            moved = true;
                        }

                        newVertices.push({
                            x: x,
                            y: y
                        });
                    });

                    if (moved) {
                        previousPositions.push(getCurrentLinkPositions([link])[0]);
                        link.set('vertices', newVertices);
                    }
                }
            })
        }


        if (previousPositions.length > 0) {
            addToUndoBuffer(previousPositions);
        }
    };

    this.zoomFitWidth = function() {
        var viewport = $('#diagramViewport');
        this.zoomTo((viewport.width()-scrollBarWidth) / diagramWidth);

        viewport.scrollTop(0);
    };

    this.zoomFitHeight = function() {
        var viewport = $('#diagramViewport');
        this.zoomTo(viewport.height() / diagramHeight);
    };

    this.zoomFitContent = function() {
        if (!currentView.elements) {
            this.zoomFitHeight();
            return;
        }

        var viewport = $('#diagramViewport');

        var minX = diagramWidth;
        var maxX = 0;
        var minY = diagramHeight;
        var maxY = 0;

        for (var i = 0; i < graph.getElements().length; i++) {
            var cell = graph.getElements()[i];

            if (cell.elementInView) {
                var x = cell.get('position').x;
                var y = cell.get('position').y;
                var width = cell.get('size').width;
                var height = cell.get('size').height;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);

                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
            }
        }

        var padding = 40;
        var contentWidth = (maxX - minX) + (2*padding);
        var contentHeight = (maxY - minY) + (2*padding);

        contentWidth = Math.min(diagramWidth, contentWidth);
        contentHeight = Math.min(diagramHeight, contentHeight);

        var viewportRatio = viewport.width() / viewport.height();
        var contentRatio = contentWidth / contentHeight;

        if (viewportRatio > contentRatio) {
            this.zoomTo(viewport.height() / contentHeight);
        } else {
            this.zoomTo(viewport.width() / contentWidth);
        }

        viewport.scrollTop((minY-padding) * scale);
        viewport.scrollLeft((minX-padding) * scale);
    };

    this.zoomIn = function() {
        if (scale < 1) {
            if (scale * 2 > 1) {
                this.zoomTo(1);
            } else {
                this.zoomTo(scale * 2);
            }
        }

        var viewport = $('#diagramViewport');
    };

    this.zoomOut = function() {
        if (scale > 0.1) {
            this.zoomTo(scale / 2);
        }

        var viewport = $('#diagramViewport');
    };

    this.zoomTo = function(zoomScale) {
        scale = zoomScale;

        var width = Math.floor(diagramWidth*scale);
        var height = Math.floor(diagramHeight*scale);

        var viewport = $("#diagramViewport");

        var diagram = $("#diagramCanvas");
        diagram.width(width);
        diagram.height(height);

        var svg = $("#v-2");
        svg.width(width);
        svg.height(height);

        if (width > viewport.width()) {
            viewport.css("overflow-x", "scroll");
        } else {
            viewport.css("overflow-x", "hidden");
        }

        if (height > viewport.height()) {
            viewport.css("overflow-y", "scroll");
        } else {
            viewport.css("overflow-y", "hidden");
        }

        paper.scale(scale);
    };

    this.getPossibleViewportWidth = function() {
        if (Structurizr.isFullScreen()) {
            return screen.width - horizontalPadding;
        } else {
            var diagramDefinition = $('#diagramDefinition');
            if (diagramDefinition && diagramDefinition.is(':visible')) {
                return window.innerWidth - horizontalPadding - diagramDefinition.innerWidth();
            } else {
                return window.innerWidth - horizontalPadding;
            }
        }
    };

    this.getPossibleViewportHeight = function() {
        var diagramControlsHeight = Structurizr.getDiagramControls().outerHeight(true);

        if (Structurizr.isFullScreen()) {
            if (presentationMode) {
                return screen.height - verticalPadding;
            } else {
                return screen.height - diagramControlsHeight - verticalPadding;
            }
        } else {
            return window.innerHeight - diagramControlsHeight - verticalPadding;
        }
    };

    this.zoomForPresentationMode = function() {
        var screenRatio = screen.width / screen.height;
        var diagramRatio = diagramWidth / diagramHeight;
        if (diagramRatio < 1.0) {
            this.zoomFitWidth();
        } else if (diagramRatio < screenRatio) {
            this.zoomFitHeight();
        } else {
            this.zoomFitWidth();
        }
    };

    this.zoomToWidthOrHeight = function() {
        var viewport = $('#diagramViewport');
        var viewportRatio = viewport.width() / viewport.height();
        var diagramRatio = diagramWidth / diagramHeight;
        if (diagramRatio < viewportRatio) {
            this.zoomFitHeight();
        } else {
            this.zoomFitWidth();
        }
    };

    this.resize = function() {
        var viewport = $('#diagramViewport');
        viewport.width(this.getPossibleViewportWidth());

        if (!embedded || Structurizr.isFullScreen()) {
            viewport.height(this.getPossibleViewportHeight());
        } else {
            var diagramRatio = diagramWidth / diagramHeight;
            viewport.height(Math.floor(viewport.width() / diagramRatio));
        }
    };

    this.showHealth = function(elementId, health) {
        var green = "#5cb85c";
        var amber = "#f0ad4e";
        var red =   "#d9534f";

        var colour;
        var borderColour;
        var symbol;

        if (health === 1) {
            colour = green;
        } else if (health === 0) {
            colour = red;
        } else {
            colour = amber;
        }

        borderColour = Structurizr.shadeColor(colour, darkenPercentage);

        var cell = mapOfIdToBox[elementId];
        if (cell) {
            // var cellView = paper.findViewByModel(cell);
            // var structurizrElement = $('#' + cellView.el.id + ' rect, ' + '#' + cellView.el.id + ' ellipse, ' + '#' + cellView.el.id + ' circle, ' + '#' + cellView.el.id + ' polygon, ' + '#' + cellView.el.id + ' line');
            // structurizrElement.attr('fill', colour);
            // structurizrElement.attr('stroke', Structurizr.shadeColor(colour, darkenPercentage));

            var type = cell.attributes.type;

            if (type === "structurizr.box") {
                cell.attr('.structurizrBox/fill', colour);
                cell.attr('.structurizrBox/stroke', borderColour);
            } else if (type === "structurizr.person") {
                cell.attr('.structurizrPersonHead/fill', colour);
                cell.attr('.structurizrPersonHead/stroke', borderColour);
                cell.attr('.structurizrPersonBody/fill', colour);
                cell.attr('.structurizrPersonBody/stroke', borderColour);
                cell.attr('.structurizrPersonLeftArm/stroke', borderColour);
                cell.attr('.structurizrPersonRightArm/stroke', borderColour);
            } else if (type === "structurizr.cylinder") {
                cell.attr('.structurizrCylinderFace/fill', colour);
                cell.attr('.structurizrCylinderFace/stroke', borderColour);
                cell.attr('.structurizrCylinderFaceFull/fill', colour);
                cell.attr('.structurizrCylinderFaceFull/stroke', borderColour);
                cell.attr('.structurizrCylinderTop/fill', colour);
                cell.attr('.structurizrCylinderTop/stroke', borderColour);
                cell.attr('.structurizrCylinderBottom/fill', colour);
                cell.attr('.structurizrCylinderBottom/stroke', borderColour);
            } else if (type === "structurizr.pipe") {
                cell.attr('.structurizrPipeFace/fill', colour);
                cell.attr('.structurizrPipeFace/stroke', borderColour);
                cell.attr('.structurizrPipeFaceFull/fill', colour);
                cell.attr('.structurizrPipeFaceFull/stroke', 'none');
                cell.attr('.structurizrPipeLeft/fill', colour);
                cell.attr('.structurizrPipeLeft/stroke', borderColour);
                cell.attr('.structurizrPipeRight/fill', colour);
                cell.attr('.structurizrPipeRight/stroke', borderColour);
                } else if (type === "structurizr.folder") {
                cell.attr('.structurizrFolder/fill', colour);
                cell.attr('.structurizrFolder/stroke', borderColour);
                cell.attr('.structurizrFolderTab/fill', colour);
                cell.attr('.structurizrFolderTab/stroke', borderColour);
            } else if (type === "structurizr.ellipse") {
                cell.attr('.structurizrEllipse/fill', colour);
                cell.attr('.structurizrEllipse/stroke', borderColour);
            } else if (type === "structurizr.hexagon") {
                cell.attr('.structurizrHexagon/fill', colour);
                cell.attr('.structurizrHexagon/stroke', borderColour);
            } else if (type === "structurizr.webBrowser") {
                cell.attr('.structurizrWebBrowser/fill', borderColour);
                cell.attr('.structurizrWebBrowser/stroke', borderColour);
                cell.attr('.structurizrWebBrowserPanel/fill', colour);
                cell.attr('.structurizrWebBrowserUrlBar/fill', colour);
                cell.attr('.structurizrWebBrowserButton1/fill', colour);
                cell.attr('.structurizrWebBrowserButton2/fill', colour);
                cell.attr('.structurizrWebBrowserButton3/fill', colour);
            } else if (type === "structurizr.mobileDevice") {
                cell.attr('.structurizrMobileDevice/fill', borderColour);
                cell.attr('.structurizrMobileDevice/stroke', borderColour);
                cell.attr('.structurizrMobileDeviceDisplay/fill', colour);
                cell.attr('.structurizrMobileDeviceButton/fill', colour);
                cell.attr('.structurizrMobileDeviceSpeaker/stroke', colour);
            }

            cell.attr('.structurizrNavigation/text', (health * 100) + '%');
            cell.attr('.structurizrNavigation/fill', Structurizr.shadeColorLighterOrDarker(colour, navigationPercentage));
            cell.attr('.structurizrNavigation/display', 'block');
        }
    };

    function selectElement(cellView) {
        cellView.selected = true;
        var structurizrBox = $('#' + cellView.el.id + ' .structurizrHighlightableElement');
        var classes = structurizrBox.attr('class');
        structurizrBox.attr('class', classes + ' highlightedElement');

        selectedElements.push(cellView);
        toggleMultiSelectButtons();
    }

    this.selectElementsWithName = function(regex) {
        var filter = new RegExp(regex);

        graph.getElements().forEach(function(element) {
            if (element.elementInView && element.positionCalculated === false) {
                var elementInModel = workspace.findElement(element.elementInView.id);
                if (elementInModel.name.match(filter)) {
                    var cellView = paper.findViewByModel(element);
                    selectElement(cellView);
                }
            }
        });
    };

    this.selectAllElements = function() {
        graph.getElements().forEach(function(element) {
            if (element.elementInView && element.positionCalculated === false) {
                var cellView = paper.findViewByModel(element);
                if (cellView.selected === undefined || cellView.selected === false) {
                    selectElement(cellView);
                }
            }
        });
    };

    this.deselectAllElements = function() {
        for (var i = selectedElements.length - 1; i >= 0; i--) {
            deselectElement(selectedElements[i]);
        }
    };

    function deselectElement(cellView) {
        cellView.selected = false;
        var structurizrBox = $('#' + cellView.el.id + ' .structurizrHighlightableElement');
        var classes = structurizrBox.attr('class');

        var highlightedElement = classes.indexOf(' highlightedElement');
        if (highlightedElement > -1) {
            structurizrBox.attr('class', classes.substring(0, highlightedElement));
        }

        var index = selectedElements.indexOf(cellView);
        if (index > -1) {
            selectedElements.splice(index, 1);
        }
        toggleMultiSelectButtons();
    }

    function toggleMultiSelectButtons() {
        var singleElementSelected = selectedElements.length > 0;
        var multipleElementsSelected = selectedElements.length > 1;
        $('.singleElementSelectedButton').prop('disabled', !singleElementSelected);
        $('.multipleElementsSelectedButton').prop('disabled', !multipleElementsSelected);
    }

    function createTagsList(style, defaultTag) {
        var tags = undefined;

        if (style.tags) {
            style.tags.forEach(function (tag) {
                if (tag !== defaultTag) {
                    if (!tags) {
                        tags = tag;
                    } else {
                        tags = tags + ", " + tag;
                    }
                }
            });
        }

        if (!tags) {
            tags = defaultTag;
        }

        return tags;
    }

    function resetDiagramKey() {
        var diagramKeyTitle = $("#diagramKeyTitle");
        var diagramKeyDescription = $("#diagramKeyDescription");
        var diagramType = $("#diagramType");
        var diagramKey = $("#diagramKey");
        var diagramKeySvg = $("#diagramKeySvg");

        diagramKeyTitle.empty();
        diagramType.empty();
        diagramKey.empty();
        diagramKey.css('font-family', workspace.getFont().name);
        diagramKeySvg.css('font-family', workspace.getFont().name);
    }

    function showDiagramType() {
        var diagramType = $("#diagramType");
        var html = '<p>';

        if (currentView.type === 'SystemLandscape') {
            var enterprise = workspace.getEnterprise();
            var enterpriseName = (enterprise && enterprise.name) ? ('<b>' + enterprise.name + '</b>') : 'a given environment';

            html +=  "This <b>system landscape diagram</b> shows the people and software systems within " + enterpriseName + ".";
        } else if (currentView.type === 'SystemContext') {
            var softwareSystem = workspace.findElement(currentView.softwareSystemId);
            html +=  "This <b>system context diagram</b> describes the context in which the <b>" + softwareSystem.name + "</b> software system exists, showing the people and other software systems that are related to it.";
        } else if (currentView.type === 'Container') {
            var softwareSystem = workspace.findElement(currentView.softwareSystemId);
            html +=  "This <b>container diagram</b> shows the containers that make up the <b>" + softwareSystem.name + "</b> software system; describing the high-level technology building blocks, how they communicate, and how responsibilities are distributed across them. ";
            html +=  "A \"container\" is something like a server-side web application, single-page application, desktop application, mobile app, database schema, file system, etc. Essentially, a container is a separately runnable/deployable unit (e.g. a separate process space) that executes code or stores data.";
        } else if (currentView.type === 'Component') {
            var container = workspace.findElement(currentView.containerId);
            html +=  "This <b>component diagram</b> shows how the <b>" + container.name + "</b> container is made up of a number of components; what each of those components are, their responsibilities, and the technology/implementation details.";
        } else if (currentView.type === 'Dynamic') {
            html +=  'This <b>dynamic diagram</b> shows how elements in the static model collaborate at runtime to implement a user story, use case, feature, etc. The diagram is based upon a UML communication diagram (previously known as a UML collaboration diagram). It is similar to a UML sequence diagram although it allows a free-form arrangement of diagram elements with numbered interactions to indicate ordering.';
        } else if (currentView.type === 'Deployment') {
            html +=  "This <b>deployment diagram</b> shows how containers in the static model are mapped to infrastructure. The diagram is based upon a UML deployment diagram, although simplified slightly to show the mapping between containers and deployment nodes. A deployment node is something like physical infrastructure (e.g. a physical server or device), virtualised infrastructure (e.g. IaaS, PaaS, a virtual machine), containerised infrastructure (e.g. a Docker container), an execution environment (e.g. a database server, Java EE web/application server, Microsoft IIS), etc. Deployment nodes can be nested.";
        }

        html += " See <a href='https://c4model.com' target='_blank'>c4model.com</a> for more information about this diagram type and the C4 model for describing software architecture.";
        html += "</p>";

        diagramType.html(html);
    }

    var totalWidthOfKey;
    var totalHeightOfKey;

    function createDiagramKey() {
        var diagramKeyTitle = $("#diagramKeyTitle");
        var diagramKeyDescription = $("#diagramKeyDescription");
        var diagramKey = $("#diagramKey");
        var diagramKeySvg = $('#diagramKeySvg');

        resetDiagramKey();

        diagramKeyTitle.html(workspace.getTitleForView(currentView));
        diagramKeyDescription.html(currentView.description ? currentView.description : '');

        //showDiagramType();

        var keyPresent = false;

        var keyElementWidth = 450;
        var keyElementHeight = 300;
        var fontSize = "30px";

        var elementStylesInUse = [];
        var elementStylesInUseMap = {};
        var elementsInView = workspace.getElementsInView(currentView);
        for (var i = 0; i < elementsInView.length; i++) {
            var elementInView = elementsInView[i];
            if (elementInView.type !== "DeploymentNode") {
                var elementStyle = workspace.findElementStyle(elementInView, defaultElementStyle);
                var elementStyleIdentifier = createTagsList(elementStyle, "Element");
                if (elementStylesInUse.indexOf(elementStyleIdentifier) === -1) {
                    elementStylesInUse.push(elementStyleIdentifier);
                    elementStylesInUseMap[elementStyleIdentifier] = elementStyle;
                }
            }
        }

        elementStylesInUse.sort(function(a, b){ return a.localeCompare(b); });

        var relationshipStylesInUse = [];
        var relationshipStylesInUseMap = {};
        var relationshipsInView = workspace.getRelationshipsInView(currentView);
        for (var i = 0; i < relationshipsInView.length; i++) {
            var relationshipInView = relationshipsInView[i];
            var relationshipStyle = workspace.findRelationshipStyle(relationshipInView, defaultRelationshipStyle);
            var relationshipStyleIdentifier = createTagsList(relationshipStyle, "Relationship");
            if (relationshipStylesInUse.indexOf(relationshipStyleIdentifier) === -1) {
                relationshipStylesInUse.push(relationshipStyleIdentifier);
                relationshipStylesInUseMap[relationshipStyleIdentifier] = relationshipStyle;
            }
        }

        relationshipStylesInUse.sort(function(a, b){ return a.localeCompare(b); });

        var numberOfItemsInKey = elementStylesInUse.length + relationshipStylesInUse.length;
        if (boundary) {
            numberOfItemsInKey++;
        }
        if (currentView.type === "Deployment") {
            numberOfItemsInKey++;
        }

        var columns = 5;
        var columnWidth = 500;
        var rowHeight = 500;
        var rows = Math.ceil(numberOfItemsInKey / columns);
        totalWidthOfKey = columns * columnWidth;
        totalHeightOfKey = rows * rowHeight;
        var counter = 1;

        var svg = '<svg width="' + totalWidthOfKey + '" height="' + totalHeightOfKey + '" style="padding: 10px; font-size: ' + fontSize + '; font-family: ' + workspace.getFont().name + ';">';

        if (boundary) {
            var width = keyElementWidth;
            var height = keyElementHeight;

            svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
            svg += '<rect width="' + width + '" height="' + height + '" rx="3" ry="3" x="0" y="0" fill="#ffffff" stroke-width="5" stroke="#444444" stroke-dasharray="50,50" />';
            svg += createTextForKey(width, height, 0, boundaryElement.name, getHumanReadableElementType(boundaryElement), '#444444');
            svg += '</g>';

            keyPresent = true;
            counter++;
        }

        if (currentView.type === "Deployment") {
            var width = keyElementWidth;
            var height = keyElementHeight;

            svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
            svg += '<rect width="' + width + '" height="' + height + '" rx="15" ry="15" x="0" y="0" fill="#ffffff" stroke-width="3" stroke="#444444" />';
            svg += createTextForKey(width, height, 0, workspace.getTerminologyForDeploymentNode(), undefined, '#444444');
            svg += '</g>';

            keyPresent = true;
            counter++;
        }

        for (var i = 0; i < elementStylesInUse.length; i++) {
            elementStyle = elementStylesInUseMap[elementStylesInUse[i]];
            var fill = Structurizr.shadeColor(elementStyle.background, 100-elementStyle.opacity);
            var borderColour = Structurizr.shadeColor(fill, darkenPercentage);
            var textColor = Structurizr.shadeColor(elementStyle.color, 100-elementStyle.opacity);

            if (shapesEnabled && elementStyle.shape === "RoundedBox") {
                var width = keyElementWidth;
                var height = keyElementHeight;

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect width="' + width + '" height="' + height + '" rx="20" ry="20" x="0" y="0" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Cylinder") {
                var lidRadius = 45;
                var uniqueKey = "key" + elementStyle.tag.replace(/ /g, "") + "Cylinder";
                var width = keyElementWidth;
                var height = keyElementWidth * (elementStyle.height / elementStyle.width);

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<ellipse id="' + uniqueKey.concat("Bottom") + '" cx="' + width/2 + '" cy="' + (height - lidRadius) + '" rx="' + (width/2) + '" ry="' + lidRadius + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '></ellipse>';
                svg += '<rect id="' + uniqueKey.concat("Face") + '" x="0" y="' + lidRadius + '" width="' + width + '" height="' + (height - (2 * lidRadius)) + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '></rect>';
                svg += '<clipPath id="' + uniqueKey.concat("StructurizrClipPath") + '" clipPathUnits="userSpaceOnUse"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#' + uniqueKey.concat("Bottom") + '"></use><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#' + uniqueKey.concat("Face") + '"></use></clipPath>';
                svg += '<rect x="0" y="' + lidRadius + '" width="' + width + '" height="' + height + '" clip-path="url(#' + uniqueKey.concat("StructurizrClipPath") + ')" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"></rect>';
                svg += '<ellipse cx="' + width/2 + '" cy="' + lidRadius + '" rx="' + (width/2) + '" ry="' + lidRadius + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '></ellipse>';
                svg += createTextForKey(width, height, lidRadius * 2, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Pipe") {
                var lidRadius = 45;
                var uniqueKey = "key" + elementStyle.tag.replace(/ /g, "") + "Pipe";
                var width = keyElementWidth;
                var height = keyElementHeight;

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<ellipse id="' + uniqueKey.concat("Right") + '" cx="' + (width-lidRadius) + '" cy="' + (height/2) + '" rx="' + lidRadius + '" ry="' + (height/2) + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '></ellipse>';
                svg += '<rect id="' + uniqueKey.concat("Face") + '" x="' + lidRadius + '" y="0" width="' + (width - (2 * lidRadius)) + '" height="' + height + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '></rect>';
                svg += '<clipPath id="' + uniqueKey.concat("StructurizrClipPath") + '" clipPathUnits="userSpaceOnUse"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#' + uniqueKey.concat("Right") + '"></use><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#' + uniqueKey.concat("Face") + '"></use></clipPath>';
                svg += '<rect x="' +  lidRadius + '" y="0" width="' + (width-lidRadius) + '" height="' + height + '" clip-path="url(#' + uniqueKey.concat("StructurizrClipPath") + ')" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"></rect>';
                svg += '<ellipse cx="' + lidRadius + '" cy="' + (height/2) + '" rx="' + lidRadius + '" ry="' + (height/2) + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '></ellipse>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Person") {
                var width = keyElementWidth;
                var height = keyElementWidth;
                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect x="0" y="' + height/2.5 + '" width="' + width + '" height="' + (height - (height/2.5)) + '" rx="90" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<circle cx="' + width/2 + '" cy="' + height/4.5 + '" r="' + height/4.5 + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<line x1="' + width/5 + '" y1="' + height/1.5 + '" x2="' + width/5 + '" y2="' + height + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<line x1="' + (width-(width/5)) + '" y1="' + height/1.5 + '" x2="' + (width-(width/5)) + '" y2="' + height + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, (height/4.5 * 2), createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Robot") {
                var width = keyElementWidth;
                var height = keyElementWidth;
                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect x="0" y="' + height/2.5 + '" width="' + width + '" height="' + (height - (height/2.5)) + '" rx="40" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<rect x="' + (width - width/1.8)/2 + '" y="' + (width/2.25 - width/10)/2 + '" width="' + width/1.8 + '" height="' + height/10 + '" rx="10" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<rect x="' + (height - height/2.25)/2 + '" y="0" width="' + width/2.25 + '" height="' + height/2.25 + '" rx="40" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<line x1="' + width/5 + '" y1="' + height/1.5 + '" x2="' + width/5 + '" y2="' + height + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<line x1="' + (width-(width/5)) + '" y1="' + height/1.5 + '" x2="' + (width-(width/5)) + '" y2="' + height + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, (height/4.5 * 2), createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Folder") {
                var width = keyElementWidth;
                var height = keyElementWidth * (elementStyle.height / elementStyle.width);

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect width="' + (width / 3) + '" height="' + (height / 4) + '" rx="15" ry="15" x="15" y="0" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage / 1.5) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<rect width="' + width + '" height="' + (height - (height / 8)) + '" rx="6" ry="6" x="0" y="' + (height / 8) + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, height/4, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Circle") {
                var width = keyElementWidth;
                var height = keyElementWidth;

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<ellipse cx="' + width/2 + '" cy="' + height/2 + '" rx="' + width/2 + '" ry="' + height/2 + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Ellipse") {
                var width = keyElementWidth;
                var height = keyElementWidth * (elementStyle.height / elementStyle.width);

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<ellipse cx="' + width/2 + '" cy="' + height/2 + '" rx="' + width/2 + '" ry="' + height/2 + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "Hexagon") {
                var width = keyElementWidth;
                var height = Math.floor(((width/2) * Math.sqrt(3)));
                var points =    (width/4) + ",0 " +
                    (3*(width/4)) + ",0 " +
                    width + "," + (height/2) + " " +
                    (3*(width/4)) + "," + height + " " +
                    (width/4) + "," + height + " " +
                    "0," + (height/2);

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<polygon points="' + points + '" fill="' + fill + '" stroke-width="5" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "WebBrowser") {
                var width = keyElementWidth;
                var height = keyElementHeight;

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect width="' + width + '" height="' + height + '" rx="10" ry="10" x="0" y="0" fill="' + borderColour + '" stroke-width="5" stroke="' + borderColour + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<rect width="' + (width-20) + '" height="' + (height-50) + '" rx="10" ry="10" x="10" y="40" fill="' + fill + '" stroke-width="0"/>';
                svg += '<rect width="' + (width-110) + '" height="20" rx="10" ry="10" x="100" y="10" fill="' + fill + '" stroke-width="0"/>';
                svg += '<ellipse cx="20" cy="20" rx="10" ry="10" fill="' + fill + '" stroke-width="0"/>';
                svg += '<ellipse cx="50" cy="20" rx="10" ry="10" fill="' + fill + '" stroke-width="0"/>';
                svg += '<ellipse cx="80" cy="20" rx="10" ry="10" fill="' + fill + '" stroke-width="0"/>';
                svg += createTextForKey(width, height, 40, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "MobileDevicePortrait") {
                var width = keyElementHeight;
                var height = keyElementWidth;

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect width="' + width + '" height="' + height + '" rx="20" ry="20" x="0" y="0" fill="' + borderColour + '" stroke-width="5" stroke="' + borderColour + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<rect width="' + (width-20) + '" height="' + (height-80) + '" rx="5" ry="5" x="10" y="40" fill="' + fill + '" stroke-width="0"/>';
                svg += '<ellipse cx="' + (width/2) + '" cy="' + (height-20) + '" rx="10" ry="10" fill="' + fill + '" stroke-width="0"/>';
                svg += '<line x1="' + ((width-50)/2) + '" y1="20" x2="' + (width-((width-50)/2)) + '" y2="20" stroke-width="5" stroke="' + fill + '"/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else if (shapesEnabled && elementStyle.shape === "MobileDeviceLandscape") {
                var width = keyElementWidth;
                var height = keyElementHeight;

                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect width="' + width + '" height="' + height + '" rx="20" ry="20" x="0" y="0" fill="' + borderColour + '" stroke-width="5" stroke="' + borderColour + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += '<rect width="' + (width-80) + '" height="' + (height-20) + '" rx="5" ry="5" x="40" y="10" fill="' + fill + '" stroke-width="0"/>';
                svg += '<ellipse cx="20" cy="' + (height/2) + '" rx="10" ry="10" fill="' + fill + '" stroke-width="0"/>';
                svg += '<line x1="' + (width-20) + '" y1="' + ((height-50)/2) + '" x2="' + (width-20) + '" y2="' + (height - ((height-50)/2)) + '" stroke-width="5" stroke="' + fill + '"/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            } else {
                var width = keyElementWidth;
                var height = keyElementHeight;
                svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
                svg += '<rect width="' + width + '" height="' + height + '" rx="3" ry="3" x="0" y="0" fill="' + fill + '" stroke-width="6" stroke="' + Structurizr.shadeColor(fill, darkenPercentage) + '"' + (elementStyle.border === 'Dashed' ? ' stroke-dasharray="15,15"' : '') + '/>';
                svg += createTextForKey(width, height, 0, createTagsList(elementStyle, "Element"), undefined, textColor);
                svg += '</g>';
            }

            keyPresent = true;
            counter++;
        }

        for (var i = 0; i < relationshipStylesInUse.length; i++) {
            relationshipStyle = relationshipStylesInUseMap[relationshipStylesInUse[i]];
            var strokeDashArray;
            if (relationshipStyle.dashed === true) {
                strokeDashArray = calculateStrokeDashArray(relationshipStyle.thickness);
            }
            var fill = Structurizr.shadeColor(relationshipStyle.color, 100-relationshipStyle.opacity);

            var width = keyElementWidth;
            var height = 160;
            var svg;
            svg += createSvgGroup(counter, columns, columnWidth, rowHeight, width, height);
            svg += '<path d="M' + (width-60) + ',0 L' + (width-60) + ',60 L' + width + ',30 L ' + (width-60) + ',0" style="fill:' + fill + '" stroke-dasharray="" />';
            if (relationshipStyle.dashed == true) {
                svg += '<path d="M0,30 L' + (width-60) + ',30" style="stroke:' + fill + '; stroke-width: ' + (relationshipStyle.thickness*3) + '; fill: none; stroke-dasharray: ' + strokeDashArray + ';" />';
            } else {
                svg += '<path d="M0,30 L' + (width-60) + ',30" style="stroke:' + fill + '; stroke-width: ' + (relationshipStyle.thickness*3) + '; fill: none;" />';
            }
            svg += createTextForKey(width, height, 60, createTagsList(relationshipStyle, "Relationship"), undefined, fill);
            svg += '</g>';

            keyPresent = true;
            counter++;
        }

        svg += '</svg>';

        if (keyPresent) {
            diagramKeySvg.html(svg);
        } else {
            diagramKey.append("<p>No elements/relationships are styled on this diagram.</p>")
        }
    }

    this.showKey = function() {
        $('#diagramKey').html('<img src="' + convertDiagramKeyToPng() + '" class="img-responsive" />');
        $('#keyModal').modal('show');
    };

    this.hideKey = function() {
        $('#keyModal').modal('hide');
    };

    function createSvgGroup(index, columns, columnWidth, rowHeight, contentWidth, contentHeight) {
        var column = ((index-1) % columns) + 1;
        var row = Math.ceil(index / columns);
        var offsetX = ((column-1) * columnWidth) + ((columnWidth - contentWidth)/2);
        var offsetY = ((row-1) * rowHeight) + ((rowHeight - contentHeight)/2);

        return '<g transform="translate(' + offsetX +',' + offsetY + ')">';
    }

    function createTextForKey(width, height, offset, tag, stereotype, textColor) {
        var text = breakText(tag, width * 0.8, workspace.getFont().name, 30);

        var heightOfText;
        if (stereotype) {
            heightOfText = calculateHeight(text + '\n' + stereotype, 20, 0, false);
        } else {
            heightOfText = calculateHeight(text, 20, 0, false);
        }

        var svg = "";
        svg += '<text x="' + width / 2 + '" y="' + (offset + ((height - offset - heightOfText)/ 2)) + '" text-anchor="middle" fill="' + textColor + '">';

        var lineCount = 0;
        text.split("\n").forEach(function(line) {
            if (lineCount === 0) {
                svg += '<tspan x="' + width / 2 + '">' + line + '</tspan>';
            } else {
                svg += '<tspan x="' + width/2 + '" dy="42px">' + line + '</tspan>';
            }
            lineCount++;
        });

        if (stereotype) {
            svg += '<tspan x="' + width/2 + '" dy="42px" font-size="0.8em">[' + stereotype + ']</tspan>';
        }

        svg += '</text>';

        return svg;
    }

    function createEmbedCode() {
        var ratio = diagramWidth / diagramHeight;
        var width = 600;
        var height = Math.ceil(width / ratio);

        var diagramIdentifier = Structurizr.getSelectedDiagramIndex() + 1;
        if (currentFilter && currentFilter.key) {
            diagramIdentifier = currentFilter.key;
        } else if (currentView.key) {
            diagramIdentifier = currentView.key;
        }

        $(".diagramEmbedWidth").html("" + width);

        if ($('#diagramSelectorToggle').is(':checked')) {
            height += diagramSelectorHeight;
        }

        $(".diagramEmbedHeight").html("" + height);

        if (workspace.isOpen()) {
            $(".diagramEmbedDiagramId").html("" + encodeURIComponent(diagramIdentifier));
            $("#privateDiagramEmbed").addClass('hidden');
        } else if (workspace.isShareable()) {
            $(".diagramEmbedDiagramId").html("" + encodeURIComponent(diagramIdentifier));
            $("#publicDiagramEmbed").addClass('hidden');
        } else {
            $(".diagramEmbedDiagramId").html("" + diagramIdentifier);
            $("#publicDiagramEmbed").addClass('hidden');
        }
    }

    function getSvgOfCurrentDiagram() {
        var svgMarkup = document.getElementById("diagramCanvas").innerHTML;
        svgMarkup = svgMarkup.substr(svgMarkup.indexOf('<svg'));

        return svgMarkup;
    }

    function convertSvgToPng(cropDiagram, callback) {
        var svgMarkup = getSvgOfCurrentDiagram();

        var exportedWidth = diagramWidth;
        var exportedHeight = diagramHeight;

        if (cropDiagram === true) {
            // find content area
            var minX = diagramWidth;
            var maxX = 0;
            var minY = diagramHeight;
            var maxY = 0;

            for (var i = 0; i < graph.getElements().length; i++) {
                var cell = graph.getElements()[i];

                if (cell.elementInView !== undefined || cell === boundary) {
                    var x = cell.get('position').x;
                    var y = cell.get('position').y;
                    var width = cell.get('size').width;
                    var height = cell.get('size').height;

                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);

                    maxX = Math.max(maxX, x + width);
                    maxY = Math.max(maxY, y + height);
                }
            }

            var padding = 50;
            minX = Math.max(minX - padding, 0);
            maxX = Math.min(maxX + padding, diagramWidth);
            minY = Math.max(minY - padding, 0);
            maxY = Math.min(maxY + padding, diagramHeight);

            exportedWidth = maxX - minX;
            exportedHeight = maxY - minY;

            var viewbox = ' viewBox="' + minX + " " + minY + " " + exportedWidth + " " + exportedHeight + '"';
            var svgOpeningTag = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="v-2" width="100%" height="100%" style="width: ' + diagramWidth + 'px; height: ' + diagramHeight + 'px;"';
            var croppedSvgOpeningTag = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="v-2" width="' + exportedWidth +'" height="' + exportedHeight + '" style="width: ' + exportedWidth + 'px; height: ' + exportedHeight + 'px;"' + viewbox;

            svgMarkup = svgMarkup.replace(svgOpeningTag, croppedSvgOpeningTag);
        }

        // this hides the handles used to change vertices
        svgMarkup = svgMarkup.replace(/class="marker-vertices"/g, 'class="marker-vertices" display="none"');

        // and remove the &nbsp; added by JointJS (otherwise you get a blank PNG file)
        svgMarkup = svgMarkup.replace(/&nbsp;/g, ' ');

        var myCanvas = document.createElement("canvas");
        myCanvas.width = document.getElementById("diagramCanvas").offsetWidth;
        myCanvas.height = document.getElementById("diagramCanvas").offsetHeight;

        var canvasContext = myCanvas.getContext("2d");

        if (callback) {
            canvg(myCanvas,
                svgMarkup,
                {
                    useCORS: true,
                    renderCallback: function () {
                        canvasContext.globalCompositeOperation = "destination-over";
                        canvasContext.fillStyle = "#ffffff";
                        canvasContext.fillRect(0, 0, myCanvas.width, myCanvas.height);

                        callback(myCanvas.toDataURL("image/png"));
                    }
                });
        } else {
            canvg(myCanvas, svgMarkup);

            canvasContext.globalCompositeOperation = "destination-over";
            canvasContext.fillStyle = "#ffffff";
            canvasContext.fillRect(0, 0, myCanvas.width, myCanvas.height);

            return myCanvas.toDataURL("image/png");
        }
    }

    function convertDiagramKeyToPng() {
        var svgMarkup = document.getElementById("diagramKeySvg").innerHTML;

        var myCanvas = document.createElement("canvas");
        myCanvas.width = totalWidthOfKey;
        myCanvas.height = totalHeightOfKey;

        var canvasContext = myCanvas.getContext("2d");

        canvg(myCanvas, svgMarkup);

        canvasContext.globalCompositeOperation = "destination-over";
        canvasContext.fillStyle = "#ffffff";
        canvasContext.fillRect(0, 0, myCanvas.width, myCanvas.height);

        return myCanvas.toDataURL("image/png");
    }

    this.createThumbnailOfCurrentDiagram = function() {
        var currentScale = scale;
        this.zoomTo(0.2);

        if (diagramTitle) {
            diagramTitle.attr('text/display', 'none');
        }
        if (diagramDescription) {
            diagramDescription.attr('text/display', 'none');
        }
        if (diagramMetadata) {
            diagramMetadata.attr('text/display', 'none');
        }
        if (brandingLogo) {
            brandingLogo.remove();
        }

        $(".structurizrNavigation").attr('display', 'none');

        var exportedImage = convertSvgToPng(false);
        this.zoomTo(currentScale);

        if (diagramTitle) {
            diagramTitle.attr('text/display', 'block');
        }
        if (diagramDescription) {
            diagramDescription.attr('text/display', 'block');
        }
        if (diagramMetadata) {
            diagramMetadata.attr('text/display', 'block');
        }
        if (brandingLogo) {
            graph.addCell(brandingLogo);
        }

        $(".structurizrNavigation").attr('display', 'block');

        return exportedImage;
    };

    this.exportSvgOfCurrentDiagram = function(viewNumber) {
        var currentScale = scale;
        this.zoomTo(1.0);

        $(".structurizrNavigation").attr('display', 'none');

        var svgMarkup = getSvgOfCurrentDiagram();
        svgMarkup = svgMarkup.substring(svgMarkup.indexOf(">") +1 );
        svgMarkup = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ' + diagramWidth + ' ' + diagramHeight + '">' + svgMarkup;

        // remove cursor definitions
        svgMarkup = svgMarkup.replace(/cursor="move"/g, '');
        svgMarkup = svgMarkup.replace(/cursor: default !important/g, '');
        svgMarkup = svgMarkup.replace(/cursor: pointer !important/g, '');
        svgMarkup = svgMarkup.replace(/cursor: zoom-in !important/g, '');
        svgMarkup = svgMarkup.replace(/class="marker-vertices"/g, 'class="marker-vertices" display="none"');

        svgMarkup = svgMarkup.replace(/StructurizrClipPath/g, currentView.key + 'StructurizrClipPath' + viewNumber);

        this.zoomTo(currentScale);

        $(".structurizrNavigation").attr('display', 'block');

        return svgMarkup;
    };

    this.exportSvgOfCurrentDiagramKey = function(viewNumber) {
        var svgMarkup = document.getElementById("diagramKeySvg").innerHTML;

        var diagramKeyWidth = svgMarkup.match(/width="(\d*)"/)[1];
        var diagramKeyHeight = svgMarkup.match(/height="(\d*)"/)[1];

        svgMarkup = svgMarkup.substring(svgMarkup.indexOf(">") +1 );
        svgMarkup = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ' + diagramKeyWidth + ' ' + diagramKeyHeight + '">' + svgMarkup;

        svgMarkup = svgMarkup.replace(/StructurizrClipPath/g, currentView.key + 'StructurizrClipPath' + viewNumber);

        return svgMarkup;
    };

    this.exportDiagramToPNGAndOpenWindow = function(viewsToExport, includeDiagramMetadata, includeDiagramAnimations, cropDiagram, includeSequenceNumber, viewNumber, originalView) {
        if (viewsToExport) {
            var closeWindows = viewsToExport.length > 1;

            if (!viewNumber) {
                viewNumber = 0;
                originalView = currentView;
            }

            if (viewNumber < viewsToExport.length) {
                var viewToExport = workspace.getViewByKey(viewsToExport[viewNumber]);
                this.changeView(viewToExport, function () {
                    Structurizr.diagram.exportCurrentView((viewNumber + 1), includeDiagramMetadata, includeDiagramAnimations, cropDiagram, includeSequenceNumber, closeWindows);
                    viewNumber++;
                    Structurizr.diagram.exportDiagramToPNGAndOpenWindow(viewsToExport, includeDiagramMetadata, includeDiagramAnimations, cropDiagram, includeSequenceNumber, viewNumber, originalView);
                });

            } else {
                this.changeView(originalView);
            }
        }
    };

    var status = {};

    this.publishImagesToRepositoryFinished = function() {
        var finished = true;
        console.log(status);

        var viewsToExport = [];
        $("#viewType > option").each(function() {
            viewsToExport.push(this.value);
        });

        viewsToExport.forEach(function(key) {
            if (status[key]) {
                finished = finished && status[key];
            } else {
                finished = false;
            }
        });

        return finished;
    };

    this.getPublishImagesStatus = function() {
        return status;
    };

    this.publishImagesToRepository = function(callback, viewNumber, originalView) {
        var viewsToExport = [];
        $("#viewType > option").each(function() {
            viewsToExport.push(this.value);
        });

        if (viewsToExport) {
            if (viewNumber === undefined) {
                viewNumber = 0;
                status = {};
                viewsToExport.forEach(function(key) {
                    status[key] = false;
                });

                if (callback) {
                    callback(status);
                }

                originalView = currentView;

                setTimeout(function() {
                    Structurizr.diagram.publishImagesToRepository(callback, viewNumber, originalView);
                }, 1000);

                return;
            }

            if (viewNumber < viewsToExport.length) {
                var viewToExport = workspace.getViewByKey(viewsToExport[viewNumber]);
                this.changeView(viewToExport, function () {
                    var currentScale = scale;
                    Structurizr.diagram.zoomTo(1.0);
                    $(".structurizrNavigation").attr('display', 'none');

                    structurizrApiClient.putImage(workspace.getId(), viewToExport.key + '-key', convertDiagramKeyToPng(), function(diagramKey) {});

                    convertSvgToPng(false, function(exportedImage) {
                        $(".structurizrNavigation").attr('display', 'block');
                        Structurizr.diagram.zoomTo(currentScale);

                        structurizrApiClient.putImage(workspace.getId(), viewToExport.key, exportedImage, function(diagramKey) {
                            status[diagramKey] = true;
                            if (callback) {
                                callback(status);
                            }
                        });

                        viewNumber++;
                        Structurizr.diagram.publishImagesToRepository(callback, viewNumber, originalView);
                    });
                });

            } else {
                this.changeView(originalView);
            }
        }
    };

    this.exportCurrentDiagramToPNG = function() {
        var currentScale = scale;
        Structurizr.diagram.zoomTo(1.0);
        $(".structurizrNavigation").attr('display', 'none');

        var png = convertSvgToPng(false);

        $(".structurizrNavigation").attr('display', 'block');
        Structurizr.diagram.zoomTo(currentScale);

        return png;
    };

    this.exportCurrentDiagramKeyToPNG = function() {
        return convertDiagramKeyToPng();
    };

    this.exportCurrentView = function(sequence, includeDiagramMetadata, includeDiagramAnimations, cropDiagram, includeSequenceNumber, closeWindow) {
        var currentScale = scale;
        this.zoomTo(1.0);
        var width = document.getElementById("diagramCanvas").offsetWidth;
        var height = document.getElementById("diagramCanvas").offsetHeight;
        var viewTitle = workspace.getTitleForView(currentView);

        var baseFilename = 'structurizr-' + workspace.getId() + '-';
        if (includeSequenceNumber) {
            var paddedSequence = ("00" + sequence);
            baseFilename += paddedSequence.substr(paddedSequence.length-3);
            baseFilename += '-';
        }
        baseFilename += currentView.key;

        $(".structurizrNavigation").attr('display', 'none');
        if (!includeDiagramMetadata) {
            $(".structurizrMetadata").attr('display', 'none');
        }

        var diagramKeyAsPng = convertDiagramKeyToPng();
        var step = '';

        if (includeDiagramAnimations === true) {
            var stepNumber = 1;
            var paddedStepNumber = ("00" + stepNumber);
            step = '-' + paddedStepNumber.substr(paddedStepNumber.length-3);
            Structurizr.diagram.startAnimation(false);
            while (Structurizr.diagram.animationStarted() === true) {
                doExport(width, height, cropDiagram, baseFilename + step + '.png', diagramKeyAsPng, undefined, viewTitle, true, false);
                Structurizr.diagram.stepForwardInAnimation(false);
                stepNumber++;
                paddedStepNumber = ("00" + stepNumber);
                step = '-' + paddedStepNumber.substr(paddedStepNumber.length-3);
            }
        }

        doExport(width, height, cropDiagram, baseFilename + step + '.png', diagramKeyAsPng, baseFilename + '-key.png', viewTitle, closeWindow, true);

        this.zoomTo(currentScale);
    };

    function doExport(width, height, cropDiagram, diagramFilename, diagramKeyAsPng, keyFilename, viewTitle, closeWindow, resetNavigationAndMetadata) {
        convertSvgToPng(cropDiagram, function(exportedImage) {
            if (resetNavigationAndMetadata === true) {
                $(".structurizrNavigation").attr('display', 'block');
                $(".structurizrMetadata").attr('display', 'block');
            }

            var exportWindow;
            var renderImages = function() {
                var title = exportWindow.document.getElementById("exportedTitle");
                var exportDiagramNarrativeElement = exportWindow.document.getElementById("exportNarrative");
                var exportedImageElement = exportWindow.document.getElementById("exportedContent");

                if (title === null) {
                    setTimeout(renderImages, 100);
                } else {
                    var img = exportWindow.document.createElement('img');
                    img.width = width;
                    img.height = height;
                    img.src = exportedImage;
                    img.className = "img-thumbnail";

                    var link = exportWindow.document.createElement("a");
                    // Commented out by Avi Flax <avi.flax@fundingcircle.com>
                    // link.download = diagramFilename;
                    link.href = exportedImage;

                    title.innerHTML = viewTitle;
                    exportDiagramNarrativeElement.innerHTML = 'Here is your diagram, exported as a PNG file.';

                    exportedImageElement.appendChild(img);
                    exportDiagramNarrativeElement.appendChild(link);
                    link.click();

                    if (keyFilename !== undefined) {
                        var imgKey = exportWindow.document.createElement('img');
                        imgKey.src = diagramKeyAsPng;
                        imgKey.className = "img-thumbnail";

                        var linkKey = exportWindow.document.createElement("a");
                        // Commented out by Avi Flax <avi.flax@fundingcircle.com>
                        // linkKey.download = keyFilename;
                        linkKey.href = diagramKeyAsPng;

                        exportedImageElement.appendChild(imgKey);
                        exportDiagramNarrativeElement.appendChild(linkKey);
                        linkKey.click();
                    }

                    if (closeWindow) {
                        setTimeout(function() {
                            exportWindow.close();
                        }, 3000);
                    }
                }
            };

            exportWindow = window.open('Structurizr Export.html');
            renderImages();
        });
    }

    this.currentViewIsDynamic = function() {
        return currentView.type === "Dynamic";
    };

    this.currentViewHasAnimation = function() {
        return currentView.animations !== undefined && currentView.animations.length > 0 && animationsEnabled === true;
    };

    var animationStarted = false;

    this.animationStarted = function() {
        return animationStarted;
    };

    this.startAnimation = function(autoPlay) {
        if (this.currentViewIsDynamic()) {
            animationStarted = true;
            linesToAnimate = graph.getLinks();
            linesToAnimate.sort(function (a, b) {
                return a.relationshipInView.order - b.relationshipInView.order;
            });
            animationIndex = 0;

            $('.stepBackwardAnimationButton').prop("disabled", false);
            $('.startAnimationButton').prop("disabled", true);
            $('.stopAnimationButton').prop("disabled", false);

            this.continueAnimation(autoPlay);
        } else if (this.currentViewHasAnimation()) {
            animationStarted = true;
            animationSteps = currentView.animations;
            animationSteps.sort(function (a, b) {
                return a.order - b.order;
            });
            animationIndex = 0;

            $('.stepBackwardAnimationButton').prop("disabled", false);
            $('.startAnimationButton').prop("disabled", true);
            $('.stopAnimationButton').prop("disabled", false);

            this.continueAnimation(autoPlay);
        }
    };

    this.stepBackwardInAnimation = function() {
        if (this.currentViewIsDynamic()) {
            if (this.animationStarted()) {

                if (animationIndex > 0) {
                    animationIndex--;

                    // go back and find the previous order ID
                    var order = linesToAnimate[animationIndex].relationshipInView.order;
                    while (animationIndex >= 0 && linesToAnimate[animationIndex].relationshipInView.order === order) {
                        animationIndex--;
                    }

                    if (animationIndex > 0) {
                        order = linesToAnimate[animationIndex].relationshipInView.order;
                        while (animationIndex >= 0 && linesToAnimate[animationIndex].relationshipInView.order === order) {
                            animationIndex--;
                        }
                        animationIndex++;
                    }
                }

                if (animationIndex >= 0) {
                    this.continueAnimation(false);
                } else {
                    this.stopAnimation();
                }
            }
        } else if (this.currentViewHasAnimation()) {
            if (this.animationStarted()) {
                if (animationIndex === 1) {
                    this.stopAnimation();
                } else if (animationIndex > 1) {
                    animationIndex--;

                    var animationStep = animationSteps[animationIndex];
                    if (animationStep) {
                        if (animationStep.elements) {
                            animationStep.elements.forEach(function (elementId) {
                                hideElement(elementId);
                            });
                        }
                        if (animationStep.relationships) {
                            animationStep.relationships.forEach(function(relationshipId) {
                                hideLine(relationshipId);
                            });
                        }
                    }

                    animationIndex--;
                    this.continueAnimation(false);
                }
            }
        }
    };

    this.stepForwardInAnimation = function() {
        if (!this.animationStarted()) {
            this.startAnimation(false);
        } else {
            this.continueAnimation(false);
        }
    };

    function hideAllLines() {
        $('.connection-wrap').attr('class', 'connection-wrap');
        $('.connection').css('opacity', '0');
        $('.marker-target').css('opacity', '0');
        $('.label').css('opacity', '0');
    }

    function hideAllElements() {
        $('.structurizrElement').css('opacity', '0');
    }

    this.continueAnimation = function(autoPlay) {
        if (this.currentViewIsDynamic()) {
            if (linesToAnimate) {
                hideAllLines();
                hideAllElements();

                if (animationIndex < linesToAnimate.length) {
                    var line = linesToAnimate[animationIndex];

                    highlightLinesWithOrder(line.relationshipInView.order);

                    if (autoPlay) {
                        setTimeout(function () {
                            Structurizr.diagram.continueAnimation(true);
                        }, animationDelay);
                    }
                } else {
                    this.stopAnimation();
                }
            }
        } else if (this.currentViewHasAnimation()) {
            if (animationIndex === 0) {
                hideAllLines();
                hideAllElements();
            }

            var animationStep = animationSteps[animationIndex];
            if (animationStep) {
                if (animationStep.elements) {
                    animationStep.elements.forEach(function (elementId) {
                        showElement(elementId);
                    });
                }
                if (animationStep.relationships) {
                    animationStep.relationships.forEach(function(relationshipId) {
                        showLine(relationshipId);
                    });
                }
            }

            if (animationIndex < (animationSteps.length - 1)) {
                animationIndex++;

                if (autoPlay) {
                    setTimeout(function () {
                        Structurizr.diagram.continueAnimation(true);
                    }, animationDelay);
                }
            } else {
                this.stopAnimation();
            }
        }
    };

    function showLine(relationshipId) {
        var line = mapOfIdToLine[relationshipId];
        if (line) {
            var lineView = paper.findViewByModel(line);
            if (lineView) {
                var connectionWrap = $('#' + lineView.el.id + ' .connection-wrap');
                connectionWrap.attr('class', 'connection-wrap highlightedLink');
                $('#' + lineView.el.id + ' .connection').css('opacity', '1.0');
                $('#' + lineView.el.id + ' .marker-target').css('opacity', '1.0');
                $('#' + lineView.el.id + ' .label').css('opacity', '1.0');
            }
        }
    }

    function hideLine(relationshipId) {
        var line = mapOfIdToLine[relationshipId];
        if (line) {
            var lineView = paper.findViewByModel(line);
            if (lineView) {
                var connectionWrap = $('#' + lineView.el.id + ' .connection-wrap');
                connectionWrap.attr('class', 'connection-wrap highlightedLink');
                $('#' + lineView.el.id + ' .connection').css('opacity', '0');
                $('#' + lineView.el.id + ' .marker-target').css('opacity', '0');
                $('#' + lineView.el.id + ' .label').css('opacity', '0');
            }
        }
    }

    function showElement(elementId) {
        var element = mapOfIdToBox[elementId];
        if (element) {
            var elementView = paper.findViewByModel(element);
            $('#' + elementView.el.id + ' .structurizrElement').css('opacity', '1.0');
        }
    }

    function hideElement(elementId) {
        var element = mapOfIdToBox[elementId];
        if (element) {
            var elementView = paper.findViewByModel(element);
            $('#' + elementView.el.id + ' .structurizrElement').css('opacity', '0');
        }
    }

    this.stopAnimation = function() {
        animationStarted = false;

        $('.stepBackwardAnimationButton').prop("disabled", true);
        $('.startAnimationButton').prop("disabled", false);
        $('.stopAnimationButton').attr("disabled", true);

        $('.connection-wrap').attr('class', 'connection-wrap');
        $('.connection').css('opacity', '1.0');
        $('.marker-target').css('opacity', '1.0');
        $('.label').css('opacity', '1.0');

        $('.structurizrElement').css('opacity', '1.0');

        if (this.currentViewIsDynamic()) {
            linesToAnimate = undefined;
        } else if (this.currentViewHasAnimation()) {
            animationSteps = undefined;
        }
    };

    function highlightLinesWithOrder(order) {
        var line = linesToAnimate[animationIndex];
        while (animationIndex < linesToAnimate.length && line.relationshipInView.order === order) {
            showLine(line.relationshipInView.id);

            var relationship = Structurizr.workspace.findRelationship(line.relationshipInView.id);

            showElement(relationship.sourceId);
            showElement(relationship.destinationId);

            animationIndex++;
            line = linesToAnimate[animationIndex];
        }
    }

    this.hasElementsSelected = function() {
        return selectedElements.length > 0;
    };

    this.hasLinkHighlighted = function() {
        return highlightedLink !== undefined;
    };

    this.moveLabelOfHighlightedLink = function(delta) {
        var labels = highlightedLink.model.get('labels');
        if (labels) {
            if (labels[0]) {
                var currentDistance = labels[0].position.distance;
                var newDistance = Math.min(1, Math.max(0, currentDistance + delta));

                for (i = 0; i < labels.length; i++) {
                    var position = labels[i].position;
                    highlightedLink.model.label(i, {
                        position: {
                            distance: newDistance,
                            offset: {
                                x: position.offset.x,
                                y: position.offset.y
                            }
                        }
                    });
                }

                highlightedLink.model.relationshipInView.position = Math.round(newDistance * 100);
                Structurizr.workspace.setUnsavedChanges(true);
            }
        }
    };

    this.toggleRoutingOfHighlightedLink = function() {
        var router = highlightedLink.model.get('router');

        highlightedLink.model.set('vertices', []);

        if (router === undefined) {
            highlightedLink.model.set('router', {name: 'orthogonal'});
            highlightedLink.model.relationshipInView.routing = 'Orthogonal';
        } else {
            highlightedLink.model.unset('router');
            highlightedLink.model.relationshipInView.routing = 'Direct';
        }

        Structurizr.workspace.setUnsavedChanges(true);
    };

    this.moveSelectedElementsLeft = function() {
        addToUndoBuffer(getCurrentElementPositions(selectedElements).concat(getCurrentLinkPositions(getLinksBetweenSelectedElements())));
        selectedElements.forEach(function(cellView) {
            moveElement(cellView.model, -gridSize, 0);
        });
        moveLinksBetweenSelectedElements(-gridSize, 0);
    };

    this.moveSelectedElementsRight = function() {
        addToUndoBuffer(getCurrentElementPositions(selectedElements).concat(getCurrentLinkPositions(getLinksBetweenSelectedElements())));
        selectedElements.forEach(function(cellView) {
            moveElement(cellView.model, gridSize, 0);
        });
        moveLinksBetweenSelectedElements(gridSize, 0);
    };

    this.moveSelectedElementsUp = function() {
        addToUndoBuffer(getCurrentElementPositions(selectedElements).concat(getCurrentLinkPositions(getLinksBetweenSelectedElements())));
        selectedElements.forEach(function(cellView) {
            moveElement(cellView.model, 0, -gridSize);
        });
        moveLinksBetweenSelectedElements(0, -gridSize);
    };

    this.moveSelectedElementsDown = function() {
        addToUndoBuffer(getCurrentElementPositions(selectedElements).concat(getCurrentLinkPositions(getLinksBetweenSelectedElements())));
        selectedElements.forEach(function(cellView) {
            moveElement(cellView.model, 0, gridSize);
        });
        moveLinksBetweenSelectedElements(0, gridSize);
    };

    function moveElement(element, dx, dy) {
        var x = element.get('position').x;
        var y = element.get('position').y;

        positionElement(element, x+dx, y+dy);
    }

    function positionElement(element, x, y) {
        element.set(
            {
                position: {
                    x: Math.floor(x),
                    y: Math.floor(y)
                }
            }
        );
    }

    this.alignSelectedElementsLeft = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            var firstSelectedElement = selectedElements[0].model;
            var left = firstSelectedElement.get('position').x;

            selectedElements.forEach(function(cellView) {
                var y = cellView.model.get('position').y;

                positionElement(cellView.model, left, y);
            });
        }
    };

    this.alignSelectedElementsRight = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            var firstSelectedElement = selectedElements[0].model;
            var right = firstSelectedElement.get('position').x + firstSelectedElement.get('size').width;

            selectedElements.forEach(function(cellView) {
                var y = cellView.model.get('position').y;
                var width = cellView.model.get('size').width;

                positionElement(cellView.model, right - width, y);
            });
        }
    };

    this.alignSelectedElementsVerticalCentre = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            var firstSelectedElement = selectedElements[0].model;
            var centre = firstSelectedElement.get('position').x + (firstSelectedElement.get('size').width / 2);

            selectedElements.forEach(function(cellView) {
                var y = cellView.model.get('position').y;
                var width = cellView.model.get('size').width;

                positionElement(cellView.model, centre - (width/2), y);
            });
        }
    };

    this.alignSelectedElementsTop = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            var firstSelectedElement = selectedElements[0].model;
            var top = firstSelectedElement.get('position').y;

            selectedElements.forEach(function(cellView) {
                var x = cellView.model.get('position').x;

                positionElement(cellView.model, x, top);
            });
        }
    };

    this.alignSelectedElementsBottom = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            var firstSelectedElement = selectedElements[0].model;
            var bottom = firstSelectedElement.get('position').y + firstSelectedElement.get('size').height;

            selectedElements.forEach(function(cellView) {
                var x = cellView.model.get('position').x;
                var height = cellView.model.get('size').height;

                positionElement(cellView.model, x, bottom - height );
            });
        }
    };

    this.alignSelectedElementsHorizontalCentre = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            var firstSelectedElement = selectedElements[0].model;
            var centre = firstSelectedElement.get('position').y + (firstSelectedElement.get('size').height/2);

            selectedElements.forEach(function(cellView) {
                var x = cellView.model.get('position').x;
                var height = cellView.model.get('size').height;

                positionElement(cellView.model, x, centre - (height/2) );
            });
        }
    };

    this.distributeSelectedElementsHorizontally = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            // order the elements from left to right
            selectedElements.sort(function(a,b) {
                var aX = a.model.get('position').x;
                var bX = b.model.get('position').x;

                return aX - bX;
            });

            var firstSelectedElement = selectedElements[0];
            var lastSelectedElement = selectedElements[selectedElements.length-1];

            var totalWidth = (lastSelectedElement.model.get('position').x + lastSelectedElement.model.get('size').width) - firstSelectedElement.model.get('position').x;
            var totalWidthOfElements = 0;
            selectedElements.forEach(function(cellView) {
                totalWidthOfElements += cellView.model.get('size').width;
            });
            var spacingBetweenElements = Math.floor((totalWidth - totalWidthOfElements) / (selectedElements.length-1));

            var x = firstSelectedElement.model.get('position').x;
            for (var i = 1; i < selectedElements.length-1; i++) {
                var currentCellView = selectedElements[i];
                var previousCellView = selectedElements[i-1];

                x += previousCellView.model.get('size').width + spacingBetweenElements;
                var y = currentCellView.model.get('position').y;

                positionElement(currentCellView.model, x, y)
            }
        }
    };

    this.distributeSelectedElementsVertically = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements));

            // order the elements from top to bottom
            selectedElements.sort(function(a,b) {
                var aY = a.model.get('position').y;
                var bY = b.model.get('position').y;

                return aY - bY;
            });

            var firstSelectedElement = selectedElements[0];
            var lastSelectedElement = selectedElements[selectedElements.length-1];

            var totalHeight = (lastSelectedElement.model.get('position').y + lastSelectedElement.model.get('size').height) - firstSelectedElement.model.get('position').y;
            var totalHeightOfElements = 0;
            selectedElements.forEach(function(cellView) {
                totalHeightOfElements += cellView.model.get('size').height;
            });
            var spacingBetweenElements = Math.floor((totalHeight - totalHeightOfElements) / (selectedElements.length-1));

            var y = firstSelectedElement.model.get('position').y;
            for (var i = 1; i < selectedElements.length-1; i++) {
                var currentCellView = selectedElements[i];
                var previousCellView = selectedElements[i-1];

                var x = currentCellView.model.get('position').x;
                y += previousCellView.model.get('size').height + spacingBetweenElements;

                positionElement(currentCellView.model, x, y)
            }
        }
    };

    this.centreSelectedElements = function() {
        if (this.hasElementsSelected()) {
            addToUndoBuffer(getCurrentElementPositions(selectedElements).concat(getCurrentLinkPositions(getLinksBetweenSelectedElements())));

            return this.centreElements(selectedElements);
        }
    };

    this.centreElements = function(elements) {
        var minX = diagramWidth, minY = diagramHeight;
        var maxX = 0, maxY = 0;
        elements.forEach(function(cellView) {
            var x = cellView.model.get('position').x;
            var y = cellView.model.get('position').y;
            var width = cellView.model.get('size').width;
            var height = cellView.model.get('size').height;

            minX = Math.min(x, minX);
            maxX = Math.max(x+width, maxX);

            minY = Math.min(y, minY);
            maxY = Math.max(y+height, maxY);
        });

        var dx = Math.floor(((diagramWidth - maxX) - minX)/2);
        var dy = Math.floor(((getDiagramTitleVerticalOffset() - maxY) - minY)/2);

        elements.forEach(function(cellView) {
            moveElement(cellView.model, dx, dy);
        });
        moveLinksBetweenElements(elements, dx, dy);
    };

    function addEventHandlers() {
        graph.on('change:position', function(cell, newPosition, opt) {
            if (opt.skipParentHandler) return;

            var parentId = cell.get('parent');
            while (parentId) {
                var parentCell = graph.getCell(parentId);
                reposition(parentCell);
                parentId = parentCell.get('parent');
            }
        });

        graph.on('change:position', function(cell, newPosition, opt) {
            if (cell.elementInView && cell.positionCalculated === false) {
                Structurizr.workspace.setUnsavedChanges(true);

                if (opt.translateBy && (!boundary || opt.translateBy !== boundary.id)) {
                    var cellViewMoved = paper.findViewByModel(cell);
                    if (cellViewMoved.selected !== 'undefined' && cellViewMoved.selected === true) {
                        var dx = newPosition.x - cell.elementInView.x;
                        var dy = newPosition.y - cell.elementInView.y;

                        selectedElements.forEach(function(cellView) {
                            if (cellView !== cellViewMoved) {
                                moveElement(cellView.model, dx, dy);
                            }
                        });

                        moveLinksBetweenSelectedElements(dx, dy);
                    }
                }

                cell.elementInView.x = newPosition.x;
                cell.elementInView.y = newPosition.y;
            }
        });
    }

    function repositionLasso() {
        if (lassoStart !== undefined && lassoEnd !== undefined) {
            lasso.css({
                left: Math.min(lassoStart.clientX, lassoEnd.clientX),
                top: Math.min(lassoStart.clientY, lassoEnd.clientY),
                width: Math.abs(lassoStart.clientX - lassoEnd.clientX),
                height: Math.abs(lassoStart.clientY - lassoEnd.clientY)
            });
        }
    }

    function lassoElements(append) {
        if (append === false) {
            Structurizr.diagram.deselectAllElements();
        }

        var lassoBoundingBox = {
            left: Math.min(lassoStart.x, lassoEnd.x),
            top: Math.min(lassoStart.y, lassoEnd.y),
            right: Math.max(lassoStart.x, lassoEnd.x),
            bottom: Math.max(lassoStart.y, lassoEnd.y)
        };

        graph.getElements().forEach(function(cell) {
            if (cell.elementInView && cell.positionCalculated === false) {
                var elementBoundingBox = cell.getBBox();
                elementBoundingBox.left = elementBoundingBox.x;
                elementBoundingBox.top = elementBoundingBox.y;
                elementBoundingBox.right = elementBoundingBox.left + elementBoundingBox.width;
                elementBoundingBox.bottom = elementBoundingBox.top + elementBoundingBox.height;

                if (
                    elementBoundingBox.right < lassoBoundingBox.left ||
                    lassoBoundingBox.right < elementBoundingBox.left ||
                    elementBoundingBox.bottom < lassoBoundingBox.top ||
                    lassoBoundingBox.bottom < elementBoundingBox.top) {
                    // do nothing
                } else {
                    selectElement(paper.findViewByModel(cell));
                }
            }
        });

        lassoStart = undefined;
        lassoEnd = undefined;
    }

    function moveLinksBetweenSelectedElements(dx, dy) {
        return moveLinksBetweenElements(selectedElements, dx, dy);
    }

    function moveLinksBetweenElements(elements, dx, dy) {
        if (dx === 0 && dy === 0) {
            return;
        }

        // find all of the links between selected elements that have vertices defined
        var linksBetweenElements = getLinksBetweenElements(elements);
        linksBetweenElements.forEach(function(link) {
            var oldVertices = link.get('vertices');
            if (oldVertices) {
                var newVertices = [];

                oldVertices.forEach(function(oldVertex) {
                    var newVertex = { x: oldVertex.x + dx, y: oldVertex.y + dy };
                    newVertices.push(newVertex);
                });

                link.set('vertices', newVertices);
            }
        })
    }

    function getLinksBetweenSelectedElements() {
        return getLinksBetweenElements(selectedElements);
    }

    function getLinksBetweenElements(elements) {
        var linksBetweenElements = [];

        var links = graph.getLinks();
        if (links) {
            links.forEach(function(link) {
                var sourceCellView = paper.findViewByModel(graph.getCell(link.get('source')));
                var targetCellView = paper.findViewByModel(graph.getCell(link.get('target')));

                if (elements.indexOf(sourceCellView) > -1 && elements.indexOf(targetCellView) > -1) {
                    linksBetweenElements.push(link);
                }
            })
        }

        return linksBetweenElements;
    }

    function getScrollBarWidth() {
        return 0;
    }

    paper.on('cell:mouseover', function(cell, evt) {
        if (cell.model.relationshipInView) {
            highlightedLink = cell;
        }

        if (tooltipEnabled) {
            if (cell.model.elementInView) {
                showTooltipForElement(workspace.findElement(cell.model.elementInView.id), cell.model._computedStyle, evt.clientX, evt.clientY);
            } else if (cell.model.relationshipInView) {
                showTooltipForRelationship(cell.model.relationshipInView, workspace.findRelationship(cell.model.relationshipInView.id), cell.model._computedStyle, evt.clientX, evt.clientY);
            } else if (cell.model === boundary) {
                showTooltipForElement(boundaryElement, cell.model._computedStyle, evt.clientX, evt.clientY);
            }
        }
    });

    paper.on('cell:mouseout', function(cell, evt) {
        hideTooltip();
        highlightedLink = undefined;
    });

    paper.on('cell:pointerdown', function(cell, evt, x, y) {
        if (!cell.getConnectionLength) {
            // an element has been clicked
            if (Structurizr.diagram.hasElementsSelected()) {
                if (selectedElements.indexOf(cell) === -1) {
                    // an unselected element has been clicked
                    previousPositions = getCurrentElementPositions([cell]);
                } else {
                    previousPositions = getCurrentElementPositions(selectedElements).concat(getCurrentLinkPositions(getLinksBetweenSelectedElements()));
                }
            } else {
                // a single element has been clicked
                previousPositions = getCurrentElementPositions([cell]);
            }
        } else {
            // a link has been clicked
            previousPositions = getCurrentLinkPositions([cell.model]);
        }
    });

    paper.on('cell:pointerup', function(cell, evt, x, y) {
        if (previousPositions) {
            if (!cell.getConnectionLength) {
                previousPositions.forEach(function (previousPosition) {
                    if (previousPosition.element === cell.model) {
                        if (
                            (previousPosition.x !== cell.model.get('position').x) &&
                            (previousPosition.y !== cell.model.get('position').y)) {
                            addToUndoBuffer(previousPositions);
                        }
                    }
                });
            } else {
                addToUndoBuffer(previousPositions);
            }
        }
    });

    paper.on('blank:pointerdown', function(evt, x, y) {
        if (Structurizr.diagram.isEditable()) {
            lassoStart = {
                x: x,
                y: y,
                clientX: evt.clientX,
                clientY: evt.clientY
            };

            lassoEnd = {
                x: x,
                y: y,
                clientX: evt.clientX,
                clientY: evt.clientY
            };

            repositionLasso();
            lasso.removeClass('hidden');

            $("#diagramCanvas").mousemove(lassoMouseMove);
            lasso.mousemove(lassoMouseMove);
        }
    });

    paper.on('blank:pointerup', function(evt, x, y) {
        if (Structurizr.diagram.isEditable()) {
            lasso.addClass('hidden');
            lassoEnd = {
                x: x,
                y: y
            };

            if (lassoStart === undefined || (lassoStart.x === lassoEnd.x && lassoStart.y === lassoEnd.y)) {
                lassoStart = undefined;
                lassoEnd = undefined;

                Structurizr.diagram.deselectAllElements();
            } else {
                $('#diagramCanvas').unbind('mousemove', lassoMouseMove);
                lasso.unbind('mousemove', lassoMouseMove);
                lassoElements(evt.shiftKey || evt.altKey);
            }
        }
    });

    paper.on('cell:pointerdblclick', function(cellView, evt, x, y) {
        if (cellView.zoomFromDoubleClick) {
            if (evt.altKey === true && cellView.openUrlFromDoubleClick) {
                cellView.openUrlFromDoubleClick();
            } else {
                cellView.zoomFromDoubleClick();
            }
        } else if (cellView.openUrlFromDoubleClick) {
            cellView.openUrlFromDoubleClick();
        }
    });

    paper.on('cell:pointerclick', function(cellView, evt, x, y) {
        if (Structurizr.diagram.isEditable()) {
            if (cellView.model.elementInView && cellView.model.positionCalculated === false) {
                var cellViewIsSelected = cellView.selected;
                var multipleCellsAreSelected = selectedElements.length > 1;

                if (!evt.shiftKey && !evt.altKey) {
                    Structurizr.diagram.deselectAllElements();

                    if (multipleCellsAreSelected) {
                        cellView.selected = true;
                    }
                }

                if (cellViewIsSelected == 'undefined') {
                    cellView.selected = true;
                } else {
                    cellView.selected = !cellViewIsSelected;
                }

                if (cellView.selected) {
                    selectElement(cellView);
                } else {
                    deselectElement(cellView);
                }
            } else {
                Structurizr.diagram.deselectAllElements();
            }
        }
    });

    this.setKeyboardShortcutsEnabled = function(bool) {
        keyboardShortcutsEnabled = bool;
    };

    this.areKeyboardShortcutsEnabled = function() {
        return keyboardShortcutsEnabled;
    };

    function getCurrentElementPositions(elementViews) {
        var previousPositions = [];
        elementViews.forEach(function(elementView) {
            var allElements = elementView.model.getEmbeddedCells({ deep: true });
            allElements.push(elementView.model);

            allElements.forEach(function(element) {
                previousPositions.push({
                    type: 'element',
                    element: element,
                    x: element.get('position').x,
                    y: element.get('position').y
                });
            });
        });

        return previousPositions;
    }

    function getCurrentLinkPositions(links) {
        var previousPositions = [];
        links.forEach(function(link) {
            previousPositions.push({
                type: 'link',
                link: link,
                vertices: link.get('vertices')
            });
        });

        return previousPositions;
    }

    function addToUndoBuffer(previousPositions) {
        undoStack.push(previousPositions);
        toggleUndoButton();
    }

    this.undo = function() {
        if (!undoStack.isEmpty()) {
            var previousPositions = undoStack.pop();
            previousPositions.forEach(function(position) {
                if (position.type === 'element') {
                    positionElement(position.element, position.x, position.y);
                } else {
                    position.link.set('vertices' , position.vertices);
                }
            });
            toggleUndoButton();
        }
    };

    this.removeAllVertices = function() {
        graph.getLinks().forEach(function (link) {
            link.set('vertices', []);
        });
    };

    this.layout = function(resizePaper) {
        try {
            var layoutAlgorithm = layoutAlgorithms[currentLayoutAlgorithmIndex];
            currentLayoutAlgorithmIndex++;
            if (currentLayoutAlgorithmIndex === layoutAlgorithms.length) {
                currentLayoutAlgorithmIndex = 0;
            }

            var setLinkVertices = ((currentLayoutAlgorithmIndex % 2) === 0);

            var padding = 20;
            var cellViews = [];
            cells.forEach(function (cell) {
                var element = paper.findViewByModel(cell);
                if (element.model.positionCalculated === false) {
                    cellViews.push(element);
                }
            });
            addToUndoBuffer(getCurrentElementPositions(cellViews).concat(getCurrentLinkPositions(graph.getLinks())));

            this.removeAllVertices();

            var rankSeparation = 250;
            if (layoutAlgorithm === 'LR' || layoutAlgorithm === 'RL') {
                rankSeparation = 500;
            }

            var dimensions = joint.layout.DirectedGraph.layout(graph, {
                nodeSep: 100,
                rankSep: rankSeparation,
                edgeSep: 200,
                setLinkVertices: setLinkVertices,
                rankDir: layoutAlgorithm,
                marginX: 100,
                marginY: 200
            });

            if (resizePaper === true) {
                var paperSizes = new Structurizr.PaperSizes();
                var paperSize = paperSizes.getPaperSizeToFit(dimensions.width, dimensions.height);
                this.changePaperSize(paperSize);
                this.zoomFitHeight();
            } else {
                repositionDiagramMetadata();
            }

            this.centreElements(cellViews);
            Structurizr.workspace.setUnsavedChanges(true);
        } catch (err) {
            console.error('There was an error applying the automatic layout: ' + err);
        }
    };

    function toggleUndoButton() {
        $('#undoButton').prop('disabled', undoStack.isEmpty());
    }

    function showTooltipForElement(element, computedStyle, x, y) {
        var description = '';
        if (element.description) {
            description += '<p>';
            description += element.description;
            description += '</p>';
        }

        description += '<hr' + ' style="border-color:' + computedStyle.borderColor +'" />';

        if (element.parentId) {
            var parentElement = workspace.findElement(element.parentId);

            description += '<div class="smaller">';
            description += '<p>Parent:</p>';
            description += '<ul><li>';
            description += parentElement.name + ' [' + getHumanReadableElementType(parentElement) +']';
            description += '</li></ul>';
        }

        if (element.properties && Object.keys(element.properties).length > 0) {
            description += '<div class="smaller">';
            description += '<p>Properties:</p>';
            description += '<ul>';
            Object.keys(element.properties).forEach(function(key) {
                description += '<li>';
                description += (key + ' = ' + element.properties[key]);
                description += '</li>';
            });
            description += '</ul>';
            description += '</div>'
        }

        if (element.code) {
            description += '<div class="smaller">';
            description += '<p>Code:</p>';
            description += '<ul>';
            element.code.forEach(function(code) {
                description += '<li>';
                if (code.role === "Primary") {
                    description += '<b>' + code.name + '</b>';
                } else {
                    description += code.name;
                }
                description += '</li>';
            });
            description += '</ul>';
            description += '</div>'
        }

        if (element.tags) {
            var tags = element.tags.split(",");

            description += '<div class="smaller">';
            description += '<p>Tags:</p>';
            description += '<ul>';
            tags.forEach(function(tag) {
                description += '<li>';
                description += tag.trim();
                description += '</li>';
            });
            description += '</ul>';
            description += '</div>';
        }

        tooltip.css("background", computedStyle.background);
        tooltip.css("border-color", computedStyle.borderColor);
        tooltip.css("color", computedStyle.foreground);
        if (computedStyle.borderStyle === 'Dashed') {
            tooltip.css('border-style', 'dashed');
        } else {
            tooltip.css('border-style', 'solid');
        }

        tooltipName.text(element.name + (element.instances && element.instances > 1 ? ' (x' + element.instances + ')' : ''));
        tooltipMetadata.text(calculateMetaData(element));
        tooltipDescription.html(description);

        tooltip.removeClass("hidden");
        repositionTooltip(x, y);
    }

    function showTooltipForRelationship(relationshipInView, relationship, computedStyle, x, y) {
        var relationshipDescription = relationshipInView.description;
        if (relationshipDescription === undefined) {
            relationshipDescription = relationship.description;
        }
        if (relationshipDescription === undefined || relationshipDescription.length === 0) {
            relationshipDescription = '→';
        }

        var description = '';
        description += '<p>';
        description += '[';
        description += workspace.findElement(relationship.sourceId).name;
        description += '] <b>';
        description += relationshipDescription;
        description += '</b> [';
        description += workspace.findElement(relationship.destinationId).name;
        description += ']';
        description += '</p>';

        description += '<hr' + ' style="border-color:' + computedStyle.color +'" />';

        if (relationship.properties) {
            description += '<div class="smaller">';
            description += '<p>Properties:</p>';
            description += '<ul>';
            Object.keys(relationship.properties).forEach(function(key) {
                description += '<li>';
                description += (key + ' = ' + relationship.properties[key]);
                description += '</li>';
            });
            description += '</ul>';
            description += '</div>';
        }

        if (relationship.tags) {
            var tags = relationship.tags.split(",");

            description += '<div class="smaller">';
            description += '<p>Tags:</p>';
            description += '<ul>';
            tags.forEach(function(tag) {
                description += '<li>';
                description += tag.trim();
                description += '</li>';
            });
            description += '</ul>';
            description += '</div>';
        }

        tooltip.css("background", '#ffffff');
        tooltip.css("border-color", computedStyle.color);
        tooltip.css("color", computedStyle.color);
        if (computedStyle.lineStyle === 'Dashed') {
            tooltip.css('border-style', 'dashed');
        } else {
            tooltip.css('border-style', 'solid');
        }

        tooltipName.text((relationshipInView.order ? relationshipInView.order + ': ' : '') + relationshipDescription);
        tooltipMetadata.text('[Relationship' + (relationship.technology ? ': ' + relationship.technology : '') + ']');
        tooltipDescription.html(description);

        tooltip.removeClass("hidden");
        repositionTooltip(x, y);
    }

    function repositionTooltip(x, y) {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        var tooltipWidth = tooltip.outerWidth(true);
        var tooltipHeight = tooltip.outerHeight(true);

        if ((x + tooltipWidth) < windowWidth) {
            // do nothing
        } else {
            x = x - tooltipWidth;
        }

        if ((y + tooltipHeight) < windowHeight) {
            // do nothing
        } else {
            y = y - tooltipHeight;
        }

        tooltip.css({left: Math.max(0, x), top: Math.max(0, y)});
    }

    function hideTooltip() {
        tooltip.addClass("hidden");
    }

    this.toggleTooltip = function() {
        tooltipEnabled = !tooltipEnabled;

        if (!tooltipEnabled) {
            $('#toggleDiagramTooltipButton').css('background', '');
            hideTooltip();
        } else {
            $('#toggleDiagramTooltipButton').css('background', '#bbbbbb');
        }
    };

    var gridVisible = false;
    this.toggleGrid = function() {
        gridVisible = !gridVisible;
        if (gridVisible) {
            paper.drawGrid();
        } else {
            paper.clearGrid();
        }
    };

    function applyRationalRoseTheme() {
        var fill = '#feffc1';
        var stroke = '#860027';

        // box
        $('#diagramCanvas .structurizrBox').css('fill', fill);
        $('#diagramCanvas .structurizrBox').css('stroke', stroke);

        // ellipse
        $('#diagramCanvas .structurizrEllipse').css('fill', fill);
        $('#diagramCanvas .structurizrEllipse').css('stroke', stroke);

        // hexagon
        $('#diagramCanvas .structurizrHexagon').css('fill', fill);
        $('#diagramCanvas .structurizrHexagon').css('stroke', stroke);

        // folder
        $('#diagramCanvas .structurizrFolder').css('fill', fill);
        $('#diagramCanvas .structurizrFolder').css('stroke', stroke);
        $('#diagramCanvas .structurizrFolderTab').css('fill', fill);
        $('#diagramCanvas .structurizrFolderTab').css('stroke', stroke);

        // cylinder
        $('#diagramCanvas .structurizrCylinderTop').css('fill', fill);
        $('#diagramCanvas .structurizrCylinderTop').css('stroke', stroke);
        $('#diagramCanvas .structurizrCylinderFaceFull').css('fill', fill);
        $('#diagramCanvas .structurizrCylinderFaceFull').css('stroke', stroke);
        $('#diagramCanvas .structurizrCylinderBottom').css('fill', fill);
        $('#diagramCanvas .structurizrCylinderBottom').css('stroke', stroke);

        // pipe
        $('#diagramCanvas .structurizrPipeLeft').css('fill', fill);
        $('#diagramCanvas .structurizrPipeLeft').css('stroke', stroke);
        $('#diagramCanvas .structurizrPipeFaceFull').css('fill', fill);
        $('#diagramCanvas .structurizrPipeFaceFull').css('stroke', stroke);
        $('#diagramCanvas .structurizrPipeRight').css('fill', fill);
        $('#diagramCanvas .structurizrPipeRight').css('stroke', stroke);

        // web browser
        $('#diagramCanvas .structurizrWebBrowser').css('fill', stroke);
        $('#diagramCanvas .structurizrWebBrowser').css('stroke', stroke);
        $('#diagramCanvas .structurizrWebBrowserPanel').css('fill', fill);
        $('#diagramCanvas .structurizrWebBrowserPanel').css('stroke', stroke);
        $('#diagramCanvas .structurizrWebBrowserUrlBar').css('fill', fill);
        $('#diagramCanvas .structurizrWebBrowserUrlBar').css('stroke', stroke);
        $('#diagramCanvas .structurizrWebBrowserButton1').css('stroke', stroke);
        $('#diagramCanvas .structurizrWebBrowserButton1').css('fill', fill);
        $('#diagramCanvas .structurizrWebBrowserButton2').css('stroke', stroke);
        $('#diagramCanvas .structurizrWebBrowserButton2').css('fill', fill);
        $('#diagramCanvas .structurizrWebBrowserButton3').css('stroke', stroke);
        $('#diagramCanvas .structurizrWebBrowserButton3').css('fill', fill);

        // mobile device
        $('#diagramCanvas .structurizrMobileDevice').css('fill', stroke);
        $('#diagramCanvas .structurizrMobileDevice').css('stroke', stroke);
        $('#diagramCanvas .structurizrMobileDeviceDisplay').css('fill', fill);
        $('#diagramCanvas .structurizrMobileDeviceDisplay').css('stroke', stroke);
        $('#diagramCanvas .structurizrMobileDeviceButton').css('fill', fill);
        $('#diagramCanvas .structurizrMobileDeviceButton').css('stroke', stroke);
        $('#diagramCanvas .structurizrMobileDeviceSpeaker').css('fill', fill);
        $('#diagramCanvas .structurizrMobileDeviceSpeaker').css('stroke', stroke);

        // person
        $('#diagramCanvas .structurizrPersonHead').css('fill', fill);
        $('#diagramCanvas .structurizrPersonHead').css('stroke', stroke);
        $('#diagramCanvas .structurizrPersonBody').css('fill', fill);
        $('#diagramCanvas .structurizrPersonBody').css('stroke', stroke);
        $('#diagramCanvas .structurizrPersonLeftArm').css('stroke', stroke);
        $('#diagramCanvas .structurizrPersonRightArm').css('stroke', stroke);

        // robot
        $('#diagramCanvas .structurizrRobotHead').css('fill', fill);
        $('#diagramCanvas .structurizrRobotHead').css('stroke', stroke);
        $('#diagramCanvas .structurizrRobotEars').css('fill', fill);
        $('#diagramCanvas .structurizrRobotEars').css('stroke', stroke);
        $('#diagramCanvas .structurizrRobotBody').css('fill', fill);
        $('#diagramCanvas .structurizrRobotBody').css('stroke', stroke);
        $('#diagramCanvas .structurizrRobotLeftArm').css('stroke', stroke);
        $('#diagramCanvas .structurizrRobotRightArm').css('stroke', stroke);

        // lines
        $('#diagramCanvas .connection').css('stroke', stroke);
        $('#diagramCanvas .marker-target').css('fill', stroke);
        $('#diagramCanvas .marker-target').css('stroke', stroke);

        // text
        $('#diagramCanvas text').css('fill', '#000000');
        $('#diagramCanvas text').css('font-family', 'Helvetica');

        // and square off all of the corners
        $('#diagramCanvas rect').attr('rx', '0');
    }

};

// move selected elements left or move to previous diagram
$(document).keydown(function(e) {
    var leftArrow = 37;
    var pageUp = 33;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if ((e.which === leftArrow || e.which === pageUp)) {
            if (Structurizr.diagram.hasElementsSelected() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.moveSelectedElementsLeft();
                e.preventDefault();
            } else if (Structurizr.diagram.isNavigationEnabled()) {
                Structurizr.diagram.hideKey();
                if (Structurizr.selectPreviousDiagram()) {
                    e.preventDefault();
                }
            }
        }
    }
});

// move selected elements right or move to next diagram
$(document).keydown(function(e) {
    var rightArrow = 39;
    var pageDown = 34;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if ((e.which === rightArrow || e.which === pageDown)) {
            if (Structurizr.diagram.hasElementsSelected() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.moveSelectedElementsRight();
                e.preventDefault();
            } else if (Structurizr.diagram.isNavigationEnabled()) {
                Structurizr.diagram.hideKey();
                if (Structurizr.selectNextDiagram()) {
                    e.preventDefault();
                }
            }
        }
    }
});

// move selected elements up
$(document).keydown(function(e) {
    var upArrow = 38;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if ((e.which === upArrow)) {
            if (Structurizr.diagram.hasLinkHighlighted() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.moveLabelOfHighlightedLink(0.05);
                e.preventDefault();
            } else if (Structurizr.diagram.hasElementsSelected() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.moveSelectedElementsUp();
                e.preventDefault();
            } else if (Structurizr.diagram.currentViewIsDynamic() || Structurizr.diagram.currentViewHasAnimation()) {
                e.preventDefault();
                Structurizr.diagram.stepBackwardInAnimation();
            }
        }
    }
});

// move selected elements down
$(document).keydown(function(e) {
    var downArrow = 40;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if ((e.which === downArrow)) {
            if (Structurizr.diagram.hasLinkHighlighted() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.moveLabelOfHighlightedLink(-0.05);
                e.preventDefault();
            } else if (Structurizr.diagram.hasElementsSelected() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.moveSelectedElementsDown();
                e.preventDefault();
            } else if (Structurizr.diagram.currentViewIsDynamic() || Structurizr.diagram.currentViewHasAnimation()) {
                e.preventDefault();
                Structurizr.diagram.stepForwardInAnimation();
            }
        }
    }
});

// select all elements
$(document).keypress(function(e) {
    var a = 97;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === a) {
            if (Structurizr.diagram.isEditable()) {
                Structurizr.diagram.selectAllElements();
            }
        }
    }
});

// deselect all elements
$(document).keypress(function(e) {
    var d = 100;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === d) {
            if (Structurizr.diagram.isEditable()) {
                Structurizr.diagram.deselectAllElements();
            }
        }
    }
});

// enter full screen mode
$(document).keypress(function(e) {
    var f = 102;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === f) {
            Structurizr.enterFullScreen();
        }
    }
});

// enter presentation mode
$(document).keypress(function(e) {
    var p = 112;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (!Structurizr.diagram.isEmbedded()) {
            if (e.which === p && !e.metaKey) {
                Structurizr.enterPresentationMode();
            }
        }
    }
});

// zoom in
$(document).keypress(function(e) {
    var plus = 43;
    var equals = 61;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === plus || e.which === equals) {
            Structurizr.diagram.zoomIn();
        }
    }
});

// zoom out
$(document).keypress(function(e) {
    var minus = 45;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === minus) {
            Structurizr.diagram.zoomOut();
        }
    }
});

// zoom to fit width
$(document).keypress(function(e) {
    var w = 119;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === w) {
            Structurizr.diagram.zoomFitWidth();
        }
    }
});

// zoom to fit height
$(document).keypress(function(e) {
    var h = 104;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === h) {
            Structurizr.diagram.zoomFitHeight();
        }
    }
});

// zoom to fit content
$(document).keypress(function(e) {
    var c = 99;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === c) {
            Structurizr.diagram.zoomFitContent();
        }
    }
});

// show diagram key
$(document).keypress(function(e) {
    var i = 105;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === i) {
            Structurizr.diagram.showKey();
        }
    }
});

$(window).on("beforeunload", function() {
    if (Structurizr.diagram && Structurizr.diagram.isEditable()) {
        if (Structurizr.workspace.isUnsavedChanges()) {
            return "There are unsaved changes to one or more diagrams in this workspace - diagram layout will be lost.";
        }
}
});

// toggle tooltip
$(document).keypress(function(e) {
    var t = 116;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === t) {
            Structurizr.diagram.toggleTooltip();
        }
    }
});

// undo
$(document).keypress(function(e) {
    var u = 117;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === u) {
            Structurizr.diagram.undo();
        }
    }
});

// auto-layout
$(document).keypress(function(e) {
    var l = 108;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled() && Structurizr.diagram.isEditable()) {
        if (e.which === l) {
            Structurizr.diagram.layout(true);
        }
    }
});

// select elements with name
$(document).keypress(function(e) {
    var n = 110;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled() && Structurizr.diagram.isEditable()) {
        if (e.which === n) {
            var regex = prompt("Please enter a regex.", "");
            if (regex !== undefined) {
                Structurizr.diagram.selectElementsWithName(regex);
            }
        }
    }
});

// // health checks
// $(document).keypress(function(e) {
//     var h = 104;
//     if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled() && Structurizr.diagram.isEditable()) {
//         if (e.which === h) {
//             $('#healthCheckButton').click();
//         }
//     }
// });

// toggle link routing algorithm
$(document).keypress(function(e) {
    var r = 114;
    if (Structurizr.diagram && Structurizr.diagram.areKeyboardShortcutsEnabled()) {
        if (e.which === r) {
            if (Structurizr.diagram.hasLinkHighlighted() && Structurizr.diagram.isEditable()) {
                Structurizr.diagram.toggleRoutingOfHighlightedLink();
                e.preventDefault();
            }
        }
    }
});
