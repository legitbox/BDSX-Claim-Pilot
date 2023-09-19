const overiddenText: Map<string, string> = new Map();

export function overrideText(id: string, text: string) {
    if (overiddenText.has(id)) {
        throw `ERROR: ${id} already overidden! Only one plugin can override text for a slot at a time`.red;
    }

    overiddenText.set(id, text);
}

export function getOverriddenText(id: string) {
    return overiddenText.get(id);
}