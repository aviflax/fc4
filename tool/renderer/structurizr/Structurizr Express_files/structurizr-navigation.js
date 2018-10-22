Structurizr.selectPreviousDiagram = function() {
    var selected = this.getSelectedDiagramIndex();
    if (selected > 0) {
        this.selectDiagramByIndex(selected-1);
        return true;
    }

    return false;
};

Structurizr.selectNextDiagram = function() {
    var selected = this.getSelectedDiagramIndex();
    var numberOfOptions = $('#viewType option').length;
    if (selected < (numberOfOptions-1)) {
        this.selectDiagramByIndex(selected+1);
        return true;
    }

    return false;
};

Structurizr.selectDiagramByIndex = function(diagramNumber)
{
    if (Structurizr.workspace.hasViews()) {
        var diagrams = $('#viewType option');
        if (diagramNumber < 0) {
            diagramNumber = 0;
        } else if (diagramNumber >= diagrams.length) {
            diagramNumber = diagrams.length - 1;
        }

        if (diagrams[diagramNumber]) {
            diagrams[diagramNumber].selected = true;

            var key = Structurizr.getViewDropDown().val();
            if (key) {
                var view = Structurizr.workspace.getViewByKey(key);
            }
            window.location.hash = encodeURIComponent(view.key)
            return true;
        }
    }

    return false;
};

Structurizr.selectDiagramByView = function(view)
{
    if (Structurizr.workspace.hasViews() && view) {
        var diagrams = $('#viewType option[value="' + view.key + '"]').prop('selected', true);
        return true;
    } else {
        return false;
    }
};

Structurizr.getSelectedDiagramIndex = function() {
    return $('#viewType option:selected').index();
};