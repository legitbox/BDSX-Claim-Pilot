"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtraData = exports.ClaimCreationEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var ClaimCreationEvent;
(function (ClaimCreationEvent) {
    ClaimCreationEvent.ID = 'ClaimCreationEvent';
    ClaimCreationEvent.CANCELABLE = true;
    ClaimCreationEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(ClaimCreationEvent.ID, callback);
    }
    ClaimCreationEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const callbackResult = callback(data.claim, data.ownerXuid);
            let extraData;
            if (callbackResult instanceof Promise) {
                extraData = await callbackResult;
            }
            else {
                extraData = callbackResult;
            }
            claimCreationExtraData.set(data.claim.id, extraData);
            let res = extraData.shouldCreate;
            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    ClaimCreationEvent.handleFireCallbacks = handleFireCallbacks;
})(ClaimCreationEvent = exports.ClaimCreationEvent || (exports.ClaimCreationEvent = {}));
function createDefaultClaimCreateExtraData() {
    return {
        shouldCreate: true,
        shouldSendDefaultMessage: true,
    };
}
// A bit of an iffy system if multiple plugins want to do things for this.
// The latest update is the one that gets used, so it's very unreliable as to when an extra data will be chosen and from where.
// Though it's not likely that a plugin wrapping the claim creation system will be compatible with another doing the same.
// If something gets reported I might try and figure out some priority system
const claimCreationExtraData = new Map();
function getExtraData(claimId, shouldRemove = true) {
    let res = claimCreationExtraData.get(claimId);
    if (res === undefined) {
        res = createDefaultClaimCreateExtraData();
    }
    if (shouldRemove) {
        claimCreationExtraData.delete(claimId);
    }
    return res;
}
exports.getExtraData = getExtraData;
(0, eventStorage_1.registerEventType)(ClaimCreationEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1DcmVhdGVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbUNyZWF0ZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBZ0U7QUFHaEUsSUFBaUIsa0JBQWtCLENBZ0NsQztBQWhDRCxXQUFpQixrQkFBa0I7SUFDbEIscUJBQUUsR0FBRyxvQkFBb0IsQ0FBQztJQUMxQiw2QkFBVSxHQUFHLElBQUksQ0FBQztJQUNsQixnQ0FBYSxHQUFHLElBQUksQ0FBQztJQUdsQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLG1CQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsMkJBQVEsV0FFdkIsQ0FBQTtJQUVNLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLElBQVM7UUFDdEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1RCxJQUFJLFNBQVMsQ0FBQztZQUNkLElBQUksY0FBYyxZQUFZLE9BQU8sRUFBRTtnQkFDbkMsU0FBUyxHQUFHLE1BQU0sY0FBYyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNILFNBQVMsR0FBRyxjQUFjLENBQUM7YUFDOUI7WUFFRCxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFckQsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQztZQUVqQyxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQzNCLGFBQWEsR0FBRyxLQUFLLENBQUM7YUFDekI7U0FDSjtRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFyQnFCLHNDQUFtQixzQkFxQnhDLENBQUE7QUFDTCxDQUFDLEVBaENnQixrQkFBa0IsR0FBbEIsMEJBQWtCLEtBQWxCLDBCQUFrQixRQWdDbEM7QUFPRCxTQUFTLGlDQUFpQztJQUN0QyxPQUFPO1FBQ0gsWUFBWSxFQUFFLElBQUk7UUFDbEIsd0JBQXdCLEVBQUUsSUFBSTtLQUNqQyxDQUFBO0FBQ0wsQ0FBQztBQUVELDBFQUEwRTtBQUMxRSwrSEFBK0g7QUFDL0gsMEhBQTBIO0FBQzFILDZFQUE2RTtBQUM3RSxNQUFNLHNCQUFzQixHQUF3QyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRTlFLFNBQWdCLFlBQVksQ0FBQyxPQUFlLEVBQUUsZUFBd0IsSUFBSTtJQUN0RSxJQUFJLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFO1FBQ25CLEdBQUcsR0FBRyxpQ0FBaUMsRUFBRSxDQUFDO0tBQzdDO0lBRUQsSUFBSSxZQUFZLEVBQUU7UUFDZCxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDMUM7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUM7QUFYRCxvQ0FXQztBQUVELElBQUEsZ0NBQWlCLEVBQUMsa0JBQWtCLENBQUMsQ0FBQyJ9