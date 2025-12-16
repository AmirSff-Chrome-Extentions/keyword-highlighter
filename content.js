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

function showToast(positiveCount, negativeCount) {
    const existing = document.getElementById('keyword-highlighter-toast');
    if (existing) {
        existing.remove();
    }

    const total = positiveCount + negativeCount;
    const rate = total ? Math.round(((positiveCount - negativeCount) / total) * 100) : 0;
    const accentColor = rate < 0 ? '#e74c3c' : rate > 0 ? '#27ae60' : '#7f8c8d';

    const toast = document.createElement('div');
    toast.id = 'keyword-highlighter-toast';
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '40px';
    toast.style.transform = 'translate(-50%, 20px)';
    toast.style.background = 'rgba(26, 26, 26, 0.92)';
    toast.style.color = '#ffffff';
    toast.style.padding = '14px 18px';
    toast.style.borderRadius = '10px';
    toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.25)';
    toast.style.zIndex = '2147483647';
    toast.style.pointerEvents = 'none';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.borderLeft = `4px solid ${accentColor}`;

    const ratePrefix = rate > 0 ? '+' : '';

    toast.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px;">Keyword Highlighter</div>
        <div>Positive: ${positiveCount}</div>
        <div>Negative: ${negativeCount}</div>
        <div style="margin-top:6px;font-weight:600;color:${accentColor};">Rate: ${ratePrefix}${rate}%</div>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 20px)';
    }, 3500);

    setTimeout(() => {
        toast.remove();
    }, 3800);
}

function applyHighlights(positiveRaw, negativeRaw) {
    clearHighlights();

    const positiveWords = parseWords(positiveRaw);
    const negativeWords = parseWords(negativeRaw);

    const positiveCount = highlightWords(positiveWords, '#9aff9a');
    const negativeCount = highlightWords(negativeWords, '#ff9a9a');

    showToast(positiveCount, negativeCount);
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
            showToast(0, 0);
            return;
        }

        applyHighlights(data.positive || '', data.negative || '');
    });
});
