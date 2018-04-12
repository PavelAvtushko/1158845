class ChartModel {
    constructor(container) {
        this._model = {};
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
            data = JSON.parse(elementData);
            element.setAttribute('xlink:href', data.href || 'javascript:void(0);');
            element.dataset['initInfo'] = elementData;
            element.dataset['id'] = data.id;
            data.element = element;

            // data.DOMgeometry = element.getBoundingClientRect();
            data.innerGeometryData = element.getBBox();
            data.innerGeometryData.x1 = data.innerGeometryData.x + data.innerGeometryData.width;
            data.innerGeometryData.y1 = data.innerGeometryData.y + data.innerGeometryData.height;
            this.x = this.x ?
                data.innerGeometryData.x < this.x ? data.innerGeometryData.x : this.x :
                data.innerGeometryData.x;

            this.y = this.y ?
                data.innerGeometryData.y < this.y ? data.innerGeometryData.y : this.y :
                data.innerGeometryData.y;

            this.x1 = this.x1 ?
                data.innerGeometryData.x1 > this.x1 ? data.innerGeometryData.x1 : this.x1 :
                data.innerGeometryData.x1;

            that._model[data.id] = data;
            if (data.type === 'connector') {
                element.classList.add('connector');
            }
        } catch (err) {
            console.log(err);
        }
    }

    findAllElements(element) {
        const outputArrows = element.outputArrows;

        if (outputArrows.length) {
            const items = outputArrows.reduce((res, id) => res.concat(this.findElementsByIputArrowID(id)), []);

            const innerItems = items.reduce((result, currentElement) => {
                const elements = this.findAllElements(currentElement);
                return (elements.length > 0) ? result.concat(elements) : result;
            }, []);

            return items.concat(innerItems);
        };
        return [];
    }

    // find elements not all
    findNotAllElements(element) {
        const outputArrows = element && element.outputArrows;

        if (outputArrows && outputArrows.length) {
            const items = outputArrows.reduce((res, id) => res.concat(this.findElementsByIputArrowID(id)), []);

            const innerItems = items.reduce((result, currentElement) => {
                const elements = (currentElement.type && currentElement.type !==
                        'connector') ?
                    this.findNotAllElements(currentElement) : [];
                return (elements.length > 0) ? result.concat(elements) : result;
            }, []);

            return items.concat(innerItems);
        };
        return [];
    }

    defineElementsWithLinkedArrows(elementsSet) {
        const indentificators = elementsSet.map((a) => a.id);
        return indentificators.reduce((res, el) => {
            res.push(el);
            res = res.concat(this._model[el].inputArrows, this._model[el].outputArrows);
            return res;
        }, []);
    }

    findElementsByArrowID(arrowID, isInput) {
        let result = [];
        for (let key in this._model) {
            const arrows = isInput ? this._model[key].inputArrows : this._model[key].outputArrows;
            if (arrows && arrows.indexOf(arrowID) > -1) {
                result.push(this._model[key]);
            };
        };
        return result;
    }

    findElementsByIputArrowID(arrowID) {
        return this.findElementsByArrowID(arrowID, true);
    }

    findElementsByOutputArrowID(arrowID) {
        return this.findElementsByArrowID(arrowID, false);
    }

    hideElements(connectorElementID) {
        const elementItems = this.findAllElements(this._model[connectorElementID]);
        const arrowsAndElements = this.defineElementsWithLinkedArrows(elementItems);

        arrowsAndElements.forEach(id => {
            if (this._model[id].type === 'connector') {
                this._model[id].isVisible = false;
            };
            this._model[id].element.setAttribute('display', 'none');
        });
    }

    partiallyDefineElementsWithLinkedArrows(elementsSet) {
        const indentificators = elementsSet.map((a) => a.id);
        return indentificators.reduce((res, el) => {
            res.push(el);
            res = res.concat(this._model[el].inputArrows, (this._model[el].isVisible ===
                    false) ? [] :
                this._model[el].outputArrows);
            return res;
        }, []);
    }

    showElements(connectorElementID) {
        const elementItems = this.findNotAllElements(this._model[connectorElementID]);
        const arrowsAndElements = this.partiallyDefineElementsWithLinkedArrows(elementItems);

        arrowsAndElements.forEach(id => {
            if (this._model[id].type === 'connector') {
                this._model[id].isVisible = false;
            };
            this._model[id].element.setAttribute('display', 'block');
        });
    }

    collapseOrExpandBody(elementID) {
        // console.log(this._model[elementID].isExpanded ? elementID + 'collapsed' : elementID + 'expanded');
        let bodyElementId;

        for (let key in this._model) {
            if (this._model[key].parentID === elementID) {
                bodyElementId = key;
                break;
            };
        };

        const bodyElement = this._model[bodyElementId];

        // console.log(this.findArrowsLinkedWithBody(bodyElementId));
        const elementsArray = this.findAllElements(this._model[bodyElementId]);
        const arrowsAndElements = this.defineElementsWithLinkedArrows(elementsArray);
        if (bodyElement.element.getAttribute('display') !== 'none') {
            bodyElement.element.setAttribute('display', 'none');
            arrowsAndElements.forEach(el => this._model[el].element.setAttribute('transform', `translate(0,-${bodyElement.innerGeometryData.height})`));
        } else {
            bodyElement.element.setAttribute('display', 'block');
            arrowsAndElements.forEach(el => this._model[el].element.removeAttribute('transform'));
        }
    }

    findArrowsLinkedWithBody(elementID) {
        let arrows = [].concat(this._model[elementID].inputArrows, this._model[elementID].outputArrows);
        arrows = arrows.filter(id => {
            return (this._model[id].innerGeometryData.y + this._model[id].innerGeometryData.height) > this._model[elementID].innerGeometryData.y;
        })
        return arrows;
    }

    // isArrowVertical(arrowID) {
    //     const arrowDimensions = this._model[arrowID].element.getBBox();
    //     return (arrowDimensions.height >= arrowDimensions.width) ? true : false;
    // }

    setHeightAttribute(coord_y) {
        const height = coord_y - this.y;
        this.container.setAttribute('height', height);
        this.container.setAttribute('viewBox', `${this.x} ${this.y} ${this.x1 - this.x} ${height}`);
    }

    changeSVGDimensions() {
        let keys = Object.keys(this._model);
        keys = keys.filter(id => this._model[id].element.getAttribute('display') !== 'none');

        const coord_y = keys.reduce((coord, id) => {
            if (this._model[id].innerGeometryData.y1 > coord) {
                coord = this._model[id].innerGeometryData.y1;
            };
            return coord;
        }, 0);
        this.setHeightAttribute(coord_y);
    }
};

const replaceQuotes = str => str.replace(/'/g, '"');

const SVG = document.getElementById('SVG_Object');

window.addEventListener('load', () => {

    const container = SVG.getSVGDocument().querySelector('svg');

    // add stylesheet to XML dynamicaly: file name: "Lucidchart_style.css" 
    const xs = SVG.getSVGDocument().createProcessingInstruction(
        "xml-stylesheet", 'href="Lucidchart_style.css" type="text/css"');
    SVG.getSVGDocument().insertBefore(xs, SVG.getSVGDocument().rootElement);

    const model = new ChartModel(container);

    const parseData = element => {
        const elementData = replaceQuotes(element.getAttribute('xlink:href'));
        model.addNewItem(elementData, element);
    };

    const elements = Array.from(container.querySelectorAll('a'));
    const parsedElements = elements.map(parseData);
    model.init();

    // disable links
    container.addEventListener('click', e => e.preventDefault());

    // add event listenerslisteners
    elements.forEach(el => {
        el.addEventListener('click', e => {
            const id = e.currentTarget.dataset['id'];
            if (id && model._model[id].type === 'connector') {
                model._model[id].isVisible ? model.hideElements(id) : model.showElements(
                    id)
                model._model[id].isVisible = !model._model[id].isVisible;
            } else if (id && model._model[id].type === 'header') {
                model.collapseOrExpandBody(id);
            }
            model.changeSVGDimensions();
        });
    });
});