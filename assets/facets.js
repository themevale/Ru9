class FacetFiltersForm extends HTMLElement {
    constructor() {
        super();
        this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

        this.debouncedOnSubmit = debounce((event) => {
            this.onSubmitHandler(event);
        }, 500);

        const facetForm = this.querySelector('form');
        facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

        const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
        if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
    }

    static setListeners() {
        const onHistoryChange = (event) => {
            const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
            if (searchParams === FacetFiltersForm.searchParamsPrev) return;
            FacetFiltersForm.renderPage(searchParams, null, false);
        }
        window.addEventListener('popstate', onHistoryChange);
    }

    static toggleActiveFacets(disable = true) {
        document.querySelectorAll('.js-facet-remove').forEach((element) => {
            element.classList.toggle('disabled', disable);
        });
    }

    static renderPage(searchParams, event, updateURLHash = true) {
        FacetFiltersForm.searchParamsPrev = searchParams;
        const sections = FacetFiltersForm.getSections();

        document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');

        sections.forEach(({ section }) => {
            const url = `${window.location.pathname}?section_id=${section}&${searchParams}`;
            const filterDataUrl = element => element.url === url;

            FacetFiltersForm.filterData.some(filterDataUrl) ?
                FacetFiltersForm.renderSectionFromCache(filterDataUrl, event) :
                FacetFiltersForm.renderSectionFromFetch(url, event);
        });

        if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
    }

    static renderSectionFromFetch(url, event) {
        fetch(url)
            .then(response => response.text())
            .then((responseText) => {
                const html = responseText;
                FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
                FacetFiltersForm.renderFilters(html, event);
                FacetFiltersForm.renderProductGridContainer(html);
                // FacetFiltersForm.renderProductCount(html);
            });
    }

    static renderSectionFromCache(filterDataUrl, event) {
        const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        // FacetFiltersForm.renderProductCount(html);
    }

    static renderProductGridContainer(html) {
        document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
        document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
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
        });
    }

    // static renderProductCount(html) {
    //     console.log();
    //     const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML
    //     const container = document.getElementById('ProductCount');
    //     const containerDesktop = document.getElementById('ProductCountDesktop');
    //     container.innerHTML = count;
    //     container.classList.remove('loading');
    //     if (containerDesktop) {
    //         containerDesktop.innerHTML = count;
    //         containerDesktop.classList.remove('loading');
    //     }
    // }

    static renderFilters(html, event) {
        const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

        const facetDetailsElements =
            parsedHTML.querySelectorAll('#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter');
        const matchesIndex = (element) => {
            const jsFilter = event ? event.target.closest('.js-filter') : undefined;
            return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
        }
        const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
        const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

        facetsToRender.forEach((element) => {
            document.querySelector(`.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
        });

        FacetFiltersForm.renderActiveFacets(parsedHTML);
        FacetFiltersForm.renderAdditionalElements(parsedHTML);

        if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
    }

    static renderActiveFacets(html) {
        const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

        activeFacetElementSelectors.forEach((selector) => {
            const activeFacetsElement = html.querySelector(selector);
            if (!activeFacetsElement) return;
            document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
        })

        FacetFiltersForm.toggleActiveFacets(false);
    }

    static renderAdditionalElements(html) {
        const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

        mobileElementSelectors.forEach((selector) => {
            if (!html.querySelector(selector)) return;
            document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
        });

        // document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
    }

    static renderCounts(source, target) {
        const targetElement = target.querySelector('.facets__selected');
        const sourceElement = source.querySelector('.facets__selected');

        const targetElementAccessibility = target.querySelector('.facets__summary');
        const sourceElementAccessibility = source.querySelector('.facets__summary');

        if (sourceElement && targetElement) {
            target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
        }

        if (targetElementAccessibility && sourceElementAccessibility) {
            target.querySelector('.facets__summary').outerHTML = source.querySelector('.facets__summary').outerHTML;
        }
    }

    static updateURLHash(searchParams) {
        history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }

    static getSections() {
        return [
            {
                section: document.getElementById('ProductGridContainer').dataset.id,
            }
        ]
    }

    createSearchParams(form) {
        const formData = new FormData(form);
        return new URLSearchParams(formData).toString();
    }

    onSubmitForm(searchParams, event) {
        FacetFiltersForm.renderPage(searchParams, event);
    }

    onSubmitHandler(event) {
        event.preventDefault();
        const sortFilterForms = document.querySelectorAll('facet-filters-form form');
        if (event.srcElement.className == 'mobile-facets__checkbox') {
            const searchParams = this.createSearchParams(event.target.closest('form'))
            this.onSubmitForm(searchParams, event)
        } else {
            const forms = [];
            const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';

            sortFilterForms.forEach((form) => {
                if (!isMobile) {
                    if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
                        forms.push(this.createSearchParams(form));
                    }
                } else if (form.id === 'FacetFiltersFormMobile') {
                    forms.push(this.createSearchParams(form));
                }
            });
            this.onSubmitForm(forms.join('&'), event)
        }
    }

    onActiveFilterClick(event) {
        event.preventDefault();
        FacetFiltersForm.toggleActiveFacets();
        const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
        FacetFiltersForm.renderPage(url);
    }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
    constructor() {
        super();
        this.querySelectorAll('input')
            .forEach(element => element.addEventListener('change', this.onRangeChange.bind(this)));
        this.setMinAndMaxValues();
    }

    onRangeChange(event) {
        this.adjustToValidValues(event.currentTarget);
        this.setMinAndMaxValues();
    }

    setMinAndMaxValues() {
        const inputs = this.querySelectorAll('input');
        const minInput = inputs[0];
        const maxInput = inputs[1];
        if (maxInput.value) minInput.setAttribute('max', maxInput.value);
        if (minInput.value) maxInput.setAttribute('min', minInput.value);
        if (minInput.value === '') maxInput.setAttribute('min', 0);
        if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
    }

    adjustToValidValues(input) {
        const value = Number(input.value);
        const min = Number(input.getAttribute('min'));
        const max = Number(input.getAttribute('max'));

        if (value < min) input.value = min;
        if (value > max) input.value = max;
    }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
    constructor() {
        super();
        const facetLink = this.querySelector('a');
        facetLink.setAttribute('role', 'button');
        facetLink.addEventListener('click', this.closeFilter.bind(this));
        facetLink.addEventListener('keyup', (event) => {
            event.preventDefault();
            if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
        });
    }

    closeFilter(event) {
        event.preventDefault();
        const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
        form.onActiveFilterClick(event);
    }
}

customElements.define('facet-remove', FacetRemove);


class MenuDrawer extends HTMLElement {
    constructor() {
        super();

        this.mainDetailsToggle = this.querySelector('details');

        this.addEventListener('keyup', this.onKeyUp.bind(this));
        this.addEventListener('focusout', this.onFocusOut.bind(this));
        this.bindEvents();
    }

    bindEvents() {
        this.querySelectorAll('summary').forEach((summary) =>
            summary.addEventListener('click', this.onSummaryClick.bind(this))
        );
        this.querySelectorAll(
            'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
        ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this))
        );
    }

    onKeyUp(event) {
        if (event.code.toUpperCase() !== 'ESCAPE') return;

        const openDetailsElement = event.target.closest('details[open]');
        if (!openDetailsElement) return;

        openDetailsElement === this.mainDetailsToggle
            ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
            : this.closeSubmenu(openDetailsElement);
    }

    onSummaryClick(event) {
        const summaryElement = event.currentTarget;
        const detailsElement = summaryElement.parentNode;
        const parentMenuElement = detailsElement.closest('.has-submenu');
        const isOpen = detailsElement.hasAttribute('open');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        function addTrapFocus() {
            trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
            summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
        }

        if (detailsElement === this.mainDetailsToggle) {
            if (isOpen) event.preventDefault();
            isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

            if (window.matchMedia('(max-width: 990px)')) {
                document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
            }
        } else {
            setTimeout(() => {
                detailsElement.classList.add('menu-opening');
                summaryElement.setAttribute('aria-expanded', true);
                parentMenuElement && parentMenuElement.classList.add('submenu-open');
                !reducedMotion || reducedMotion.matches
                    ? addTrapFocus()
                    : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
            }, 100);
        }
    }

    openMenuDrawer(summaryElement) {
        setTimeout(() => {
            this.mainDetailsToggle.classList.add('menu-opening');
        });
        summaryElement.setAttribute('aria-expanded', true);
        trapFocus(this.mainDetailsToggle, summaryElement);
        document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
    }

    closeMenuDrawer(event, elementToFocus = false) {
        if (event === undefined) return;

        this.mainDetailsToggle.classList.remove('menu-opening');
        this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
            details.removeAttribute('open');
            details.classList.remove('menu-opening');
        });
        this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
            submenu.classList.remove('submenu-open');
        });
        document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
        removeTrapFocus(elementToFocus);
        this.closeAnimation(this.mainDetailsToggle);

        if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
    }

    onFocusOut() {
        setTimeout(() => {
            if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
                this.closeMenuDrawer();
        });
    }

    onCloseButtonClick(event) {
        const detailsElement = event.currentTarget.closest('details');
        this.closeSubmenu(detailsElement);
    }

    closeSubmenu(detailsElement) {
        const parentMenuElement = detailsElement.closest('.submenu-open');
        parentMenuElement && parentMenuElement.classList.remove('submenu-open');
        detailsElement.classList.remove('menu-opening');
        detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
        removeTrapFocus(detailsElement.querySelector('summary'));
        this.closeAnimation(detailsElement);
    }

    closeAnimation(detailsElement) {
        let animationStart;

        const handleAnimation = (time) => {
            if (animationStart === undefined) {
                animationStart = time;
            }

            const elapsedTime = time - animationStart;

            if (elapsedTime < 400) {
                window.requestAnimationFrame(handleAnimation);
            } else {
                detailsElement.removeAttribute('open');
                if (detailsElement.closest('details[open]')) {
                    trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
                }
            }
        };

        window.requestAnimationFrame(handleAnimation);
    }
}

customElements.define('menu-drawer', MenuDrawer);
