"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverriddenText = exports.overrideText = void 0;
const overiddenText = new Map();
function overrideText(id, text) {
    if (overiddenText.has(id)) {
        throw `ERROR: ${id} already overidden! Only one plugin can override text for a slot at a time`.red;
    }
    overiddenText.set(id, text);
}
exports.overrideText = overrideText;
function getOverriddenText(id) {
    return overiddenText.get(id);
}
exports.getOverriddenText = getOverriddenText;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmlkZVRleHRTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvdmVyaWRlVGV4dFN5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFNLGFBQWEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUVyRCxTQUFnQixZQUFZLENBQUMsRUFBVSxFQUFFLElBQVk7SUFDakQsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ3ZCLE1BQU0sVUFBVSxFQUFFLDRFQUE0RSxDQUFDLEdBQUcsQ0FBQztLQUN0RztJQUVELGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFORCxvQ0FNQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLEVBQVU7SUFDeEMsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFGRCw4Q0FFQyJ9