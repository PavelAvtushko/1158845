class ChartModel {
    constructor(container) {
        this._model = {};
        this._arrows = {};
        this.container = container;
        this.x;
        this.y;
        this.x1;
    }

    init() {
        this.hideAllElementsAfterConnectors();
        this.container.setAttribute('width', this.x1 - this.x);
        this.changeSVGDimensions();
    }

    hideAllElementsAfterConnectors() {
        let keys = Object.keys(this._model);
        keys = keys.filter(id => this._model[id].type === 'connector' && !this._model[id].isVisible);
        keys.forEach(id => this.hideElements(id));
    }

    addNewItem(elementData, element) {
        const that = this;
        let data;
        try {
            data = JSON.parse(elementData.replace('#sub-address', ''));
            this.defineChartDimension(element, data);
            element.dataset['initInfo'] = elementData;
            if (data.href) {
                element.setAttribute('xlink:href', data.href);
            } else {
                element.removeAttribute('xlink:href');
            }
            if (data.id) {
                element.dataset['id'] = data.id;
            }
            data.element = element;
            this._model[data.id] = data;
            this.addClassToElement(element, data.type);
            this.addTransformAttributeToElement(element);
            this.defineBlocksLinkedWithArrows(data);
        } catch (err) {
            console.log(err);
        }
    }

    defineChartDimension(element, data) {
        data.innerGeometryData = element.getBBox();
        data.innerGeometryData.x1 = data.innerGeometryData.x + data.innerGeometryData.width;
        data.innerGeometryData.y1 = data.innerGeometryData.y + data.innerGeometryData.height;

        if (data.id) {
            this.x = this.x ?
                data.innerGeometryData.x < this.x ? data.innerGeometryData.x : this.x :
                data.innerGeometryData.x;

            this.y = this.y ?
                data.innerGeometryData.y < this.y ? data.innerGeometryData.y : this.y :
                data.innerGeometryData.y;

            this.x1 = this.x1 ?
                data.innerGeometryData.x1 > this.x1 ? data.innerGeometryData.x1 : this.x1 :
                data.innerGeometryData.x1;
        }
    }

    defineBlocksLinkedWithArrows(elementData) {
        if (elementData.outputArrows && elementData.outputArrows.length) {
            elementData.outputArrows.forEach(arrowID => {
                if (this._arrows[arrowID]) {
                    this._arrows[arrowID].startPoint = elementData.id
                } else {
                    this._arrows[arrowID] = {
                        startPoint: elementData.id
                    };
                };
            });
        }
        if (elementData.inputArrows && elementData.inputArrows.length) {
            elementData.inputArrows.forEach(arrowID => {
                if (this._arrows[arrowID]) {
                    this._arrows[arrowID].endPoint = elementData.id
                } else {
                    this._arrows[arrowID] = {
                        endPoint: elementData.id
                    };
                };
            });
        }
    }

    addClassToElement(element, type) {
        switch (type) {
            case 'connector':
                element.classList.add('connector');
                break;
            case 'header':
                element.classList.add('header');
                break;
            case 'text':
                element.classList.add('link');
                break;
            case 'infoBlock':
                element.classList.add('link');
                break;
        }
    }

    addTransformAttributeToElement(element) {
        element.setAttribute('transform', 'translate(0,0)');
    }

    findElements(connectorElementID) {
        const connector = this._model[connectorElementID];
        const elements = {};
        elements[connectorElementID] = connector.outputArrows;

        if (connector.outputArrows.length) {
            const nextElementID = this._arrows[connector.outputArrows[0]].endPoint;
            let arr = [].concat(connector.outputArrows, this._model[nextElementID].outputArrows);

            for (let i = 0; i < arr.length; i++) {
                const nextElementID = this._arrows[arr[i]].endPoint;
                if (!elements[nextElementID]) {
                    if (this._model[nextElementID].type !== 'connector') {
                        elements[nextElementID] = this._model[nextElementID].outputArrows;
                        arr = arr.concat(this._model[nextElementID].outputArrows);
                        if (this._model[nextElementID].children) {
                            this._model[nextElementID].children.forEach(id => elements[id] = []);
                        }
                    } else {
                        elements[nextElementID] = [];
                    }
                }
            }
        }
        return elements;
    }

    hideElements(connectorElementID) {
        const hideElements = this.findElements(connectorElementID);
        for (let id in hideElements) {
            if (id !== connectorElementID) {
                this._model[id].element.setAttribute('display', 'none');
            }
            hideElements[id].forEach(arrow => this._model[arrow].element.setAttribute('display', 'none'));
        }
    }

    showElements(connectorElementID) {
        const showElements = this.findElements(connectorElementID);
        for (let id in showElements) {
            this._model[id].element.setAttribute('display', 'block');
            showElements[id].forEach(arrow => this._model[arrow].element.setAttribute('display', 'block'));
        }
    }

    findElementsByRootElement(elementID) {
        const header = this._model[elementID];
        const elements = {};
        elements[elementID] = header.outputArrows;

        if (elements[elementID].length) {
            let arr = elements[elementID];
            for (let i = 0; i < arr.length; i++) {
                const nextElementID = this._arrows[arr[i]].endPoint;
                if (!elements[nextElementID]) {
                    elements[nextElementID] = this._model[nextElementID].outputArrows;
                    arr = arr.concat(this._model[nextElementID].outputArrows);

                    if (this._model[nextElementID].children) {
                        this._model[nextElementID].children.forEach(id => elements[id] = []);
                    }
                }
            }
        }
        return elements;
    }

    collapseOrExpandBody(headerID) {
        const childrenElements = this._model[headerID].children;

        if (childrenElements && childrenElements.length) {
            childrenElements.forEach(childID => {
                if (this._model[childID].type !== 'body') {
                    return;
                }
                this._model[childID].isExpanded = !this._model[childID].isExpanded;
                const elementsBellow = this.findElementsByRootElement(headerID);

                if (this._model[childID].element.getAttribute('display') !== 'none') {
                    this._model[childID].children && this._model[childID].children.forEach(childID => this._model[childID].element.setAttribute('display', 'none'));

                    this._model[childID].element.setAttribute('display', 'none');
                    for (let id in elementsBellow) {
                        if (id !== headerID) {
                            this._model[id].element.setAttribute('transform', `translate(0, ${this.getHeightFromTransformAttribute(this._model[id].element) - this._model[childID].innerGeometryData.height})`);
                        }
                        elementsBellow[id].forEach(arrow => {
                            const el = this._model[arrow].element;
                            el.setAttribute('transform', `translate(0, ${this.getHeightFromTransformAttribute(el) - this._model[childID].innerGeometryData.height})`);
                        });
                    }
                } else {
                    this._model[childID].children && this._model[childID].children.forEach(childID => this._model[childID].element.setAttribute('display', 'block'));
                    this._model[childID].element.setAttribute('display', 'block');
                    for (let id in elementsBellow) {
                        if (id !== headerID) {
                            this._model[id].element.setAttribute('transform', `translate(0, ${this.getHeightFromTransformAttribute(this._model[id].element) + this._model[childID].innerGeometryData.height})`);
                        }
                        elementsBellow[id].forEach(arrow => {
                            const el = this._model[arrow].element;
                            el.setAttribute('transform', `translate(0, ${this.getHeightFromTransformAttribute(el) + this._model[childID].innerGeometryData.height})`);
                        });
                    }
                }
            });
        }

    }

    getHeightFromTransformAttribute(element) {
        return parseFloat(element.getAttribute('transform').replace(/.*,\s?(-?\d+.?(\d+)?)\)/, "$1"));
    }

    findArrowsLinkedWithBody(elementID) {
        let arrows = [].concat(this._model[elementID].inputArrows, this._model[elementID].outputArrows);
        arrows = arrows.filter(id => {
            return (this._model[id].innerGeometryData.y + this._model[id].innerGeometryData.height) > this._model[elementID].innerGeometryData.y;
        })
        return arrows;
    }

    setHeightAttribute(dimensionData) {
        const height = dimensionData.y - this.y;
        this.container.setAttribute('height', height);
        this.container.setAttribute('viewBox', `${this.x} ${this.y} ${this.x1 - this.x} ${height}`);
    }

    changeSVGDimensions() {
        const heightAndElementData = {
            y: 0,
            id: ''
        };

        let keys = Object.keys(this._model);
        keys = keys.filter(id => this._model[id].element.getAttribute('display') !== 'none');

        const dimensionData = keys.reduce((res, id) => {
            const el = this._model[id].element;
            const h = this.getHeightFromTransformAttribute(el);

            if (this._model[id].innerGeometryData.y1 + h > res.y) {
                res.y = this._model[id].innerGeometryData.y1 + h;
                res.id = id;
            };
            return res;
        }, heightAndElementData);

        this.setHeightAttribute(dimensionData);
    }

    clickEventhandler(e) {
        const id = e.currentTarget.dataset['id'];
        if (id && this._model[id].type === 'connector' && !this._model[id].isVisible) {
            this.showElements(id);
            this._model[id].isVisible = !this._model[id].isVisible;
        } else if (id && this._model[id].type === 'header') {
            this.collapseOrExpandBody(id);
        } else {
            const href = e.currentTarget.getAttribute('xlink:href');
            if (href) {
                window.open(href);
            }
        }
        this.changeSVGDimensions();
    };
};

const replaceQuotes = str => str.replace(/'/g, '"');

const lucid_SVG = document.getElementById('SVG_Lucid');
const visio_SVG = document.getElementById('SVG_Visio');

window.addEventListener('load', () => {

    const lucid_container = lucid_SVG.getSVGDocument().querySelector('svg');
    const visio_container = visio_SVG.getSVGDocument().querySelector('svg');

    // add stylesheet to XML dynamicaly: file name: "Lucidchart_style.css" 
    const lucid_style = lucid_SVG.getSVGDocument().createProcessingInstruction(
        "xml-stylesheet", 'href="chart_style.css" type="text/css"');
    lucid_SVG.getSVGDocument().insertBefore(lucid_style, lucid_SVG.getSVGDocument().rootElement);

    const visio_style = visio_SVG.getSVGDocument().createProcessingInstruction(
        "xml-stylesheet", 'href="chart_style.css" type="text/css"');
    visio_SVG.getSVGDocument().insertBefore(visio_style, visio_SVG.getSVGDocument().rootElement);

    const lucid_model = new ChartModel(lucid_container);
    const visio_model = new ChartModel(visio_container);

    const lucid_parseData = element => {
        const elementData = replaceQuotes(element.getAttribute('xlink:href'));
        lucid_model.addNewItem(elementData, element);
    };

    const visio_parseData = element => {
        const elementData = replaceQuotes(element.getAttribute('xlink:href'));
        visio_model.addNewItem(elementData, element);
    };

    const lucid_elements = Array.from(lucid_container.querySelectorAll('a'));
    lucid_elements.forEach(lucid_parseData);

    const visio_elements = Array.from(visio_container.querySelectorAll('a'));
    visio_elements.forEach(visio_parseData);

    lucid_model.init();
    visio_model.init();
    // disable links
    //container.addEventListener('click', e => e.preventDefault());

    // add event listenerslisteners
    lucid_elements.forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            lucid_model.clickEventhandler(e);
        });
    });
    visio_elements.forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            visio_model.clickEventhandler(e);
        });
    });

});