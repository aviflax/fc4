Structurizr.isFullScreenEnabled = function() {
  return document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;
};

Structurizr.isFullScreen = function() {
    return document.enterFullScreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement;
};

Structurizr.exitFullScreen = function() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }
};

Structurizr.enterFullScreen = function() {
    if (this.isFullScreenEnabled()) {
        var content = document.getElementById('content');
        if (content.requestFullscreen) {
            content.requestFullscreen();
        } else if (content.webkitRequestFullscreen) {
            content.webkitRequestFullscreen();
        } else if (content.mozRequestFullScreen) {
            content.mozRequestFullScreen();
        } else if (content.msRequestFullscreen) {
            content.msRequestFullscreen();
        }

        $('#diagramViewport').css('overflow', 'auto');
    }
};

Structurizr.enterPresentationMode = function() {
    Structurizr.diagram.setPresentationMode(true);
    Structurizr.getDiagramControls().addClass('hidden');

    if (!this.isFullScreen()) {
        this.enterFullScreen();
    }

    Structurizr.diagram.resize();
    Structurizr.diagram.zoomForPresentationMode();
};

$(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange fullscreenChange MSFullscreenChange',function(){
    if (!Structurizr.diagram) {
        return;
    }

    if (Structurizr.isFullScreen()) {
        if (!Structurizr.diagram.isEmbedded()) {
            $('#enterFullScreenButton').addClass("hidden");
            // $('#exitFullScreenButton').removeClass("hidden");
        } else {
            $('#enterEmbeddedFullScreenButton').addClass("hidden");
            $('#exitEmbeddedFullScreenButton').removeClass("hidden");
        }

        Structurizr.diagram.resize();

        if (Structurizr.diagram.isPresentationMode()) {
            Structurizr.diagram.zoomForPresentationMode();
        }
    } else {
        Structurizr.diagram.setPresentationMode(false);

        if (!Structurizr.diagram.isEmbedded()) {
            Structurizr.getDiagramControls().removeClass('hidden');
            $('#enterFullScreenButton').removeClass("hidden");
            // $('#exitFullScreenButton').addClass("hidden");
        } else {
            $('#enterEmbeddedFullScreenButton').removeClass("hidden");
            $('#exitEmbeddedFullScreenButton').addClass("hidden");
        }

        Structurizr.diagram.resize();

        Structurizr.diagram.zoomFitWidth();
    }
});

Structurizr.enableFullScreenControls = function() {
    if (Structurizr.isFullScreenEnabled()) {
        $('#enterFullScreenButton').removeClass('hidden');
        $('#enterPresentationMode').removeClass('hidden');
    }
};