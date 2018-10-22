Structurizr.getDiagramControls = function() {
    return $('#diagramControls');
};

Structurizr.getViewDropDown = function() {
    return $("#viewType");
};

Structurizr.getPageSizeDropDown = function() {
    return $("#pageSize");
};

Structurizr.getView = function() {
    var view;
    var key = Structurizr.getViewDropDown().val();
    if (key) {
        view = Structurizr.workspace.getViewByKey(key);
    }

    return view;
};

Structurizr.getKeyForViewAtIndex = function(index) {
    var options = $('#viewType option');
    if (options) {
        if (isNaN(index)) {
            index = 1;
        }

        if (index < 1) {
            return options[0].value;
        } else if (index < options.length) {
            return options[index-1].value;
        } else if (index >= options.length) {
            return options[options.length-1].value;
        }
    }

    return '';
};

Structurizr.getViewDropDown().change(function() {
    var key = Structurizr.getViewDropDown().val();
    if (key) {
        var view = Structurizr.workspace.getViewByKey(key);

        setTimeout(function() {
            window.location.hash = encodeURIComponent(view.key);
        }, 10);
    }
});

Structurizr.getPageSizeDropDown().change(function() {
    var pageSize = Structurizr.getPageSizeDropDown().val();
    var dimensions = pageSize.split("x");
    Structurizr.diagram.setPageSize(dimensions[0], dimensions[1]);
    Structurizr.diagram.getCurrentView().paperSize = $('#pageSize option:selected').attr('id');
    Structurizr.diagram.zoomFitHeight();
    Structurizr.workspace.setUnsavedChanges(true);

    Structurizr.getPageSizeDropDown().blur();
});

Structurizr.parseViews = function(workspace) {
    var viewsDropDown = this.getViewDropDown();
    viewsDropDown.empty();

    if (workspace.getViews()) {

        var listOfViews = [];
        var filters = [];

        workspace.getViews().forEach(function(view) {
            if (view.type === "Filtered") {
                filters.push(view.baseViewKey);
            }
        });

        workspace.getViews().forEach(function(view) {
            listOfViews.push(
                {
                    key: view.key,
                    label: Structurizr.getViewName(view)
                }
            )
        });

        listOfViews.sort(function(a, b) {
            if (a.label < b.label) {
                return -1;
            } else if (a.label > b.label) {
                return 1;
            } else {
                return 0;
            }
        });

        listOfViews.forEach(function(view) {
            if (filters.indexOf(view.key) === -1) {
                viewsDropDown.append(
                    $('<option></option>').val(view.key).html(view.label.substring(1))
                );
            }
        });
    }
};

Structurizr.getViewName = function(view) {
    var name = "";
    var key = view.key;

    if (view.type === "Filtered") {
        key = view.key;
        view = Structurizr.workspace.getViewByKey(view.baseViewKey);
    }

    if (view.type === 'SystemLandscape') {
        var enterprise = Structurizr.workspace.getWorkspace().model.enterprise;
        name = '1[System Landscape]' + (enterprise ? ' ' + enterprise.name : '');

    } else if (view.type === 'SystemContext') {
        var softwareSystem = Structurizr.workspace.findElement(view.softwareSystemId);
        name = '2[System Context] ' + softwareSystem.name;

    } else if (view.type === 'Container') {
        var softwareSystem = Structurizr.workspace.findElement(view.softwareSystemId);
        name = '3[Container] ' + softwareSystem.name;

    } else if (view.type === 'Component') {
        var softwareSystem = Structurizr.workspace.findElement(view.softwareSystemId);
        var container = Structurizr.workspace.findElement(view.containerId);
        name = '4[Component] ' + softwareSystem.name + ' - ' + container.name;

    } else if (view.type === 'Dynamic') {
        var element = Structurizr.workspace.findElement(view.elementId);
        if (!element) {
            element = Structurizr.workspace.findElement(view.softwareSystemId);
        }
        if (element) {
            if (element.type === "SoftwareSystem") {
                name = '5[Dynamic] ' + element.name;
            } else if (element.type === "Container") {
                var softwareSystem = Structurizr.workspace.findElement(element.parentId);
                name = '5[Dynamic] ' + softwareSystem.name + ' - ' + element.name;
            }
        } else {
            name = '5[Dynamic]';
        }

    } else if (view.type === 'Deployment') {
        if (view.softwareSystemId) {
            var softwareSystem = Structurizr.workspace.findElement(view.softwareSystemId);
            name = '6[Deployment] ' + softwareSystem.name;
        } else {
            name = '6[Deployment]';
        }

        if (view.environment !== undefined) {
            name += ' - ' + view.environment;
        }
    }

    name += ' (#' + key + ')';

    return name;
};