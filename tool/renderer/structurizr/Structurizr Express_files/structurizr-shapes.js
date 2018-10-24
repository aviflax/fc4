if (typeof exports === 'object') {
    var joint = {
        util: require('../src/core').util,
        shapes: {},
        dia: {
            Element: require('../src/joint.dia.element').Element,
            Link: require('../src/joint.dia.link').Link
        }
    };
}

joint.shapes.org = {};

var structurizr_CornerRadius = 1;

joint.shapes.org.Box = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><rect class="structurizrBox structurizrHighlightableElement"/><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.box',
        attrs: {
            rect: {
                rx: structurizr_CornerRadius,
                ry: structurizr_CornerRadius
            },
            '.structurizrBox': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.15,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.30,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.45,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'rect',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.90,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Boundary = joint.dia.Element.extend({
    markup: '<g><rect class="structurizrBoundary"/><text class="structurizrName"/><text class="structurizrMetaData"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.boundary',
        attrs: {
            rect: {
                width: 100,
                height: 100,
                rx: 0,
                ry: 0
            },
            '.structurizrBoundary': {
                fill: '#ffffff',
                'stroke': '#444444',
                'stroke-width': '2',
                'stroke-dasharray': '20,20',
                'pointer-events': 'none'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                'font-size': '20px',
                'fill': '#444444',
                ref: 'rect',
                'x': 10,
                'y': 25,
                'text-anchor': 'start',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                'font-size': '15px',
                'fill': '#444444',
                ref: 'rect',
                'x': 10,
                'y': 45,
                'text-anchor': 'start',
                'pointer-events': 'visible'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.DeploymentNode = joint.dia.Element.extend({
    markup: '<g><rect class="structurizrDeploymentNode"/><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrInstanceCount"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.deploymentNode',
        attrs: {
            rect: {
                width: 100,
                height: 100,
                rx: 10,
                ry: 10
            },
            '.structurizrDeploymentNode': {
                fill: '#ffffff',
                'stroke': '#444444',
                'stroke-width': '1',
                'pointer-events': 'none'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                'font-size': '20px',
                ref: 'rect',
                'x': 10,
                'y': 25,
                'text-anchor': 'start',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                'font-size': '15px',
                ref: 'rect',
                'x': 10,
                'y': 45,
                'text-anchor': 'start'
            },
            '.structurizrInstanceCount': {
                'font-size': '40px',
                'font-weight': 'bold',
                'fill': '#555555',
                ref: 'rect',
                'ref-x': 0.99,
                'y': 45,
                'text-anchor': 'end'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.DiagramTitle = joint.dia.Element.extend({
    markup: '<g><text class="structurizrDiagramTitle structurizrMetadata"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.diagramTitle',
        attrs: {
            '.structurizrDiagramTitle': {
                'font-weight': 'bold',
                'font-size': '36px',
                'text-anchor': 'start',
                fill: '#000000',
                'pointer-events': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.DiagramDescription = joint.dia.Element.extend({
    markup: '<g><text class="structurizrDiagramDescription structurizrMetadata"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.diagramDescription',
        attrs: {
            '.structurizrDiagramDescription': {
                'font-weight': 'normal',
                'font-size': '22px',
                'text-anchor': 'start',
                fill: '#777777',
                'pointer-events': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.DiagramMetadata = joint.dia.Element.extend({
    markup: '<g><text class="structurizrDiagramMetadata structurizrMetadata"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.diagramMetadata',
        attrs: {
            '.structurizrDiagramMetadata': {
                'font-weight': 'normal',
                'font-size': '22px',
                'text-anchor': 'start',
                fill: '#777777',
                'pointer-events': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.BrandingImage = joint.dia.Element.extend({
    markup: '<g><image class="structurizrBrandingImage structurizrMetadata"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.brandingImage',
        attrs: {
            '.structurizrBrandingImage': {
                'pointer-events': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.DiagramWatermark = joint.dia.Element.extend({
    markup: '<g><text class="structurizrDiagramWatermark"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.diagramWatermark',
        attrs: {
            '.structurizrDiagramWatermark': {
                'font-family': 'Open Sans',
                'font-weight': 'normal',
                'font-size': '28px',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Relationship = joint.dia.Link.extend({
    markup: [
        '<path class="connection" stroke="black"/>',
        '<path class="marker-source" fill="black" stroke="black" />',
        '<path class="marker-target" fill="black" stroke="black" />',
        '<path class="connection-wrap"/>',
        '<title class="tooltip"></title>',
        '<g class="labels"/>',
        '<g class="marker-vertices"/>',
        '<g class="marker-arrowheads"/>',
        '<g class="link-tools"/>'
    ].join(''),
    labelMarkup: [
        '<g class="label">',
        '<rect />',
        '<text />',
        '</g>'
    ].join(''),
    defaults: joint.util.deepSupplement({
        type: 'structurizr.relationship'
    }, joint.dia.Link.prototype.defaults)
});

joint.shapes.org.Person = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><rect class="structurizrPersonBody structurizrHighlightableElement" x="0" y="175" width="450" height="250" rx="70" /><circle class="structurizrPersonHead structurizrHighlightableElement" cx="225" cy="100" r="100" /><line class="structurizrPersonRightArm" x1="90" y1="300" x2="90" y2="450" style="stroke-width:2px" /><line class="structurizrPersonLeftArm" x1="360" y1="300" x2="360" y2="450" style="stroke-width:2px" /><text class="structurizrName"/><text class="structurizrMetaData" /><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.person',
        attrs: {
            '.structurizrPersonHead': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrPersonBody': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.25,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.40,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.60,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'rect',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.88,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Robot = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><rect class="structurizrRobotBody structurizrHighlightableElement" x="0" y="175" width="450" height="250" rx="30" /><rect class="structurizrRobotEars structurizrHighlightableElement" rx="10" /><rect class="structurizrRobotHead structurizrHighlightableElement" rx="30" /><line class="structurizrRobotRightArm" x1="90" y1="300" x2="90" y2="450" style="stroke-width:2px" /><line class="structurizrRobotLeftArm" x1="360" y1="300" x2="360" y2="450" style="stroke-width:2px" /><text class="structurizrName"/><text class="structurizrMetaData" /><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.Robot',
        attrs: {
            '.structurizrRobotHead': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrRobotEars': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrRobotBody': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.25,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.40,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.60,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'rect',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.88,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Cylinder = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><ellipse class="structurizrCylinderBottom structurizrHighlightableElement" id="bottom" cx="225" cy="270" rx="225" ry="30"></ellipse><rect class="structurizrCylinderFace structurizrHighlightableElement" id="face" x="0" y="30" width="450" height="240"></rect><clipPath id="cylinderStructurizrClipPath" clipPathUnits="userSpaceOnUse"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#bottom"></use><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#face"></use></clipPath><rect class="structurizrCylinderFaceFull" x="0" y="30" width="450" height="300" clip-path="url(#cylinderStructurizrClipPath)"></rect><ellipse cx="225" cy="30" rx="225" ry="30" id="lid" class="structurizrCylinderTop structurizrHighlightableElement" ></ellipse><text class="structurizrName"/><text class="structurizrMetaData" /><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.cylinder',
        attrs: {
            '.structurizrCylinderFace': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrCylinderFaceFull': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrCylinderTop': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrCylinderBottom': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.25,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.43,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.60,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: '.structurizrCylinderFaceFull',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.90,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Pipe = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><ellipse class="structurizrPipeRight structurizrHighlightableElement" id="pipeRight" cx="225" cy="270" rx="225" ry="30"></ellipse><rect class="structurizrPipeFace structurizrHighlightableElement" id="pipeFace" x="0" y="30" width="450" height="240"></rect><clipPath id="pipeStructurizrClipPath" clipPathUnits="userSpaceOnUse"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#pipeRight"></use><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#pipeFace"></use></clipPath><rect class="structurizrPipeFaceFull" x="0" y="30" width="450" height="300" clip-path="url(#pipeStructurizrClipPath)"></rect><ellipse cx="225" cy="30" rx="225" ry="30" id="lid" class="structurizrPipeLeft structurizrHighlightableElement" ></ellipse><text class="structurizrName"/><text class="structurizrMetaData" /><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.pipe',
        attrs: {
            '.structurizrPipeFace': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrPipeFaceFull': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrPipeLeft': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrPipeRight': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.25,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.43,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.60,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'rect',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.90,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Folder = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><rect class="structurizrFolderTab structurizrHighlightableElement" /><rect class="structurizrFolder structurizrHighlightableElement"/><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.folder',
        attrs: {
            rect: {
                rx: structurizr_CornerRadius,
                ry: structurizr_CornerRadius
            },
            '.structurizrFolderTab': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrFolder': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'

            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: '.structurizrFolder',
                'ref-x': 0.5,
                'ref-y': 0.15,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: '.structurizrFolder',
                'ref-x': 0.5,
                'ref-y': 0.30,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: '.structurizrFolder',
                'ref-x': 0.5,
                'ref-y': 0.45,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: '.structurizrFolder',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.89,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Ellipse = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><ellipse class="structurizrEllipse structurizrHighlightableElement"/><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.ellipse',
        attrs: {
            ellipse: {
            },
            '.structurizrEllipse': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'ellipse',
                'ref-x': 0.5,
                'ref-y': 0.15,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'ellipse',
                'ref-x': 0.5,
                'ref-y': 0.30,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'ellipse',
                'ref-x': 0.5,
                'ref-y': 0.45,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'ellipse',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.95,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.Hexagon = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><polygon class="structurizrHexagon structurizrHighlightableElement"/><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.hexagon',
        attrs: {
            ellipse: {
            },
            '.structurizrHexagon': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'polygon',
                'ref-x': 0.5,
                'ref-y': 0.15,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'polygon',
                'ref-x': 0.5,
                'ref-y': 0.30,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'polygon',
                'ref-x': 0.5,
                'ref-y': 0.45,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'polygon',
                'font-weight': 'bold',
                'ref-x': 0.50,
                'ref-y': 0.92,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.WebBrowser = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><rect class="structurizrWebBrowser structurizrHighlightableElement"/><rect class="structurizrWebBrowserPanel"/><ellipse class="structurizrWebBrowserButton1"/><ellipse class="structurizrWebBrowserButton2"/><ellipse class="structurizrWebBrowserButton3"/><rect class="structurizrWebBrowserUrlBar"/><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.webBrowser',
        attrs: {
            rect: {
                rx: structurizr_CornerRadius,
                ry: structurizr_CornerRadius
            },
            '.structurizrWebBrowser': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrWebBrowserPanel': {
                stroke: '#444444',
                'stroke-width': 0,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrWebBrowserUrlBar': {
                stroke: '#444444',
                'stroke-width': 0,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.15,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.30,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.45,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'rect',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.90,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

joint.shapes.org.MobileDevice = joint.dia.Element.extend({
    markup: '<g class="structurizrElement"><rect class="structurizrMobileDevice structurizrHighlightableElement"/><rect class="structurizrMobileDeviceDisplay"/><ellipse class="structurizrMobileDeviceButton"/><line class="structurizrMobileDeviceSpeaker" style="stroke-width:2px" /><text class="structurizrName"/><text class="structurizrMetaData"/><text class="structurizrDescription"/><text class="structurizrNavigation"/></g>',
    defaults: joint.util.deepSupplement({
        type: 'structurizr.mobileDevice',
        attrs: {
            rect: {
                rx: structurizr_CornerRadius,
                ry: structurizr_CornerRadius
            },
            '.structurizrMobileDevice': {
                stroke: '#444444',
                'stroke-width': 2,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrMobileDeviceDisplay': {
                stroke: '#444444',
                'stroke-width': 0,
                'pointer-events': 'visiblePainted'
            },
            '.structurizrName': {
                'font-weight': 'bold',
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.15,
                'text-anchor': 'middle',
                'pointer-events': 'visible'
            },
            '.structurizrMetaData': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.30,
                'text-anchor': 'middle'
            },
            '.structurizrDescription': {
                ref: 'rect',
                'ref-x': 0.5,
                'ref-y': 0.45,
                'text-anchor': 'middle'
            },
            '.structurizrNavigation': {
                ref: 'rect',
                'font-weight': 'bold',
                'ref-x': 0.5,
                'ref-y': 0.90,
                'text-anchor': 'middle',
                'display': 'none'
            }
        }
    }, joint.dia.Element.prototype.defaults)
});

if (typeof exports === 'object') {
    module.exports = joint.shapes.org;
}
