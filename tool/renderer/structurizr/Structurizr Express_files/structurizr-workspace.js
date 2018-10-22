Structurizr.Workspace = function(workspace) {
    if (workspace === undefined) {
        workspace = {};
    }

    if (workspace.model === undefined) {
        workspace.model = {};
    }

    var model = workspace.model;

    if (model.softwareSystems === undefined) {
        model.softwareSystems = [];
    }

    if (model.people === undefined) {
        model.people = [];
    }

    if (workspace.views === undefined) {
        workspace.views = {};
    }

    var views = workspace.views;

    if (workspace.views.systemLandscapeViews === undefined) {
        workspace.views.systemLandscapeViews = [];
    }

    if (workspace.views.systemContextViews === undefined) {
        workspace.views.systemContextViews = [];
    }

    if (workspace.views.containerViews === undefined) {
        workspace.views.containerViews = [];
    }

    if (workspace.views.componentViews === undefined) {
        workspace.views.componentViews = [];
    }

    if (workspace.views.dynamicViews === undefined) {
        workspace.views.dynamicViews = [];
    }

    if (workspace.views.deploymentViews === undefined) {
        workspace.views.deploymentViews = [];
    }

    if (workspace.views.filteredViews === undefined) {
        workspace.views.filteredViews = [];
    }

    if (workspace.views.configuration === undefined) {
        workspace.views.configuration = {};
    }

    if (workspace.views.configuration.styles === undefined) {
        workspace.views.configuration.styles = {};
    }

    if (workspace.views.configuration.styles.elements === undefined) {
        workspace.views.configuration.styles.elements = [];
    }

    if (workspace.views.configuration.styles.relationships === undefined) {
        workspace.views.configuration.styles.relationships = [];
    }

    if (workspace.documentation === undefined) {
        workspace.documentation = {};
    }

    if (workspace.documentation.sections === undefined) {
        workspace.documentation.sections = [];
    }

    if (workspace.documentation.decisions === undefined) {
        workspace.documentation.decisions = [];
    }

    var elements = {};
    var elementsByCanonicalName = {};
    var hasElements = false;
    var hasContainers = false;
    var hasComponents = false;

    var relationships = {};

    var allViews = [];

    var elementStyles = {};
    var relationshipStyles = {};

    var open = false;
    var shareable = false;
    var localStorage = false;
    var brandingEnabled = false;

    var workspaceOwner;

    var maxId = 0;
    var unsavedChanges = false;
    var self = this;

    createInternalIndexOfStyles();
    createInternalIndexOfElementsAndRelationships();
    enrichViews();
    checkDocumentationIsValid();
    checkDecisionsAreValid();


    function createInternalIndexOfStyles() {
        if (views) {
            var styles = [];
            if (views.configuration && views.configuration.styles && views.configuration.styles.elements) {
                styles = views.configuration.styles.elements;
            } else if (views.styles && workspace.views.styles.elements) {
                styles = views.styles.elements;
            }

            for (var i = 0; i < styles.length; i++) {
                elementStyles[styles[i].tag] = styles[i];
            }

            styles = [];
            if (views.configuration && views.configuration.styles && views.configuration.styles.relationships) {
                styles = views.configuration.styles.relationships;
            } else if (views.styles && views.styles.relationships) {
                styles = views.styles.relationships;
            }
            for (i = 0; i < styles.length; i++) {
                relationshipStyles[styles[i].tag] = styles[i];
            }
        }
    }

    function checkDocumentationIsValid() {
        if (workspace.documentation !== undefined && workspace.documentation.sections !== undefined) {
            workspace.documentation.sections.forEach(function(section) {
                if (section.content === undefined) {
                    section.content = '';
                }
            })
        }
    }

    function checkDecisionsAreValid() {
        if (workspace.documentation !== undefined && workspace.documentation.decisions !== undefined) {
            workspace.documentation.decisions.forEach(function(decision) {
                if (decision.content === undefined) {
                    decision.content = '';
                }
            })
        }
    }

    function supplementElementStyleFromBranding(tag, colorPair) {
        if (colorPair && colorPair.background && colorPair.foreground) {
            var elementStyle = elementStyles[tag];
            if (elementStyle === undefined) {
                elementStyle = { tag: tag };
                elementStyles[tag] = elementStyle;
            }

            if (elementStyle.background === undefined && elementStyle.color === undefined) {
                elementStyle.background = colorPair.background;
                elementStyle.color = colorPair.foreground;
            }
        }
    }

    function createInternalIndexOfElementsAndRelationships() {
        if (model) {
            if (model.people) {
                for (i = 0; i < model.people.length; i++) {
                    var person = model.people[i];
                    person.parentId = undefined;
                    person.canonicalName = "/" + person.name.replace("/", "");
                    registerElement(person, "Person");
                }
            }
            if (model.softwareSystems) {
                for (i = 0; i < model.softwareSystems.length; i++) {
                    var softwareSystem = model.softwareSystems[i];
                    softwareSystem.parentId = undefined;
                    softwareSystem.canonicalName = "/" + softwareSystem.name.replace("/", "");
                    registerElement(softwareSystem, "SoftwareSystem");

                    if (softwareSystem.containers) {
                        for (var j = 0; j < softwareSystem.containers.length; j++) {
                            hasContainers = true;
                            var container = softwareSystem.containers[j];
                            container.parentId = softwareSystem.id;
                            container.canonicalName = softwareSystem.canonicalName + "/" + container.name.replace("/", "");
                            registerElement(container, "Container");

                            if (container.components) {
                                for (var k = 0; k < container.components.length; k++) {
                                    hasComponents = true;
                                    var component = container.components[k];
                                    component.parentId = container.id;
                                    component.canonicalName = container.canonicalName + "/" + component.name.replace("/", "");
                                    registerElement(component, "Component");
                                }
                            }
                        }
                    }
                }
            }

            if (model.deploymentNodes) {
                model.deploymentNodes.forEach(function(deploymentNode) {
                    createInternalIndexOfDeploymentNode(deploymentNode, undefined);
                });
            }
        }
    }

    function createInternalIndexOfDeploymentNode(deploymentNode, parent) {
        if (parent === undefined) {
            deploymentNode.parentId = undefined;
            deploymentNode.canonicalName = "/" + deploymentNode.name.replace("/", "");
        } else {
            deploymentNode.parentId = parent.id;
            deploymentNode.canonicalName = parent.canonicalName + "/" + deploymentNode.name.replace("/", "");
        }
        registerElement(deploymentNode, "DeploymentNode");

        if (deploymentNode.children) {
            deploymentNode.children.forEach(function(child) {
                createInternalIndexOfDeploymentNode(child, deploymentNode);
            });
        }

        if (deploymentNode.containerInstances) {
            deploymentNode.containerInstances.forEach(function(containerInstance) {
                var container = elements[containerInstance.containerId];
                containerInstance.canonicalName = container.canonicalName + '[' + containerInstance.instanceId +']';
                containerInstance.name = container.name;
                containerInstance.description = container.description;
                containerInstance.technology = container.technology;
                containerInstance.parentId = container.parentId;

                if (containerInstance.url === undefined) {
                    containerInstance.url = container.url;
                }


                if (!containerInstance.properties) {
                    containerInstance.properties = {};
                }
                if (container.properties) {
                    Object.keys(container.properties).forEach(function(key) {
                        if (!containerInstance.properties[key]) {
                            containerInstance.properties[key] = container.properties[key];
                        }
                    });
                }

                registerElement(containerInstance, "ContainerInstance");
            });
        }
    }

    function enrichViews() {
        var number = 1;

        if (views) {
            if (views.enterpriseContextViews) {
                workspace.views.enterpriseContextViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "SystemLandscape";
                    registerView(view);
                });
            }

            if (views.systemLandscapeViews) {
                workspace.views.systemLandscapeViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "SystemLandscape";
                    registerView(view);
                });
            }

            if (views.systemContextViews) {
                workspace.views.systemContextViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "SystemContext";
                    registerView(view);
                });
            }

            if (views.containerViews) {
                workspace.views.containerViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "Container";
                    registerView(view);
                });
            }
            if (views.componentViews) {
                workspace.views.componentViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "Component";
                    registerView(view);
                });
            }

            if (views.dynamicViews) {
                workspace.views.dynamicViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "Dynamic";
                    registerView(view);
                });
            }

            if (views.deploymentViews) {
                workspace.views.deploymentViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "Deployment";
                    registerView(view);
                });
            }

            if (views.filteredViews) {
                workspace.views.filteredViews.forEach(function(view) {
                    if (!view.key) {
                        view.key = '_' + number++;
                    }
                    view.type = "Filtered";
                    registerView(view);
                });
            }
        }
    }

    function registerView(view) {
        allViews.push(view);
    }

    function registerElement(element, type) {
        if (element) {
            element.type = type;

            hasElements = true;
            elements[element.id] = element;
            elementsByCanonicalName[element.canonicalName] = element;
            registerId(element.id);

            if (element.relationships) {
                for (var i = 0; i < element.relationships.length; i++) {
                    registerRelationship(element.relationships[i]);
                }
            }
        }
    }

    function registerRelationship(relationship) {
        relationships[relationship.id] = relationship;
        registerId(relationship.id);
    }

    this.getWorkspace = function() {
        return workspace;
    };

    this.getId = function() {
        return workspace && workspace.id ? workspace.id : -1;
    };

    this.getName = function() {
        return workspace && workspace.name ? workspace.name : "";
    };

    this.isEmpty = function() {
        return !hasElements;
    };

    this.hasEnterprise = function() {
        return model !== undefined && model.enterprise !== undefined;
    };

    this.getEnterprise = function() {
        return model.enterprise;
    };

    this.hasElements = function() {
        return hasElements;
    };

    this.getViews = function() {
        return allViews;
    };

    this.hasViews = function() {
        return this.hasSystemLandscapeViews() || this.hasSystemContextViews() || this.hasContainerViews() || this.hasComponentViews() || this.hasDynamicViews() || this.hasDeploymentViews();
    };

    this.hasSystemLandscapeViews = function() {
        if (views) {
            return (views.hasOwnProperty('systemLandscapeViews') && views.systemLandscapeViews.length > 0) || (views.hasOwnProperty('enterpriseContextViews') && views.enterpriseContextViews.length > 0);
        } else {
            return false;
        }
    };

    this.hasSystemContextViews = function() {
        if (views) {
            return (views.hasOwnProperty('systemContextViews') && views.systemContextViews.length > 0);
        } else {
            return false;
        }
    };

    this.hasContainerViews = function() {
        if (views) {
            return (views.hasOwnProperty('containerViews') && views.containerViews.length > 0);
        } else {
            return false;
        }
    };

    this.hasComponentViews = function() {
        if (views) {
            return (views.hasOwnProperty('componentViews') && views.componentViews.length > 0);
        } else {
            return false;
        }
    };

    this.hasDynamicViews = function() {
        if (views) {
            return (views.hasOwnProperty('dynamicViews') && views.dynamicViews.length > 0);
        } else {
            return false;
        }
    };

    this.hasDeploymentViews = function() {
        if (views) {
            return (views.hasOwnProperty('deploymentViews') && views.deploymentViews.length > 0);
        } else {
            return false;
        }
    };

    this.getDeploymentViews = function() {
        return views.deploymentViews;
    };

    this.getDefaultView = function() {
        if (views.configuration && views.configuration.defaultView) {
            return views.configuration.defaultView;
        } else {
            return undefined;
        }
    };

    this.setDefaultView = function(key) {
        if (!views.configuration) {
            views.configuration = {};
        }

        views.configuration.defaultView = key;
    };

    this.getLastSavedView = function() {
        if (views.configuration && views.configuration.lastSavedView) {
            return views.configuration.lastSavedView;
        } else {
            return undefined;
        }
    };

    this.setLastSavedView = function(key) {
        if (!views.configuration) {
            views.configuration = {};
        }

        views.configuration.lastSavedView = key;
    };

    this.getBranding = function() {
        var branding = {
            font: {
                name: 'Open Sans',
                url: undefined
            },
            logo: undefined
        };

        if (brandingEnabled) {
            if (views.configuration && views.configuration.branding) {
                var b = views.configuration.branding;
                if (b.font && b.font.name) {
                    branding.font = b.font;
                }

                if (b.logo) {
                    branding.logo = b.logo;
                }
            }
        }

        return branding;
    };

    this.getFont = function() {
        var font = {
            name: 'Open Sans',
            url: undefined
        };

        if (brandingEnabled) {
            if (views.configuration && views.configuration.branding && views.configuration.branding.font) {
                font = views.configuration.branding.font;

                if (!font.name) {
                    font.name = "Open Sans";
                    font.url = undefined;
                }
            }
        }

        return font;
    };

    this.hasDocumentation = function() {
        if (workspace.documentation) {
            return workspace.documentation.hasOwnProperty('sections') && workspace.documentation.sections.length > 0;
        } else {
            return false;
        }
    };

    this.getDocumentation = function() {
        return workspace.documentation;
    };

    this.hasDecisions = function() {
        if (workspace.documentation) {
            return workspace.documentation.hasOwnProperty('decisions') && workspace.documentation.decisions.length > 0;
        } else {
            return false;
        }
    };

    this.getDecisions = function() {
        return workspace.documentation.decisions;
    };

    this.hasHealthChecks = function() {
        var healthChecks = false;
        Object.keys(elements).forEach(function(key,index) {
            var element = elements[key];
            healthChecks = healthChecks || (element.hasOwnProperty('healthChecks') && element.healthChecks.length > 0);
        });

        return healthChecks;
    };

    this.hasContainers = function() {
        return hasContainers;
    };

    this.getAllContainers = function() {
        var containers = [];

        Object.keys(elements).forEach(function(key, index) {
            var element = elements[key];
            if (element.type === 'Container') {
                containers.push(element);
            }
        });

        return containers;
    };

    this.hasComponents = function() {
        return hasComponents;
    };

    this.getModel = function() {
        return model;
    };

    this.getElementStyles = function() {
        return elementStyles;
    };

    this.getElementStyle = function(tag) {
        return this.getElementStyles()[tag];
    };

    this.getElementStylesAsArray = function() {
        var styles = [];

        Object.keys(elementStyles).forEach(function(key, index) {
            styles.push(elementStyles[key]);
        });

        return styles;
    };

    this.getRelationshipStyles = function() {
        return relationshipStyles;
    };

    this.getRelationshipStyle = function(tag) {
        return this.getRelationshipStyles()[tag];
    };

    this.getRelationshipStylesAsArray = function() {
        var styles = [];

        Object.keys(relationshipStyles).forEach(function(key, index) {
            styles.push(relationshipStyles[key]);
        });

        return styles;
    };

    this.getElements = function() {
        return elements;
    };

    this.getElementsAsArray = function() {
        return Object.keys(elements).map(function(id) {
            return elements[id];
        });
    };

    this.getSoftwareSystems = function() {
        return this.getElementsAsArray().filter(function(element) {
            return element.type === 'SoftwareSystem';
        })
    };

    this.getContainers = function() {
        return this.getElementsAsArray().filter(function(element) {
            return element.type === 'Container';
        })
    };

    this.findElement = function(id) {
        return elements[id];
    };

    this.findElementByCanonicalName = function(canonicalName) {
        return elementsByCanonicalName[canonicalName];
    };

    this.getRelationships = function() {
        return relationships;
    };

    this.getRelationshipsAsArray = function() {
        return Object.keys(relationships).map(function(id) {
            return relationships[id];
        });
    };

    this.findRelationship = function(id) {
        return relationships[id];
    };

    this.getViewByNumber = function(number) {
        return allViews[number-1];
    };

    this.getViewByKey = function(key) {
        var view = undefined;
        var views = this.getViews();
        views.forEach(function(v) {
            if (v.key && v.key === key) {
                view = v;
            }
        });

        return view;
    };

    this.findElementStyle = function(element, defaultStyle) {
        var style = new Structurizr.ElementStyle(
            defaultStyle.width,
            defaultStyle.height,
            defaultStyle.background,
            defaultStyle.color,
            defaultStyle.fontSize,
            defaultStyle.shape,
            defaultStyle.border,
            defaultStyle.opacity,
            defaultStyle.metadata,
            defaultStyle.description);
        style.tags = [ "Element" ];

        if (element.tags) {
            var tags = element.tags.split(",");
            for (var i = 0; i < tags.length; i++) {
                var elementStyle = this.getElementStyles()[tags[i].trim()];
                if (elementStyle) {
                    style.copyStyleAttributeIfSpecified(elementStyle, 'width');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'height');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'background');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'color');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'fontSize');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'shape');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'border');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'opacity');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'metadata');
                    style.copyStyleAttributeIfSpecified(elementStyle, 'description');
                    style.tag = tags[i].trim();
                    style.tags.push(tags[i].trim());
                }
            }
        }

        return style;
    };

    this.findRelationshipStyle = function(relationship, defaultStyle) {
        var style = new Structurizr.RelationshipStyle(
            defaultStyle.thickness,
            defaultStyle.color,
            defaultStyle.dashed,
            defaultStyle.routing,
            defaultStyle.fontSize,
            defaultStyle.width,
            defaultStyle.position,
            defaultStyle.opacity);
        style.tags = [ "Relationship" ];

        if (relationship.tags) {
            var tags = relationship.tags.split(",");
            for (var i = 0; i < tags.length; i++) {
                var relationshipStyle = this.getRelationshipStyles()[tags[i].trim()];
                if (relationshipStyle) {
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'thickness');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'color');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'dashed');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'routing');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'fontSize');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'width');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'position');
                    style.copyStyleAttributeIfSpecified(relationshipStyle, 'opacity');
                    style.tag = tags[i].trim();
                    style.tags.push(tags[i].trim());
                }
            }
        }

        return style;
    };

    this.getViewConfiguration = function() {
        if (workspace.views && workspace.views.configuration) {
            return workspace.views.configuration;
        } else {
            return {};
        }
    };

    this.getTitleForView = function(view) {
        // if a title has been provided, use that
        if (view && view.title && view.title.trim().length > 0) {
            return view.title;
        }

        var title = '';

        if (view.type === 'SystemLandscape') {
            var enterprise = workspace.model.enterprise;
            title = "System Landscape diagram" + ((enterprise && enterprise.name)? " for " + enterprise.name : "");
        } else if (view.type === "SystemContext") {
            var softwareSystem = this.findElement(view.softwareSystemId);
            title = "System Context diagram for " + softwareSystem.name;
        } else if (view.type === "Container") {
            var softwareSystem = this.findElement(view.softwareSystemId);
            title = "Container diagram for " + softwareSystem.name;
        } else if (view.type === "Component") {
            var softwareSystem = this.findElement(view.softwareSystemId);
            var container = this.findElement(view.containerId);
            title = "Component diagram for " + softwareSystem.name + " - " + container.name;
        } else if (view.type === "Dynamic") {
            if (view.elementId) {
                var element = this.findElement(view.elementId);
                title = "Dynamic diagram for " + element.name;
            } else {
                title = "Dynamic diagram";
            }
        } else if (view.type === "Deployment") {
            if (view.softwareSystemId) {
                var softwareSystem = this.findElement(view.softwareSystemId);
                title = "Deployment diagram for " + softwareSystem.name;
            } else {
                title = "Deployment diagram";
            }

            if (view.environment !== undefined) {
                title += ' - ' + view.environment;
            }
        }

        return title;
    };

    this.getElementsInView = function(view) {
        var elements = [];

        if (view.elements) {
            for (var i = 0; i < view.elements.length; i++) {
                var element = this.findElement(view.elements[i].id);
                if (element) {
                    elements.push(element);
                }
            }
        }

        return elements;
    };

    this.getRelationshipsInView = function(view) {
        var relationships = [];

        if (view.relationships) {
            for (var i = 0; i < view.relationships.length; i++) {
                var relationship = this.findRelationship(view.relationships[i].id);
                if (relationship) {
                    relationships.push(relationship);
                }
            }
        }

        return relationships;
    };

    this.findFirstSystemContextViewForSoftwareSystem = function(element) {
        if (this.hasSystemContextViews()) {
            for (var i = 0; i < views.systemContextViews.length; i++) {
                var view = views.systemContextViews[i];
                if (view.softwareSystemId == element.id) {
                    return view;
                }
            }
        }
    };

    this.findFirstContainerViewForSoftwareSystem = function(element) {
        if (this.hasContainerViews()) {
            for (var i = 0; i < views.containerViews.length; i++) {
                var view = views.containerViews[i];
                if (view.softwareSystemId == element.id) {
                    return view;
                }
            }
        }
    };

    this.findFirstComponentViewForContainer = function(element) {
        if (this.hasComponentViews()) {
            for (var i = 0; i < views.componentViews.length; i++) {
                var view = views.componentViews[i];
                if (view.containerId == element.id) {
                    return view;
                }
            }
        }
    };

    this.setOpen = function(bool) {
        open = bool;
    };

    this.isOpen = function() {
        return open;
    };

    this.setShareable = function(bool) {
        shareable = bool;
    };

    this.isShareable = function() {
        return shareable;
    };

    this.setLocalStorage = function(bool) {
        localStorage = bool;
    };

    this.isLocalStorage = function() {
        return localStorage;
    };

    this.setBranding = function(bool) {
        brandingEnabled = bool;
    };

    this.setWorkspaceOwner = function(owner) {
        workspaceOwner = owner;
    };

    this.getWorkspaceOwner = function() {
        return workspaceOwner;
    };

    this.setLastModifiedDate = function(date) {
        if (workspace.lastModifiedDate === undefined) {
            workspace.lastModifiedDate = date;
        }
    };

    this.getLastModifiedDate = function() {
        return workspace.lastModifiedDate;
    };

    this.getVersion = function() {
        return workspace.version;
    };

    this.getWarnings = function() {
        var warnings = [];

        Object.keys(elements).forEach(function(key) {
            var element = elements[key];

            if (element.type !== 'ContainerInstance' && element.type !== 'DeploymentNode') {
                if (element.description === undefined || element.description.trim().length === 0) {
                    warnings.push({element: element, message: "is missing a description"});
                }
            }

            if ((element.type === 'Container' || element.type === 'Component') && !element.technology) {
                warnings.push({ element: element, message: "is missing a technology" });
            }
        });

        Object.keys(relationships).forEach(function(key) {
            var relationship = relationships[key];

            if (!relationship.description) {
                var source = elements[relationship.sourceId];
                var destination = elements[relationship.destinationId];
                if (source.type === 'Component' && destination.type === 'Component' && source.containerId != destination.containerId) {
                    warnings.push({ relationship: relationship, message: "is missing a description" });
                }
            }
        });

        Object.keys(elementStyles).forEach(function(key) {
            var elementStyle = elementStyles[key];

            if (elementStyle.metadata !== undefined && elementStyle.metadata === false) {
                warnings.push({ elementStyle: elementStyle, message: "is hiding the element metadata - this is not recommended" });
            }

            if (elementStyle.description !== undefined && elementStyle.description === false) {
                warnings.push({ elementStyle: elementStyle, message: "is hiding the element description - this is not recommended" });
            }
        });

        return warnings;
    };

    function getTerminology(key, defaultValue) {
        if (workspace.views.configuration && workspace.views.configuration.terminology && workspace.views.configuration.terminology.hasOwnProperty(key)) {
            return workspace.views.configuration.terminology[key];
        } else {
            return defaultValue;
        }
    }

    this.getTerminologyForEnterprise = function() {
        return getTerminology('enterprise', 'Enterprise');
    };

    this.getTerminologyForElement = function(element) {
        if (element.type === 'Person') {
            return this.getTerminologyForPerson();
        } else if (element.type === 'SoftwareSystem') {
            return this.getTerminologyForSoftwareSystem();
        } else if (element.type === 'Container') {
            return this.getTerminologyForContainer();
        } else if (element.type === 'Component') {
            return this.getTerminologyForComponent();
        }

        return '';
    };

    this.getTerminologyForPerson = function() {
        return getTerminology('person', 'Person');
    };

    this.getTerminologyForSoftwareSystem = function() {
        return getTerminology('softwareSystem', 'Software System');
    };

    this.getTerminologyForContainer = function() {
        return getTerminology('container', 'Container');
    };

    this.getTerminologyForComponent = function() {
        return getTerminology('component', 'Component');
    };

    this.getTerminologyForCode = function() {
        return getTerminology('code', 'Code');
    };

    this.getTerminologyForDeploymentNode = function() {
        return getTerminology('deploymentNode', 'Deployment Node');
    };

    this.getRawJson = function() {
        var json = this.cloneWorkspaceAndRemoveUnnecessaryElements();
        return JSON.stringify(json, null, '    ');
    };

    this.updateWorkspace = function(name, description) {
        if (name === undefined || name.trim().length === 0) {
            throw "A name must be specified.";
        }

        workspace.name = name;
        workspace.description = description;
        this.setUnsavedChanges(true);
    };

    function hasAssociatedViews(element) {
        var result = false;

        self.getViews().forEach(function(view) {
            if (view.softwareSystemId && view.softwareSystemId === element.id) {
                result = true;
            }

            if (view.containerId && view.containerId === element.id) {
                result = true;
            }
        });

        return result;
    }

    function hasAssociatedDocumentation(element) {
        var result = false;
        workspace.documentation.sections.forEach(function(section) {
            if (section.elementId !== undefined && section.elementId === element.id) {
                result = true;
            }
        });

        workspace.documentation.decisions.forEach(function(decision) {
            if (decisions.elementId !== undefined && decisions.elementId === element.id) {
                result = true;
            }
        });

        if (element.type === 'SoftwareSystem') {
            if (element.containers) {
                element.containers.forEach(function(container) {
                    result |= hasAssociatedDocumentation(container);
                });
            }
        } else if (element.type === 'Container') {
            if (element.components) {
                element.components.forEach(function(component) {
                    result |= hasAssociatedDocumentation(component);
                });
            }
        }

        return result;
    }

    this.deleteElement = function(id) {
        var element = this.findElement(id);
        if (element) {
            if (hasAssociatedViews(element)) {
                throw "This element has views associated with it, and cannot be deleted.";
            }

            if (hasAssociatedDocumentation(element)) {
                throw "This element has documentation associated with it, and cannot be deleted.";
            }

            if (element.type === 'Person') {
                deleteRelationships(element);

                var index = model.people.indexOf(element);
                model.people.splice(index, 1);
            } else if (element.type === 'Component') {
                deleteRelationships(element);

                var container = self.findElement(element.parentId);
                var index = container.components.indexOf(element);
                container.components.splice(index, 1);
            } else if (element.type === 'Container') {
                if (element.components) {
                    for (var i = element.components.length; i--; i > 0) {
                        self.deleteElement(element.components[i].id);
                    }
                }

                deleteRelationships(element);
                var softwareSystem = self.findElement(element.parentId);
                var index = softwareSystem.containers.indexOf(element);
                softwareSystem.containers.splice(index, 1);
            } else if (element.type === 'SoftwareSystem') {
                if (element.containers) {
                    for (var i = element.containers.length; i--; i > 0) {
                        self.deleteElement(element.containers[i].id);
                    }
                }

                deleteRelationships(element);
                var index = model.softwareSystems.indexOf(element);
                model.softwareSystems.splice(index, 1);
            }

            var views = this.getViews();
            if (views !== undefined) {
                views.forEach(function(view) {
                    if (view.elements !== undefined) {
                        for (var i = view.elements.length; i--; i > 0) {
                            if (view.elements[i].id === id) {
                                view.elements.splice(i, 1);
                            }
                        }
                    }
                })
            }

            delete elements[element.id];
            this.setUnsavedChanges(true);
        }
    };

    function deleteRelationships(element) {
        var relationshipIds = Object.keys(relationships);
        for (var i = relationshipIds.length; i--; i > 0) {
            var relationship = relationships[relationshipIds[i]];
            if (relationship.sourceId === element.id || relationship.destinationId === element.id) {
                self.deleteRelationship(relationship.id);
            }
        }
    }

    this.updateRelationship = function(id, description, technology, tags) {
        description = trim(description);
        technology = trim(technology);
        tags = trim(tags);

        var relationship = this.findRelationship(id);

        if (relationship) {
            var source = this.findElement(relationship.sourceId);
            var destination = this.findElement(relationship.destinationId);

            if (relationship.description !== description) {
                if (hasRelationship(source, description, destination)) {
                    throw "A relationship between " + source.name + " and " + destination.name + ' with a description of "' + description + '" already exists.';
                }
            }

            relationship.description = description;
            relationship.technology = technology;
            relationship.tags = createTagsList(['Relationship'], tags);

            this.setUnsavedChanges(true);
        }
    };

    this.addRelationship = function(sourceId, description, technology, destinationId) {
        var source = this.findElement(sourceId);
        if (source === undefined) {
            throw "The source element with an ID of " + sourceId + " does not exist.";
        }

        var destination = this.findElement(destinationId);
        if (destination === undefined) {
            throw "The destination element with an ID of " + destinationId + " does not exist.";
        }

        description = trim(description);
        technology = trim(technology);

        if (source.relationships === undefined) {
            source.relationships = [];
        }

        if (hasRelationship(source, description, destination)) {
            throw "A relationship between " + source.name + " and " + destination.name + ' with a description of "' + description + '" already exists.';
        }

        var relationship = {
            id: getNextId(),
            sourceId: sourceId,
            description: description,
            technology: technology,
            destinationId: destinationId,
            tags: 'Relationship'
        };

        source.relationships.push(relationship);
        registerRelationship(relationship);
        this.setUnsavedChanges(true);

        // add the relationship to all views with the source and destination
        var views = this.getViews();
        views.forEach(function(view) {
            if (view.elements) {
                var elementIds = view.elements.map(function (elementView) {
                    return elementView.id;
                });

                if (elementIds.indexOf(sourceId) > -1 && elementIds.indexOf(destinationId) > -1) {
                    view.relationships.push(
                        {
                            id: relationship.id
                        }
                    );
                }
            }
        });

        return relationship;
    };

    this.deleteRelationship = function(id) {
        var relationship = this.findRelationship(id);
        if (relationship) {
            var source = this.findElement(relationship.sourceId);
            var index = source.relationships.indexOf(relationship);
            source.relationships.splice(index, 1);
            delete relationships[id];

            // also remove the relationship from views
            var views = this.getViews();
            views.forEach(function(view) {
                if (view.relationships) {
                    for (var i = view.relationships.length-1; i >= 0; i--) {
                        if (view.relationships[i].id === id) {
                            view.relationships.splice(i, 1);
                        }
                    }
                }
            });

            this.setUnsavedChanges(true);
        } else {
            throw "The relationship with an ID of " + id + " does not exist in the model.";
        }
    };

    function hasRelationship(source, description, destination) {
        if (description === undefined) {
            description = '';
        }
        description = description.trim();

        var found = false;
        if (source.relationships) {
            source.relationships.forEach(function(relationship){
                if (relationship.destinationId === destination.id && relationship.description === description) {
                    found = true;
                }
            });
        }

        return found;
    }

    function registerId(id) {
        if (!isNaN(id)) {
            var idAsNumber = parseInt(id, 10);
            if (idAsNumber > maxId) {
                maxId = idAsNumber;
            }
        }
    }

    function getNextId() {
        return "" + (++maxId);
    }

    function hasPersonWithName(name) {
        var peopleWithTheSameName = model.people.filter(function(person) {
            return person.name === name;
        });

        return peopleWithTheSameName.length > 0;
    }

    function hasSoftwareSystemWithName(name) {
        var softwareSystemsWithTheSameName = model.softwareSystems.filter(function(softwareSystem) {
            return softwareSystem.name === name;
        });

        return softwareSystemsWithTheSameName.length > 0;
    }

    function hasContainerWithName(softwareSystem, name) {
        if (softwareSystem && softwareSystem.containers) {
            var containersWithTheSameName = softwareSystem.containers.filter(function (container) {
                return container.name === name;
            });

            return containersWithTheSameName.length > 0;
        } else {
            return false;
        }

    }

    function hasComponentWithName(container, name) {
        if (container && container.components) {
            var componentsWithTheSameName = container.components.filter(function(component) {
                return component.name === name;
            });

            return componentsWithTheSameName.length > 0;
        } else {
            return false;
        }
    }

    function trim(s) {
        if (s === undefined || s === null) {
            return '';
        } else {
            return s.trim();
        }
    }

    function validateUrl(s) {
        if (s !== undefined && s.trim().length > 0) {
            return /^((https?):\/\/).*$/.test(s);
        } else {
            return true;
        }
    }

    function createTagsList(requiredTags, customTags) {
        var tags = requiredTags;

        customTags.split(',').forEach(function(tag) {
            tag = trim(tag);

            if (tags.indexOf(tag) === -1) {
                tags.push(tag);
            }
        });

        var tagsAsString = '';
        tags.forEach(function(tag) {
            tagsAsString += tag;
            tagsAsString += ',';
        });

        return tagsAsString.substr(0, tagsAsString.length-1);
    }

    this.addPerson = function(name, description) {
        name = trim(name);
        description = trim(description);

        if (name.length === 0) {
            throw "A name must be specified.";
        }

        if (hasPersonWithName(name)) {
            throw "A person named '" + name + "' already exists.";
        }

        if (hasSoftwareSystemWithName(name)) {
            throw "A software system named '" + name + "' already exists.";
        }

        var person = {
            id: getNextId(),
            name: name,
            description: description,
            tags: 'Element,Person'
        };

        model.people.push(person);
        registerElement(person, 'Person', undefined);
        this.setUnsavedChanges(true);

        return person;
    };

    this.updatePerson = function(id, name, description, url, tags) {
        var element = this.findElement(id);
        if (element !== undefined && element.type === 'Person') {
            name = trim(name);
            description = trim(description);
            url = trim(url);
            tags = trim(tags);

            if (name.length === 0) {
                throw "A name must be specified.";
            }

            if (element.name !== name) {
                if (hasPersonWithName(name)) {
                    throw "A person named '" + name + "' already exists.";
                }

                if (hasSoftwareSystemWithName(name)) {
                    throw "A software system named '" + name + "' already exists.";
                }
            }

            if (!validateUrl(url)) {
                throw url + ' does not look like a valid URL.';
            }

            element.name = name;
            element.description = description;
            element.url = url;
            element.tags = createTagsList(['Element', 'Person'], tags);
            this.setUnsavedChanges(true);
        } else {
            throw "A person with an ID of " + id + " does not exist in the model.";
        }
    };

    this.addSoftwareSystem = function(name, description) {
        name = trim(name);
        description = trim(description);

        if (name.length === 0) {
            throw "A name must be specified.";
        }

        if (hasPersonWithName(name)) {
            throw "A person named '" + name + "' already exists.";
        }

        if (hasSoftwareSystemWithName(name)) {
            throw "A software system named '" + name + "' already exists.";
        }

        var softwareSystem = {
            id: getNextId(),
            name: name,
            description: description,
            tags: 'Element,Software System'
        };

        model.softwareSystems.push(softwareSystem);
        registerElement(softwareSystem, 'SoftwareSystem', undefined);
        this.setUnsavedChanges(true);

        return softwareSystem;
    };

    this.updateSoftwareSystem = function(id, name, description, url, tags) {
        var element = this.findElement(id);
        if (element !== undefined && element.type === 'SoftwareSystem') {
            name = trim(name);
            description = trim(description);
            url = trim(url);
            tags = trim(tags);

            if (name.length === 0) {
                throw "A name must be specified.";
            }

            if (element.name !== name) {
                if (hasPersonWithName(name)) {
                    throw "A person named '" + name + "' already exists.";
                }

                if (hasSoftwareSystemWithName(name)) {
                    throw "A software system named '" + name + "' already exists.";
                }
            }

            if (!validateUrl(url)) {
                throw url + ' does not look like a valid URL.';
            }

            element.name = name;
            element.description = description;
            element.url = url;
            element.tags = createTagsList(['Element', 'Software System'], tags);
            this.setUnsavedChanges(true);
        } else {
            throw "A software system with an ID of " + id + " does not exist in the model.";
        }
    };

    this.addContainer = function(softwareSystemId, name, description, technology) {
        name = trim(name);
        description = trim(description);
        technology = trim(technology);

        var softwareSystem = this.findElement(softwareSystemId);
        if (softwareSystem !== undefined && softwareSystem.type === 'SoftwareSystem') {
            if (name.length === 0) {
                throw "A name must be specified.";
            }

            if (softwareSystem.containers === undefined) {
                softwareSystem.containers = [];
            }

            if (hasContainerWithName(softwareSystem, name)) {
                throw "A container named '" + name + "' already exists.";
            }

            var container = {
                id: getNextId(),
                name: name,
                description: description,
                technology: technology,
                tags: 'Element,Container',
                parentId: softwareSystem.id
            };

            softwareSystem.containers.push(container);
            registerElement(container, 'Container', softwareSystem);
            this.setUnsavedChanges(true);

            return container;
        } else {
            throw "The software system with an ID of " + softwareSystemId + " does not exist in the model.";
        }
    };

    this.updateContainer = function(id, name, description, technology, url, tags) {
        name = trim(name);
        description = trim(description);
        technology = trim(technology);
        url = trim(url);
        tags = trim(tags);

        var element = this.findElement(id);
        if (element !== undefined && element.type === 'Container') {

            if (name.length === 0) {
                throw "A name must be specified.";
            }

            if (element.name !== name) {
                var softwareSystem = this.findElement(element.parentId);
                if (hasContainerWithName(softwareSystem, name)) {
                    throw "A container named '" + name + "' already exists.";
                }
            }

            if (!validateUrl(url)) {
                throw url + ' does not look like a valid URL.';
            }

            element.name = name;
            element.description = description;
            element.technology = technology;
            element.url = url;
            element.tags = createTagsList(['Element', 'Container'], tags);
            this.setUnsavedChanges(true);
        } else {
            throw "A container with an ID of " + id + " does not exist in the model.";
        }
    };

    this.addComponent = function(containerId, name, description, technology) {
        name = trim(name);
        description = trim(description);
        technology = trim(technology);

        var container = this.findElement(containerId);
        if (container !== undefined && container.type === 'Container') {
            if (name.length === 0) {
                throw "A name must be specified.";
            }

            if (container.components === undefined) {
                container.components = [];
            }

            if (hasComponentWithName(container, name)) {
                throw "A component named '" + name + "' already exists.";
            }

            var component = {
                id: getNextId(),
                name: name,
                description: description,
                technology: technology,
                tags: 'Element,Component',
                parentId: container.id
            };

            container.components.push(component);
            registerElement(component, 'Component', container);
            this.setUnsavedChanges(true);

            return component;
        } else {
            throw "The container with an ID of " + containerId + " does not exist in the model.";
        }
    };

    this.updateComponent = function(id, name, description, technology, url, tags) {
        name = trim(name);
        description = trim(description);
        technology = trim(technology);
        url = trim(url);
        tags = trim(tags);

        var element = this.findElement(id);
        if (element !== undefined && element.type === 'Component') {

            if (name.length === 0) {
                throw "A name must be specified.";
            }

            if (element.name !== name) {
                var container = this.findElement(element.parentId);
                if (hasComponentWithName(container, name)) {
                    throw "A component named '" + name + "' already exists.";
                }
            }

            if (!validateUrl(url)) {
                throw url + ' does not look like a valid URL.';
            }

            element.name = name;
            element.description = description;
            element.technology = technology;
            element.url = url;
            element.tags = createTagsList(['Element', 'Component'], tags);
            this.setUnsavedChanges(true);
        } else {
            throw "A component with an ID of " + id + " does not exist in the model.";
        }
    };

    var unsavedChangesCallback;

    this.setUnsavedChangesCallback = function(callback) {
        unsavedChangesCallback = callback;
    };

    this.setUnsavedChanges = function(bool) {
        unsavedChanges = bool;

        if (unsavedChangesCallback !== undefined) {
            unsavedChangesCallback(bool);
        }
    };

    this.isUnsavedChanges = function() {
        return unsavedChanges;
    };

    this.getPermittedElementsForView = function(view) {
        var permittedElements = [];

        if (view.type === 'SystemLandscape') {
            this.getElementsAsArray().forEach(function(element) {
                if (element.type === 'Person' || element.type === 'SoftwareSystem') {
                    permittedElements.push(element);
                }
            });
        } else if (view.type === 'SystemContext') {
            this.getElementsAsArray().forEach(function(element) {
                if (element.type === 'Person') {
                    permittedElements.push(element);
                } else if (element.type === 'SoftwareSystem') {
                    if (element.id !== view.softwareSystemId) {
                        permittedElements.push(element);
                    }
                }
            });
        } else if (view.type === 'Container') {
            this.getElementsAsArray().forEach(function(element) {
                if (element.type === 'Person') {
                    permittedElements.push(element);
                } else if (element.type === 'SoftwareSystem') {
                    if (element.id !== view.softwareSystemId) {
                        permittedElements.push(element);
                    }
                } else if (element.type === 'Container') {
                    if (element.parentId === view.softwareSystemId) {
                        permittedElements.push(element);
                    }
                }
            });
        } else if (view.type === 'Component') {
            this.getElementsAsArray().forEach(function(element) {
                if (element.type === 'Person') {
                    permittedElements.push(element);
                } else if (element.type === 'SoftwareSystem') {
                    if (element.id !== view.softwareSystemId) {
                        permittedElements.push(element);
                    }
                } else if (element.type === 'Container') {
                    if (element.parentId === view.softwareSystemId && element.id !== view.containerId) {
                        permittedElements.push(element);
                    }
                } else if (element.type === 'Component') {
                    if (element.parentId === view.containerId) {
                        permittedElements.push(element);
                    }
                }
            });
        }

        return permittedElements;
    };

    function hasViewWithKey(key) {
        return self.getViewByKey(key) !== undefined;
    }

    this.deleteView = function(key) {
        key = trim(key);

        if (key.length === 0) {
            throw "A key must be specified.";
        }

        if (!hasViewWithKey(key)) {
            throw "A view with the key \"" + key + "\" does not exist.";
        }

        var view = this.getViewByKey(key);

        if (view.type === 'SystemLandscape') {
            var index = views.systemLandscapeViews.indexOf(view);
            views.systemLandscapeViews.splice(index, 1);
        } else if (view.type === 'SystemContext') {
            var index = views.systemContextViews.indexOf(view);
            views.systemContextViews.splice(index, 1);
        } else if (view.type === 'Container') {
            var index = views.containerViews.indexOf(view);
            views.containerViews.splice(index, 1);
        } else if (view.type === 'Component') {
            var index = views.componentViews.indexOf(view);
            views.componentViews.splice(index, 1);
        } else if (view.type === 'Dynamic') {
            var index = views.dynamicViews.indexOf(view);
            views.dynamicViews.splice(index, 1);
        } else if (view.type === 'Deployment') {
            var index = views.deploymentViews.indexOf(view);
            views.deploymentViews.splice(index, 1);
        } else if (view.type === 'Filtered') {
            var index = views.filteredViews.indexOf(view);
            views.filteredViews.splice(index, 1);
        }

        allViews.splice(allViews.indexOf(view), 1);
        this.setUnsavedChanges(true);
    };

    function validateViewKey(key) {
        if (!key.match(/^[A-Za-z0-9]+$/)) {
            throw "Keys must contain alphanumeric characters only."
        }
    }

    this.createSystemLandscapeView = function(key, description) {
        key = trim(key);
        description = trim(description);

        if (key.length === 0) {
            throw "A key must be specified.";
        }

        validateViewKey(key);

        if (hasViewWithKey(key)) {
            throw "A view with the key \"" + key + "\" already exists.";
        }

        var view = {
            key: key,
            description: description,
            type: 'SystemLandscape'
        };

        workspace.views.systemLandscapeViews.push(view);
        registerView(view);
        this.setUnsavedChanges(true);

        return view;
    };

    this.createSystemContextView = function(key, description, softwareSystemId) {
        key = trim(key);
        description = trim(description);
        softwareSystemId = trim(softwareSystemId);

        if (key.length === 0) {
            throw "A key must be specified.";
        }

        validateViewKey(key);

        if (hasViewWithKey(key)) {
            throw "A view with the key \"" + key + "\" already exists.";
        }

        if (softwareSystemId.length === 0) {
            throw "A software system ID must be specified.";
        }

        var softwareSystem = this.findElement(softwareSystemId);
        if (softwareSystem === undefined || softwareSystem.type !== 'SoftwareSystem') {
            throw "The element with an ID of " + softwareSystemId + " is not a software system.";
        }

        var view = {
            key: key,
            description: description,
            type: 'SystemContext',
            softwareSystemId: softwareSystemId
        };

        workspace.views.systemContextViews.push(view);
        registerView(view);
        this.setUnsavedChanges(true);

        return view;
    };

    this.createContainerView = function(key, description, softwareSystemId) {
        key = trim(key);
        description = trim(description);
        softwareSystemId = trim(softwareSystemId);

        if (key.length === 0) {
            throw "A key must be specified.";
        }

        validateViewKey(key);

        if (hasViewWithKey(key)) {
            throw "A view with the key \"" + key + "\" already exists.";
        }

        if (softwareSystemId.length === 0) {
            throw "A software system ID must be specified.";
        }

        var softwareSystem = this.findElement(softwareSystemId);
        if (softwareSystem === undefined || softwareSystem.type !== 'SoftwareSystem') {
            throw "The element with an ID of " + softwareSystemId + " is not a software system.";
        }

        var view = {
            key: key,
            description: description,
            type: 'Container',
            softwareSystemId: softwareSystemId
        };

        workspace.views.containerViews.push(view);
        registerView(view);
        this.setUnsavedChanges(true);

        return view;
    };

    this.createComponentView = function(key, description, containerId) {
        key = trim(key);
        description = trim(description);
        containerId = trim(containerId);

        if (key.length === 0) {
            throw "A key must be specified.";
        }

        validateViewKey(key);

        if (hasViewWithKey(key)) {
            throw "A view with the key \"" + key + "\" already exists.";
        }

        if (containerId.length === 0) {
            throw "A container ID must be specified.";
        }

        var container = this.findElement(containerId);
        if (container === undefined || container.type !== 'Container') {
            throw "The element with an ID of " + containerId + " is not a container.";
        }

        var view = {
            key: key,
            description: description,
            type: 'Component',
            softwareSystemId: container.parentId,
            containerId: containerId
        };

        workspace.views.componentViews.push(view);
        registerView(view);
        this.setUnsavedChanges(true);

        return view;
    };

    this.updateView = function(key, description, elements) {
        key = trim(key);
        description = trim(description);

        if (elements === undefined) {
            elements = [];
        }

        var view = this.getViewByKey(key);
        if (view === undefined) {
            throw "A view with the key \"" + key + "\" does not exist.";
        }

        if (view.type === 'SystemContext') {
            elements.push(view.softwareSystemId);
        }

        view.description = description;
        this.updateElementsAndRelationshipsInView(view, elements);
        this.setUnsavedChanges(true);
    };

    this.updateElementsAndRelationshipsInView = function(view, elements) {
        var previousElements = view.elements;
        var previousRelationships = view.relationships;
        view.elements = [];
        view.relationships = [];

        var relationshipIds = [];
        var allRelationships = this.getRelationshipsAsArray();

        elements.forEach(function(elementId) {
            var elementInView = {
                id: elementId
            };

            if (previousElements) {
                previousElements.forEach(function (previousElementInView) {
                    if (previousElementInView.id === elementId) {
                        elementInView.x = previousElementInView.x;
                        elementInView.y = previousElementInView.y;
                    }
                });
            }

            view.elements.push(elementInView);

            allRelationships.forEach(function(relationship) {
                if (relationship.sourceId === elementId || relationship.destinationId === elementId) {
                    if (relationshipIds.indexOf(relationship.id) === -1) {
                        relationshipIds.push(relationship.id);
                    }
                }
            });

        });

        relationshipIds.forEach(function(relationshipId) {
            var relationshipInView = {
                id: relationshipId
            };

            if (previousRelationships) {
                previousRelationships.forEach(function (previousRelationshipInView) {
                    if (previousRelationshipInView.id === relationshipId) {
                        relationshipInView.position = previousRelationshipInView.position;
                        relationshipInView.vertices = previousRelationshipInView.vertices;
                    }
                });
            }

            view.relationships.push(relationshipInView);
        });

    };

    this.addElementStyle = function(tag) {
        tag = trim(tag);

        if (tag.length === 0) {
            throw "A tag must be specified.";
        }

        if (this.getElementStyle(tag) !== undefined) {
            throw "An element style with a tag of \"" + tag + "\" already exists.";
        }

        var elementStyle = {
            tag: tag
        };
        workspace.views.configuration.styles.elements.push(elementStyle);

        elementStyles[tag] = elementStyle;
        this.setUnsavedChanges(true);

        return elementStyle;
    };

    this.updateElementStyle = function(tag, shape, background, color, width, height, fontSize, border, opacity, metadata, description) {
        tag = trim(tag);
        shape = trim(shape);
        background = trim(background);
        color = trim(color);
        border = trim(border);

        if (tag.length === 0) {
            throw "A tag must be specified.";
        }

        var elementStyle = this.getElementStyle(tag);
        if (elementStyle === undefined) {
            throw "An element style with a tag of \"" + tag + "\" does not exist.";
        }

        if (shape.length === 0) {
            delete elementStyle.shape;
        } else {
            elementStyle.shape = shape;
        }

        if (background.length === 0) {
            delete elementStyle.background;
        } else {
            elementStyle.background = background;
        }

        if (color.length === 0) {
            delete elementStyle.color;
        } else {
            elementStyle.color = color;
        }

        if (width === undefined) {
            delete elementStyle.width;
        } else {
            elementStyle.width = width;
        }

        if (height === undefined) {
            delete elementStyle.height;
        } else {
            elementStyle.height = height;
        }

        if (fontSize === undefined) {
            delete elementStyle.fontSize;
        } else {
            elementStyle.fontSize = fontSize;
        }

        if (border.length === 0) {
            delete elementStyle.border;
        } else {
            elementStyle.border = border;
        }

        if (opacity === undefined) {
            delete elementStyle.opacity;
        } else {
            elementStyle.opacity = opacity;
        }

        if (metadata === undefined) {
            delete elementStyle.metadata;
        } else {
            elementStyle.metadata = metadata;
        }

        if (description === undefined) {
            delete elementStyle.description;
        } else {
            elementStyle.description = description;
        }

        this.setUnsavedChanges(true);
    };

    this.deleteElementStyle = function(tag) {
        tag = trim(tag);

        if (tag.length === 0) {
            throw "A tag must be specified.";
        }

        var elementStyle = this.getElementStyle(tag);
        if (elementStyle === undefined) {
            throw "An element style with a tag of \"" + tag + "\" does not exist.";
        }

        for (var i = workspace.views.configuration.styles.elements.length-1; i >= 0; i--) {
            var style = workspace.views.configuration.styles.elements[i];
            if (style.tag === tag) {
                workspace.views.configuration.styles.elements.splice(i, 1);
            }
        }

        delete elementStyles[tag];
        this.setUnsavedChanges(true);
    };

    this.addRelationshipStyle = function(tag) {
        tag = trim(tag);

        if (tag.length === 0) {
            throw "A tag must be specified.";
        }

        if (relationshipStyles[tag] !== undefined) {
            throw "A relationship style with a tag of \"" + tag + "\" already exists.";
        }

        var relationshipStyle = {
            tag: tag
        };
        workspace.views.configuration.styles.relationships.push(relationshipStyle);

        relationshipStyles[tag] = relationshipStyle;
        this.setUnsavedChanges(true);

        return relationshipStyle;
    };

    this.updateRelationshipStyle = function(tag, color, position, thickness, width, fontSize, dashed, opacity, routing) {
        tag = trim(tag);
        color = trim(color);
        routing = trim(routing);

        if (tag.length === 0) {
            throw "A tag must be specified.";
        }

        var relationshipStyle = this.getRelationshipStyle(tag);
        if (relationshipStyle === undefined) {
            throw "A relationship style with a tag of \"" + tag + "\" does not exist.";
        }

        if (color.length === 0) {
            delete relationshipStyle.color;
        } else {
            relationshipStyle.color = color;
        }

        if (position === undefined) {
            delete relationshipStyle.position;
        } else {
            relationshipStyle.position = position;
        }

        if (thickness === undefined) {
            delete relationshipStyle.thickness;
        } else {
            relationshipStyle.thickness = thickness;
        }

        if (width === undefined) {
            delete relationshipStyle.width;
        } else {
            relationshipStyle.width = width;
        }

        if (fontSize === undefined) {
            delete relationshipStyle.fontSize;
        } else {
            relationshipStyle.fontSize = fontSize;
        }

        if (dashed === undefined) {
            delete relationshipStyle.dashed;
        } else {
            relationshipStyle.dashed = dashed;
        }

        if (opacity === undefined) {
            delete relationshipStyle.opacity;
        } else {
            relationshipStyle.opacity = opacity;
        }

        if (routing.length === 0) {
            delete relationshipStyle.routing;
        } else {
            relationshipStyle.routing = routing;
        }

        this.setUnsavedChanges(true);
    };

    this.deleteRelationshipStyle = function(tag) {
        tag = trim(tag);


        if (tag.length === 0) {
            throw "A tag must be specified.";
        }

        var relationshipStyle = this.getRelationshipStyle(tag);
        if (relationshipStyle === undefined) {
            throw "A relationship style with a tag of \"" + tag + "\" does not exist.";
        }

        for (var i = workspace.views.configuration.styles.relationships.length-1; i >= 0; i--) {
            var style = workspace.views.configuration.styles.relationships[i];
            if (style.tag === tag) {
                workspace.views.configuration.styles.relationships.splice(i, 1);
            }
        }

        delete relationshipStyles[tag];
        this.setUnsavedChanges(true);
    };

    this.getElementTagsWithoutAssociatedStyles = function() {
        var tags = [];
        var styles = [];

        this.getElementStylesAsArray().forEach(function(style) {
            styles.push(style.tag);
        });

        this.getElementsAsArray().forEach(function(element) {
            if (element.tags) {
                element.tags.split(',').forEach(function (tag) {
                    tag = trim(tag);

                    if (tags.indexOf(tag) === -1 && styles.indexOf(tag) === -1) {
                        tags.push(tag);
                    }
                });
            }
        });

        tags.sort();

        return tags;
    };

    this.getRelationshipTagsWithoutAssociatedStyles = function() {
        var tags = [];
        var styles = [];

        this.getRelationshipStylesAsArray().forEach(function(style) {
            styles.push(style.tag);
        });

        this.getRelationshipsAsArray().forEach(function(relationship) {
            if (relationship.tags) {
                relationship.tags.split(',').forEach(function (tag) {
                    tag = trim(tag);

                    if (tags.indexOf(tag) === -1 && styles.indexOf(tag) === -1) {
                        tags.push(tag);
                    }
                });
            }
        });

        tags.sort();

        return tags;
    };

    function getDecision(decisionId, elementId) {
        var decisions = workspace.documentation.decisions;

        if (elementId.length > 0) {
            decisions = decisions.filter(function(decision) {
                return decision.elementId !== undefined && decision.elementId === elementId;
            })
        } else {
            decisions = decisions.filter(function(decision) {
                return decision.elementId === undefined;
            })
        }

        for (var i = 0; i < decisions.length; i++) {
            var decision = decisions[i];

            if (decision.id === decisionId) {
                return decision;
            }
        }

        return undefined;
    }

    function getNextDecisionId(elementId) {
        var maxId = 0;

        var decisions = workspace.documentation.decisions;

        if (elementId.length > 0) {
            decisions = decisions.filter(function(decision) {
                return decision.elementId !== undefined && decision.elementId === elementId;
            })
        } else {
            decisions = decisions.filter(function(decision) {
                return decision.elementId === undefined;
            })
        }

        for (var i = 0; i < decisions.length; i++) {
            var decision = decisions[i];

            if (!isNaN(decision.id)) {
                var idAsNumber = parseInt(decision.id, 10);
                if (idAsNumber > maxId) {
                    maxId = idAsNumber;
                }
            }
        }

        return '' + (maxId + 1);
    }

    this.addDecision = function(title, format, elementId) {
        title = trim(title);
        format = trim(format);
        elementId = trim(elementId);

        if (title.length === 0) {
            throw "A title must be specified.";
        }

        if (format.length === 0) {
            throw "A format must be specified.";
        }

        if (format !== 'Markdown' && format !== 'AsciiDoc') {
            throw "The format must be one of Markdown or AsciiDoc.";
        }

        var element;
        if (elementId.length > 0) {
            element = this.findElement(elementId);

            if (element === undefined) {
                throw "The element with an ID of " + elementId + " does not exist.";
            }
        }

        var decision = {
            id: getNextDecisionId(elementId),
            title: title,
            date: new Date().toISOString(),
            format: format,
            content: '',
            status: 'Proposed'
        };

        if (format === 'Markdown') {
            decision.content =
                "## Context\n" +
                "\n" +
                "## Decision\n" +
                "\n" +
                "## Consequences\n";
        } else {
            decision.content =
                "== Context\n" +
                "\n" +
                "== Decision\n" +
                "\n" +
                "== Consequences\n";
        }

        if (element !== undefined) {
            decision.elementId = element.id;
        }

        workspace.documentation.decisions.push(decision);

        this.setUnsavedChanges(true);

        return decision;
    };

    this.updateDecision = function(decisionId, elementId, title, status, content) {
        decisionId = trim(decisionId);
        elementId = trim(elementId);
        title = trim(title);
        status = trim(status);
        content = trim(content);

        if (decisionId.length === 0) {
            throw "A decision ID must be specified.";
        }

        if (title.length === 0) {
            throw "A title must be specified.";
        }

        if (status.length === 0) {
            throw "A status must be specified.";
        }

        if (status !== 'Proposed' && status !== 'Accepted' && status !== 'Superseded' && status !== 'Deprecated' && status !== 'Rejected') {
            throw "The status must be one of Proposed, Accepted, Superseded, Deprecated, Rejected.";
        }

        var decision = getDecision(decisionId, elementId);
        if (decision !== undefined) {
            decision.title = title;
            decision.status = status;
            decision.content = content;

            this.setUnsavedChanges(true);
        } else {
            throw "A decision with ID " + decisionId + (elementId.length > 0 ? " for element " + elementId : "") + " does not exist.";
        }
    };

    this.deleteDecision = function(decisionId, elementId) {
        decisionId = trim(decisionId);
        elementId = trim(elementId);

        if (decisionId.length === 0) {
            throw "A decision ID must be specified.";
        }

        var decision = getDecision(decisionId, elementId);
        if (decision !== undefined) {
            var index = workspace.documentation.decisions.indexOf(decision);
            workspace.documentation.decisions.splice(index, 1);

            this.setUnsavedChanges(true);
        } else {
            throw "A decision with ID " + decisionId + (elementId.length > 0 ? " for element " + elementId : "") + " does not exist.";
        }
    };

    this.deleteDocumentationSection = function(title, elementId) {
        title = trim(title);
        elementId = trim(elementId);

        if (title.length === 0) {
            throw "A title must be specified.";
        }

        var section = getDocumentationSection(title, elementId);
        if (section !== undefined) {
            var index = workspace.documentation.sections.indexOf(section);
            workspace.documentation.sections.splice(index, 1);

            this.setUnsavedChanges(true);
        } else {
            throw 'A documentation section with a title of "' + title + '" does not exist.';
        }
    };

    function getDocumentationSection(title, elementId) {
        var sections = workspace.documentation.sections;

        if (elementId.length > 0) {
            sections = sections.filter(function(section) {
                return section.elementId !== undefined && section.elementId === elementId;
            })
        } else {
            sections = sections.filter(function(section) {
                return section.elementId === undefined;
            })
        }

        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];

            if (section.title === title) {
                return section;
            }
        }

        return undefined;
    }

    this.cloneWorkspaceAndRemoveUnnecessaryElements = function() {
        var json = JSON.parse(JSON.stringify(workspace));

        if (json.model) {
            if (json.model.people) {
                json.model.people.forEach(function(person) {
                    delete person['type'];
                    delete person['canonicalName'];
                    delete person['parentId'];
                });
            }

            if (json.model.softwareSystems) {
                json.model.softwareSystems.forEach(function(softwareSystem) {
                    delete softwareSystem['type'];
                    delete softwareSystem['canonicalName'];
                    delete softwareSystem['parentId'];

                    if (softwareSystem.containers) {
                        softwareSystem.containers.forEach(function(container) {
                            delete container['type'];
                            delete container['canonicalName'];
                            delete container['parentId'];

                            if (container.components) {
                                container.components.forEach(function (component) {
                                    delete component['type'];
                                    delete component['canonicalName'];
                                    delete component['parentId'];
                                });
                            }
                        });
                    }
                });
            }

            if (json.model.deploymentNodes) {
                json.model.deploymentNodes.forEach(function(deploymentNode) {
                    removeUnnecessaryElements(deploymentNode);
                });
            }
        }

        if (json.views) {
            if (json.views.enterpriseContextViews) {
                json.views.enterpriseContextViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }

            if (json.views.systemLandscapeViews) {
                json.views.systemLandscapeViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }

            if (json.views.systemContextViews) {
                json.views.systemContextViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }

            if (json.views.containerViews) {
                json.views.containerViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }
            if (json.views.componentViews) {
                json.views.componentViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }

            if (json.views.dynamicViews) {
                json.views.dynamicViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }

            if (json.views.deploymentViews) {
                json.views.deploymentViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }

            if (json.views.filteredViews) {
                json.views.filteredViews.forEach(function (view) {
                    delete view['type'];
                    delete view['number'];
                });
            }
        }

        if (json.documentation) {
            if (json.documentation.sections) {
                json.documentation.sections.forEach(function (section) {
                    delete section.name;
                    delete section.softwareSystem;
                });
            }

            if (json.documentation.decisions) {
                json.documentation.decisions.forEach(function (decision) {
                    delete decision.softwareSystem;
                });
            }
        }

        return json;
    };

    function removeUnnecessaryElements(deploymentNode) {
        delete deploymentNode['type'];
        delete deploymentNode['canonicalName'];
        delete deploymentNode['parentId'];

        if (deploymentNode.children) {
            deploymentNode.children.forEach(function(child) {
                removeUnnecessaryElements(child);
            });
        }

        if (deploymentNode.containerInstances) {
            deploymentNode.containerInstances.forEach(function(containerInstance) {
                delete containerInstance['name'];
                delete containerInstance['description'];
                delete containerInstance['technology'];
                delete containerInstance['type'];
                delete containerInstance['canonicalName'];
                delete containerInstance['parentId'];
            });
        }
    }

};