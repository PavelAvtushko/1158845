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

            this._model[data.id] = data;
            this.addClassToElement(element, data.type);
            this.addTransformAttributeToElement(element);

        } catch (err) {
            console.log(err);
        }
    }

    addClassToElement(element, type) {
        if (type === 'connector') {
            element.classList.add('connector');
        } else if (type === 'header') {
            element.classList.add('header');
        } else if (type === 'text') {
            element.classList.add('link');
        }
    }

    addTransformAttributeToElement(element) {
        element.setAttribute('transform', 'translate(0,0)');
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

        if (outputArrows.length) {
            const items = outputArrows.reduce((res, id) => {
                const el = this.findElementsByIputArrowID(id);
                return res.concat(el)
            }, []);

            const innerItems = items.reduce((result, currentElement) => {
                const elements = (currentElement.type && currentElement.type !== 'connector') ?
                    this.findNotAllElements(currentElement) : [];
                return (elements.length > 0) ? result.concat(elements) : result;
            }, []);

            return items.concat(innerItems);
        };
        return [];
    }

    defineElementsWithLinkedArrows(elementsSet) {
        const indentificators = elementsSet.map(a => a.id);
        return indentificators.reduce((res, id) => {
            const arr = [].concat(id, this._model[id].inputArrows, this._model[id].outputArrows);
            for (let i = 0; i < arr.length; i++) {
                if (res.indexOf(arr[i]) === -1) {
                    res.push(arr[i]);
                }
            }
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
        const indentificators = elementsSet.reduce((res, element) => {
            if (res.indexOf(element.id) === -1) {
                res.push(element.id);
            };
            return res;
        }, []);
        return indentificators.reduce((res, el) => {
            res.push(el);
            //and necessary arrows
            res = res.concat(this._model[el].inputArrows, (this._model[el].isVisible === false) ? [] :
                this._model[el].outputArrows);
            return res;
        }, []);
    }

    checkIfContains(outputConnectorArray, inputConnectorArray) {
        for (let i = 0, len = outputConnectorArray.length; i < len; i++) {
            if (inputConnectorArray.indexOf(outputConnectorArray[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    showElements(connectorElementID) {
        const elementItems = this.findNotAllElements(this._model[connectorElementID]);
        // const connectorOutputArrows = connectorElementID.outputArrows;
        // let arrowsAndElements;
        // if (elementItems.length === 1 && this.checkIfContains(connectorOutputArrows, elementItems[0].inputArrows)) {
        //     arrowsAndElements = [elementItems.id].concat(connectorOutputArrows);
        // } else {
        let arrowsAndElements = this.partiallyDefineElementsWithLinkedArrows(elementItems);
        // }

        arrowsAndElements.forEach(id => {
            if (this._model[id].type === 'connector') {
                this._model[id].isVisible = false;
            };
            if (this._model[id].type === 'body' && !this._model[id].isExpanded) {
                return;
            }
            this._model[id].element.setAttribute('display', 'block');
        });
    }

    collapseOrExpandBody(elementID) {
        let bodyElementId;

        for (let key in this._model) {
            if (this._model[key].type === 'body' && this._model[key].parentID === elementID) {
                bodyElementId = key;
                break;
            };
        };
        if (!bodyElementId) {
            return;
        }
        const bodyElement = this._model[bodyElementId];
        bodyElement.isExpanded = !bodyElement.isExpanded;

        const elementsArray = this.findAllElements(this._model[bodyElementId]);
        const arrowsAndElements = this.defineElementsWithLinkedArrows(elementsArray);

        if (bodyElement.element.getAttribute('display') !== 'none') {
            bodyElement.element.setAttribute('display', 'none');
            arrowsAndElements.forEach(id => {
                const el = this._model[id].element;
                el.setAttribute('transform', `translate(0, ${this.getHeightFromTransformAttribute(el) - bodyElement.innerGeometryData.height})`);
            });
        } else {
            bodyElement.element.setAttribute('display', 'block');
            arrowsAndElements.forEach(id => {
                const el = this._model[id].element;
                el.setAttribute('transform', `translate(0, ${this.getHeightFromTransformAttribute(el) + bodyElement.innerGeometryData.height})`);
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

    // isArrowVertical(arrowID) {
    //     const arrowDimensions = this._model[arrowID].element.getBBox();
    //     return (arrowDimensions.height >= arrowDimensions.width) ? true : false;
    // }

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
        if (id && this._model[id].type === 'connector') {
            this._model[id].isVisible ? this.hideElements(id) : this.showElements(
                id)
            this._model[id].isVisible = !this._model[id].isVisible;
        } else if (id && this._model[id].type === 'header') {
            this.collapseOrExpandBody(id);
        }
        this.changeSVGDimensions();
    };
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
            model.clickEventhandler(e);
        });
    });
});