Structurizr.Express = function() {

    var format = 'text';
    var workspace;
    var view;
    var id = 1;
    var elements, elementsById, elementsByName, relationships;
    var errorMessages = [], warningMessages = [];

    var suppressEmptyProperties = false;

    this.setSuppressEmptyProperties = function(bool) {
        suppressEmptyProperties = bool;
    };

    var parsers = {
        'Person': parsePerson,
        'SoftwareSystem': parseSoftwareSystem,
        'Container': parseContainer,
        'Component': parseComponent,
        'Relationship': parseRelationship,
        'Diagram': parseDiagram,
        'ElementStyle': parseElementStyle,
        'RelationshipStyle': parseRelationshipStyle
    };

    this.parse = function(definition) {
        definition = sanitiseDefinition(definition);
        if (definition.startsWith('{')) {
            format = 'json';
            return parseFromJson(definition);
        } else {
            format = 'text';
            return parseFromText(definition);
        }
    };

    function parseFromText(definition) {
        id = 1;
        elements = [];
        elementsById = [];
        elementsByName = [];
        relationships = [];

        errorMessages = [];
        warningMessages = [];

        workspace = {};
        workspace.model = {};
        workspace.model.softwareSystems = [];
        workspace.model.people = [];
        workspace.views = {};
        workspace.views.configuration = {};
        workspace.views.configuration.styles = {};
        workspace.views.configuration.styles.elements = [];
        workspace.views.configuration.styles.relationships = [];
        workspace.views.systemContextViews = [];
        view = undefined;

        var lines = definition.split('\n');
        var lineNumber = 0;
        lines.forEach(function(line) {
            lineNumber++;

            var parts = line.split('=');
            if (parts.length === 2) {
                var type = parts[0].trim();
                var definition = parts[1].trim();

                var parser = parsers[type];
                if (parser) {
                    parser(lineNumber, line, definition);
                } else {
                    logWarning('Type "' + type + '" is unknown.', line, lineNumber);
                }
            }
        });

        createView(lineNumber);

        return workspace;
    }

    function parseFromJson(definition) {
        id = 1;
        elements = [];
        elementsById = [];
        elementsByName = [];
        relationships = [];

        errorMessages = [];
        warningMessages = [];

        workspace = {};
        workspace.model = {};
        workspace.model.softwareSystems = [];
        workspace.model.people = [];
        workspace.views = {};
        workspace.views.configuration = {};
        workspace.views.configuration.styles = {};
        workspace.views.configuration.styles.elements = [];
        workspace.views.configuration.styles.relationships = [];
        workspace.views.systemLandscapeViews = [];
        workspace.views.systemContextViews = [];
        workspace.views.containerViews = [];
        workspace.views.componentViews = [];
        workspace.views.dynamicViews = [];

        view = undefined;

        try {
            var json = JSON.parse(definition);
        } catch (e) {
            console.log(e);
            logError(e);
            return;
        }

        if (json) {
            if (json.elements) {
                json.elements.forEach(function(element) {
                    parseElementFromJson(element);
                });
            }

            if (json.relationships) {
                json.relationships.forEach(function(relationship) {
                    parseRelationshipFromJson(relationship);
                })
            }

            if (json.styles) {
                json.styles.forEach(function(style) {
                    if (style.type && style.type === 'element') {
                        parseElementStyleFromJson(style);
                    } else if (style.type && style.type === 'relationship') {
                        parseRelationshipStyleFromJson(style);
                    }
                })
            }

            parseDiagramFromJson(json);
        }

        createView(undefined);

        return workspace;
    }

    function parseElementFromJson(element) {
        if (element && element.type) {
            if (element.type.toLowerCase() === "software system" || element.type.toLowerCase() === "softwaresystem") {
                parseSoftwareSystemFromJson(element);
            } else if (element.type.toLowerCase() === "person") {
                parsePersonFromJson(element);
            } else {
                logError('Invalid element type of \"' + element.type + '\", top-level elements must have a type of \"Person\" or \"Software System\".')
            }
        } else {
            logError('Top-level elements must have a type of \"Person\" or \"Software System\".')
        }
    }

    function parseSoftwareSystemFromJson(element) {
        var name = element.name;
        var description = element.description;
        var tags = element.tags;
        var position = element.position;

        if (!name || name.length === 0) {
            logError('Software systems must have a name.');
            return;
        }

        var softwareSystem = {};
        softwareSystem.id = id++;
        softwareSystem.name = name;
        softwareSystem.description = description;
        softwareSystem.type = 'SoftwareSystem';
        softwareSystem.tags = 'Element,Software System';
        if (tags && tags.length > 0) {
            softwareSystem.tags += ',';
            softwareSystem.tags += tags;

            var tagsArray = tags.split(',');
            tagsArray.forEach(function(tag) {
                if (tag.trim().toLowerCase() === 'internal') {
                    softwareSystem.location = 'Internal';
                } else if (tag.trim().toLowerCase() === 'external') {
                    softwareSystem.location = 'External';
                }
            });
        }

        softwareSystem.containers = [];
        softwareSystem.relationships = [];

        var coordinate = parsePosition(position, 1, undefined);
        softwareSystem.x = coordinate.x;
        softwareSystem.y = coordinate.y;

        workspace.model.softwareSystems.push(softwareSystem);
        addElement(1, undefined, softwareSystem);

        if (element.containers) {
            element.containers.forEach(function(container) {
                parseContainerFromJson(softwareSystem, container);
            });
        }
    }

    function parseContainerFromJson(softwareSystem, element) {
        var name = element.name;
        var description = element.description;
        var technology = element.technology;
        var tags = element.tags;
        var position = element.position;

        if (!name || name.length === 0) {
            logError('Containers must have a name.');
            return;
        }

        var container = {};
        container.id = id++;
        container.parentId = softwareSystem.id;
        container.name = name;
        container.description = description;
        container.technology = technology;
        container.type = 'Container';
        container.tags = 'Element,Container';
        if (tags && tags.length > 0) {
            container.tags += ',';
            container.tags += tags;
        }

        container.components = [];
        container.relationships = [];

        var coordinate = parsePosition(position, undefined, undefined);
        container.x = coordinate.x;
        container.y = coordinate.y;

        softwareSystem.containers.push(container);
        addElement(undefined, undefined, container);

        if (element.components) {
            element.components.forEach(function(component) {
                parseComponentFromJson(container, component);
            });
        }
    }

    function parseComponentFromJson(container, element) {
        var name = element.name;
        var description = element.description;
        var technology = element.technology;
        var tags = element.tags;
        var position = element.position;

        if (!name || name.length === 0) {
            logError('Components must have a name.');
            return;
        }

        var component = {};
        component.id = id++;
        component.parentId = container.id;
        component.name = name;
        component.description = description;
        component.technology = technology;
        component.type = 'Component';
        component.tags = 'Element,Component';
        if (tags && tags.length > 0) {
            component.tags += ',';
            component.tags += tags;
        }

        component.relationships = [];

        var coordinate = parsePosition(position, undefined, undefined);
        component.x = coordinate.x;
        component.y = coordinate.y;

        container.components.push(component);
        addElement(undefined, undefined, component);
    }

    function parsePersonFromJson(element) {
        var name = element.name;
        var description = element.description;
        var tags = element.tags;
        var position = element.position;

        if (!name || name.length === 0) {
            logError('People must have a name.');
            return;
        }

        var person = {};
        person.id = id++;
        person.name = name;
        person.description = description;
        person.type = 'Person';
        person.tags = 'Element,Person';
        if (tags && tags.length > 0) {
            person.tags += ',';
            person.tags += tags;

            var tagsArray = tags.split(',');
            tagsArray.forEach(function(tag) {
                if (tag.trim().toLowerCase() === 'internal') {
                    person.location = 'Internal';
                } else if (tag.trim().toLowerCase() === 'external') {
                    person.location = 'External';
                }
            });
        }

        person.relationships = [];

        var coordinate = parsePosition(position, 1, undefined);
        person.x = coordinate.x;
        person.y = coordinate.y;

        workspace.model.people.push(person);
        addElement(1, undefined, person);
    }

    function sanitiseDefinition(definition) {
        definition = definition.replace(/>/g,'&gt');
        definition = definition.replace(/</g,'&lt');

        return definition;
    }

    function parseSoftwareSystem(lineNumber, line, definition) {
        var properties = definition.split('|');

        var name;
        var description;
        var tags;
        var position;

        if (properties.length === 4) {
            name = properties[0].trim();
            description = properties[1].trim();
            tags = properties[2].trim();
            position = properties[3].trim();
        } else {
            logError('The definition of a software system must have 4 parts (Name | Description | Tags | x,y).', line, lineNumber);
            return;
        }

        if (name.length === 0) {
            logError('Software systems must be given a name.', line, lineNumber);
            return;
        }

        var softwareSystem = {};
        softwareSystem.id = id++;
        softwareSystem.name = name;
        softwareSystem.description = description;
        if (!softwareSystem.description) {
            logWarning("The software system is missing a description.", line, lineNumber)
        }
        softwareSystem.type = 'SoftwareSystem';
        softwareSystem.tags = 'Element,Software System';
        if (tags.length > 0) {
            softwareSystem.tags += ',';
            softwareSystem.tags += tags;
        }
        softwareSystem.containers = [];
        softwareSystem.relationships = [];

        var tagsArray = tags.split(',');
        tagsArray.forEach(function(tag) {
            if (tag.trim().toLowerCase() === 'internal') {
                softwareSystem.location = 'Internal';
            } else if (tag.trim().toLowerCase() === 'external') {
                softwareSystem.location = 'External';
            }
        });

        var coordinate = parsePosition(position, lineNumber, line);
        softwareSystem.x = coordinate.x;
        softwareSystem.y = coordinate.y;

        workspace.model.softwareSystems.push(softwareSystem);
        addElement(lineNumber, line, softwareSystem);
    }

    function parsePerson(lineNumber, line, definition) {
        var properties = definition.split('|');

        var name;
        var description;
        var tags;
        var position;

        if (properties.length === 4) {
            name = properties[0].trim();
            description = properties[1].trim();
            tags = properties[2].trim();
            position = properties[3].trim();
        } else {
            logError('The definition of a person must have 4 parts (Name | Description | Tags | x,y).', line, lineNumber);
            return;
        }

        if (name.length === 0) {
            logError('People must be given a name.', line, lineNumber);
            return;
        }

        var person = {};
        person.id = id++;
        person.name = name;
        person.description = description;
        if (!person.description) {
            logWarning("The person is missing a description.", line, lineNumber);
        }
        person.type = 'Person';
        person.tags = 'Element,Person';
        if (tags.length > 0) {
            person.tags += ',';
            person.tags += tags;
        }
        person.relationships = [];

        var tagsArray = tags.split(',');
        tagsArray.forEach(function(tag) {
            if (tag.trim().toLowerCase() === 'internal') {
                person.location = 'Internal';
            } else if (tag.trim().toLowerCase() === 'external') {
                person.location = 'External';
            }
        });

        var coordinate = parsePosition(position, lineNumber, line);
        person.x = coordinate.x;
        person.y = coordinate.y;

        workspace.model.people.push(person);
        addElement(lineNumber, line, person);
    }

    function parseContainer(lineNumber, line, definition) {
        var properties = definition.split('|');
        if (properties.length === 6) {
            var softwareSystemName = properties[0].trim();
            var name = properties[1].trim();
            var description = properties[2].trim();
            var technology = properties[3].trim();
            var tags = properties[4].trim();
            var position = properties[5].trim();

            if (name.length === 0) {
                logError('Containers must be given a name.', line, lineNumber);
                return;
            }

            if (softwareSystemName.length === 0) {
                logError('Containers must be given a software system name.', line, lineNumber);
                return;
            }

            var softwareSystem = elementsByName[softwareSystemName];
            if (softwareSystem && softwareSystem.type === 'SoftwareSystem') {
                var container = {};
                container.id = id++;
                container.parentId = softwareSystem.id;
                container.name = name;
                container.description = description;
                if (!container.description) {
                    logWarning("The container is missing a description.", line, lineNumber)
                }
                container.technology = technology;
                if (!container.technology) {
                    logWarning("The container is missing a technology.", line, lineNumber)
                }
                container.type = 'Container';
                container.tags = 'Element,Container';
                if (tags.length > 0) {
                    container.tags += ',';
                    container.tags += tags;
                }
                container.components = [];
                container.relationships = [];

                var coordinate = parsePosition(position, lineNumber, line);
                container.x = coordinate.x;
                container.y = coordinate.y;

                softwareSystem.containers.push(container);
                addElement(lineNumber, line, container);
            } else {
                logError('The software system named "' + softwareSystemName + '" could not be found.', line, lineNumber);
            }
        } else {
            logError('The definition of a container must have 6 parts (Software System | Name | Description | Technology | Tags | x,y).', line, lineNumber);
        }
    }

    function parseComponent(lineNumber, line, definition) {
        var properties = definition.split('|');
        if (properties.length === 6) {
            var containerName = properties[0].trim();
            var name = properties[1].trim();
            var description = properties[2].trim();
            var technology = properties[3].trim();
            var tags = properties[4].trim();
            var position = properties[5].trim();

            if (name.length === 0) {
                logError('Components must be given a name.', line, lineNumber);
                return;
            }

            if (containerName.length === 0) {
                logError('Components must be given a container name.', line, lineNumber);
                return;
            }

            var container = elementsByName[containerName];
            if (container && container.type === 'Container') {
                var component = {};
                component.id = id++;
                component.parentId = container.id;
                component.name = name;
                component.description = description;
                if (!component.description) {
                    logWarning("The component is missing a description.", line, lineNumber)
                }
                component.technology = technology;
                if (!component.technology) {
                    logWarning("The component is missing a technology.", line, lineNumber)
                }
                component.type = 'Component';
                component.tags = 'Element,Component';
                if (tags.length > 0) {
                    component.tags += ',';
                    component.tags += tags;
                }
                component.relationships = [];

                var coordinate = parsePosition(position, lineNumber, line);
                component.x = coordinate.x;
                component.y = coordinate.y;

                container.components.push(component);
                addElement(lineNumber, line, component);
            } else {
                logError('The container named "' + containerName + '" could not be found.', line, lineNumber);
            }
        } else {
            logError('The definition of a component must have 6 parts (Container | Name | Description | Technology | Tags | x,y).', line, lineNumber);
        }
    }

    function parsePosition(position, lineNumber, line) {
        var coordinate = { x: undefined, y: undefined };
        if (position && position.length > 0) {
            var coordinates = position.split(",");
            if (coordinates.length === 2) {
                var xAsString = coordinates[0].trim();
                var yAsString = coordinates[1].trim();

                if (isInteger(xAsString)) {
                    coordinate.x = parseInt(xAsString, 10);
                } else {
                    logWarning('The x coordinate of "' + xAsString + '" is not a positive integer.', line, lineNumber);
                }

                if (isInteger(yAsString)) {
                    coordinate.y = parseInt(yAsString, 10);
                } else {
                    logWarning('The y coordinate of "' + yAsString + '" is not a positive integer.', line, lineNumber);
                }
            } else {
                logWarning('"' + position + '" is not an x,y coordinate.', line, lineNumber);
            }
        }

        return coordinate;
    }

    function addElement(lineNumber, line, element) {
        if (!elementsByName[element.name]) {
            elements.push(element);
            elementsById[element.id] = element;
            elementsByName[element.name] = element;
        } else {
            logError('An element named "' + element.name + '" already exists.', line, lineNumber)
        }
    }

    function parseRelationship(lineNumber, line, definition) {
        var properties = definition.split('|');
        if (properties.length === 6) {
            var sourceName = properties[0].trim();
            var description = properties[1].trim();
            var technology = properties[2].trim();
            var destinationName = properties[3].trim();
            var tags = properties[4].trim();
            var vertices = properties[5].trim();

            var sourceElement = elementsByName[sourceName];
            var destinationElement = elementsByName[destinationName];

            if (sourceElement && destinationElement) {
                var relationship = {};
                relationship.id = id++;
                relationship.sourceId = sourceElement.id;
                relationship.destinationId = destinationElement.id;
                relationship.description = description;
                relationship.technology = technology;
                relationship.tags = 'Relationship';
                if (tags.length > 0) {
                    relationship.tags += ',';
                    relationship.tags += tags;
                }
                relationship.vertices = [];

                if (vertices.length > 0) {
                    var positions = vertices.split(' ');
                    positions.forEach(function (position) {
                        var coordinate = parsePosition(position, lineNumber, line);
                        if (coordinate.x && coordinate.y) {
                            relationship.vertices.push(coordinate);
                        }
                    });
                }

                if (!relationship.description) {
                    logWarning("The relationship is missing a description.", line, lineNumber)
                }

                sourceElement.relationships.push(relationship);
                relationships.push(relationship);
            } else if (!sourceElement) {
                logError('The source element named "' + sourceName + '" can not be found.', line, lineNumber);
            } else if (!destinationElement) {
                logError('The destination element named "' + destinationName + '" can not be found.', line, lineNumber);
            }
        } else {
            logError('The definition of a relationship must have 6 parts (Source | Description | Technology | Destination | Tags | Vertices).', line, lineNumber);
        }
    }

    function parseRelationshipFromJson(json) {
        var sourceName = json.source;
        var description = json.description;
        var technology = json.technology;
        var destinationName = json.destination;
        var tags = json.tags;
        var vertices = json.vertices;
        var position = json.position;
        var routing = json.routing;
        var order = json.order;

        if (!sourceName || sourceName.length === 0) {
            logError("The relationship source must be specified.");
            return;
        }

        if (!destinationName || destinationName.length === 0) {
            logError("The relationship destination must be specified.");
            return;
        }
        var sourceElement = elementsByName[sourceName];
        var destinationElement = elementsByName[destinationName];

        if (order !== undefined && order.length > 0) {
            if (isInteger(order)) {
                order = parseInt(order);
            } else {
                logError('The order of "' + order + '" is not an integer.');
            }
        } else {
            order = 1;
        }

        if (sourceElement && destinationElement) {
            var relationship = {};
            relationship.id = id++;
            relationship.sourceId = sourceElement.id;
            relationship.destinationId = destinationElement.id;
            relationship.description = description;
            relationship.technology = technology;
            relationship.order = order;
            relationship.tags = 'Relationship';
            if (tags && tags.length > 0) {
                relationship.tags += ',';
                relationship.tags += tags;
            }
            relationship.vertices = [];

            if (vertices && vertices.length > 0) {
                vertices.forEach(function(position) {
                    var coordinate = parsePosition(position, 1, undefined);
                    if (coordinate.x && coordinate.y) {
                        relationship.vertices.push(coordinate);
                    }
                });
            }

            if (routing !== undefined) {
                relationship.routing = routing;
            }

            if (position !== undefined) {
                relationship.position = position;
            }

            sourceElement.relationships.push(relationship);
            relationships.push(relationship);
        } else if (!sourceElement) {
            logError('The relationship source element named "' + sourceName + '" does not exist.');
        } else if (!destinationElement) {
            logError('The relationship destination element named "' + destinationName + '" does not exist.');
        }
    }

    function parseDiagram(lineNumber, line, definition) {
        workspace.views.systemLandscapeViews = [];
        workspace.views.systemContextViews = [];
        workspace.views.containerViews = [];
        workspace.views.componentViews = [];

        if (view) {
            logWarning("More than one diagram has been defined - ignoring previous diagrams.", line, lineNumber)
        } else {
            view = {};
        }

        var properties = definition.split('|');
        if (properties.length === 4) {

            var viewType = properties[0].trim();
            var elementName = properties[1].trim();
            var element;
            var description = properties[2].trim();
            var paperSize = properties[3].trim();

            if (viewType === 'Enterprise Context' || viewType === 'System Landscape') {
                workspace.model.enterprise = {
                    name: elementName
                }
            } else {
                element = elementsByName[elementName];
                if (!element) {
                    logError('The element with the name "' + elementName + '" could not be found.', line, lineNumber);
                    return;
                }
            }

            var paperSizes = new Structurizr.PaperSizes();
            if (paperSizes.getDimensions(paperSize)) {
                view.paperSize = paperSize;
            } else {
                logError('The paper size of "' + paperSize + '" is not recognised.', line, lineNumber)
            }

            view.description = description;

            if (viewType === 'Enterprise Context' || viewType === 'System Landscape') {
                view.type = 'SystemLandscape';
                workspace.views.systemLandscapeViews.push(view);
            } else if (viewType === 'System Context') {
                if (element.type === 'SoftwareSystem') {
                    workspace.views.systemContextViews.push(view);
                    view.type = 'SystemContext';
                    view.softwareSystemId = element.id;
                } else {
                    logError('The element with the name "' + elementName + '" must be a software system.', line, lineNumber);
                }
            } else if (viewType === 'Container') {
                if (element.type === 'SoftwareSystem') {
                    workspace.views.containerViews.push(view);
                    view.type = 'Container';
                    view.softwareSystemId = element.id;
                } else {
                    logError('The element with the name "' + elementName + '" must be a software system.', line, lineNumber);
                }
            } else if (viewType === 'Component') {
                if (element.type === 'Container') {
                    workspace.views.componentViews.push(view);
                    view.type = 'Component';
                    view.softwareSystemId = element.parentId;
                    view.containerId = element.id;
                } else {
                    logError('The element with the name "' + elementName + '" must be a container.', line, lineNumber);
                }
            } else {
                logError('The diagram type must be "System Landscape", "System Context", "Container" or "Component".', line, lineNumber);
            }
        } else {
            logError('The definition of a diagram must have 4 parts (Type | Element or Enterprise Name | Description | Paper size).', line, lineNumber)
        }
    }

    function parseDiagramFromJson(json) {
        view = {};

        var viewType = json.type;
        var elementName = json.scope;
        var element;
        var description = json.description;
        var paperSize = json.size;

        if (viewType === 'Enterprise Context' || viewType === 'System Landscape') {
            workspace.model.enterprise = {
                name: elementName
            }
        } else if (viewType === 'System Context' || viewType === 'Container') {
            element = elementsByName[elementName];
            if (!element) {
                logError('Diagram scope: the software system named "' + elementName + '" could not be found.');
                return;
            }
        } else if (viewType === 'Component') {
            element = elementsByName[elementName];
            if (!element) {
                logError('Diagram scope: the contained named "' + elementName + '" could not be found.');
                return;
            }
        } else if (viewType === 'Dynamic') {
            if (elementName) {
                element = elementsByName[elementName];
                if (!element) {
                    logError('Diagram scope: the software system or container named "' + elementName + '" could not be found.');
                    return;
                }
            }
        }

        var paperSizes = new Structurizr.PaperSizes();
        if (paperSizes.getDimensions(paperSize)) {
            view.paperSize = paperSize;
        } else {
            view.paperSize = "A5_Landscape";
        }

        view.description = description;

        if (viewType === 'Enterprise Context' || viewType === 'System Landscape') {
            view.type = 'SystemLandscape';
            workspace.views.systemLandscapeViews.push(view);
        } else if (viewType === 'System Context') {
            if (element.type === 'SoftwareSystem') {
                workspace.views.systemContextViews.push(view);
                view.type = 'SystemContext';
                view.softwareSystemId = element.id;
            } else {
                logError('The element with the name "' + elementName + '" must be a software system.');
            }
        } else if (viewType === 'Container') {
            if (element.type === 'SoftwareSystem') {
                workspace.views.containerViews.push(view);
                view.type = 'Container';
                view.softwareSystemId = element.id;
            } else {
                logError('The element with the name "' + elementName + '" must be a software system.');
            }
        } else if (viewType === 'Component') {
            if (element.type === 'Container') {
                workspace.views.componentViews.push(view);
                view.type = 'Component';
                view.softwareSystemId = element.parentId;
                view.containerId = element.id;
            } else {
                logError('The element with the name "' + elementName + '" must be a container.');
            }
        } else if (viewType === 'Dynamic') {
            if (element === undefined) {
                workspace.views.dynamicViews.push(view);
                view.type = 'Dynamic';
            } else {
                if (element.type === 'SoftwareSystem' || element.type === 'Container') {
                    workspace.views.dynamicViews.push(view);
                    view.type = 'Dynamic';
                    view.elementId = element.id;
                } else {
                    logError('The diagram scope for a dynamic view must be a software system or container.');
                }
            }
        } else {
            logError('The diagram type must be "System Landscape", "System Context", "Container", "Component" or "Dynamic".');
        }
    }

    function parseElementStyle(lineNumber, line, definition) {
        var elementStyle = {};
        var properties = definition.split('|');
        if (properties.length === 7) {
            var tag = properties[0].trim();
            var width = properties[1].trim();
            var height = properties[2].trim();
            var background = properties[3].trim();
            var color = properties[4].trim();
            var fontSize = properties[5].trim();
            var shape = properties[6].trim();

            if (tag.length > 0) {
                elementStyle.tag = tag;
            }

            if (width.length > 0) {
                if (isInteger(width)) {
                    elementStyle.width = parseInt(width);
                } else {
                    logError('The width of "' + width + '" is not an integer.', line, lineNumber);
                }
            }

            if (height.length > 0) {
                if (isInteger(height)) {
                    elementStyle.height = parseInt(height);
                } else {
                    logError('The height of "' + height + '" is not an integer.', line, lineNumber);
                }
            }

            if (background.length > 0) {
                if (isRGBHexColor(background)) {
                    elementStyle.background = background;
                } else {
                    logError('The background of "' + background + '" is not valid; must be an RGB hex value, e.g. "#ffffff".', line, lineNumber);
                }
            }

            if (color.length > 0) {
                if (isRGBHexColor(color)) {
                    elementStyle.color = color;
                } else {
                    logError('The color of "' + color + '" is not valid; must be an RGB hex value, e.g. "#ffffff".', line, lineNumber);
                }
            }

            if (fontSize.length > 0) {
                if (isInteger(fontSize)) {
                    elementStyle.fontSize = parseInt(fontSize);
                } else {
                    logError('The font size of "' + fontSize + '" is not an integer.', line, lineNumber);
                }
            }

            if (shape.length > 0) {
                if (shape === "Box" || shape === "RoundedBox" || shape === "Circle" || shape === "Ellipse" || shape === "Hexagon" || shape === "Person" || shape === "Folder" || shape === "Cylinder" || shape === "Pipe") {
                    elementStyle.shape = shape;
                } else {
                    logError('The shape of "' + shape + '" is not valid; must be one of Box, RoundedBox, Circle, Ellipse, Hexagon, Person, Folder, Cylinder or Pipe.', line, lineNumber);
                }
            }

            workspace.views.configuration.styles.elements.push(elementStyle);
        } else {
            logError('The definition of an element style must have 7 parts (Tag | Width | Height | Background | Color | Font size | Shape).', line, lineNumber);
        }
    }

    function parseElementStyleFromJson(json) {
        var elementStyle = {};
        var tag = json.tag;
        var width = json.width;
        var height = json.height;
        var background = json.background;
        var color = json.color;
        var border = json.border;
        var opacity = json.opacity;
        var fontSize = json.fontSize;
        var shape = json.shape;
        var metadata = json.metadata;
        var description = json.description;

        if (tag && tag.length > 0) {
            elementStyle.tag = tag;
        }

        if (width && width.length > 0) {
            if (isInteger(width)) {
                elementStyle.width = parseInt(width);
            } else {
                logError('The width of "' + width + '" is not an integer.');
            }
        }

        if (height && height.length > 0) {
            if (isInteger(height)) {
                elementStyle.height = parseInt(height);
            } else {
                logError('The height of "' + height + '" is not an integer.');
            }
        }

        if (background && background.length > 0) {
            if (isRGBHexColor(background)) {
                elementStyle.background = background;
            } else {
                logError('The background of "' + background + '" is not valid; must be an RGB hex value, e.g. "#ffffff".');
            }
        }

        if (color && color.length > 0) {
            if (isRGBHexColor(color)) {
                elementStyle.color = color;
            } else {
                logError('The color of "' + color + '" is not valid; must be an RGB hex value, e.g. "#ffffff".');
            }
        }

        if (border && border.length > 0) {
            if (border.toLowerCase() === 'solid') {
                elementStyle.border = 'Solid';
            } else if (border.toLowerCase() === 'dashed') {
                elementStyle.border = 'Dashed';
            } else {
                logError('The border of "' + border + '" is not valid; it must be \"Solid\" or \"Dashed\".');
            }
        }

        if (opacity && opacity.length > 0) {
            if (isInteger(opacity)) {
                elementStyle.opacity = Math.min(100, Math.max(0, parseInt(opacity)));
            } else {
                logError('The opacity of "' + opacity+ '" is not an integer.');
            }
        }

        if (fontSize && fontSize.length > 0) {
            if (isInteger(fontSize)) {
                elementStyle.fontSize = parseInt(fontSize);
            } else {
                logError('The font size of "' + fontSize + '" is not an integer.');
            }
        }

        if (shape && shape.length > 0) {
            if (shape === "Box" || shape === "RoundedBox" || shape === "Circle" || shape === "Ellipse" || shape === "Hexagon" || shape === "Person" || shape === "Robot" || shape === "Folder" || shape === "Cylinder" || shape === "Pipe" || shape === "WebBrowser" || shape === "MobileDevicePortrait" || shape === "MobileDeviceLandscape") {
                elementStyle.shape = shape;
            } else {
                logError('The shape of "' + shape + '" is not valid; must be one of Box, RoundedBox, Circle, Ellipse, Hexagon, Person, Robot, Folder, Cylinder, Pipe, WebBrowser, MobileDevicePortrait or MobileDeviceLandscape.');
            }
        }

        if (metadata !== undefined && metadata.length > 0) {
            metadata = metadata.toLowerCase();
            if (isBoolean(metadata)) {
                elementStyle.metadata = (metadata === 'true');
            } else {
                logError('The metadata value of "' + metadata + '" is not valid; must be one of true or false.');
            }
        }

        if (description !== undefined && description.length > 0) {
            description = description.toLowerCase();
            if (isBoolean(description)) {
                elementStyle.description = (description === 'true');
            } else {
                logError('The description value of "' + description + '" is not valid; must be one of true or false.');
            }
        }

        workspace.views.configuration.styles.elements.push(elementStyle);
    }

    function parseRelationshipStyleFromJson(json) {
        var relationshipStyle = {};
        var tag = json.tag;
        var width = json.width;
        var thickness = json.thickness;
        var color = json.color;
        var opacity = json.opacity;
        var position = json.position;
        var fontSize = json.fontSize;
        var dashed = json.dashed;
        var routing = json.routing;

        if (tag && tag.length > 0) {
            relationshipStyle.tag = tag;
        }

        if (width && width.length > 0) {
            if (isInteger(width)) {
                relationshipStyle.width = parseInt(width);
            } else {
                logError('The width of "' + width + '" is not an integer.');
            }
        }

        if (color && color.length > 0) {
            if (isRGBHexColor(color)) {
                relationshipStyle.color = color;
            } else {
                logError('The color of "' + color + '" is not valid; must be an RGB hex value, e.g. "#ffffff".');
            }
        }

        if (opacity && opacity.length > 0) {
            if (isInteger(opacity)) {
                relationshipStyle.opacity = Math.min(100, Math.max(0, parseInt(opacity)));
            } else {
                logError('The opacity of "' + opacity+ '" is not an integer.');
            }
        }

        if (position && position.length > 0) {
            if (isInteger(position)) {
                relationshipStyle.position = Math.min(100, Math.max(0, parseInt(position)));
            } else {
                logError('The position of "' + position+ '" is not an integer.');
            }
        }

        if (fontSize && fontSize.length > 0) {
            if (isInteger(fontSize)) {
                relationshipStyle.fontSize = parseInt(fontSize);
            } else {
                logError('The font size of "' + fontSize + '" is not an integer.');
            }
        }

        if (thickness && thickness.length > 0) {
            if (isInteger(thickness)) {
                relationshipStyle.thickness = parseInt(thickness);
            } else {
                logError('The thickness of "' + thickness + '" is not an integer.');
            }
        }

        if (dashed && dashed.length > 0) {
            if (dashed.toLowerCase() === 'true') {
                relationshipStyle.dashed = true;
            } else if (dashed.toLowerCase() === 'false') {
                relationshipStyle.dashed = false;
            } else {
                logError('Dashed must be \"true\" or \"false\".');
            }
        }

        if (routing && routing.length > 0) {
            if (routing.toLowerCase() === 'direct') {
                relationshipStyle.routing = 'Direct';
            } else if (routing.toLowerCase() === 'orthogonal') {
                relationshipStyle.routing = 'Orthogonal';
            } else {
                logError('The routing of "' + routing + '" is not valid; it must be \"Direct\" or \"Orthogonal\".');
            }
        }

        workspace.views.configuration.styles.relationships.push(relationshipStyle);
    }

    function parseRelationshipStyle(lineNumber, line, definition) {
        var relationshipStyle = {};
        var properties = definition.split('|');
        if (properties.length === 8) {
            var tag = properties[0].trim();
            var thickness = properties[1].trim();
            var color = properties[2].trim();
            var dashed = properties[3].trim();
            var routing = properties[4].trim();
            var fontSize = properties[5].trim();
            var width = properties[6].trim();
            var position = properties[7].trim();

            if (tag.length > 0) {
                relationshipStyle.tag = tag;
            }

            if (thickness.length > 0) {
                if (isInteger(thickness)) {
                    relationshipStyle.thickness = parseInt(thickness);
                } else {
                    logError('The line thickness of "' + thickness + '" is not an integer.', line, lineNumber);
                }
            }

            if (color.length > 0) {
                if (isRGBHexColor(color)) {
                    relationshipStyle.color = color;
                } else {
                    logError('The color of "' + color + '" is not valid; must be an RGB hex value, e.g. "#ffffff".', line, lineNumber);
                }
            }

            if (dashed.length > 0) {
                if (dashed === "true" || dashed === "false") {
                    relationshipStyle.dashed = (dashed === 'true');
                } else {
                    logError('The dashed property of "' + dashed + '" is not valid; must be true or false.', line, lineNumber);
                }
            }

            if (routing.length > 0) {
                if (routing === "Direct" || routing === "Orthogonal") {
                    relationshipStyle.routing = routing;
                } else {
                    logError('The routing property of "' + routing + '" is not valid; must be Direct or Orthogonal.', line, lineNumber);
                }
            }

            if (fontSize.length > 0) {
                if (isInteger(fontSize)) {
                    relationshipStyle.fontSize = parseInt(fontSize);
                } else {
                    logError('The font size of "' + fontSize + '" is not an integer.', line, lineNumber);
                }
            }

            if (width.length > 0) {
                if (isInteger(width)) {
                    relationshipStyle.width = parseInt(width);
                } else {
                    logError('The width of "' + width + '" is not an integer.', line, lineNumber);
                }
            }

            if (position.length > 0) {
                if (isInteger(position)) {
                    var positionAsInt = parseInt(position, 10);
                    if (positionAsInt >= 0 && positionAsInt <= 100) {
                        relationshipStyle.position = parseInt(position);
                    } else {
                        logError('The position of "' + position + '" is not valid; must be an integer between 0 and 100.', line, lineNumber);
                    }
                } else {
                    logError('The position of "' + position + '" is not an integer.', line, lineNumber);
                }
            }

            workspace.views.configuration.styles.relationships.push(relationshipStyle);
        } else {
            logError('The definition of a relationship style must have 8 parts (Tag | Line thickness | Color | Dashed | Routing | Font size | Width | Position).', line, lineNumber);
        }
    }

    function createView(lineNumber) {
        if (view) {
            view.elements = [];
            elements.forEach(function (element) {
                var elementInView =
                {
                    'id': element.id,
                    x: element.x,
                    y: element.y
                };

                if (isAllowedInView(element, view)) {
                    view.elements.push(elementInView);
                }
            });

            view.relationships = [];
            relationships.forEach(function (relationship) {
                var relationshipInView = { 'id': relationship.id };

                if (view.type === 'Dynamic') {
                    relationshipInView.order = relationship.order;
                }

                if (relationship.vertices.length > 0) {
                    relationshipInView.vertices = relationship.vertices;
                }

                if (relationship.routing !== undefined) {
                    relationshipInView.routing = relationship.routing;
                }

                if (relationship.position !== undefined) {
                    relationshipInView.position = relationship.position;
                }

                view.relationships.push(relationshipInView);
            });
        } else {
            logError('No diagram has been defined.');
        }
    }

    function isAllowedInView(element, view) {
        if (view.type === 'SystemLandscape') {
            return  (
                element.type === 'Person' ||
                element.type === 'SoftwareSystem'
                );
        } else if (view.type === 'SystemContext') {
            return  (
                    element.type === 'Person' ||
                    element.type === 'SoftwareSystem'
                    );
        } else if (view.type === 'Container') {
            return  (
                (element.type === 'Person') ||
                (element.type === 'SoftwareSystem' && element.id !== view.softwareSystemId) ||
                (element.type === 'Container' && element.parentId === view.softwareSystemId)
                    );
        } else if (view.type === 'Component') {
            var container = elementsById[view.containerId];
            return  (
                (element.type === 'Person') ||
                (element.type === 'SoftwareSystem' && element.id !== container.parentId) ||
                (element.type === 'Container' && element.id !== view.containerId) ||
                (element.type === 'Component' && element.parentId === view.containerId)
                    );
        } else if (view.type === 'Dynamic') {
            if (element.type === 'Person') {
                return true;
            }

            if (view.elementId === undefined) {
                if (element.type === 'SoftwareSystem') {
                    return true;
                } else {
                    console.log('Only people and software systems can be added to this view.');
                    return false;
                }
            }
            var elementInScope = elementsById[view.elementId];
            if (elementInScope !== undefined) {
                if (elementInScope.type === 'SoftwareSystem') {
                    if (element.id === elementInScope.id) {
                        console.log(element.name + ' is already the scope of this view and cannot be added to it.');
                        return false;
                    } else if (element.type === 'Container' && element.parentId !== elementInScope.id) {
                        console.log('Only containers that reside inside ' + elementInScope.name + ' can be added to this view.');
                        return false;
                    } else if (element.type === 'Component') {
                        console.log("Components can't be added to a dynamic view when the scope is a software system.");
                        return false;
                    }
                }

                if (elementInScope.type === 'Container') {
                    if (element.id === elementInScope.id || element.id === elementInScope.parentId) {
                        console.log(element.name + ' is already the scope of this view and cannot be added to it.');
                        return false;
                    } else if (element.type === 'Container' && element.parentId !== elementInScope.parentId) {
                        var parentSoftwareSystem = elementsById[elementInScope.parentId];
                        console.log("Only containers that reside inside " + parentSoftwareSystem.name + " can be added to this view.");
                        return false;
                    } else if (element.type === 'Component' && element.parentId !== elementInScope.id) {
                        console.log("Only components that reside inside " + elementInScope.name + " can be added to this view.");
                        return false;
                    }
                }
            }

            return true;
        }
    }

    function copyProperty(value, obj, name) {
        if (value !== undefined) {
            var valueAsString = String(value).trim();
            if (valueAsString.length > 0) {
                obj[name] = valueAsString;
            } else {
                if (suppressEmptyProperties === false) {
                    obj[name] = '';
                }
            }
        } else {
            if (suppressEmptyProperties === false) {
                obj[name] = '';
            }
        }
    }

    this.format = function(workspace) {
        return formatAsJson(workspace);
    };

    function formatAsText(workspace) {
        var definition = '';

        var view = workspace.getViewByNumber(1);

        var elements = workspace.getElements();
        Object.keys(elements).forEach(function(key) {
            var element = elements[key];

            definition += formatElement(element, view);
            definition += '\n';
        });

        definition += '\n';
        var relationships = workspace.getRelationships();
        Object.keys(relationships).forEach(function(key) {
            var relationship = relationships[key];

            definition += formatRelationship(relationship, view, workspace);
            definition += '\n';
        });

        definition += '\n';
        definition += formatView(view, workspace);
        definition += '\n';

        var elementStyles = workspace.getElementStyles();
        var maxTagLength = 0;
        Object.keys(elementStyles).forEach(function(key) {
            var elementStyle = elementStyles[key];
            maxTagLength = Math.max(maxTagLength, elementStyle.tag.length);
        });

        definition += '\n';
        Object.keys(elementStyles).forEach(function(key) {
            var elementStyle = elementStyles[key];
            definition += formatElementStyle(elementStyle, maxTagLength);
            definition += '\n';
        });

        var relationshipStyles = workspace.getRelationshipStyles();
        maxTagLength = 0;
        Object.keys(relationshipStyles).forEach(function(key) {
            var relationshipStyle = relationshipStyles[key];
            maxTagLength = Math.max(maxTagLength, relationshipStyle.tag.length);
        });

        definition += '\n';
        Object.keys(relationshipStyles).forEach(function(key) {
            var relationshipStyle = relationshipStyles[key];
            definition += formatRelationshipStyle(relationshipStyle, maxTagLength);
            definition += '\n';
        });

        return definition;
    }

    function formatAsJson(workspace) {
        var diagram = {
            elements: [],
            relationships: [],
            styles: []
        };

        var view = workspace.getViewByNumber(1);

        if (view.type === 'SystemLandscape') {
            diagram.type = 'System Landscape';
            diagram.scope = workspace.getWorkspace().model.enterprise.name
        } else if (view.type === 'SystemContext') {
            diagram.type = 'System Context';
            var softwareSystem = workspace.findElement(view.softwareSystemId);
            diagram.scope = softwareSystem.name;
        } if (view.type === 'Container') {
            diagram.type = 'Container';
            var softwareSystem = workspace.findElement(view.softwareSystemId);
            diagram.scope = softwareSystem.name;
        } if (view.type === 'Component') {
            diagram.type = 'Component';
            var container = workspace.findElement(view.containerId);
            diagram.scope = container.name;
        } if (view.type === 'Dynamic') {
            diagram.type = 'Dynamic';
            if (view.elementId) {
                diagram.scope = workspace.findElement(view.elementId).name;
            } else {
                diagram.scope = '';
            }
        }

        diagram.description = view.description;
        diagram.size = view.paperSize;

        var elements = workspace.getElements();
        Object.keys(elements).forEach(function(key) {
            var element = elements[key];
            if (element.type === 'SoftwareSystem') {
                var expressSoftwareSystem = formatElementAsJson(element, view);
                diagram.elements.push(expressSoftwareSystem);

                if (element.containers && element.containers.length > 0) {
                    expressSoftwareSystem.containers = [];
                    element.containers.forEach(function(container) {
                        var expressContainer = formatElementAsJson(container, view);
                        expressSoftwareSystem.containers.push(expressContainer);

                        if (container.components && container.components.length > 0) {
                            expressContainer.components = [];
                            container.components.forEach(function(component) {
                                var expressComponent = formatElementAsJson(component, view);
                                expressContainer.components.push(expressComponent);
                            });
                        }

                    });
                }
            } else if (element.type === 'Person') {
                var expressPerson = formatElementAsJson(element, view);
                diagram.elements.push(expressPerson);
            }
        });

        var relationships = workspace.getRelationships();
        Object.keys(relationships).forEach(function(key) {
            var relationship = relationships[key];
            diagram.relationships.push(formatRelationshipAsJson(relationship, view, workspace));
        });

        var elementStyles = workspace.getElementStyles();
        Object.keys(elementStyles).forEach(function(key) {
            var elementStyle = elementStyles[key];
            diagram.styles.push(formatElementStyleAsJson(elementStyle));
        });

        var relationshipStyles = workspace.getRelationshipStyles();
        Object.keys(relationshipStyles).forEach(function(key) {
            var relationshipStyle = relationshipStyles[key];
            diagram.styles.push(formatRelationshipStyleAsJson(relationshipStyle));
        });

        return diagram;
    }

    function formatElement(element, view) {
        var buf = '' + element.type;

        buf += ' =';

        if (element.type === 'Container') {
            buf += formatProperty(element.canonicalName.substring(1).split('/')[0]);
            buf += '|';
        } else if (element.type === 'Component') {
            buf += formatProperty(element.canonicalName.substring(1).split('/')[1]);
            buf += '|';
        }
        buf += formatProperty(element.name);
        buf += '|';
        buf += formatProperty(element.description);

        if (element.type === 'Container' || element.type === 'Component') {
            buf += '|';
            buf += formatProperty(element.technology);
        }

        var tags = element.tags;
        if (element.type === 'SoftwareSystem') {
            tags = tags.substring('Element,Software System'.length);
        } else if (element.type === 'Person') {
            tags = tags.substring('Element,Person'.length);
        } else if (element.type === 'Container') {
            tags = tags.substring('Element,Container'.length);
        } else if (element.type === 'Component') {
            tags = tags.substring('Element,Component'.length);
        }
        buf += '|';
        buf += formatProperty(tags.trim().substring(1));
        buf += '| ';

        view.elements.forEach(function(elementInView) {
            if (elementInView.id === element.id) {
                buf += elementInView.x;
                buf += ',';
                buf += elementInView.y;
            }
        });

        return buf;
    }

    function formatElementAsJson(element, view) {
        var expressElement = {};

        if (element.type === 'SoftwareSystem') {
            expressElement.type = 'Software System';
        } else {
            expressElement.type = element.type;
        }

        copyProperty(element.name, expressElement, 'name');
        copyProperty(element.description, expressElement, 'description');

        if (element.type === 'Container' || element.type === 'Component') {
            copyProperty(element.technology, expressElement, 'technology');
        }

        var tags = element.tags;
        if (element.type === 'SoftwareSystem') {
            tags = tags.substring('Element,Software System'.length);
        } else if (element.type === 'Person') {
            tags = tags.substring('Element,Person'.length);
        } else if (element.type === 'Container') {
            tags = tags.substring('Element,Container'.length);
        } else if (element.type === 'Component') {
            tags = tags.substring('Element,Component'.length);
        }

        copyProperty(tags.trim().substring(1), expressElement, 'tags');

        view.elements.forEach(function(elementInView) {
            if (elementInView.id === element.id) {
                expressElement['position'] = (elementInView.x + ',' + elementInView.y);
            }
        });

        return expressElement;
    }

    function formatRelationship(relationship, view, workspace) {
        var sourceElement = workspace.findElement(relationship.sourceId);
        var destinationElement = workspace.findElement(relationship.destinationId);

        var buf = '';

        buf += 'Relationship =';
        buf += formatProperty(sourceElement.name);
        buf += '|';
        buf += formatProperty(relationship.description);
        buf += '|';
        buf += formatProperty(relationship.technology);
        buf += '|';
        buf += formatProperty(destinationElement.name);
        buf += '|';
        buf += formatProperty(relationship.tags.substring('Relationship'.length).trim().substring(1));
        buf += '| ';

        view.relationships.forEach(function(relationshipInView) {
            if (relationshipInView.id === relationship.id && relationshipInView.vertices) {
                relationshipInView.vertices.forEach(function(vertex) {
                    buf += vertex.x;
                    buf += ',';
                    buf += vertex.y;
                    buf += ' ';
                });
            }
        });

        return buf;
    }

    function formatRelationshipAsJson(relationship, view, workspace) {
        var expressRelationship = {};
        var sourceElement = workspace.findElement(relationship.sourceId);
        var destinationElement = workspace.findElement(relationship.destinationId);

        copyProperty(sourceElement.name, expressRelationship, 'source');
        copyProperty(relationship.description, expressRelationship, 'description');
        copyProperty(relationship.technology, expressRelationship, 'technology');
        if (view.type === 'Dynamic') {
            copyProperty(relationship.order, expressRelationship, 'order');
        }
        copyProperty(destinationElement.name, expressRelationship, 'destination');
        copyProperty(relationship.tags.substring('Relationship'.length).trim().substring(1), expressRelationship, 'tags');

        view.relationships.forEach(function(relationshipInView) {
            if (relationshipInView.id === relationship.id) {
                if (relationshipInView.vertices) {
                    expressRelationship.vertices = [];
                    relationshipInView.vertices.forEach(function (vertex) {
                        expressRelationship.vertices.push(vertex.x + ',' + vertex.y);
                    });
                }

                if (relationshipInView.routing !== undefined) {
                    copyProperty(relationshipInView.routing, expressRelationship, 'routing');
                }

                if (relationshipInView.position !== undefined) {
                    copyProperty(relationshipInView.position, expressRelationship, 'position');
                }
            }
        });

        return expressRelationship;
    }

    function formatView(view, workspace) {
        var buf = 'Diagram = ';

        if (view.type === 'SystemLandscape') {
            buf += 'System Landscape | ';
            buf += workspace.getWorkspace().model.enterprise.name
        } else if (view.type === 'SystemContext') {
            buf += 'System Context | ';
            var softwareSystem = workspace.findElement(view.softwareSystemId);
            buf += softwareSystem.name;
        } if (view.type === 'Container') {
            buf += 'Container | ';
            var softwareSystem = workspace.findElement(view.softwareSystemId);
            buf += softwareSystem.name;
        } if (view.type === 'Component') {
            buf += 'Component | ';
            var container = workspace.findElement(view.containerId);
            buf += container.name;
        }

        buf += ' |';
        buf += formatProperty(view.description);
        buf += '| ';
        buf += view.paperSize;

        return buf;
    }

    function formatElementStyle(elementStyle, maxTagLength) {
        var buf = '';

        buf += 'ElementStyle =';
        buf += formatWithPadding(elementStyle.tag, maxTagLength, false);
        buf += '|';
        buf += formatWithPadding(elementStyle.width, 4, true);
        buf += '|';
        buf += formatWithPadding(elementStyle.height, 4, true);
        buf += '|';
        buf += formatWithPadding(elementStyle.background, 7, false);
        buf += '|';
        buf += formatWithPadding(elementStyle.color, 7, false);
        buf += '|';
        buf += formatWithPadding(elementStyle.fontSize, 3, true);
        buf += '|';
        buf += formatWithPadding(elementStyle.shape, 10, false);

        return buf;
    }

    function formatElementStyleAsJson(elementStyle) {
        var express = { type: 'element' };

        copyProperty(elementStyle.tag, express, 'tag');
        copyProperty(elementStyle.width, express, 'width');
        copyProperty(elementStyle.height, express, 'height');
        copyProperty(elementStyle.background, express, 'background');
        copyProperty(elementStyle.color, express, 'color');
        copyProperty(elementStyle.border, express, 'border');
        copyProperty(elementStyle.opacity, express, 'opacity');
        copyProperty(elementStyle.fontSize, express, 'fontSize');
        copyProperty(elementStyle.shape, express, 'shape');
        copyProperty(elementStyle.metadata, express, 'metadata');
        copyProperty(elementStyle.description, express, 'description');

        return express;
    }

    function formatRelationshipStyle(relationshipStyle, maxTagLength) {
        var buf = '';

        buf += 'RelationshipStyle =';
        buf += formatWithPadding(relationshipStyle.tag, maxTagLength, false);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.thickness, 2, true);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.color, 7, false);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.dashed, 5, false);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.routing, 10, false);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.fontSize, 3, true);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.width, 4, true);
        buf += '|';
        buf += formatWithPadding(relationshipStyle.position, 3, true);

        return buf;
    }

    function formatRelationshipStyleAsJson(relationshipStyle) {
        var express = { type: 'relationship' };

        copyProperty(relationshipStyle.tag, express, 'tag');
        copyProperty(relationshipStyle.thickness, express, 'thickness');
        copyProperty(relationshipStyle.color, express, 'color');
        copyProperty(relationshipStyle.opacity, express, 'opacity');
        copyProperty(relationshipStyle.routing, express, 'routing');
        copyProperty(relationshipStyle.fontSize, express, 'fontSize');
        copyProperty(relationshipStyle.width, express, 'width');
        copyProperty(relationshipStyle.position, express, 'position');
        copyProperty(relationshipStyle.dashed, express, 'dashed');

        return express;
    }

    function formatWithPadding(value, length, leftPadding) {
        var buf = '';

        if (typeof value !== 'undefined') {
            buf += value;
        }

        if (buf.length < length) {
            var padding = length-buf.length;
            for (var i = 0; i < padding; i++) {
                if (leftPadding) {
                    buf = ' ' + buf;
                } else {
                    buf += ' ';
                }
            }
        }

        return ' ' + buf + ' ';
    }

    function formatProperty(value) {
        if (value && value.length > 0) {
            return ' ' + value + ' ';
        } else {
            return ' ';
        }
    }

    this.clearMessages = function() {
        errorMessages = [];
        warningMessages = [];
    };

    this.hasErrorMessages = function() {
        return errorMessages.length > 0;
    };

    this.getErrorMessages = function() {
        return errorMessages;
    };

    this.hasWarningMessages = function() {
        return warningMessages.length > 0;
    };

    this.getWarningMessages = function() {
        return warningMessages;
    };

    this.addErrorMessage = function(message) {
        logError(message);
    };

    function logError(message, line, lineNumber) {
        errorMessages.push({
            message: message,
            line: line,
            lineNumber: lineNumber
        });

        if (lineNumber) {
            console.error('Line ' + lineNumber + ': ' + message);
            console.error(line);
        } else {
            console.error(message);
        }
    }

    function logWarning(message, line, lineNumber) {
        warningMessages.push({
            message: message,
            line: line,
            lineNumber: lineNumber
        });

        if (lineNumber) {
            console.log('Line ' + lineNumber + ': ' + message);
            console.log(line);
        } else {
            console.log(message);
        }
    }

    function isInteger(numberAsString) {
        return /^\+?\d+$/.test(numberAsString);
    }

    function isBoolean(b) {
        return b === 'true' || b === 'false';
    }

    function isRGBHexColor(hexValue) {
        return /^#[0-9a-f]{6}/i.test(hexValue);
    }

};