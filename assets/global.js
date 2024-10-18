class HTMLUpdateUtility {
    /**
     * Used to swap an HTML node with a new node.
     * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
     *
     * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
     */
    static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
        preProcessCallbacks?.forEach((callback) => callback(newContent));

        const newNodeWrapper = document.createElement('div');
        HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
        const newNode = newNodeWrapper.firstChild;

        // dedupe IDs
        const uniqueKey = Date.now();
        oldNode.querySelectorAll('[id], [form]').forEach((element) => {
            element.id && (element.id = `${element.id}-${uniqueKey}`);
            element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
        });

        oldNode.parentNode.insertBefore(newNode, oldNode);
        oldNode.style.display = 'none';

        postProcessCallbacks?.forEach((callback) => callback(newNode));

        setTimeout(() => oldNode.remove(), 500);
    }

    // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
    static setInnerHTML(element, html) {
        element.innerHTML = html;
        element.querySelectorAll('script').forEach((oldScriptTag) => {
            const newScriptTag = document.createElement('script');
            Array.from(oldScriptTag.attributes).forEach((attribute) => {
                newScriptTag.setAttribute(attribute.name, attribute.value);
            });
            newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
            oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
        });
    }
}

function getFocusableElements(container) {
    return Array.from(
        container.querySelectorAll(
            "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
        )
    );
}


document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
    summary.setAttribute('role', 'button');
    summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

    if (summary.nextElementSibling.getAttribute('id')) {
        summary.setAttribute('aria-controls', summary.nextElementSibling.id);
    }

    summary.addEventListener('click', (event) => {
        const c_filter = document.querySelectorAll('[id^="Details-"] summary');
        if (summary.closest('details').hasAttribute('open')) {
            event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
        } else {
            c_filter.forEach(filter => {
                filter.closest('details').removeAttribute('open');
            })
        }
    });

    if (summary.closest('header-drawer')) return;
    summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
    var elements = getFocusableElements(container);
    var first = elements[0];
    var last = elements[elements.length - 1];

    removeTrapFocus();

    trapFocusHandlers.focusin = (event) => {
        if (
            event.target !== container &&
            event.target !== last &&
            event.target !== first
        )
            return;

        document.addEventListener('keydown', trapFocusHandlers.keydown);
    };

    trapFocusHandlers.focusout = function () {
        document.removeEventListener('keydown', trapFocusHandlers.keydown);
    };

    trapFocusHandlers.keydown = function (event) {
        if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
        // On the last focusable element and tab forward, focus the first element.
        if (event.target === last && !event.shiftKey) {
            event.preventDefault();
            first.focus();
        }

        //  On the first focusable element and tab backward, focus the last element.
        if (
            (event.target === container || event.target === first) &&
            event.shiftKey
        ) {
            event.preventDefault();
            last.focus();
        }
    };

    document.addEventListener('focusout', trapFocusHandlers.focusout);
    document.addEventListener('focusin', trapFocusHandlers.focusin);

    elementToFocus?.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
    document.querySelector(":focus-visible");
} catch (e) {
    focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
    const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
    let currentFocusedElement = null;
    let mouseClick = null;

    window.addEventListener('keydown', (event) => {
        if (navKeys.includes(event.code.toUpperCase())) {
            mouseClick = false;
        }
    });

    window.addEventListener('mousedown', (event) => {
        mouseClick = true;
    });

    window.addEventListener('focus', () => {
        if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

        if (mouseClick) return;

        currentFocusedElement = document.activeElement;
        currentFocusedElement.classList.add('focused');

    }, true);
}


function removeTrapFocus(elementToFocus = null) {
    document.removeEventListener('focusin', trapFocusHandlers.focusin);
    document.removeEventListener('focusout', trapFocusHandlers.focusout);
    document.removeEventListener('keydown', trapFocusHandlers.keydown);

    if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    const summaryElement = openDetailsElement.querySelector('summary');
    openDetailsElement.removeAttribute('open');
    summaryElement.setAttribute('aria-expanded', false);
    summaryElement.focus();
}


function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

function fetchConfig(type = 'json') {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
    };
}

let subscribers = {};

function subscribe(eventName, callback) {
    if (subscribers[eventName] === undefined) {
        subscribers[eventName] = [];
    }

    subscribers[eventName] = [...subscribers[eventName], callback];

    return function unsubscribe() {
        subscribers[eventName] = subscribers[eventName].filter((cb) => {
            return cb !== callback;
        });
    };
}

function publish(eventName, data) {
    if (subscribers[eventName]) {
        subscribers[eventName].forEach((callback) => {
            callback(data);
        });
    }
}