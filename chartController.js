class ChartModel {
    constructor(container) {
        this._model = {};
        this._arrows = {};
        this._bodyLinks = {};
        this.container = container;
        this.x;
        this.y;
        this.x1;
    }

    init() {
        this.defineBodyDependenciesAndUpdateModel();
        this.hideAllElementsAfterConnectors();
        this.container.setAttribute('width', this.x1 - this.x);
        this.changeSVGDimensions();
    }

    hideAllElementsAfterConnectors() {
        let keys = Object.keys(this._model);
        keys = keys.filter(id => this._model[id].type === 'connector' && !this._model[id].isVisible);
        keys.forEach(id => this.hideElements(id));
    }

    addNewItem(element, elementTitleData, elementHrefData) {
        let data;
        elementTitleData = '{' + elementTitleData + '}';
        try {
            data = JSON.parse(elementTitleData);
            this.restructureArrowsData(data);
            this.defineTypeOfElement(data, elementHrefData);
            this.setBodyElementLinks(data);
            this.defineChartDimension(element, data);

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

            // additional properties
            if (data.type === 'connector') {
                this._model[data.id].isVisible = false;
            } else if (data.type === 'body') {
                this._model[data.id].isExpanded = true;
            }

            this.addClassToElement(element, data.type);
            this.addTransformAttributeToElement(element);
            this.defineBlocksLinkedWithArrows(data);
        } catch (err) {
            console.log(err);
        }
    }

    setBodyElementLinks(data) {
        if (data.type === 'body') {
            this._bodyLinks[data.id] = [].concat(data.outputArrows, data.inputArrows);
        };
    }

    defineBodyDependenciesAndUpdateModel() {
        Object.keys(this._bodyLinks).forEach(bodyID => {
            this._bodyLinks[bodyID].forEach(arrowID => {
                const endPointID = this._arrows[arrowID].endPoint;

                if (this._model[endPointID].type === 'link') {

                    this._model[bodyID].children.push(endPointID);
                    const index = this._model[bodyID].outputArrows.indexOf(arrowID);
                    this._model[bodyID].outputArrows.splice(index, 1);

                    const indexForheader = this._model[endPointID].inputArrows.indexOf(arrowID);
                    this._model[endPointID].inputArrows.splice(indexForheader, 1);

                    this._model[arrowID].element.setAttribute('display', 'none');
                }
            })
            this._bodyLinks[bodyID].forEach(arrowID => {
                const startPointID = this._arrows[arrowID].startPoint;

                if (this._model[startPointID].type === 'header') {

                    this._model[startPointID].children.push(bodyID);
                    this._model[bodyID].parentID = startPointID;

                    this._model[bodyID].outputArrows.forEach(id => {
                        this._model[startPointID].outputArrows.push(id);
                        this._arrows[id].startPoint = startPointID;
                    });

                    const indexForheader = this._model[startPointID].outputArrows.indexOf(arrowID);
                    this._model[startPointID].outputArrows.splice(indexForheader, 1);

                    const indexForbody = this._model[bodyID].outputArrows.indexOf(arrowID);
                    this._model[bodyID].outputArrows.splice(indexForbody, 1);

                    this._model[arrowID].element.setAttribute('display', 'none');
                }
            })
        })
    }

    restructureArrowsData(data) {
        if (data.inputArrows || data.outputArrows) {
            data.inputArrows = data.inputArrows ? data.inputArrows.trim().split(' ') : [];
            data.outputArrows = data.outputArrows ? data.outputArrows.trim().split(' ') : [];
        }
    }

    defineTypeOfElement(data, elementHrefData) {
        elementHrefData = elementHrefData.trim();
        const separatorPosition = elementHrefData.lastIndexOf('#');
        if (elementHrefData && separatorPosition > -1) {
            data.type = elementHrefData.slice(separatorPosition + 1);
            data.href = elementHrefData.slice(0, separatorPosition);
        }
        if (data.type === 'body' || data.type === 'header') {
            data.children = [];
        }
    }

    defineChartDimension(element, data) {
        data.innerGeometryData = element.getBBox();
        data.innerGeometryData.x1 = data.innerGeometryData.x + data.innerGeometryData.width;
        data.innerGeometryData.y1 = data.innerGeometryData.y + data.innerGeometryData.height;
        if (data.innerGeometryData.x === 0 || data.innerGeometryData.y === 0) {
            return;
        }
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
            case 'link':
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
                        if (this._model[nextElementID].children && this._model[nextElementID].children.length) {
                            this._model[nextElementID].children.forEach(id => elements[id] = this._model[id].children ? this._model[id].children : []);
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
                        this._model[nextElementID].children.forEach(id => elements[id] = this._model[id].children ? this._model[id].children : []);
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

const visio_SVG = document.getElementById('SVG_Visio');

window.addEventListener('load', () => {

    const visio_container = visio_SVG.getSVGDocument().querySelector('svg');

    // add stylesheet to XML dynamicaly: file name: "Lucidchart_style.css" 
    const visio_style = visio_SVG.getSVGDocument().createProcessingInstruction(
        "xml-stylesheet", 'href="chart_style.css" type="text/css"');
    visio_SVG.getSVGDocument().insertBefore(visio_style, visio_SVG.getSVGDocument().rootElement);

    const visio_model = new ChartModel(visio_container);
    const visio_parseData = element => {
        const elementTitleData = replaceQuotes(element.getAttribute('xlink:title'));
        const elementHrefData = replaceQuotes(element.getAttribute('xlink:href'));
        visio_model.addNewItem(element, elementTitleData, elementHrefData);
    };
    const visio_elements = Array.from(visio_container.querySelectorAll('a'));
    visio_elements.forEach(visio_parseData);
    visio_model.init();

    visio_elements.forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            visio_model.clickEventhandler(e);
        });
    });
});