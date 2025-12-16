function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseWords(value) {
    return (value || '')
        .split(',')
        .map(word => word.trim())
        .filter(Boolean);
}

function clearHighlights() {
    const highlights = document.querySelectorAll('span[data-keyword-highlighter="true"]');

    highlights.forEach(span => {
        const textNode = document.createTextNode(span.textContent || '');
        span.replaceWith(textNode);
    });
}

function highlightWords(words, color) {
    if (!words.length) return 0;

    const regex = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.nodeValue || !node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }

                const parentElement = node.parentElement;

                if (parentElement) {
                    const tagName = parentElement.tagName;
                    if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT' || tagName === 'TEXTAREA') {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (parentElement.closest('[data-keyword-highlighter="true"]')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    let matchCount = 0;

    textNodes.forEach(node => {
        const matches = node.nodeValue.match(regex);

        if (!matches) return;

        matchCount += matches.length;

        const template = document.createElement('template');
        template.innerHTML = node.nodeValue.replace(regex, match =>
            `<span data-keyword-highlighter="true" style="background:${color}; color:black;">${match}</span>`
        );

        const fragment = document.createDocumentFragment();

        while (template.content.firstChild) {
            fragment.appendChild(template.content.firstChild);
        }

        node.parentNode.replaceChild(fragment, node);
    });

    return matchCount;
}

let toastTemplatePromise = null;

function loadToastTemplate() {
    if (!toastTemplatePromise) {
        const url = chrome.runtime.getURL('toast.html');

        toastTemplatePromise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load toast template (${response.status})`);
                }

                return response.text();
            })
            .then(html => {
                const container = document.createElement('div');
                container.innerHTML = html.trim();
                const template = container.querySelector('template');

                if (!template) {
                    throw new Error('Toast template does not contain a <template> element.');
                }

                return template;
            })
            .catch(error => {
                console.error('Keyword Highlighter: unable to load toast template.', error);
                toastTemplatePromise = null;
                throw error;
            });
    }

    return toastTemplatePromise;
}

async function createToastElements() {
    const template = await loadToastTemplate();
    const fragment = template.content.cloneNode(true);

    const toast = fragment.querySelector('#keyword-highlighter-toast');
    if (!toast) {
        throw new Error('Toast element missing in template.');
    }

    const host = document.createElement('div');
    host.id = 'keyword-highlighter-toast-host';

    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(fragment);

    const positiveEl = shadowRoot.querySelector('[data-role="positive"]');
    const negativeEl = shadowRoot.querySelector('[data-role="negative"]');
    const rateEl = shadowRoot.querySelector('[data-role="rate"]');

    return { host, toast: shadowRoot.getElementById('keyword-highlighter-toast'), positiveEl, negativeEl, rateEl };
}

async function showToast(positiveCount, negativeCount) {
    const existingHost = document.getElementById('keyword-highlighter-toast-host');
    if (existingHost) {
        existingHost.remove();
    }

    try {
        const { host, toast, positiveEl, negativeEl, rateEl } = await createToastElements();

        const total = positiveCount + negativeCount;
        const rate = total ? Math.round(((positiveCount - negativeCount) / total) * 100) : 0;
        const accentColor = rate < 0 ? '#e74c3c' : rate > 0 ? '#27ae60' : '#7f8c8d';
        const ratePrefix = rate > 0 ? '+' : '';

        if (positiveEl) {
            positiveEl.textContent = `Positive: ${positiveCount}`;
        }

        if (negativeEl) {
            negativeEl.textContent = `Negative: ${negativeCount}`;
        }

        if (rateEl) {
            rateEl.textContent = `Rate: ${ratePrefix}${rate}%`;
        }

        toast.style.setProperty('--kh-accent', accentColor);

        document.body.appendChild(host);

        requestAnimationFrame(() => {
            toast.classList.add('kh-show');
        });

        const hideTimeout = setTimeout(() => {
            toast.classList.remove('kh-show');
        }, 3500);

        setTimeout(() => {
            clearTimeout(hideTimeout);
            host.remove();
        }, 3800);
    } catch (error) {
        console.error('Keyword Highlighter: unable to display toast.', error);
    }
}

function applyHighlights(positiveRaw, negativeRaw) {
    clearHighlights();

    const positiveWords = parseWords(positiveRaw);
    const negativeWords = parseWords(negativeRaw);

    const positiveCount = highlightWords(positiveWords, '#9aff9a');
    const negativeCount = highlightWords(negativeWords, '#ff9a9a');

    void showToast(positiveCount, negativeCount);
}

chrome.runtime.onMessage.addListener((msg) => {
    applyHighlights(msg.positive || '', msg.negative || '');
});

document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() !== 'x') return;

    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        return;
    }

    event.preventDefault();

    chrome.storage.sync.get(['positive', 'negative'], (data) => {
        if (!data.positive && !data.negative) {
            void showToast(0, 0);
            return;
        }

        applyHighlights(data.positive || '', data.negative || '');
    });
});
