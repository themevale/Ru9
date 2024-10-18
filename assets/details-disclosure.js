class SideDrawerOpener extends HTMLElement {
    constructor() {
        super();
        const button = this.querySelector('button');
        if (!button) return;

        let isFirstLoad = true;
        button.addEventListener('click', () => {
            const drawer = document.querySelector(this.getAttribute('data-side-drawer'));
            if (isFirstLoad && this.hasAttribute('drawer-has-url')) {
                isFirstLoad = false;
                const urlStyle = drawer?.dataset.urlStyleSheet;
                if (urlStyle) buildStyleSheet(urlStyle, drawer);
            }

            if (drawer) drawer.open(button);
        });
    }
}

customElements.define('side-drawer-opener', SideDrawerOpener);

class SideDrawer extends HTMLElement {
    constructor() {
        super();
        this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
        this.querySelector('[id^="Drawer-Overlay-"]')?.addEventListener('click', this.close.bind(this));
    }

    connectedCallback() {
        if (!this.dataset.moved) {
            this.dataset.moved = true;
            document.body.appendChild(this);
        }
    }

    open(triggeredBy) {
        if (triggeredBy) this.setActiveElement(triggeredBy);
        setTimeout(() => this.classList.add('active'));

        this.handleTransition(true, 'drawer--opening', 'drawer--open');
        this.trapFocus();
        document.body.classList.add('overflow-hidden');
    }

    close() {
        this.classList.remove('active');
        if (this.activeElement) removeTrapFocus(this.activeElement);
        document.body.classList.remove('overflow-hidden');
        this.handleTransition(false, 'drawer--closing');
    }

    handleTransition(checkOpen, startClass, endClass = '') {
        const isDrawer = this.querySelector('.side-drawer:not(.popup__inner)');
        if (!isDrawer) return;

        this.addEventListener('transitionstart', () => {
            document.body.classList.add(startClass);
            checkOpen ? document.body.classList.remove('drawer--open', 'drawer--closing') : document.body.classList.remove('drawer--open', 'drawer--opening');
        }, { once: true });

        this.addEventListener('transitionend', () => {
            checkOpen ? document.body.classList.remove(startClass, 'drawer--opening', 'drawer--closing') : document.body.classList.remove('drawer--closing', 'drawer--opening', 'drawer--open');
            if (endClass) document.body.classList.add(endClass);
        }, { once: true });
    }

    setActiveElement(element) {
        this.activeElement = element;
    }

    trapFocus() {
        this.addEventListener('transitionend', () => {
            const containerToTrapFocusOn = this.querySelector('.drawer__inner, .popup__inner');
            const focusElement = this.querySelector('.drawer__close, .search__input, .popup__input');
            trapFocus(containerToTrapFocusOn, focusElement);
        }, { once: true });
    }
}

customElements.define('side-drawer', SideDrawer);

class DetailsDisclosure extends HTMLElement {
    constructor() {
        super();
        this.mainDetailsToggle = this.querySelector('details');
        this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

        this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
        this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
    }

    onFocusOut() {
        setTimeout(() => {
            if (!this.contains(document.activeElement)) this.close();
        });
    }

    onToggle() {
        if (!this.animations) this.animations = this.content.getAnimations();

        if (this.mainDetailsToggle.hasAttribute('open')) {
            this.animations.forEach((animation) => animation.play());
        } else {
            this.animations.forEach((animation) => animation.cancel());
        }
    }

    close() {
        this.mainDetailsToggle.removeAttribute('open');
        this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
    }
}

customElements.define('details-disclosure', DetailsDisclosure);

class CollapsibleDetails extends HTMLDetailsElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.init();
    }

    init() {
        this._isOpen = this.hasAttribute('open');
        this.summary = this.querySelector('summary');
        this.content = this.summary.nextElementSibling;
        this.setAttribute('aria-expanded', this._isOpen ? 'true' : 'false');
        this.summary?.addEventListener('click', this._toggleOpen.bind(this));

        if (this.hasAttribute('collapsible-mobile')) {
            this.resizeHandler();
            window.addEventListener('resize', this.resizeHandler.bind(this));
            document.addEventListener('unmatchSmall', this.resizeHandler.bind(this));
        }

        if (Shopify.designMode && this.hasAttribute('check-shopify-design-mode')) {
            this.addEventListener('shopify:block:select', () => this.isOpen = true);
            this.addEventListener('shopify:block:deselect', () => this.isOpen = false);
        }
    }

    static get observedAttributes() {
        return ['open'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') this.setAttribute('aria-expanded', newValue === '' ? 'true' : 'false');
    }

    get isOpen() {
        return this._isOpen;
    }

    set isOpen(value) {
        if (value !== this._isOpen) {
            this._isOpen = value;

            if (this.isConnected) {
                this._animate(value);
            } else {
                value ? this.setAttribute('open', '') : this.removeAttribute('open');
            }
        }
        this.setAttribute('aria-expanded', value ? 'true' : 'false');
    }

    _toggleOpen(event) {
        event.preventDefault();
        this.isOpen = !this.isOpen;
    }

    close() {
        this._isOpen = false;
        this._animate(false);
    }

    resizeHandler() {
        if (window.matchMedia('(max-width: 749px)').matches) {
            if (this.isOpen) {
                this._isOpen = false;
                this.removeAttribute('open');
                this.setAttribute('aria-expanded', 'false');
            }
        } else {
            this._isOpen = true;
            this.setAttribute('open', '');
            this.setAttribute('aria-expanded', 'true');
        }
    }

    async _animate(open) {
        this.style.overflow = 'hidden';
        if (open) {
            this.setAttribute('open', '');

            await Motion.timeline([
                [this, { height: [`${this.summary.clientHeight}px`, `${this.scrollHeight}px`] }, { duration: 0.45, easing: 'cubic-bezier(0.7, 0, 0.3, 1)' }],
                [this.content, { opacity: [0, 1], transform: ['translateX(-1rem)', 'translateX(0)'] }, { duration: 0.25, at: '-0.1' }]
            ]).finished;
        } else {
            await Motion.timeline([
                [this.content, { opacity: 0, transform: ['translateX(0)', 'translateX(1rem)'] }, { duration: 0.15 }],
                [this, { height: [`${this.clientHeight}px`, `${this.summary.clientHeight}px`] }, { duration: 0.35, at: '<', easing: 'cubic-bezier(0.7, 0, 0.3, 1)' }]
            ]).finished;

            this.removeAttribute('open');
        }

        this.style.height = 'auto';
        this.style.overflow = 'visible';
    }
}

customElements.define('collapsible-details', CollapsibleDetails, { extends: 'details' });

class DropdownDetails extends HTMLDetailsElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.init();
    }

    init() {
        this.mqlDesktop = window.matchMedia('(min-width: 1025px)');
        this._isOpen = this.hasAttribute('open') && this.getAttribute('open') === 'true';
        this.elements = {
            button: this.querySelector('.details__summary'),
            dropdown: this.querySelector('.details__list')
        };

        if (!this) return;
        this.addEventListener('focusout', this.onFocusOut.bind(this));
        this.addEventListener('keyup', onKeyUpEscape);
        this.setAttribute('open', 'false');
        this.elements.button?.addEventListener('click', this._toggleOpen.bind(this));

        if (this.mqlDesktop.matches && this.getAttribute('activate-event') === 'hover') {
            const hoverEvents = ['focusin', 'mouseenter', 'mouseleave'];
            hoverEvents.forEach(event => this.addEventListener(event, this._hoverOpen.bind(this)));
        }

        if (Shopify.designMode && this.hasAttribute('check-shopify-design-mode')) {
            this.addEventListener('shopify:block:select', () => {
                this.isOpen = true;
                this.elements.dropdown.classList.add('active');
            });
            this.addEventListener('shopify:block:deselect', () => {
                this.isOpen = false;
                this.elements.dropdown.classList.remove('active');
            });
        }
    }

    static get observedAttributes() {
        return ['open'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') this.elements.button.setAttribute('aria-expanded', newValue === 'true');
    }

    get isOpen() {
        return this._isOpen;
    }

    set isOpen(value) {
        if (value !== this._isOpen) {
            this._isOpen = value;
            if (this.isConnected) {
                this._animate(value);
            } else {
                value ? this.setAttribute('open', 'true') : this.setAttribute('open', 'false');
            }
        }
        this.elements.button.setAttribute('aria-expanded', value ? 'true' : 'false');
    }

    onFocusOut() {
        setTimeout(() => {
            if (!this.contains(document.activeElement)) this.close();
        });
    }

    _toggleOpen(event) {
        event.preventDefault();
        this.isOpen = !this.isOpen;
        this.elements.dropdown.classList.toggle('active');
        this.toggleAttribute('open', this.isOpen);
    }

    _hoverOpen(event) {
        const value = event.type === 'mouseenter' || event.type === 'focusin';
        this.isOpen = value;
        this.elements.dropdown.classList.toggle('active', value);
        if (this.closest('header-menu')) this.closest('.header-wrapper').preventHide = value;
    }

    close() {
        this.isOpen = false;
        this.elements.dropdown.classList.remove('active');
        this.setAttribute('open', 'false');
    }

    async _animate(open) {
        if (open) {
            this.setAttribute('open', 'true');
            await Motion.timeline(this.elements.dropdown, { opacity: [0, 1], transform: ['translateY(-1rem)', 'translateY(0)'] }, { duration: 0.25, at: '-0.1' }).finished;
        } else {
            await Motion.timeline(this.elements.dropdown, { opacity: [1, 0], transform: ['translateY(0)', 'translateY(1rem)'] }, { duration: 0.15 }).finished;
            this.setAttribute('open', 'false');
        }
    }
}

customElements.define('dropdown-details', DropdownDetails, { extends: 'details' });