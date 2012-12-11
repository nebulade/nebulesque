// DOM renderer

function QuickRendererDOM () {

};

QuickRendererDOM.prototype.createElement = function (typeHint) {
    var elem;

    if (typeHint === 'object') {
        elem = document.createElement('object');
    } else if (typeHint === 'item') {
        elem = document.createElement('div');
        elem.style['position'] = 'absolute';
    } else if (typeHint === 'input') {
        elem = document.createElement('input');
    }

    return elem;
};

QuickRendererDOM.prototype.addElement = function (element, parent) {
    if (parent && parent.element) {
        parent.element.appendChild(element.element);
    } else {
        document.body.appendChild(element.element);
    }
};

QuickRendererDOM.prototype.renderElement = function (element) {
    if (element.element) {
        for (p in element.properties) {
            var property = element.properties[p].name;
            // console.log("update property", property, element[property], element.element.style[property]);
            element.element.style[property] = element[property];
        }
    }
};