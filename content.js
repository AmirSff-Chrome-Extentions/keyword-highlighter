function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightWords(words, color) {
    if (!words.length) return;

    // const regex = new RegExp(`\\b(${words.map(escapeRegExp).join('|')})\\b`, 'gi');

    const regex = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');


    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                // if (node.parentNode && node.parentNode.tagName === 'SPAN') {
                //     return NodeFilter.FILTER_REJECT;
                // }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(node => {
        const text = node.nodeValue.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const matches = text.match(regex);

        if (!matches) return;

        const span = document.createElement('span');
        span.innerHTML = node.nodeValue.replace(regex, match =>
            `<span style="background:${color}; color:black;">${match}</span>`
        );

        node.parentNode.replaceChild(span, node);
    });
}

chrome.runtime.onMessage.addListener((msg) => {
    const positive = msg.positive
        .split(',')
        .map(w => w.trim())
        .filter(Boolean)

    const negative = msg.negative
        .split(',')
        .map(w => w.trim())
        .filter(Boolean)

    highlightWords(positive, '#9aff9a');
    highlightWords(negative, '#ff9a9a');
});
