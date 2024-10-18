class StickyAddToCart extends HTMLElement {
    constructor() {
        super();
        this.anchor = this.closest('[id^=ProductSection-]').querySelector('[id^=ProductSubmitButton-]') || this.closest('[id^=ProductSection-]');
        this.mark = document.querySelector('footer');
        this.inner = this.querySelector('.product__sticky-inner');
        this.toogle = this.querySelector('button[data-toggle]');
        this.toogle?.addEventListener('click', this.toggleEvent.bind(this));
    }

    connectedCallback() {
        this.renderAnchorLink()

        this.onScrollHandler = this.onScroll.bind(this);
        window.addEventListener('scroll', this.onScrollHandler, false);
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this.onScrollHandler);
    }

    renderAnchorLink() {
        const divs = document.querySelectorAll('div[data-anchor-link="true"]');
        const linksWrap = this.querySelector('.sticky-navigation__links')

        divs.forEach(div => {
            const text = div.getAttribute('data-anchor-link-text');
            if (text) {
                const href = text.toLowerCase().replace(/\s+/g, '-');
                const a = document.createElement('a');

                a.href = '#' + href;
                a.textContent = text;

                linksWrap.appendChild(a);
            }
        });
    }

    onScroll() {
        if (this.anchor && this.check(this.anchor, 100)) {
            requestAnimationFrame(this.show.bind(this));

            if (!window.matchMedia('(max-width: 749px)').matches) {
                setTimeout(() => {
                    if (document.body.classList.contains('scroll-up')) {
                        let height = document.querySelector('sticky-header').offsetHeight;
                        if (document.querySelector('sticky-header').classList.contains('header-sticky__none')) {
                            this.style.top = 0;
                        } else {
                            this.style.top = `${height}px`;
                        }
                    } else if (document.body.classList.contains('scroll-down')) {
                        let height = document.querySelector('sticky-header').offsetHeight;
                        if (document.querySelector('sticky-header').classList.contains('header-sticky__always')) {
                            this.style.top = `${height}px`;
                        } else {
                            this.style.top = 0;
                        }
                    }
                });
            } else {
                this.style.top = 'auto';
            }
        } else {
            requestAnimationFrame(this.hide.bind(this));
        }
    }

    check(element, threshold) {
        let rect = element.getBoundingClientRect().y;
        threshold = threshold ? threshold : 0;

        return rect + threshold < 0
    }

    hide() {
        this.classList.remove('active', 'full');

        if (this.inner.style.maxHeight) this.inner.style.maxHeight = null;
        window.matchMedia('(max-width: 749px)').matches && document.body.style.setProperty('--p-b-xs', 0);
    }

    show() {
        this.classList.add('active');
        window.matchMedia('(max-width: 749px)').matches && document.body.style.setProperty('--p-b-xs', `${Math.floor(this.offsetHeight)}px`);
    }

    toggleEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.inner.style.maxHeight) {
            this.inner.style.maxHeight = null;
        } else {
            this.inner.style.maxHeight = `${this.inner.scrollHeight}px`;
        }

        this.classList.toggle('full');
    }
}

customElements.define('sticky-add-to-cart', StickyAddToCart);